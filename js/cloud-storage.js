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
    usePKCE: false,
    refreshable: true,
  },
};

const CLOUD_REDIRECT_URI = window.location.origin + '/oauth-callback.html';
const CLOUD_LATEST_FILENAME = 'staktrakr-latest.json';

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

// Surface auth failures to the user (toast with alert fallback).
function cloudNotifyAuthFailure(provider, message, details) {
  var providerName = (CLOUD_PROVIDERS[provider] && CLOUD_PROVIDERS[provider].name) || 'Cloud provider';
  var fullMessage = providerName + ' authentication failed: ' + message;

  debugLog('[CloudStorage] ' + fullMessage, details || '');
  if (details) {
    try { console.error('[CloudStorage] OAuth error details:', details); } catch (_) { /* ignore */ }
  }

  if (typeof showCloudToast === 'function') {
    showCloudToast(fullMessage, 7000);
  } else {
    alert(fullMessage);
  }
}

// Exchange an OAuth authorization code for an access token.
async function cloudExchangeCode(code, state) {
  var savedState = sessionStorage.getItem('cloud_oauth_state');
  var provider = (state || '').split('_')[0] || 'dropbox';

  if (state !== savedState) {
    cloudNotifyAuthFailure(provider, 'OAuth state mismatch. Please try again.');
    return;
  }

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

  try {
    var resp = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });

    var raw = await resp.text();
    var data = {};
    if (raw) {
      try { data = JSON.parse(raw); } catch (_) { data = { rawResponse: raw }; }
    }

    if (!resp.ok) {
      var errText = data.error_summary || data.error_description || data.error || 'Unknown error';
      cloudNotifyAuthFailure(provider, 'Token exchange failed (' + resp.status + '). ' + String(errText), data);
      return;
    }

    if (!data.access_token) {
      cloudNotifyAuthFailure(provider, 'Token exchange response did not include an access token.', data);
      return;
    }

    var tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    };
    cloudStoreToken(provider, tokenData);
    sessionStorage.removeItem('cloud_oauth_state');
    if (typeof syncCloudUI === 'function') syncCloudUI();
    if (typeof showCloudToast === 'function') showCloudToast('Connected to ' + config.name + '.');
    debugLog('[CloudStorage] Connected to ' + config.name);
  } catch (err) {
    cloudNotifyAuthFailure(provider, 'Token exchange request failed. Check redirect URI/domain registration and try again.', err);
  }
}

// Primary: listen for OAuth callback postMessage from popup
window.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'staktrakr-oauth') return;
  var code = event.data.code;
  var state = event.data.state;
  if (!code || !state) return;
  cloudExchangeCode(code, state);
});

// Fallback: localStorage relay when popup loses window.opener (Cloudflare challenge, etc.)
function cloudCheckOAuthRelay() {
  try {
    var raw = localStorage.getItem('staktrakr_oauth_result');
    if (!raw) return;
    localStorage.removeItem('staktrakr_oauth_result');
    var data = JSON.parse(raw);
    if (data.code && data.state) {
      cloudExchangeCode(data.code, data.state);
    }
  } catch (e) { /* ignore */ }
}

// Pick up the relay key via storage event (fires when another tab/popup writes it)
window.addEventListener('storage', function (event) {
  if (event.key === 'staktrakr_oauth_result' && event.newValue) {
    cloudCheckOAuthRelay();
  }
});

// Also check on visibility change (user returns to tab after popup closed)
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) cloudCheckOAuthRelay();
});

// Check on page load (main-window redirect lands here after oauth-callback.html)
if (document.readyState === 'complete') {
  cloudCheckOAuthRelay();
} else {
  window.addEventListener('load', cloudCheckOAuthRelay);
}

