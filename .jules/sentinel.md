# Sentinel's Journal

## 2025-05-24 - [Secure Token Exchange]
**Vulnerability:** Client-side OAuth configuration for pCloud and Box was pointing directly to provider APIs, which require a `client_secret` that cannot be safely stored in the client. This would lead to failed authentication or potential secret leakage if developers tried to "fix" it by embedding secrets.
**Learning:** Even with a proxy function available, client configuration drift can render it unused. Ensure client and server components are strictly coupled for sensitive flows like OAuth.
**Prevention:** Use relative paths (e.g., `/api/token-exchange`) in client configuration by default to force usage of the backend proxy. Add validation in the proxy to ensure it handles all required grant types (like `refresh_token`).
