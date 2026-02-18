/**
 * Encrypted Vault Backup Module (.stvault)
 *
 * Provides AES-256-GCM encrypted export/import of all localStorage data.
 * Uses Web Crypto API (primary) with forge.js fallback for file:// protocol.
 *
 * Binary format (56-byte header + ciphertext):
 *   0-6   : "STVAULT" magic bytes
 *   7     : format version (0x01)
 *   8-11  : PBKDF2 iterations (uint32 big-endian)
 *   12-43 : 32-byte random salt
 *   44-55 : 12-byte random IV/nonce
 *   56+   : AES-256-GCM ciphertext (includes 16-byte auth tag)
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const VAULT_MAGIC = new Uint8Array([0x53, 0x54, 0x56, 0x41, 0x55, 0x4C, 0x54]); // "STVAULT"
const VAULT_VERSION = 0x01;
const VAULT_HEADER_SIZE = 56;
const VAULT_PBKDF2_ITERATIONS = 100000;
const VAULT_MIN_PASSWORD_LENGTH = 8;
const VAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// =============================================================================
// CRYPTO ABSTRACTION LAYER
// =============================================================================

/**
 * Detect available crypto backend.
 * @returns {'native'|'forge'|null}
 */
function getCryptoBackend() {
  try {
    if (
      typeof crypto !== "undefined" &&
      crypto.subtle &&
      typeof crypto.subtle.importKey === "function"
    ) {
      return "native";
    }
  } catch (_) {
    /* ignore */
  }
  try {
    if (typeof forge !== "undefined" && forge.cipher && forge.pkcs5) {
      return "forge";
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

/**
 * Generate cryptographically random bytes.
 * @param {number} length
 * @returns {Uint8Array}
 */
function vaultRandomBytes(length) {
  const backend = getCryptoBackend();
  if (backend === "native") {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  if (backend === "forge") {
    const bytes = forge.random.getBytesSync(length);
    return new Uint8Array(
      bytes.split("").map(function (c) {
        return c.charCodeAt(0);
      }),
    );
  }
  throw new Error("No crypto backend available");
}

/**
 * Derive AES-256 key from password using PBKDF2.
 * @param {string} password
 * @param {Uint8Array} salt - 32-byte salt
 * @param {number} iterations
 * @returns {Promise<CryptoKey|string>} Native CryptoKey or forge key bytes
 */
async function vaultDeriveKey(password, salt, iterations) {
  const backend = getCryptoBackend();
  if (backend === "native") {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
  if (backend === "forge") {
    var saltStr = String.fromCharCode.apply(null, salt);
    var key = forge.pkcs5.pbkdf2(password, saltStr, iterations, 32, "sha256");
    return key;
  }
  throw new Error("No crypto backend available");
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * @param {Uint8Array} plaintext
 * @param {CryptoKey|string} key
 * @param {Uint8Array} iv - 12-byte nonce
 * @returns {Promise<Uint8Array>} ciphertext + 16-byte auth tag
 */
async function vaultEncrypt(plaintext, key, iv) {
  var backend = getCryptoBackend();
  if (backend === "native") {
    var result = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      plaintext,
    );
    return new Uint8Array(result);
  }
  if (backend === "forge") {
    var cipher = forge.cipher.createCipher(
      "AES-GCM",
      key,
    );
    var ivStr = String.fromCharCode.apply(null, iv);
    cipher.start({ iv: ivStr, tagLength: 128 });
    cipher.update(
      forge.util.createBuffer(String.fromCharCode.apply(null, plaintext)),
    );
    cipher.finish();

    var encrypted = cipher.output.getBytes();
    var tag = cipher.mode.tag.getBytes();

    var combined = new Uint8Array(encrypted.length + tag.length);
    for (var i = 0; i < encrypted.length; i++) {
      combined[i] = encrypted.charCodeAt(i);
    }
    for (var j = 0; j < tag.length; j++) {
      combined[encrypted.length + j] = tag.charCodeAt(j);
    }
    return combined;
  }
  throw new Error("No crypto backend available");
}

/**
 * Decrypt ciphertext with AES-256-GCM.
 * @param {Uint8Array} ciphertext - ciphertext + 16-byte auth tag
 * @param {CryptoKey|string} key
 * @param {Uint8Array} iv - 12-byte nonce
 * @returns {Promise<Uint8Array>} plaintext
 * @throws {Error} On wrong password or corrupted data (GCM auth tag mismatch)
 */
async function vaultDecrypt(ciphertext, key, iv) {
  var backend = getCryptoBackend();
  if (backend === "native") {
    try {
      var result = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext,
      );
      return new Uint8Array(result);
    } catch (_) {
      throw new Error("Incorrect password or corrupted file.");
    }
  }
  if (backend === "forge") {
    // Split ciphertext and tag (last 16 bytes)
    var tagLength = 16;
    if (ciphertext.length < tagLength) {
      throw new Error("Incorrect password or corrupted file.");
    }
    var encBytes = ciphertext.slice(0, ciphertext.length - tagLength);
    var tagBytes = ciphertext.slice(ciphertext.length - tagLength);

    var encStr = String.fromCharCode.apply(null, encBytes);
    var tagStr = String.fromCharCode.apply(null, tagBytes);
    var ivStr = String.fromCharCode.apply(null, iv);

    var decipher = forge.cipher.createDecipher("AES-GCM", key);
    decipher.start({
      iv: ivStr,
      tagLength: 128,
      tag: forge.util.createBuffer(tagStr),
    });
    decipher.update(forge.util.createBuffer(encStr));
    var pass = decipher.finish();

    if (!pass) {
      throw new Error("Incorrect password or corrupted file.");
    }
    var output = decipher.output.getBytes();
    return new Uint8Array(
      output.split("").map(function (c) {
        return c.charCodeAt(0);
      }),
    );
  }
  throw new Error("No crypto backend available");
}

// =============================================================================
// BINARY FORMAT
// =============================================================================

/**
 * Serialize vault header + ciphertext into a single binary blob.
 * @param {Uint8Array} salt - 32 bytes
 * @param {Uint8Array} iv - 12 bytes
 * @param {number} iterations
 * @param {Uint8Array} ciphertext
 * @returns {Uint8Array}
 */
function serializeVaultFile(salt, iv, iterations, ciphertext) {
  var file = new Uint8Array(VAULT_HEADER_SIZE + ciphertext.length);
  // Magic bytes
  file.set(VAULT_MAGIC, 0);
  // Version
  file[7] = VAULT_VERSION;
  // Iterations (uint32 big-endian)
  file[8] = (iterations >>> 24) & 0xff;
  file[9] = (iterations >>> 16) & 0xff;
  file[10] = (iterations >>> 8) & 0xff;
  file[11] = iterations & 0xff;
  // Salt
  file.set(salt, 12);
  // IV
  file.set(iv, 44);
  // Ciphertext
  file.set(ciphertext, VAULT_HEADER_SIZE);
  return file;
}

/**
 * Parse a .stvault binary file into its components.
 * @param {Uint8Array} fileBytes
 * @returns {{salt: Uint8Array, iv: Uint8Array, iterations: number, ciphertext: Uint8Array}}
 * @throws {Error} On invalid format
 */
function parseVaultFile(fileBytes) {
  if (fileBytes.length < VAULT_HEADER_SIZE + 16) {
    throw new Error("Not a valid .stvault file.");
  }
  // Check magic bytes
  for (var i = 0; i < VAULT_MAGIC.length; i++) {
    if (fileBytes[i] !== VAULT_MAGIC[i]) {
      throw new Error("Not a valid .stvault file.");
    }
  }
  // Check version
  var version = fileBytes[7];
  if (version > VAULT_VERSION) {
    throw new Error(
      "Created by a newer StakTrakr version. Please update.",
    );
  }
  // Parse iterations
  var iterations =
    (fileBytes[8] << 24) |
    (fileBytes[9] << 16) |
    (fileBytes[10] << 8) |
    fileBytes[11];
  iterations = iterations >>> 0; // ensure unsigned

  var salt = fileBytes.slice(12, 44);
  var iv = fileBytes.slice(44, 56);
  var ciphertext = fileBytes.slice(VAULT_HEADER_SIZE);

  return {
    salt: salt,
    iv: iv,
    iterations: iterations,
    ciphertext: ciphertext,
  };
}

// =============================================================================
// DATA COLLECTION / RESTORATION
// =============================================================================

/**
 * Collect all localStorage data for vault export.
 * @returns {object|null} Payload object or null if empty
 */
function collectVaultData() {
  var payload = {
    _meta: {
      appVersion: typeof APP_VERSION !== "undefined" ? APP_VERSION : "unknown",
      exportTimestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    },
    data: {},
  };

  var hasData = false;

  for (var i = 0; i < ALLOWED_STORAGE_KEYS.length; i++) {
    var key = ALLOWED_STORAGE_KEYS[i];
    try {
      var val = localStorage.getItem(key);
      if (val !== null) {
        payload.data[key] = val;
        hasData = true;
      }
    } catch (e) {
      debugLog("Vault: could not read key", key, e);
    }
  }

  if (!hasData) return null;

  // Compute checksum of the data section
  var dataJson = JSON.stringify(payload.data);
  payload._meta.checksum = simpleHash(dataJson);

  return payload;
}

/**
 * Simple hash for integrity check (not cryptographic — just detects corruption).
 * @param {string} str
 * @returns {string}
 */
function simpleHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return "sh:" + (hash >>> 0).toString(16);
}

/**
 * Restore vault data into localStorage and refresh UI.
 * @param {object} payload - Decrypted vault payload
 */
function restoreVaultData(payload) {
  var data = payload.data;
  if (!data || typeof data !== "object") {
    throw new Error("Vault file appears corrupted.");
  }

  // Write each key to localStorage
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    // Only restore recognized keys
    if (ALLOWED_STORAGE_KEYS.indexOf(key) !== -1) {
      try {
        localStorage.setItem(key, data[key]);
      } catch (e) {
        debugLog("Vault: could not write key", key, e);
      }
    }
  }

  // Refresh the full UI
  try {
    if (typeof loadInventory === "function") loadInventory();
    if (typeof renderTable === "function") renderTable();
    if (typeof renderActiveFilters === "function") renderActiveFilters();
    if (typeof loadSpotHistory === "function") loadSpotHistory();
    if (typeof fetchSpotPrice === "function") fetchSpotPrice();
  } catch (e) {
    debugLog("Vault: UI refresh error", e);
  }
}

// =============================================================================
// PASSWORD STRENGTH
// =============================================================================

/**
 * Evaluate password strength.
 * @param {string} password
 * @returns {{score: number, label: string, color: string}}
 */
function getPasswordStrength(password) {
  if (!password || password.length < VAULT_MIN_PASSWORD_LENGTH) {
    return { score: 0, label: "Too short", color: "var(--danger)" };
  }
  var score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Cap at 4
  if (score > 4) score = 4;

  var labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
  var colors = [
    "var(--danger)",
    "var(--warning)",
    "var(--info)",
    "var(--success)",
    "var(--success)",
  ];

  return {
    score: score,
    label: labels[score],
    color: colors[score],
  };
}

// =============================================================================
// EXPORT FLOW
// =============================================================================

/**
 * Export an encrypted vault backup.
 * @param {string} password
 * @returns {Promise<void>}
 */
async function exportEncryptedBackup(password) {
  var backend = getCryptoBackend();
  if (!backend) {
    throw new Error(
      "Encryption not available. Use Chrome/Safari/Edge or serve via HTTP.",
    );
  }

  var payload = collectVaultData();
  if (!payload) {
    throw new Error("No data to export.");
  }

  debugLog("Vault: exporting with", backend, "backend");

  var enc = new TextEncoder();
  var plaintext = enc.encode(JSON.stringify(payload));

  var salt = vaultRandomBytes(32);
  var iv = vaultRandomBytes(12);

  var key = await vaultDeriveKey(password, salt, VAULT_PBKDF2_ITERATIONS);
  var ciphertext = await vaultEncrypt(plaintext, key, iv);
  var fileBytes = serializeVaultFile(salt, iv, VAULT_PBKDF2_ITERATIONS, ciphertext);

  // Download via Blob + anchor
  var blob = new Blob([fileBytes], { type: "application/octet-stream" });
  var url = URL.createObjectURL(blob);
  var timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  var a = document.createElement("a");
  a.href = url;
  a.download = "staktrakr_backup_" + timestamp + VAULT_FILE_EXTENSION;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  debugLog("Vault: export complete,", fileBytes.length, "bytes");
}

// =============================================================================
// IMPORT FLOW
// =============================================================================

/**
 * Import and decrypt a vault backup.
 * @param {Uint8Array} fileBytes
 * @param {string} password
 * @returns {Promise<void>}
 */
async function importEncryptedBackup(fileBytes, password) {
  var backend = getCryptoBackend();
  if (!backend) {
    throw new Error(
      "Encryption not available. Use Chrome/Safari/Edge or serve via HTTP.",
    );
  }

  if (fileBytes.length > VAULT_MAX_FILE_SIZE) {
    throw new Error("File exceeds 50MB limit.");
  }

  var parsed = parseVaultFile(fileBytes);

  debugLog(
    "Vault: importing with",
    backend,
    "backend,",
    parsed.iterations,
    "iterations",
  );

  var key = await vaultDeriveKey(
    password,
    parsed.salt,
    parsed.iterations,
  );
  var plainBytes = await vaultDecrypt(parsed.ciphertext, key, parsed.iv);

  var dec = new TextDecoder();
  var jsonStr = dec.decode(plainBytes);
  var payload;
  try {
    payload = JSON.parse(jsonStr);
  } catch (_) {
    throw new Error("Vault file appears corrupted.");
  }

  if (!payload || !payload.data) {
    throw new Error("Vault file appears corrupted.");
  }

  restoreVaultData(payload);
  debugLog("Vault: import complete");
}

// =============================================================================
// MODAL MANAGEMENT
// =============================================================================

/** @type {Uint8Array|null} Pending file bytes for import */
var _vaultPendingFile = null;

/**
 * Open the vault modal in export or import mode.
 * @param {'export'|'import'} mode
 * @param {File} [file] - File object for import mode
 */
function openVaultModal(mode, file) {
  var modal = safeGetElement("vaultModal");
  if (!modal) return;

  var titleEl = safeGetElement("vaultModalTitle");
  var passwordEl = safeGetElement("vaultPassword");
  var confirmRow = safeGetElement("vaultConfirmRow");
  var confirmEl = safeGetElement("vaultConfirmPassword");
  var strengthRow = safeGetElement("vaultStrengthRow");
  var fileInfoEl = safeGetElement("vaultFileInfo");
  var statusEl = safeGetElement("vaultStatus");
  var actionBtn = safeGetElement("vaultActionBtn");

  // Reset state
  if (passwordEl) passwordEl.value = "";
  if (confirmEl) confirmEl.value = "";
  if (statusEl) {
    statusEl.style.display = "none";
    statusEl.className = "encryption-status";
    statusEl.innerHTML = "";
  }

  // Update strength bar
  updateStrengthBar("");

  // Update match indicator
  updateMatchIndicator("", "");

  modal.setAttribute("data-vault-mode", mode);

  if (mode === "export") {
    if (titleEl) titleEl.textContent = "Export Encrypted Backup";
    if (confirmRow) confirmRow.style.display = "";
    if (strengthRow) strengthRow.style.display = "";
    if (fileInfoEl) fileInfoEl.style.display = "none";
    if (actionBtn) {
      actionBtn.textContent = "Export";
      actionBtn.className = "btn";
    }
    _vaultPendingFile = null;
  } else {
    if (titleEl) titleEl.textContent = "Import Encrypted Backup";
    if (confirmRow) confirmRow.style.display = "none";
    if (strengthRow) strengthRow.style.display = "none";
    if (fileInfoEl) {
      fileInfoEl.style.display = "";
      var nameSpan = safeGetElement("vaultFileName");
      var sizeSpan = safeGetElement("vaultFileSize");
      if (nameSpan && file) nameSpan.textContent = file.name;
      if (sizeSpan && file)
        sizeSpan.textContent = formatFileSize(file.size);
    }
    if (actionBtn) {
      actionBtn.textContent = "Import";
      actionBtn.className = "btn info";
    }

    // Read file bytes
    if (file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        _vaultPendingFile = new Uint8Array(e.target.result);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  openModalById("vaultModal");
}

/**
 * Close the vault modal and reset state.
 */
function closeVaultModal() {
  _vaultPendingFile = null;
  closeModalById("vaultModal");
}

/**
 * Handle the vault modal action button (export or import).
 */
async function handleVaultAction() {
  var modal = safeGetElement("vaultModal");
  if (!modal) return;

  var mode = modal.getAttribute("data-vault-mode");
  var passwordEl = safeGetElement("vaultPassword");
  var confirmEl = safeGetElement("vaultConfirmPassword");
  var statusEl = safeGetElement("vaultStatus");
  var actionBtn = safeGetElement("vaultActionBtn");

  var password = passwordEl ? passwordEl.value : "";

  // Validate password length
  if (password.length < VAULT_MIN_PASSWORD_LENGTH) {
    showVaultStatus(
      "error",
      "Password must be at least " + VAULT_MIN_PASSWORD_LENGTH + " characters.",
    );
    return;
  }

  if (mode === "export") {
    var confirm = confirmEl ? confirmEl.value : "";
    if (password !== confirm) {
      showVaultStatus("error", "Passwords do not match.");
      return;
    }

    // Check crypto backend
    if (!getCryptoBackend()) {
      showVaultStatus(
        "error",
        "Encryption not available. Use Chrome/Safari/Edge or serve via HTTP.",
      );
      return;
    }

    // Disable button, show progress
    if (actionBtn) actionBtn.disabled = true;
    showVaultStatus("info", "Encrypting\u2026");

    try {
      await exportEncryptedBackup(password);
      showVaultStatus("success", "Backup exported successfully.");
    } catch (err) {
      showVaultStatus("error", err.message || "Export failed.");
    } finally {
      if (actionBtn) actionBtn.disabled = false;
    }
  } else {
    // Import mode
    if (!_vaultPendingFile) {
      showVaultStatus("error", "No file loaded.");
      return;
    }

    if (!getCryptoBackend()) {
      showVaultStatus(
        "error",
        "Encryption not available. Use Chrome/Safari/Edge or serve via HTTP.",
      );
      return;
    }

    if (actionBtn) actionBtn.disabled = true;
    showVaultStatus("info", "Decrypting\u2026");

    try {
      await importEncryptedBackup(_vaultPendingFile, password);
      showVaultStatus("success", "Data restored successfully. Reloading\u2026");
      setTimeout(function () { location.reload(); }, 1200);
    } catch (err) {
      showVaultStatus("error", err.message || "Import failed.");
    } finally {
      if (actionBtn) actionBtn.disabled = false;
    }
  }
}

// =============================================================================
// MODAL HELPERS
// =============================================================================

/**
 * Show status message in the vault modal.
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} message
 */
function showVaultStatus(type, message) {
  var statusEl = safeGetElement("vaultStatus");
  if (!statusEl) return;

  statusEl.style.display = "";
  statusEl.className = "encryption-status";

  var dotClass = "status-" + type;
  var isAnimated = type === "info";

  // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
  statusEl.innerHTML =
    '<div class="status-indicator ' + dotClass + '">' +
    '<span class="status-dot' + (isAnimated ? " vault-dot-pulse" : "") + '"></span>' +
    '<span class="status-text">' + escapeHtml(message) + "</span>" +
    "</div>";
}

/**
 * Format file size in human-readable form.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * Update the password strength bar.
 * @param {string} password
 */
function updateStrengthBar(password) {
  var fillEl = safeGetElement("vaultStrengthFill");
  var textEl = safeGetElement("vaultStrengthText");
  if (!fillEl || !textEl) return;

  if (!password) {
    fillEl.style.width = "0%";
    fillEl.style.background = "transparent";
    textEl.textContent = "";
    return;
  }

  var strength = getPasswordStrength(password);
  var percent = ((strength.score + 1) / 5) * 100;
  if (strength.score === 0 && password.length < VAULT_MIN_PASSWORD_LENGTH) {
    percent = (password.length / VAULT_MIN_PASSWORD_LENGTH) * 20;
  }

  fillEl.style.width = percent + "%";
  fillEl.style.background = strength.color;
  textEl.textContent = strength.label;
  textEl.style.color = strength.color;
}

/**
 * Update the password match indicator.
 * @param {string} password
 * @param {string} confirm
 */
function updateMatchIndicator(password, confirm) {
  var matchEl = safeGetElement("vaultMatchIndicator");
  if (!matchEl) return;

  if (!confirm) {
    matchEl.textContent = "";
    matchEl.style.color = "";
    return;
  }

  if (password === confirm) {
    matchEl.textContent = "Passwords match";
    matchEl.style.color = "var(--success)";
  } else {
    matchEl.textContent = "Passwords do not match";
    matchEl.style.color = "var(--danger)";
  }
}

/**
 * Toggle password visibility for a field.
 * @param {string} inputId
 * @param {HTMLElement} toggleBtn
 */
function toggleVaultPasswordVisibility(inputId, toggleBtn) {
  var input = safeGetElement(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (toggleBtn) toggleBtn.textContent = "\u25C9"; // ◉
  } else {
    input.type = "password";
    if (toggleBtn) toggleBtn.textContent = "\u25CE"; // ◎
  }
}

// =============================================================================
// WINDOW EXPORTS
// =============================================================================

window.openVaultModal = openVaultModal;
window.closeVaultModal = closeVaultModal;
