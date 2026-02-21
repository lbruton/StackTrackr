# Firecrawl Docker

Self-hosted [Firecrawl](https://github.com/firecrawl/firecrawl) instance using pre-built images.
Runs the full scraping/crawling API locally — no cloud API credits needed.

## Services

| Service | Purpose |
|---------|---------|
| `api` | Firecrawl HTTP API on port 3002 |
| `worker` | Background job processor |
| `playwright-service` | Headless browser for JS-rendered pages |
| `redis` | Queue and rate-limit storage |
| `rabbitmq` | Job queue broker |
| `nuq-postgres` | PostgreSQL + pg_cron (built locally from `nuq-postgres/`) |

## Quick Start

```bash
# 1. Create your .env from the template
cp .env.example .env

# 2. (Optional) Add an AI key to .env for /extract and JSON format features
# See .env.example for OpenAI and Gemini options

# 3. Build the custom postgres image (first time only)
docker compose build nuq-postgres

# 4. Start all services
docker compose up -d

# 5. Verify it's running
curl http://localhost:3002/
```

API response: `{"message":"Firecrawl API","documentation_url":"https://docs.firecrawl.dev"}`

Queue admin UI: <http://localhost:3002/admin/@/queues>
(Login with `BULL_AUTH_KEY` from your `.env`)

## Using with the firecrawl CLI

Point the CLI to your local instance:

```bash
export FIRECRAWL_API_URL=http://localhost:3002

# Scrape a page
firecrawl scrape "https://example.com" -o output.md

# Search (requires SearXNG or falls back to Google)
firecrawl scrape "https://example.com"
```

Add `FIRECRAWL_API_URL=http://localhost:3002` to your shell profile (`~/.zshrc`) to make it permanent.

## Test with curl

```bash
# Scrape
curl -X POST http://localhost:3002/v1/scrape \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com"}'

# Crawl
curl -X POST http://localhost:3002/v1/crawl \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://docs.firecrawl.dev"}'
```

## Stop

```bash
docker compose down

# Stop and remove all data (redis, rabbitmq volumes)
docker compose down -v
```

## Notes

- The `/agent` endpoint is **not supported** in self-hosted mode (cloud only)
- AI features (extract, JSON format) require `OPENAI_API_KEY` in `.env`
- Gemini works via the OpenAI-compatible endpoint — see `.env.example`
- Supabase "not configured" warnings in logs are normal and harmless