function cloudDisconnect(provider) {
  cloudClearToken(provider);
  localStorage.removeItem('cloud_last_backup');
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
// Versioned filename helper
// ---------------------------------------------------------------------------

function cloudBuildVersionedFilename() {
  var d = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var stamp = d.getFullYear() +
    pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  return 'staktrakr-backup-' + stamp + '.stvault';
}

// ---------------------------------------------------------------------------
// Upload vault to cloud (accepts pre-built fileBytes)
// ---------------------------------------------------------------------------

async function cloudUploadVault(provider, fileBytes) {
  var token = await cloudGetToken(provider);
  if (!token) throw new Error('Not connected to ' + CLOUD_PROVIDERS[provider].name);

  var config = CLOUD_PROVIDERS[provider];
  var filename = cloudBuildVersionedFilename();
  var now = Date.now();

  await cloudEnsureFolder(provider, token);

  if (provider === 'dropbox') {
    // Upload versioned backup
    var apiArg = JSON.stringify({
      path: config.folder + '/' + filename,
      mode: 'add',
      autorename: true,
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

    // Upload latest.json pointer
    var itemCount = 0;
    try { itemCount = typeof inventory !== 'undefined' ? inventory.length : 0; } catch (_) { /* ignore */ }
    var latestData = {
      filename: filename,
      timestamp: now,
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
      itemCount: itemCount,
    };
    var latestBytes = new TextEncoder().encode(JSON.stringify(latestData));
    var latestArg = JSON.stringify({
      path: config.folder + '/' + CLOUD_LATEST_FILENAME,
      mode: 'overwrite',
      autorename: false,
      mute: true,
    });
    await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': latestArg,
      },
      body: latestBytes,
    });
  } else if (provider === 'pcloud') {
    var formData = new FormData();
    formData.append('file', new Blob([fileBytes]), filename);
    await fetch('https://api.pcloud.com/uploadfile?path=' +
      encodeURIComponent(config.folder) +
      '&renameifexists=1&nopartial=1&access_token=' + encodeURIComponent(token), {
      method: 'POST',
      body: formData,
    });
  } else if (provider === 'box') {
    var folderId = await cloudEnsureFolder(provider, token);
    var fd = new FormData();
    fd.append('file', new Blob([fileBytes]), filename);
    fd.append('attributes', JSON.stringify({ name: filename, parent: { id: folderId } }));
    await fetch('https://upload.box.com/api/2.0/files/content', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd,
    });
  }

  var backupMeta = {
    provider: provider,
    timestamp: now,
    filename: filename,
    appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
    itemCount: 0,
  };
  try { backupMeta.itemCount = typeof inventory !== 'undefined' ? inventory.length : 0; } catch (_) { /* ignore */ }
  localStorage.setItem('cloud_last_backup', JSON.stringify(backupMeta));

  if (typeof syncCloudUI === 'function') syncCloudUI();
  debugLog('[CloudStorage] Backup uploaded to ' + config.name + ' as ' + filename);
}

// ---------------------------------------------------------------------------
// Download latest.json metadata from cloud
// ---------------------------------------------------------------------------

async function cloudGetRemoteLatest(provider) {
  var token = await cloudGetToken(provider);
  if (!token) return null;

  var config = CLOUD_PROVIDERS[provider];

  try {
    if (provider === 'dropbox') {
      var apiArg = JSON.stringify({ path: config.folder + '/' + CLOUD_LATEST_FILENAME });
      var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Dropbox-API-Arg': apiArg,
        },
      });
      if (!resp.ok) return null;
      return resp.json();
    }
  } catch (e) {
    debugLog('[CloudStorage] Failed to fetch remote latest', e);
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// List backups in cloud folder
// ---------------------------------------------------------------------------

async function cloudListBackups(provider) {
  var token = await cloudGetToken(provider);
  if (!token) throw new Error('Not connected to ' + CLOUD_PROVIDERS[provider].name);

  var config = CLOUD_PROVIDERS[provider];
  var backups = [];

  if (provider === 'dropbox') {
    var resp = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: config.folder, recursive: false }),
    });
    if (!resp.ok) {
      // Folder may not exist yet
      if (resp.status === 409) return [];
      throw new Error('List failed: ' + resp.status);
    }
    var data = await resp.json();
    var entries = data.entries || [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry['.tag'] === 'file' && entry.name.endsWith('.stvault')) {
        backups.push({
          name: entry.name,
          server_modified: entry.server_modified,
          size: entry.size,
        });
      }
    }
  }

  // Sort newest first
  backups.sort(function (a, b) {
    return new Date(b.server_modified) - new Date(a.server_modified);
  });

  return backups;
}

// ---------------------------------------------------------------------------
// Download a specific vault file by name
// ---------------------------------------------------------------------------

