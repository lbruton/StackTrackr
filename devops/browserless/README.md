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

Check the health endpoint — it responds without requiring the auth token:

```sh
curl http://localhost:3000/health
```

Or open the API docs in a browser (token required in URL):

```
http://localhost:3000/docs?token=local_dev_token
```

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
