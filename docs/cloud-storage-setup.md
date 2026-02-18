# Cloud Storage OAuth Setup Guide

## Architecture Overview

```
Browser (SPA)                 Cloudflare Pages          Cloud Provider
─────────────────────────────────────────────────────────────────────
1. User clicks Connect  ──►  oauth-callback.html  ──►  Auth screen
2. User approves        ◄──  postMessage(code)    ◄──  Redirect + code
3. Exchange code        ──►  /api/token-exchange   ──►  Token endpoint
4. Receive token        ◄──  { access_token }     ◄──  Token response
```

**Dropbox** supports PKCE — the browser exchanges the code directly, no secret needed.

**pCloud and Box** require a `client_secret` for the token exchange. A Cloudflare Pages Function (serverless worker) proxies that step so the secret never reaches the browser.

## 1. Register OAuth Apps

### Dropbox

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click **Create app**
3. Choose **Scoped access** → **Full Dropbox** (or App folder)
4. Name: `StakTrakr`
5. Under **Settings → OAuth 2**:
   - Add redirect URI: `https://staktrakr.com/oauth-callback.html`
   - Set **Allow public clients (implicit grant & PKCE)**: Yes
   - Access token expiration: **Short-lived** (enables refresh tokens)
6. Under **Permissions**, enable: `files.content.write`, `files.content.read`
7. Copy the **App key** (this is the client ID)
8. No client secret needed (PKCE flow)

### pCloud

1. Go to [pCloud Developer Portal](https://docs.pcloud.com/methods/oauth_apps/)
2. Register a new app
3. Set redirect URI: `https://staktrakr.com/oauth-callback.html`
4. Copy the **Client ID** and **Client Secret**
5. pCloud tokens are lifetime (no refresh needed)

### Box

1. Go to [Box Developer Console](https://app.box.com/developers/console)
2. Click **Create New App** → **Custom App** → **User Authentication (OAuth 2.0)**
3. Name: `StakTrakr`
4. Under **Configuration**:
   - Add redirect URI: `https://staktrakr.com/oauth-callback.html`
   - Application Scopes: enable **Read and write all files and folders**
5. Copy the **Client ID** and **Client Secret**

## 2. Deploy on Cloudflare Pages

The site is a static SPA hosted on Cloudflare Pages. The `oauth-callback.html` is just another static file — no special handling needed for it. The token-exchange proxy is a Cloudflare Pages Function.

### Static site setup

```bash
# In Cloudflare dashboard → Pages → Create a project
# Connect your GitHub repo, set:
#   Build command: (none)
#   Build output directory: /  (root of repo)
#   Branch: main
```

The custom domain `staktrakr.com` points to this Pages project via DNS (CNAME).

### Token exchange worker (Pages Function)

Create `functions/api/token-exchange.js` in the repo root. Cloudflare Pages auto-deploys anything in `functions/` as serverless endpoints.

```js
// functions/api/token-exchange.js
export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await request.json();
  const { provider, code, redirect_uri, code_verifier } = body;

  const configs = {
    pcloud: {
      tokenUrl: 'https://api.pcloud.com/oauth2_token',
      clientId: env.PCLOUD_CLIENT_ID,
      clientSecret: env.PCLOUD_CLIENT_SECRET,
    },
    box: {
      tokenUrl: 'https://api.box.com/oauth2/token',
      clientId: env.BOX_CLIENT_ID,
      clientSecret: env.BOX_CLIENT_SECRET,
    },
  };

  const config = configs[provider];
  if (!config) {
    return new Response(JSON.stringify({ error: 'Unknown provider' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri,
  });

  if (code_verifier) params.set('code_verifier', code_verifier);

  const resp = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await resp.json();

  return new Response(JSON.stringify(data), {
    status: resp.ok ? 200 : 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://staktrakr.com',
    },
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://staktrakr.com',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### Set secrets in Cloudflare

```bash
# Via Cloudflare dashboard:
#   Pages project → Settings → Environment variables
#   Add these as encrypted (Production + Preview):

PCLOUD_CLIENT_ID=<from pCloud>
PCLOUD_CLIENT_SECRET=<from pCloud>
BOX_CLIENT_ID=<from Box>
BOX_CLIENT_SECRET=<from Box>
```

These are **never** exposed to the browser. The Pages Function runs server-side.

**Do NOT put secrets in GitHub** — use Cloudflare's environment variables exclusively.

## 3. Update `cloud-storage.js` for the Proxy

For pCloud and Box, the token exchange in `cloud-storage.js` must go through the worker instead of directly to the provider. Update the `message` event listener's token exchange:

```js
// In the postMessage listener, replace the direct fetch for pCloud/Box:
var config = CLOUD_PROVIDERS[provider];

if (provider === 'dropbox') {
  // Dropbox: direct PKCE exchange (no secret needed)
  fetch(config.tokenUrl, { method: 'POST', headers: {...}, body: body })
    .then(...)
} else {
  // pCloud, Box: proxy through Cloudflare worker
  fetch('https://staktrakr.com/api/token-exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: provider,
      code: code,
      redirect_uri: CLOUD_REDIRECT_URI,
    }),
  })
    .then(...)
}
```

The same proxy pattern applies to Box token **refresh** calls.

## 4. Checklist

| Step | Where | Secret needed? |
|------|-------|---------------|
| Register Dropbox app | Dropbox App Console | No (PKCE, app key only) |
| Register pCloud app | pCloud Developer Portal | Yes → Cloudflare env var |
| Register Box app | Box Developer Console | Yes → Cloudflare env var |
| Deploy static site | Cloudflare Pages (GitHub integration) | -- |
| Add `functions/api/token-exchange.js` | Repo root | -- |
| Set `PCLOUD_CLIENT_*` env vars | Cloudflare Pages → Settings | Encrypted |
| Set `BOX_CLIENT_*` env vars | Cloudflare Pages → Settings | Encrypted |
| Update redirect URIs | Each provider console | -- |
| Update client IDs in `cloud-storage.js` | Replace `TODO_REPLACE_*` placeholders | Public (safe) |
| Update token exchange to use proxy | `cloud-storage.js` message listener | -- |

## 5. Testing Locally

OAuth redirects require the registered redirect URI. For local testing:

1. Add `https://localhost:8788/oauth-callback.html` as a second redirect URI in each provider
2. Run Cloudflare Pages locally: `npx wrangler pages dev . --port 8788`
3. Set environment variables in a `.dev.vars` file (gitignored):

```
PCLOUD_CLIENT_ID=xxx
PCLOUD_CLIENT_SECRET=xxx
BOX_CLIENT_ID=xxx
BOX_CLIENT_SECRET=xxx
```

## Security Notes

- Client IDs are public and safe to commit — they identify the app but can't authenticate without PKCE or a secret
- Client secrets live only in Cloudflare environment variables, never in the repo
- All vault data is encrypted client-side before upload — cloud providers see only opaque blobs
- Tokens stored in localStorage are scoped to the user's browser; `cleanupStorage()` respects the allowlist
- The token exchange worker restricts CORS to `https://staktrakr.com`
