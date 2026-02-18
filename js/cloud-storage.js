// =============================================================================
// CLOUD STORAGE — Dropbox, pCloud, Box OAuth + vault backup/restore
// =============================================================================

/**
 * Cloud provider configurations.
 * Client IDs are placeholder — replace with real registered app IDs.
 */
const CLOUD_PROVIDERS = {
  dropbox: {
    name: 'Dropbox',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientId: 'gbxz5vvffweoz4f',
    scopes: '',
    folder: '/StakTrakr',
    filename: 'staktrakr-backup.stvault',
    usePKCE: true,
    refreshable: true,
  },
  pcloud: {
    name: 'pCloud',
    authUrl: 'https://my.pcloud.com/oauth2/authorize',
    tokenUrl: 'https://api.pcloud.com/oauth2_token',
    clientId: 'TODO_REPLACE_PCLOUD_CLIENT_ID',
    scopes: '',
    folder: '/StakTrakr',
    filename: 'staktrakr-backup.stvault',
    usePKCE: false,
    refreshable: false, // pCloud tokens are lifetime
  },
  box: {
    name: 'Box',
    authUrl: 'https://account.box.com/api/oauth2/authorize',
    tokenUrl: 'https://api.box.com/oauth2/token',
    clientId: 'TODO_REPLACE_BOX_CLIENT_ID',
    scopes: '',
    folder: 'StakTrakr',
    filename: 'staktrakr-backup.stvault',
    usePKCE: false,
    refreshable: true,
  },
};

const CLOUD_REDIRECT_URI = 'https://staktrakr.com/oauth-callback.html';

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function cloudGenerateVerifier() {
  var arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode.apply(null, arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function cloudGenerateChallenge(verifier) {
  var encoder = new TextEncoder();
  var digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

function cloudGetStorageKey(provider) {
  return 'cloud_token_' + provider;
}

function cloudGetStoredToken(provider) {
  try {
    var raw = localStorage.getItem(cloudGetStorageKey(provider));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function cloudStoreToken(provider, tokenData) {
  localStorage.setItem(cloudGetStorageKey(provider), JSON.stringify(tokenData));
}

function cloudClearToken(provider) {
  localStorage.removeItem(cloudGetStorageKey(provider));
}

function cloudIsConnected(provider) {
  return !!cloudGetStoredToken(provider);
}

async function cloudGetToken(provider) {
  var stored = cloudGetStoredToken(provider);
  if (!stored) return null;

  var config = CLOUD_PROVIDERS[provider];

  // pCloud tokens never expire
  if (!config.refreshable) return stored.access_token;

  // Check if token is expired (with 60s buffer)
  if (stored.expires_at && Date.now() < stored.expires_at - 60000) {
    return stored.access_token;
  }

  // Attempt refresh
  if (!stored.refresh_token) {
    cloudClearToken(provider);
    return null;
  }

  try {
    var body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refresh_token,
      client_id: config.clientId,
    });
    var resp = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });
    if (!resp.ok) throw new Error('Refresh failed');
    var data = await resp.json();
    var updated = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || stored.refresh_token,
      expires_at: Date.now() + (data.expires_in || 14400) * 1000,
    };
    cloudStoreToken(provider, updated);
    return updated.access_token;
  } catch (e) {
    debugLog('[CloudStorage] Token refresh failed for ' + provider, e);
    cloudClearToken(provider);
    return null;
  }
}

// ---------------------------------------------------------------------------
// OAuth popup flow
// ---------------------------------------------------------------------------

function cloudAuthStart(provider) {
  var config = CLOUD_PROVIDERS[provider];
  if (!config) return;

  var state = provider + '_' + Date.now();
  sessionStorage.setItem('cloud_oauth_state', state);

  var params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: CLOUD_REDIRECT_URI,
    state: state,
    token_access_type: 'offline',
  });

  if (config.usePKCE) {
    var verifier = cloudGenerateVerifier();
    sessionStorage.setItem('cloud_pkce_verifier', verifier);
    // Challenge computed async — build URL after
    cloudGenerateChallenge(verifier).then(function (challenge) {
      params.set('code_challenge', challenge);
      params.set('code_challenge_method', 'S256');
      window.open(config.authUrl + '?' + params.toString(), 'cloudOAuth', 'width=600,height=700');
    });
  } else {
    window.open(config.authUrl + '?' + params.toString(), 'cloudOAuth', 'width=600,height=700');
  }
}

