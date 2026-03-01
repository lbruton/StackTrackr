# Cloud Settings Redesign + Unified Encryption

**Date:** 2026-02-23
**Status:** Approved — ready for implementation

---

## Problem

The Cloud settings panel is too tall and spread out (fills the entire modal). Buttons have an
old Bootstrap-influenced look. The encryption mode selector adds unnecessary complexity. The
current "Simple" mode is not zero-knowledge to Dropbox (key = `account_id` alone, which
Dropbox knows).

---

## Goals

1. Compact Dropbox card to ≤400px tall with Option A layout
2. Move all configuration actions to an Advanced sub-modal
3. Replace all cloud-section buttons with the app's modern pill-style `btn` classes
4. Unify encryption into one mode — zero-knowledge to Dropbox, persistent across sessions
5. Remove the encryption mode selector entirely

---

## UI Design

### Main Card (always visible, connected state)

```
┌─────────────────────────────────────┐
│ ☁ Dropbox          ● Connected      │
│ user@email.com     Last sync: 2m ago│
├─────────────────────────────────────┤
│ Auto-sync  ────────────────── [on]  │
├─────────────────────────────────────┤
│ [↻ Sync Now]          [⚙ Advanced]  │
└─────────────────────────────────────┘
```

### Main Card (disconnected state)

```
┌─────────────────────────────────────┐
│ ☁ Dropbox          ○ Not connected  │
├─────────────────────────────────────┤
│         [Connect Dropbox]           │
└─────────────────────────────────────┘
```

### Advanced Sub-Modal ("Dropbox Settings")

Opens as a modal overlay using the existing modal pattern (`openModalById`). Contains:

- **Backup Now** — manual push to Dropbox
- **Restore** — pull from Dropbox
- **Disconnect** — revokes OAuth, clears local tokens (destructive — confirm prompt)
- **Change Vault Password** — re-derives key with new password, re-encrypts vault, saves
- **Sync History** — last local snapshot card (date, items, version)
- **View Sync Log** — opens log modal
- **Disclaimer** — "Backups stored in /StakTrakr on your Dropbox. If you forget your vault
  password, backups cannot be recovered."

---

## Encryption Architecture

### Key Derivation

```
key = PBKDF2(vault_password + ':' + dropbox_account_id, salt, 600_000_iterations)
```

- `vault_password` — user-chosen, stored in localStorage as `cloud_vault_password`
- `dropbox_account_id` — obtained at OAuth, stored in localStorage as `cloud_dropbox_account_id`
- The **derived key is never stored** — re-derived fresh each session from the two inputs

### Security Model

- **Zero-knowledge to Dropbox:** Dropbox stores the encrypted blob and knows `account_id`,
  but without `vault_password` cannot derive the key or decrypt the vault.
- **Local device:** Both inputs are in localStorage. If the device is compromised, the vault
  can be decrypted — but the threat model is cloud-provider snooping, not local device
  compromise. (A local attacker could also export to CSV directly.)
- **At-rest encryption on Dropbox servers:** ✅ Genuine protection against provider access.

### Session Flow

| Scenario | Behaviour |
|---|---|
| Returning user, same device | Both values in localStorage → auto-derive key, no prompt |
| New device / localStorage cleared | After OAuth, prompt "Enter vault password" → store → auto-derive |
| First-ever connection | After OAuth, prompt "Set a vault password" → store → derive |
| Change password | Advanced sub-modal → re-encrypt vault → update `cloud_vault_password` |

### Migration from Old Modes

On first unlock after update:
1. Try new key (`PBKDF2(vault_password + account_id)`) — if localStorage password exists
2. If vault can't be decrypted, fall back silently to old Simple key (`SALT:account_id`)
3. If old key works: re-encrypt with new key, prompt user to set a password, store it
4. Old Secure mode users: they already have a password → store it as `cloud_vault_password`
   on their next successful manual entry

---

## Storage Keys

New key to add to `ALLOWED_STORAGE_KEYS` in `js/constants.js`:

- `cloud_vault_password` — the user's vault password (replaces session-only cache)

Existing keys retained:
- `cloud_dropbox_account_id`
- `cloud_sync_mode` — can be removed after migration (no longer used)

---

## Code Impact

| File | Change |
|---|---|
| `index.html` | Compact card HTML, Advanced sub-modal HTML, remove mode selector |
| `js/cloud-sync.js` | Unified `getSyncPasswordSilent()`, migration logic, `changeVaultPassword()` |
| `js/constants.js` | Add `cloud_vault_password` to `ALLOWED_STORAGE_KEYS`, remove `STAKTRAKR_SIMPLE_SALT` |
| `css/styles.css` | Compact card styles (if needed beyond inline) |

---

## Out of Scope

- Header customization (add Backup/Restore as optional header menu item) — future work
- StakTrakr Cloud provider (Coming Soon card) — unchanged
- Manual backup/restore for users who want no cloud storage — already works via existing flow
