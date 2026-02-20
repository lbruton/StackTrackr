# Browserless — Self-Hosted Headless Chrome

Browserless provides a self-hosted headless Chromium instance for running scripted Playwright tests locally. It exposes a WebSocket endpoint that Playwright connects to instead of launching a local browser process.

## Backend split

| Backend | Used for | Config |
|---|---|---|
| `browserless` (this service) | Scripted Playwright specs | `BROWSER_BACKEND=browserless` |
| Browserbase (cloud) | Natural-language Stagehand / MCP flows | `BROWSER_BACKEND=browserbase` |

## Start the service

```sh
cp .env.example .env
docker compose up -d
```

## Verify

Navigate to `http://localhost:3000/docs` — the Browserless API docs page should load, confirming the service is healthy and the token is accepted.

## Stop the service

```sh
docker compose down
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `BROWSERLESS_TOKEN` | `local_dev_token` | Auth token required in Playwright `wsEndpoint` URL |
| `CONCURRENT` | `5` | Max simultaneous browser sessions |
| `QUEUED` | `10` | Max queued sessions before rejection |
| `TIMEOUT` | `120000` | Session timeout in milliseconds |