// Listen for OAuth callback postMessage
window.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'staktrakr-oauth') return;

  var code = event.data.code;
  var state = event.data.state;
  if (!code || !state) return;

  var savedState = sessionStorage.getItem('cloud_oauth_state');
  if (state !== savedState) {
    debugLog('[CloudStorage] OAuth state mismatch');
    return;
  }

  var provider = state.split('_')[0];
  var config = CLOUD_PROVIDERS[provider];
  if (!config) return;

  var body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: config.clientId,
    redirect_uri: CLOUD_REDIRECT_URI,
  });

  var verifier = sessionStorage.getItem('cloud_pkce_verifier');
  if (verifier) {
    body.set('code_verifier', verifier);
    sessionStorage.removeItem('cloud_pkce_verifier');
  }

  fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body,
  })
    .then(function (resp) { return resp.json(); })
    .then(function (data) {
      if (data.access_token) {
        var tokenData = {
          access_token: data.access_token,
          refresh_token: data.refresh_token || null,
          expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
        };
        cloudStoreToken(provider, tokenData);
        sessionStorage.removeItem('cloud_oauth_state');
        if (typeof syncCloudUI === 'function') syncCloudUI();
        debugLog('[CloudStorage] Connected to ' + config.name);
      }
    })
    .catch(function (err) {
      debugLog('[CloudStorage] Token exchange failed', err);
    });
});

function cloudDisconnect(provider) {
  cloudClearToken(provider);
  if (typeof syncCloudUI === 'function') syncCloudUI();
}

// ---------------------------------------------------------------------------
// Folder management (provider-specific)
// ---------------------------------------------------------------------------

async function cloudEnsureFolder(provider, token) {
  if (provider === 'dropbox') {
    // Dropbox auto-creates on upload with autorename=false
    return;
  }
  if (provider === 'pcloud') {
    // Create folder if not exists (pCloud returns existing folder if already created)
    await fetch('https://api.pcloud.com/createfolderifnotexists?path=' +
      encodeURIComponent(CLOUD_PROVIDERS[provider].folder) +
      '&access_token=' + encodeURIComponent(token));
    return;
  }
  if (provider === 'box') {
    // Check if StakTrakr folder exists at root (folder_id 0)
    var resp = await fetch('https://api.box.com/2.0/search?query=StakTrakr&type=folder&ancestor_folder_ids=0&limit=5', {
      headers: { Authorization: 'Bearer ' + token },
    });
    var data = await resp.json();
    var existing = (data.entries || []).find(function (e) { return e.name === 'StakTrakr' && e.type === 'folder'; });
    if (existing) return existing.id;
    // Create folder
    var createResp = await fetch('https://api.box.com/2.0/folders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'StakTrakr', parent: { id: '0' } }),
    });
    var created = await createResp.json();
    return created.id;
  }
}

// ---------------------------------------------------------------------------
// Upload vault to cloud
// ---------------------------------------------------------------------------

async function cloudUploadVault(provider, password) {
  var token = await cloudGetToken(provider);
  if (!token) throw new Error('Not connected to ' + CLOUD_PROVIDERS[provider].name);

  var config = CLOUD_PROVIDERS[provider];

  // Build vault file using existing vault globals
  var payload = collectVaultData();
  var plaintext = new TextEncoder().encode(JSON.stringify(payload));
  var salt = vaultRandomBytes(32);
  var iv = vaultRandomBytes(12);
  var iterations = typeof VAULT_PBKDF2_ITERATIONS !== 'undefined' ? VAULT_PBKDF2_ITERATIONS : 600000;
  var key = await vaultDeriveKey(password, salt, iterations);
  var ciphertext = await vaultEncrypt(plaintext, key, iv);
  var fileBytes = serializeVaultFile(salt, iv, iterations, ciphertext);

  await cloudEnsureFolder(provider, token);

  if (provider === 'dropbox') {
    var apiArg = JSON.stringify({
      path: config.folder + '/' + config.filename,
      mode: 'overwrite',
      autorename: false,
      mute: true,
    });
    await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': apiArg,
      },
      body: fileBytes,
    });
  } else if (provider === 'pcloud') {
    var formData = new FormData();
    formData.append('file', new Blob([fileBytes]), config.filename);
    await fetch('https://api.pcloud.com/uploadfile?path=' +
      encodeURIComponent(config.folder) +
      '&renameifexists=0&nopartial=1&access_token=' + encodeURIComponent(token), {
      method: 'POST',
      body: formData,
    });
  } else if (provider === 'box') {
    var folderId = await cloudEnsureFolder(provider, token);
    // Check if file already exists to update instead of create
    var searchResp = await fetch('https://api.box.com/2.0/search?query=' + encodeURIComponent(config.filename) +
      '&type=file&ancestor_folder_ids=' + folderId + '&limit=5', {
      headers: { Authorization: 'Bearer ' + token },
    });
    var searchData = await searchResp.json();
    var existingFile = (searchData.entries || []).find(function (e) { return e.name === config.filename; });

    var fd = new FormData();
    fd.append('file', new Blob([fileBytes]), config.filename);

    if (existingFile) {
      // Upload new version
      await fetch('https://upload.box.com/api/2.0/files/' + existingFile.id + '/content', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd,
      });
    } else {
      fd.append('attributes', JSON.stringify({ name: config.filename, parent: { id: folderId } }));
      await fetch('https://upload.box.com/api/2.0/files/content', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd,
      });
    }
  }

  localStorage.setItem('cloud_last_backup', JSON.stringify({
    provider: provider,
    timestamp: Date.now(),
  }));

  if (typeof syncCloudUI === 'function') syncCloudUI();
  debugLog('[CloudStorage] Backup uploaded to ' + config.name);
}

