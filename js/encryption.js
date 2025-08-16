// STACKRTRACKR ENCRYPTION SYSTEM
// =============================================================================
// Master password encryption for all application data
// Encrypts: API keys, inventory data, settings, and all sensitive information
// BACKWARD COMPATIBLE: Gracefully handles existing unencrypted data

/**
 * Master Encryption Manager
 * Handles encryption/decryption of all application data with a single master password
 * Fully backward compatible with existing unencrypted installations
 */
class StackrTrackrEncryption {
  constructor() {
    this.isInitialized = false;
    this.masterKey = null;
    this.encryptedStoragePrefix = 'stackrtrackr_encrypted_';
    this.saltKey = 'stackrtrackr_master_salt';
    this.debugDecryption = false; // Set to true for debugging
    
    // Keys that should be encrypted when encryption is enabled
    this.protectedKeys = [
      'stackrtrackr.inventory',
      'stackrtrackr.spotPrices', 
      'stackrtrackr.settings',
      'catalog_api_config',
      'stackrtrackr.changeLog',
      'stackrtrackr.apiConfig',
      'stackrtrackr.api.keys', // Legacy API keys
      'stackrtrackr.metals.settings',
      'stackrtrackr.userPreferences'
    ];
    
    // Initialize encryption system
    this.init();
  }

  /**
   * Initialize the encryption system
   */
  async init() {
    try {
      // Check if master password has been set
      const hasMasterPassword = this.hasMasterPassword();
      
      if (hasMasterPassword && this.debugDecryption) {
        console.log('🔐 Encryption system initialized - master password exists');
      } else if (this.debugDecryption) {
        console.log('📝 Encryption system initialized - no master password (backward compatible mode)');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize encryption system:', error);
    }
  }

  /**
   * Check if a master password has been set
   */
  hasMasterPassword() {
    return localStorage.getItem(this.saltKey) !== null;
  }

  /**
   * Check if encryption is currently unlocked
   */
  isUnlocked() {
    return this.masterKey !== null;
  }

  /**
   * Generate cryptographic salt
   */
  generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive encryption key from password
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Set up master password for the first time
   */
  async setupMasterPassword(password) {
    try {
      if (this.hasMasterPassword()) {
        throw new Error('Master password already exists. Use changeMasterPassword() instead.');
      }

      const salt = this.generateSalt();
      const key = await this.deriveKey(password, salt);
      
      // Store salt
      localStorage.setItem(this.saltKey, salt);
      
      // Store verification token
      const verificationData = await this.encryptData('verification_token_stackrtrackr', key);
      localStorage.setItem(this.encryptedStoragePrefix + 'verification', verificationData);
      
      this.masterKey = key;
      
      if (this.debugDecryption) {
        console.log('✅ Master password set up successfully');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to setup master password:', error);
      return false;
    }
  }

  /**
   * Verify and unlock with master password
   */
  async unlockWithPassword(password) {
    try {
      const salt = localStorage.getItem(this.saltKey);
      if (!salt) {
        throw new Error('No master password set');
      }

      const key = await this.deriveKey(password, salt);
      
      // Verify password by decrypting verification token
      const verificationData = localStorage.getItem(this.encryptedStoragePrefix + 'verification');
      if (!verificationData) {
        throw new Error('Verification data not found');
      }

      const decrypted = await this.decryptData(verificationData, key);
      if (decrypted !== 'verification_token_stackrtrackr') {
        throw new Error('Invalid password');
      }

      this.masterKey = key;
      
      if (this.debugDecryption) {
        console.log('✅ Successfully unlocked with master password');
      }
      
      return true;
    } catch (error) {
      if (this.debugDecryption) {
        console.error('❌ Failed to unlock with password:', error);
      }
      return false;
    }
  }

  /**
   * Change master password (re-encrypt all data with new password)
   */
  async changeMasterPassword(oldPassword, newPassword) {
    try {
      // First verify old password
      const unlocked = await this.unlockWithPassword(oldPassword);
      if (!unlocked) {
        throw new Error('Invalid current password');
      }

      // Get all encrypted data
      const encryptedKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.encryptedStoragePrefix)
      );

      // Decrypt all data with old key
      const decryptedData = {};
      for (const storageKey of encryptedKeys) {
        const encryptedValue = localStorage.getItem(storageKey);
        const dataKey = storageKey.replace(this.encryptedStoragePrefix, '');
        try {
          decryptedData[dataKey] = await this.decryptData(encryptedValue, this.masterKey);
        } catch (error) {
          console.warn(`Failed to decrypt ${dataKey}:`, error);
        }
      }

      // Generate new salt and key
      const newSalt = this.generateSalt();
      const newKey = await this.deriveKey(newPassword, newSalt);

      // Re-encrypt all data with new key
      for (const [dataKey, decryptedValue] of Object.entries(decryptedData)) {
        if (dataKey !== 'verification') { // Skip verification, we'll create a new one
          const reencrypted = await this.encryptData(decryptedValue, newKey);
          localStorage.setItem(this.encryptedStoragePrefix + dataKey, reencrypted);
        }
      }

      // Update salt and verification
      localStorage.setItem(this.saltKey, newSalt);
      const newVerificationData = await this.encryptData('verification_token_stackrtrackr', newKey);
      localStorage.setItem(this.encryptedStoragePrefix + 'verification', newVerificationData);

      this.masterKey = newKey;

      if (this.debugDecryption) {
        console.log('✅ Master password changed successfully');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to change master password:', error);
      return false;
    }
  }

  /**
   * Encrypt data with the current master key
   */
  async encryptData(data, key = null) {
    const encryptionKey = key || this.masterKey;
    if (!encryptionKey) {
      throw new Error('No encryption key available');
    }

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data));
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      dataBytes
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt data with the current master key
   */
  async decryptData(encryptedData, key = null) {
    const decryptionKey = key || this.masterKey;
    if (!decryptionKey) {
      throw new Error('No decryption key available');
    }

    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      decryptionKey,
      encrypted
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decrypted);
    