async function cloudDownloadVaultByName(provider, filename) {
  var token = await cloudGetToken(provider);
  if (!token) throw new Error('Not connected to ' + CLOUD_PROVIDERS[provider].name);

  var config = CLOUD_PROVIDERS[provider];

  if (provider === 'dropbox') {
    var apiArg = JSON.stringify({ path: config.folder + '/' + filename });
    var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': apiArg,
      },
    });
    if (!resp.ok) throw new Error('Download failed: ' + resp.status);
    return new Uint8Array(await resp.arrayBuffer());
  }

  throw new Error('Download by name not supported for ' + provider);
}

// ---------------------------------------------------------------------------
// Download vault from cloud (legacy — downloads latest)
// ---------------------------------------------------------------------------

async function cloudDownloadVault(provider) {
  // Try to get latest pointer first
  var latest = await cloudGetRemoteLatest(provider);
  if (latest && latest.filename) {
    return cloudDownloadVaultByName(provider, latest.filename);
  }

  // Fallback: list and download newest
  var backups = await cloudListBackups(provider);
  if (backups.length > 0) {
    return cloudDownloadVaultByName(provider, backups[0].name);
  }

  throw new Error('No backups found on ' + CLOUD_PROVIDERS[provider].name);
}

// ---------------------------------------------------------------------------
// Conflict check
// ---------------------------------------------------------------------------

async function cloudCheckConflict(provider) {
  var remote = await cloudGetRemoteLatest(provider);
  if (!remote || !remote.timestamp) {
    return { conflict: false };
  }

  var local = null;
  try {
    local = JSON.parse(localStorage.getItem('cloud_last_backup'));
  } catch { /* ignore */ }

  if (!local || !local.timestamp) {
    // No local record — remote is newer by definition
    return { conflict: true, remote: remote };
  }

  if (remote.timestamp > local.timestamp) {
    return { conflict: true, remote: remote };
  }

  return { conflict: false };
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

    // Toggle login vs disconnect buttons
    var loginArea = card.querySelector('.cloud-login-area');
    var connectedBadge = card.querySelector('.cloud-connected-badge');
    var disconnectBtn = card.querySelector('.cloud-disconnect-btn');
    var backupListEl = document.getElementById('cloudBackupList_' + key);

    if (loginArea) loginArea.style.display = connected ? 'none' : '';
    if (connectedBadge) connectedBadge.style.display = connected ? '' : 'none';
    if (disconnectBtn) disconnectBtn.style.display = connected ? '' : 'none';

    // Enable/disable backup & restore buttons based on connection
    card.querySelectorAll('.cloud-backup-btn, .cloud-restore-btn').forEach(function (btn) {
      btn.disabled = !connected;
    });

    // Update status indicator
    var indicator = card.querySelector('.cloud-status-indicator');
    if (indicator) {
      indicator.dataset.state = connected ? 'connected' : 'disconnected';
      var textEl = indicator.querySelector('.cloud-status-text');
      if (textEl) textEl.textContent = connected ? 'Connected' : 'Not connected';
    }

    // Update sync & item count rows
    var syncEl = card.querySelector('.cloud-status-sync');
    var itemsEl = card.querySelector('.cloud-status-items');
    if (connected && lastBackup && lastBackup.provider === key) {
      var d = new Date(lastBackup.timestamp);
      if (syncEl) {
        syncEl.textContent = d.toLocaleDateString() + ' ' +
          d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      if (itemsEl) {
        var meta = lastBackup.itemCount ? lastBackup.itemCount.toLocaleString() : '0';
        if (lastBackup.appVersion) meta += ' (v' + lastBackup.appVersion + ')';
        itemsEl.textContent = meta;
      }
    } else {
      if (syncEl) syncEl.textContent = connected ? 'No backups yet' : 'Never';
      if (itemsEl) itemsEl.textContent = '\u2014';
    }

    // Update legacy status detail text
    var statusEl = card.querySelector('.cloud-status-detail');
    if (statusEl) statusEl.textContent = '';

    // Hide backup list when disconnected
    if (backupListEl && !connected) {
      backupListEl.style.display = 'none';
      backupListEl.innerHTML = '';
    }
  });

  // Update password cache status
  var pwStatusEl = document.getElementById('cloudPwCacheStatus');
  if (pwStatusEl) {
    try {
      var raw = localStorage.getItem('cloud_vault_pw_cache');
      if (raw) {
        var payload = JSON.parse(raw);
        var remaining = payload.expires - Date.now();
        if (remaining > 0) {
          var hours = Math.floor(remaining / 3600000);
          var days = Math.floor(hours / 24);
          pwStatusEl.textContent = days > 0 ? 'Expires in ' + days + 'd ' + (hours % 24) + 'h' :
            hours > 0 ? 'Expires in ' + hours + 'h' : 'Expires soon';
          pwStatusEl.style.color = 'var(--success)';
        } else {
          pwStatusEl.textContent = 'Expired';
          pwStatusEl.style.color = 'var(--text-secondary)';
        }
      } else {
        pwStatusEl.textContent = 'Not cached';
        pwStatusEl.style.color = 'var(--text-secondary)';
      }
    } catch (_) {
      pwStatusEl.textContent = 'Not cached';
      pwStatusEl.style.color = 'var(--text-secondary)';
    }
  }
}

