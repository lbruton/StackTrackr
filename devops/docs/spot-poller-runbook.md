# Spot Poller Operational Runbook

This document describes the operation and maintenance of the background spot price poller.

## Service Overview

The spot poller consists of two main scripts:
*   `poller.py`: The long-running orchestration script.
*   `update-seed-data.py`: The data fetching and transformation logic.

## Common Tasks

### 1. Manual Backfill
If the poller has been down for an extended period, or if you need to fetch historical data for a specific range:
```bash
cd devops/spot-poller
python3 update-seed-data.py --start-date 2026-01-01 --end-date 2026-02-15
```
Use `--dry-run` to preview the changes before writing.

### 2. Updating for a New Year
When a new year begins (e.g., 2027):
1.  Update `END_YEAR` in `devops/build-seed-bundle.py`.
2.  The poller will automatically create `data/spot-history-2027.json` upon its first run in the new year.
3.  Commit the new JSON file to the repository.

### 3. Troubleshooting

#### "API key not set"
Ensure the `METAL_PRICE_API_KEY` is correctly defined in `devops/spot-poller/.env` and that the file is picked up by Docker Compose.

#### "Data directory not found"
Verify that the `volumes` mapping in `docker-compose.yml` correctly points to the project's `data/` directory.

#### No data for weekends
The metals markets are closed on weekends. The poller will log "no data returned", which is normal behavior.

## Implementation Details

### Hourly Data
Hourly snapshots are written to a sharded directory structure:
`data/hourly/YYYY/MM/DD/HH.json`
This prevents large directories and keeps lookups efficient.

### Daily Seed Data
At noon EST (17:00 UTC), the poller writes a "seed" entry to the yearly file. This entry acts as the daily reference price for historical charts.