// ---------------------------------------------------------------------------
// Download vault from cloud
// ---------------------------------------------------------------------------

async function cloudDownloadVault(provider) {
  var token = await cloudGetToken(provider);
  if (!token) throw new Error('Not connected to ' + CLOUD_PROVIDERS[provider].name);

  var config = CLOUD_PROVIDERS[provider];
  var fileBytes;

  if (provider === 'dropbox') {
    var apiArg = JSON.stringify({ path: config.folder + '/' + config.filename });
    var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': apiArg,
      },
    });
    if (!resp.ok) throw new Error('Download failed: ' + resp.status);
    fileBytes = new Uint8Array(await resp.arrayBuffer());
  } else if (provider === 'pcloud') {
    // Get file link first
    var linkResp = await fetch('https://api.pcloud.com/getfilelink?path=' +
      encodeURIComponent(config.folder + '/' + config.filename) +
      '&access_token=' + encodeURIComponent(token));
    var linkData = await linkResp.json();
    if (!linkData.hosts || !linkData.path) throw new Error('File not found on pCloud');
    var fileUrl = 'https://' + linkData.hosts[0] + linkData.path;
    var dlResp = await fetch(fileUrl);
    fileBytes = new Uint8Array(await dlResp.arrayBuffer());
  } else if (provider === 'box') {
    var folderId = await cloudEnsureFolder(provider, token);
    var searchResp = await fetch('https://api.box.com/2.0/search?query=' + encodeURIComponent(config.filename) +
      '&type=file&ancestor_folder_ids=' + folderId + '&limit=5', {
      headers: { Authorization: 'Bearer ' + token },
    });
    var searchData = await searchResp.json();
    var file = (searchData.entries || []).find(function (e) { return e.name === config.filename; });
    if (!file) throw new Error('Backup not found on Box');
    var dlResp2 = await fetch('https://api.box.com/2.0/files/' + file.id + '/content', {
      headers: { Authorization: 'Bearer ' + token },
    });
    fileBytes = new Uint8Array(await dlResp2.arrayBuffer());
  }

  return fileBytes;
}

// ---------------------------------------------------------------------------
// Cloud UI sync
// ---------------------------------------------------------------------------

function syncCloudUI() {
  var lastBackup = null;
  try {
    lastBackup = JSON.parse(localStorage.getItem('cloud_last_backup'));
  } catch { /* ignore */ }

  Object.keys(CLOUD_PROVIDERS).forEach(function (key) {
    var connected = cloudIsConnected(key);
    var card = document.getElementById('cloudCard_' + key);
    if (!card) return;

    var connectBtn = card.querySelector('.cloud-connect-btn');
    var disconnectBtn = card.querySelector('.cloud-disconnect-btn');
    var actions = card.querySelector('.cloud-actions');
    var status = card.querySelector('.cloud-status');

    if (connectBtn) connectBtn.style.display = connected ? 'none' : '';
    if (disconnectBtn) disconnectBtn.style.display = connected ? '' : 'none';
    if (actions) actions.style.display = connected ? '' : 'none';

    if (status) {
      if (connected && lastBackup && lastBackup.provider === key) {
        var d = new Date(lastBackup.timestamp);
        status.textContent = 'Last backup: ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
      } else if (connected) {
        status.textContent = 'Connected — no backups yet';
      } else {
        status.textContent = '';
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

window.CLOUD_PROVIDERS = CLOUD_PROVIDERS;
window.cloudAuthStart = cloudAuthStart;
window.cloudDisconnect = cloudDisconnect;
window.cloudUploadVault = cloudUploadVault;
window.cloudDownloadVault = cloudDownloadVault;
window.cloudIsConnected = cloudIsConnected;
window.syncCloudUI = syncCloudUI;