    try {
      return JSON.parse(decryptedText);
    } catch {
      return decryptedText;
    }
  }

  /**
   * Store encrypted data
   */
  async storeEncrypted(key, data) {
    if (!this.masterKey) {
      throw new Error('Master key not available. Please unlock first.');
    }

    const encrypted = await this.encryptData(data);
    localStorage.setItem(this.encryptedStoragePrefix + key, encrypted);
    
    if (this.debugDecryption) {
      console.log(`🔐 Stored encrypted data for key: ${key}`);
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async retrieveDecrypted(key) {
    if (!this.masterKey) {
      throw new Error('Master key not available. Please unlock first.');
    }

    const encrypted = localStorage.getItem(this.encryptedStoragePrefix + key);
    if (!encrypted) {
      return null;
    }

    const decrypted = await this.decryptData(encrypted);
    
    if (this.debugDecryption) {
      console.log(`🔓 Retrieved decrypted data for key: ${key}`);
    }
    
    return decrypted;
  }

  /**
   * Check if the system is unlocked
   */
  isUnlocked() {
    return this.masterKey !== null;
  }

  /**
   * Lock the system (clear master key from memory)
   */
  lock() {
    this.masterKey = null;
    if (this.debugDecryption) {
      console.log('🔒 System locked');
    }
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled) {
    this.debugDecryption = enabled;
    console.log(`🐛 Debug decryption mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Migrate existing unencrypted data to encrypted storage
   */
  async migrateExistingData() {
    if (!this.isUnlocked()) {
      throw new Error('System must be unlocked to migrate data');
    }

    const keysToMigrate = [
      'stackrtrackr.inventory',
      'stackrtrackr.spotPrices',
      'stackrtrackr.api.config',
      'catalog_api_config',
      'stackrtrackr.settings',
      'stackrtrackr.changeLog'
    ];

    let migrated = 0;
    for (const key of keysToMigrate) {
      const existingData = localStorage.getItem(key);
      if (existingData) {
        try {
          const parsedData = JSON.parse(existingData);
          await this.storeEncrypted(key.replace('stackrtrackr.', ''), parsedData);
          localStorage.removeItem(key); // Remove unencrypted version
          migrated++;
          
          if (this.debugDecryption) {
            console.log(`✅ Migrated ${key} to encrypted storage`);
          }
        } catch (error) {
          console.warn(`Failed to migrate ${key}:`, error);
        }
      }
    }

    if (this.debugDecryption) {
      console.log(`✅ Migration complete: ${migrated} items encrypted`);
    }

    return migrated;
  }

  /**
   * Emergency decrypt all data (for debugging)
   */
  async emergencyDecryptAll() {
    if (!this.debugDecryption) {
      console.warn('⚠️ Debug mode must be enabled for emergency decryption');
      return {};
    }

    if (!this.isUnlocked()) {
      throw new Error('System must be unlocked for emergency decryption');
    }

    const encryptedKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.encryptedStoragePrefix)
    );

    const allData = {};
    for (const storageKey of encryptedKeys) {
      const dataKey = storageKey.replace(this.encryptedStoragePrefix, '');
      try {
        allData[dataKey] = await this.retrieveDecrypted(dataKey);
      } catch (error) {
        console.warn(`Failed to decrypt ${dataKey}:`, error);
        allData[dataKey] = 'DECRYPTION_FAILED';
      }
    }

    console.log('🚨 EMERGENCY DECRYPTION - ALL DATA:', allData);
    return allData;
  }

  /**
   * BACKWARD COMPATIBLE: Store data securely (encrypt if unlocked, plain if not)
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   */
  async secureStore(key, data) {
    try {
      const jsonData = JSON.stringify(data);
      
      if (this.isUnlocked() && this.protectedKeys.includes(key)) {
        // Encrypt the data
        const encrypted = await this.storeEncrypted(key, jsonData);
        
        if (this.debugDecryption) {
          console.log(`🔐 Stored encrypted: ${key}`);
        }
        
        return encrypted;
      } else {
        // Store unencrypted for backward compatibility
        localStorage.setItem(key, jsonData);
        
        if (this.debugDecryption) {
          console.log(`📝 Stored unencrypted: ${key}`);
        }
        
        return true;
      }
    } catch (error) {
      console.error(`Failed to securely store ${key}:`, error);
      throw error;
    }
  }

  /**
   * BACKWARD COMPATIBLE: Retrieve data (decrypt if encrypted, plain if not)
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   */
  async secureRetrieve(key, defaultValue = null) {
    try {
      // First check if there's encrypted data
      const encryptedKey = this.encryptedStoragePrefix + key;
      const encryptedData = localStorage.getItem(encryptedKey);
      
      if (encryptedData) {
        // This is encrypted data
        if (!this.isUnlocked()) {
          throw new Error(`Cannot decrypt ${key}: encryption not unlocked`);
        }
        
        const decrypted = await this.retrieveDecrypted(key);
        
        if (this.debugDecryption) {
          console.log(`🔓 Retrieved encrypted: ${key}`);
        }
        
        return JSON.parse(decrypted);
      } else {
        // Check for unencrypted data (backward compatibility)
        const plainData = localStorage.getItem(key);
        
        if (plainData) {
          if (this.debugDecryption) {
            console.log(`📖 Retrieved unencrypted: ${key}`);
          }
          
          return JSON.parse(plainData);
        }
      }
      
      // Nothing found
      return defaultValue;
    } catch (error) {
      console.error(`Failed to securely retrieve ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Migrate existing unencrypted data to encrypted storage
   */
  async migrateToEncrypted() {
    if (!this.isUnlocked()) {
      throw new Error('Encryption must be unlocked to migrate data');
    }

    try {
      let migratedCount = 0;
      
      for (const key of this.protectedKeys) {
        const plainData = localStorage.getItem(key);
        const encryptedKey = this.encryptedStoragePrefix + key;
        const encryptedExists = localStorage.getItem(encryptedKey);
        
        // Only migrate if there's plain data and no encrypted version exists
        if (plainData && !encryptedExists) {
          try {
            // Encrypt the existing data
            await this.storeEncrypted(key, plainData);
            
            // Remove the plain version
            localStorage.removeItem(key);
            
            migratedCount++;
            
            if (this.debugDecryption) {
              console.log(`🔄 Migrated to encrypted: ${key}`);
            }
          } catch (error) {
            console.warn(`Failed to migrate ${key}:`, error);
          }
        }
      }
      
      if (this.debugDecryption) {
        console.log(`✅ Migration complete: ${migratedCount} items encrypted`);
      }
      
      return migratedCount;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if specific key has encrypted data
   * @param {string} key - Key to check
   */
  hasEncryptedData(key) {
    const encryptedKey = this.encryptedStoragePrefix + key;
    return localStorage.getItem(encryptedKey) !== null;
  }

  /**
   * Check if specific key has unencrypted data
   * @param {string} key - Key to check  
   */
  hasUnencryptedData(key) {
    const encryptedKey = this.encryptedStoragePrefix + key;
    const hasEncrypted = localStorage.getItem(encryptedKey) !== null;
    const hasPlain = localStorage.getItem(key) !== null;
    
    return hasPlain && !hasEncrypted;
  }

  /**
   * Get encryption status for all protected keys
   */
  getDataStatus() {
    const status = {
      encrypted: [],
      unencrypted: [], 
      missing: []
    };
    
    for (const key of this.protectedKeys) {
      if (this.hasEncryptedData(key)) {
        status.encrypted.push(key);
      } else if (this.hasUnencryptedData(key)) {
        status.unencrypted.push(key);
      } else {
        status.missing.push(key);
      }
    }
    
    return status;
  }

  /**
   * Emergency disable encryption (decrypt all data back to plain storage)
   * WARNING: This will leave all data unencrypted
   */
  async emergencyDisableEncryption(password) {
    try {
      // Verify password first
      const unlocked = await this.unlockWithPassword(password);
      if (!unlocked) {
        throw new Error('Invalid password');
      }

      // Decrypt all encrypted data back to plain storage
      for (const key of this.protectedKeys) {
        if (this.hasEncryptedData(key)) {
          const decrypted = await this.retrieveDecrypted(key);
          localStorage.setItem(key, decrypted);
          
          // Remove encrypted version
          const encryptedKey = this.encryptedStoragePrefix + key;
          localStorage.removeItem(encryptedKey);
        }
      }

      // Remove encryption setup
      localStorage.removeItem(this.saltKey);
      localStorage.removeItem(this.encryptedStoragePrefix + 'verification');
      
      // Reset state
      this.masterKey = null;

      if (this.debugDecryption) {
        console.log('🚨 EMERGENCY: Encryption disabled, all data decrypted to plain storage');
      }

      return true;
    } catch (error) {
      console.error('Emergency disable failed:', error);
      return false;
    }
  }
}

// Global encryption manager instance
const encryptionManager = new StackrTrackrEncryption();

// Master Password UI Manager
class MasterPasswordUI {
  constructor() {
    this.encryption = encryptionManager;
    this.initializeEventListeners();
    this.updateUI();
  }

  initializeEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      // Setup encryption
      const setupBtn = document.getElementById('setupEncryptionBtn');
      if (setupBtn) {
        setupBtn.addEventListener('click', () => this.setupEncryption());
      }

      // Unlock encryption
      const unlockBtn = document.getElementById('unlockEncryptionBtn');
      if (unlockBtn) {
        unlockBtn.addEventListener('click', () => this.unlockEncryption());
      }

      // Lock encryption
      const lockBtn = document.getElementById('lockEncryptionBtn');
      if (lockBtn) {
        lockBtn.addEventListener('click', () => this.lockEncryption());
      }

      // Change password
      const changePasswordBtn = document.getElementById('showChangePasswordBtn');
      if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => this.showChangePassword());
      }

      const changePasswordConfirmBtn = document.getElementById('changePasswordConfirmBtn');
      if (changePasswordConfirmBtn) {
        changePasswordConfirmBtn.addEventListener('click', () => this.changePassword());
      }

      const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
      if (cancelChangePasswordBtn) {
        cancelChangePasswordBtn.addEventListener('click', () => this.hideChangePassword());
      }

      // Migrate data
      const migrateBtn = document.getElementById('migrateAllDataBtn');
      if (migrateBtn) {
        migrateBtn.addEventListener('click', () => this.migrateData());
      }

      // Emergency disable
      const emergencyBtn = document.getElementById('emergencyDisableBtn');
      if (emergencyBtn) {
        emergencyBtn.addEventListener('click', () => this.emergencyDisable());
      }

      // Enter key handlers
      ['masterPassword', 'confirmMasterPassword', 'unlockPassword'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              if (id === 'unlockPassword') {
                this.unlockEncryption();
              } else if (id === 'confirmMasterPassword') {
                this.setupEncryption();
              }
            }
          });
        }
      });

      this.updateUI();
    });
  }

  updateUI() {
    setTimeout(() => {
      const hasPassword = this.encryption.hasMasterPassword();
      const isUnlocked = this.encryption.isUnlocked();

      // Update status indicator
      const statusIndicator = document.getElementById('encryptionStatusIndicator');
      const statusText = document.getElementById('encryptionStatusText');
      
      if (statusIndicator && statusText) {
        if (!hasPassword) {
          statusIndicator.className = 'status-indicator status-warning';
          statusText.textContent = 'Unencrypted (setup encryption for security)';
        } else if (isUnlocked) {
          statusIndicator.className = 'status-indicator status-success';
          statusText.textContent = 'Encrypted and unlocked';
        } else {
          statusIndicator.className = 'status-indicator status-error';
          statusText.textContent = 'Encrypted but locked (enter password)';
        }
      }

      // Show/hide appropriate sections
      const setupSection = document.getElementById('encryptionSetup');
      const unlockSection = document.getElementById('encryptionUnlock');
      const managementSection = document.getElementById('encryptionManagement');

      if (setupSection) setupSection.style.display = !hasPassword ? 'block' : 'none';
      if (unlockSection) unlockSection.style.display = hasPassword && !isUnlocked ? 'block' : 'none';
      if (managementSection) managementSection.style.display = hasPassword && isUnlocked ? 'block' : 'none';

      // Update data status if encryption is unlocked
      if (isUnlocked) {
        this.updateDataStatus();
      }
    }, 100);
  }

  updateDataStatus() {
    const dataStatusEl = document.getElementById('dataStatus');
    const migrateBtn = document.getElementById('migrateAllDataBtn');
    
    if (!dataStatusEl) return;

    const status = this.encryption.getDataStatus();
    let html = '<div class="data-status-grid">';
    
    if (status.encrypted.length > 0) {
      html += `<div class="status-item status-success">✅ Encrypted: ${status.encrypted.length} items</div>`;
    }
    
    if (status.unencrypted.length > 0) {
      html += `<div class="status-item status-warning">⚠️ Unencrypted: ${status.unencrypted.length} items</div>`;
      if (migrateBtn) migrateBtn.style.display = 'inline-block';
    } else {
      if (migrateBtn) migrateBtn.style.display = 'none';
    }
    
    if (status.missing.length > 0) {
      html += `<div class="status-item status-info">ℹ️ No data: ${status.missing.length} items</div>`;
    }
    
    html += '</div>';
    dataStatusEl.innerHTML = html;
  }

  async setupEncryption() {
    const masterPassword = document.getElementById('masterPassword')?.value;
    const confirmPassword = document.getElementById('confirmMasterPassword')?.value;

    if (!masterPassword || !confirmPassword) {
      alert('Please enter and confirm your master password');
      return;
    }

    if (masterPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (masterPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    const setupBtn = document.getElementById('setupEncryptionBtn');
    if (setupBtn) {
      setupBtn.textContent = 'Setting up...';
      setupBtn.disabled = true;
    }

    try {
      const success = await this.encryption.setupMasterPassword(masterPassword);
      if (success) {
        // Clear password inputs
        document.getElementById('masterPassword').value = '';
        document.getElementById('confirmMasterPassword').value = '';
        
        alert('✅ Encryption setup complete! Your data will now be encrypted.');
        this.updateUI();
      } else {
        alert('❌ Failed to setup encryption');
      }
    } catch (error) {
      alert('❌ Error setting up encryption: ' + error.message);
    } finally {
      if (setupBtn) {
        setupBtn.textContent = '🔐 Enable Encryption';
        setupBtn.disabled = false;
      }
    }
  }

  async unlockEncryption() {
    const password = document.getElementById('unlockPassword')?.value;

    if (!password) {
      alert('Please enter your master password');
      return;
    }

    const unlockBtn = document.getElementById('unlockEncryptionBtn');
    if (unlockBtn) {
      unlockBtn.textContent = 'Unlocking...';
      unlockBtn.disabled = true;
    }

    try {
      const success = await this.encryption.unlockWithPassword(password);
      if (success) {
        // Clear password input
        document.getElementById('unlockPassword').value = '';
        
        this.updateUI();
      } else {
        alert('❌ Invalid password');
      }
    } catch (error) {
      alert('❌ Error unlocking encryption: ' + error.message);
    } finally {
      if (unlockBtn) {
        unlockBtn.textContent = '🔓 Unlock';
        unlockBtn.disabled = false;
      }
    }
  }

  lockEncryption() {
    this.encryption.masterKey = null;
    this.updateUI();
  }

  showChangePassword() {
    const changeSection = document.getElementById('changePasswordSection');
    if (changeSection) {
      changeSection.style.display = 'block';
    }
  }

  hideChangePassword() {
    const changeSection = document.getElementById('changePasswordSection');
    if (changeSection) {
      changeSection.style.display = 'none';
      // Clear inputs
      ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
    }
  }

  async changePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmNewPassword = document.getElementById('confirmNewPassword')?.value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      alert('New password must be at least 8 characters long');
      return;
    }

    const changeBtn = document.getElementById('changePasswordConfirmBtn');
    if (changeBtn) {
      changeBtn.textContent = 'Changing...';
      changeBtn.disabled = true;
    }

    try {
      const success = await this.encryption.changeMasterPassword(currentPassword, newPassword);
      if (success) {
        alert('✅ Password changed successfully!');
        this.hideChangePassword();
      } else {
        alert('❌ Failed to change password - check your current password');
      }
    } catch (error) {
      alert('❌ Error changing password: ' + error.message);
    } finally {
      if (changeBtn) {
        changeBtn.textContent = '🔄 Change Password';
        changeBtn.disabled = false;
      }
    }
  }

  async migrateData() {
    if (!confirm('This will encrypt all your existing unencrypted data. Continue?')) {
      return;
    }

    const migrateBtn = document.getElementById('migrateAllDataBtn');
    if (migrateBtn) {
      migrateBtn.textContent = 'Migrating...';
      migrateBtn.disabled = true;
    }

    try {
      const count = await this.encryption.migrateToEncrypted();
      alert(`✅ Successfully encrypted ${count} data items`);
      this.updateDataStatus();
    } catch (error) {
      alert('❌ Error migrating data: ' + error.message);
    } finally {
      if (migrateBtn) {
        migrateBtn.textContent = '📦 Migrate All Data';
        migrateBtn.disabled = false;
      }
    }
  }

  async emergencyDisable() {
    const password = prompt('⚠️ EMERGENCY DISABLE: This will decrypt ALL data back to unencrypted storage.\n\nEnter your master password to confirm:');
    
    if (!password) return;

    if (!confirm('🚨 FINAL WARNING: This will permanently disable encryption and leave all your data unencrypted. Are you absolutely sure?')) {
      return;
    }

    try {
      const success = await this.encryption.emergencyDisableEncryption(password);
      if (success) {
        alert('🚨 Encryption disabled. All data is now unencrypted.');
        this.updateUI();
      } else {
        alert('❌ Failed to disable encryption - check your password');
      }
    } catch (error) {
      alert('❌ Error disabling encryption: ' + error.message);
    }
  }
}

// Initialize UI when available
const masterPasswordUI = new MasterPasswordUI();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.encryptionManager = encryptionManager;
  window.StackrTrackrEncryption = StackrTrackrEncryption;
}