// ---------------------------------------------------------------------------
// Password cache (XOR obfuscation — NOT cryptographic, just prevents plaintext)
// ---------------------------------------------------------------------------

function cloudCachePassword(provider, password, days) {
  var len = password.length;
  var nonce = new Uint8Array(len);
  crypto.getRandomValues(nonce);
  var encoded = new TextEncoder().encode(password);
  var data = new Uint8Array(len);
  for (var i = 0; i < len; i++) data[i] = encoded[i] ^ nonce[i];
  var payload = {
    nonce: btoa(String.fromCharCode.apply(null, nonce)),
    data: btoa(String.fromCharCode.apply(null, data)),
    expires: Date.now() + (days || 3) * 86400000,
    provider: provider,
  };
  localStorage.setItem('cloud_vault_pw_cache', JSON.stringify(payload));
}

function cloudGetCachedPassword(provider) {
  try {
    var raw = localStorage.getItem('cloud_vault_pw_cache');
    if (!raw) return null;
    var payload = JSON.parse(raw);
    if (payload.provider !== provider) return null;
    if (Date.now() > payload.expires) {
      cloudClearCachedPassword();
      return null;
    }
    var nonce = Uint8Array.from(atob(payload.nonce), function (c) { return c.charCodeAt(0); });
    var data = Uint8Array.from(atob(payload.data), function (c) { return c.charCodeAt(0); });
    var decoded = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++) decoded[i] = data[i] ^ nonce[i];
    return new TextDecoder().decode(decoded);
  } catch (_) {
    return null;
  }
}

function cloudClearCachedPassword() {
  localStorage.removeItem('cloud_vault_pw_cache');
}

// ---------------------------------------------------------------------------
// Kraken toast (easter egg on first cloud backup)
// ---------------------------------------------------------------------------

function showCloudToast(message, durationMs) {
  durationMs = durationMs || 5000;
  var toast = document.createElement('div');
  toast.className = 'cloud-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', function () { toast.remove(); });
  }, durationMs);
}

function showKrakenToastIfFirst() {
  if (localStorage.getItem('cloud_kraken_seen') === 'true') return;
  localStorage.setItem('cloud_kraken_seen', 'true');
  showCloudToast('Yarr! Release the Krakens! Your treasure is encrypted and ready to brave the cloud seas. Stay vigilant, captain!');
}

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

window.CLOUD_PROVIDERS = CLOUD_PROVIDERS;
window.cloudAuthStart = cloudAuthStart;
window.cloudDisconnect = cloudDisconnect;
window.cloudUploadVault = cloudUploadVault;
window.cloudDownloadVault = cloudDownloadVault;
window.cloudDownloadVaultByName = cloudDownloadVaultByName;
window.cloudListBackups = cloudListBackups;
window.cloudGetRemoteLatest = cloudGetRemoteLatest;
window.cloudCheckConflict = cloudCheckConflict;
window.cloudIsConnected = cloudIsConnected;
window.syncCloudUI = syncCloudUI;
window.cloudCachePassword = cloudCachePassword;
window.cloudGetCachedPassword = cloudGetCachedPassword;
window.cloudClearCachedPassword = cloudClearCachedPassword;
window.showCloudToast = showCloudToast;
window.showKrakenToastIfFirst = showKrakenToastIfFirst;
