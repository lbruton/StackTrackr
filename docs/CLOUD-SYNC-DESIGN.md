# Cloud Sync Architecture — Design Spec (Draft)

## Context

StakTrakr is a pure client-side app (vanilla JS, localStorage, `file://` compatible). As of v3.14.00, the `.stvault` encrypted backup feature provides manual portable backups via cloud drives (iCloud, Google Drive, Dropbox). This spec outlines the architecture for **automated cloud sync** — starting with Supabase, designed to support additional providers later.

**Goal**: Let users sync their StakTrakr data across devices without manual file management, while preserving the zero-backend, client-side-only architecture.

**Non-goals (for now)**: Real-time collaboration, multi-user shared inventories, row-level conflict resolution.

---

## Foundation: What We Already Have

The vault module (`js/vault.js`) provides the serialize/deserialize layer:

- **`collectVaultData()`** — reads all `ALLOWED_STORAGE_KEYS` into a JSON payload with metadata
- **`restoreVaultData(payload)`** — writes keys back to localStorage + refreshes UI
- **AES-256-GCM encryption** — password-based encryption with Web Crypto + forge.js fallback

These functions are provider-agnostic. Any sync adapter just needs to transport the JSON payload (optionally encrypted) to/from a remote store.

---

## Sync Strategy: Snapshot Sync (Phase 1)

**Full-state snapshot** — upload/download the entire app state as a single blob. Same approach as `.stvault` but automated.

| Pros | Cons |
|------|------|
| Simple to implement | Overwrites everything on each sync |
| No conflict resolution needed | Inefficient for large inventories |
| Reuses existing vault serialize/deserialize | No merge — last-write-wins |
| Works with any blob storage provider | |

**Why not row-level sync?** StakTrakr's data model is a flat JSON array in a single localStorage key (`LS_KEY`). Row-level sync would require: item-level timestamps, conflict resolution UI, and a relational schema on the server side. That's Phase 2+ complexity.

**Why not CRDTs?** Overkill for a single-user app syncing across their own devices. CRDTs solve multi-user concurrent editing — not our use case.

---

## Sync Adapter Interface

```javascript
// Each provider implements this interface
const SyncAdapter = {
  id: 'supabase',           // unique provider key
  name: 'Supabase Cloud',   // display name for settings UI

  // Auth
  authenticate(credentials) → Promise<{success, user, error}>
  signOut()                  → Promise<void>
  isAuthenticated()          → boolean

  // Sync
  push(payload)              → Promise<{success, timestamp, error}>
  pull()                     → Promise<{success, payload, timestamp, error}>
  getLastSyncTime()          → Promise<{timestamp}>

  // UI
  getAuthFields()            → [{id, label, type, placeholder}]  // dynamic form fields
  getStatusInfo()            → {connected, lastSync, userLabel}
};
```

The settings UI renders auth fields dynamically based on `getAuthFields()` — Supabase shows email/password, Nextcloud shows server URL + app password, etc.

---

## Provider Assessment

### Tier 1: Supabase (Start Here)

| Aspect | Details |
|--------|---------|
| **Integration** | Official CDN JS client (`@supabase/supabase-js@2`) — no build tools needed |
| **Auth** | Email/password, magic link, OAuth (Google, GitHub, etc.) |
| **Storage** | Supabase Storage — S3-compatible, upload/download Blobs via simple API |
| **CORS** | Works out of the box, including from `file://` protocol |
| **Cost** | Free tier: 1GB storage, 50K monthly active users, 2GB bandwidth |
| **Encryption** | Data encrypted at rest by Supabase; we add client-side AES-256-GCM on top |
| **Path** | `staktrakr-vaults/{userId}/vault.stvault` |

**Why Supabase first**: Zero CORS friction, official vanilla JS CDN, built-in auth, generous free tier, simplest path from concept to working feature.

### Tier 2: Nextcloud / Owncloud (Self-Hosted Option)

| Aspect | Details |
|--------|---------|
| **Protocol** | WebDAV — standard HTTP methods (PUT/GET/DELETE) on `remote.php/dav/files/USERNAME/` |
| **Auth** | App Passwords (recommended) with Basic Auth header, or OAuth2 |
| **CORS** | **Not supported by default** — requires WebAppPassword Nextcloud app or manual server config |
| **JS Libraries** | npm packages exist (`webdav`, `nextcloud-link`) but need bundlers; for vanilla JS, manual `fetch()` with WebDAV methods |
| **User setup** | User provides: server URL, username, app password |
| **Path** | `StakTrakr/vault.stvault` in user's Nextcloud files |

**Reality check**: CORS is the main friction point. Options:
1. User installs WebAppPassword app on their Nextcloud — enables CORS for our origin
2. We provide a tiny proxy script users can deploy alongside Nextcloud (PHP one-liner)
3. We document it as "advanced / self-hosted" with setup instructions

**Still valuable** — privacy-focused users (which overlap heavily with precious metals collectors) would appreciate this option.

### Tier 3: Generic WebDAV

Same as Nextcloud but for any WebDAV server. Would cover Owncloud, Seafile, and some NAS devices (Synology, QNAP) that expose WebDAV.

### Tier 4: S3-Compatible Storage

Direct S3/R2/MinIO/Backblaze B2 integration. "Enterprise Dropbox" — user provides endpoint, access key, secret key, bucket name. CORS must be configured on the bucket. Niche but powerful for technical users.

---

## Phase 1: Supabase Implementation (Estimated Scope)

### New Files

- **`js/sync.js`** — Sync orchestrator: adapter registry, sync scheduling, conflict detection (timestamp-based), status management
- **`js/sync-supabase.js`** — Supabase adapter implementing the SyncAdapter interface

### Files to Modify

- **`index.html`** — Supabase CDN script tag, sync UI in Settings > Cloud panel, sync status indicator in header
- **`js/constants.js`** — Supabase URL/anon key constants, new localStorage keys for sync state
- **`js/state.js`** / **`js/init.js`** / **`js/events.js`** — DOM refs, element lookups, event wiring
- **`css/styles.css`** — Sync status styles, auth form styles

### Settings > Cloud Panel (currently placeholder)

Transform the "Cloud Sync — Feature coming soon" placeholder into:
- Provider selector dropdown
- Dynamic auth form (email/password for Supabase)
- Sign up / Sign in / Sign out buttons
- Sync status: connected, last sync time, data size
- Manual "Sync Now" button
- Auto-sync toggle with interval setting

### Sync Flow

1. User opens Settings > Cloud, selects Supabase
2. Signs up or signs in with email/password
3. On first sync: uploads current state as encrypted `.stvault` blob to Supabase Storage
4. On subsequent syncs: compares local `lastModified` timestamp with remote — newer wins
5. Auto-sync option: syncs on page load and every N minutes
6. Manual "Sync Now" for on-demand push/pull

### Security Model

- Client-side AES-256-GCM encryption before upload (reuse vault encryption)
- Supabase Row Level Security: users can only access their own files
- Supabase anon key is public (safe) — auth tokens scoped per user
- Master password for encryption is separate from Supabase account password
- Master password never sent to Supabase — only encrypted blobs travel over the wire

### Open Questions

1. **Encryption password for sync**: Require a separate "sync encryption password" on first setup? Or reuse the vault export password? (If separate, need to store a password hint or salt locally)
2. **Conflict UI**: When remote is newer AND local has changes since last sync — show a merge prompt? Or always last-write-wins?
3. **Auto-sync frequency**: Every 5 minutes? On every data change? Configurable?
4. **Multiple devices**: If user has 3 devices, does each push overwrite? Need device ID tracking?
5. **Supabase project**: Who hosts the Supabase project — you (shared instance for all users) or each user brings their own?

---

## Phase 2+: Future Providers

Once the adapter interface is proven with Supabase:
- **Nextcloud adapter** — WebDAV PUT/GET with app password auth, documented CORS setup guide
- **Generic WebDAV adapter** — covers Owncloud, Seafile, NAS devices
- **S3 adapter** — for power users with their own buckets

Each adapter is a single JS file implementing the interface. The sync orchestrator and UI are shared.

---

## Verification Plan

1. Sign up for Supabase, sync inventory, verify blob appears in storage
2. Sign in on a different browser/device, pull data, verify full restore
3. Edit on device A, sync, pull on device B — verify changes propagate
4. Test with no internet — verify graceful degradation
5. Test wrong encryption password — verify clear error
6. Test Supabase free tier limits with realistic inventory sizes
7. Verify `file://` protocol compatibility with Supabase CDN client
