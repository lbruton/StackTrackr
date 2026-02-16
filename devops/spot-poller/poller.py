#!/usr/bin/env python3
"""
StakTrakr Seed Data Poller
=============================
Long-running script (designed for Docker) that:
  1. On startup: backfills any gap since the last seed data entry
  2. Every hour: polls /latest and writes to data/hourly/YYYY/MM/DD/HH.json
  3. At noon EST (hour >= 12): also writes the daily seed entry to spot-history-YYYY.json

Writes directly to the mounted data/ folder. User commits manually.
"""

import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# Import shared utilities from the backfill script
from importlib.util import spec_from_file_location, module_from_spec

def _import_seed_updater():
    """Import update-seed-data.py as a module (handles the hyphenated filename)."""
    script_path = Path(__file__).parent / "update-seed-data.py"
    spec = spec_from_file_location("seed_updater", script_path)
    mod = module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

seed = _import_seed_updater()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

POLL_INTERVAL_SECONDS = 3600  # 1 hour

# ---------------------------------------------------------------------------
# Catchup
# ---------------------------------------------------------------------------

def run_catchup(api_key, data_dir):
    """Backfill any gap between the last seed entry and yesterday."""
    latest = seed.find_latest_date(data_dir)
    if latest is None:
        log("No existing seed data found — skipping catchup.")
        return

    yesterday = datetime.now().date() - timedelta(days=1)
    start = latest + timedelta(days=1)

    if start > yesterday:
        log(f"Catchup: already current (latest: {latest}).")
        return

    days = (yesterday - start).days + 1
    log(f"Catchup: backfilling {start} → {yesterday} ({days} days)...")

    chunk_start = start
    all_entries = []
    while chunk_start <= yesterday:
        chunk_end = min(chunk_start + timedelta(days=seed.MAX_DAYS_PER_REQUEST - 1), yesterday)
        log(f"  Fetching {chunk_start} to {chunk_end}...")
        try:
            data = seed.fetch_timeframe(api_key, chunk_start, chunk_end)
            rates = data.get("rates", {})
            entries = seed.transform_to_seed_format(rates)
            all_entries.extend(entries)
            log(f"  OK — {len(rates)} days returned.")
        except Exception as e:
            log(f"  Error during catchup: {e}")
            return
        chunk_start = chunk_end + timedelta(days=1)

    if all_entries:
        results = seed.merge_into_year_files(data_dir, all_entries)
        for year, count in sorted(results.items()):
            if count > 0:
                log(f"  Catchup wrote +{count} entries to spot-history-{year}.json")
    else:
        log("  Catchup: no data returned (weekends/holidays?).")

# ---------------------------------------------------------------------------
# Hourly data collection
# ---------------------------------------------------------------------------

NOON_HOUR = 12  # 12:00 PM EST — market reference price for daily seed

def write_hourly(entries, data_dir, hour_str, date_obj):
    """
    Write hourly price snapshot to data/hourly/YYYY/MM/DD/HH.json.
    Uses the source "hourly" instead of "seed" for provenance.
    Skips if the file already exists (idempotent).
    """
    # Re-tag entries with "hourly" source for the sharded files
    hourly_entries = []
    for e in entries:
        hourly_entry = dict(e)
        hourly_entry["source"] = "hourly"
        hourly_entries.append(hourly_entry)

    written = seed.save_hourly_file(data_dir, hourly_entries, date_obj, hour_str)
    if written:
        log(f"Hourly: wrote {len(hourly_entries)} entries → "
            f"hourly/{date_obj.year}/{date_obj.month:02d}/{date_obj.day:02d}/{hour_str}.json")
    else:
        log(f"Hourly: {hour_str}.json already exists — skipped.")

# ---------------------------------------------------------------------------
# Hourly poll
# ---------------------------------------------------------------------------

def poll_once(api_key, data_dir):
    """
    Poll /latest prices every hour.
    - Always writes to the hourly sharded tree (data/hourly/YYYY/MM/DD/HH.json)
    - At noon EST (hour >= 12), also writes/overwrites the daily seed file
    """
    now = datetime.now()  # TZ=America/New_York from Docker env
    today = now.date()
    hour = now.hour
    today_str = today.strftime("%Y-%m-%d")
    hour_str = f"{hour:02d}"

    log(f"Poll: fetching latest prices for {today_str} (hour {hour_str})...")
    try:
        data = seed.fetch_latest(api_key)
    except Exception as e:
        log(f"Poll error: {e}")
        return

    rates = data.get("rates", {})
    if not rates:
        log("Poll: no rates in response.")
        return

    entries = seed.transform_latest_to_seed(rates, today_str)
    if not entries:
        log("Poll: no valid entries after transformation.")
        return

    # Always write hourly data
    write_hourly(entries, data_dir, hour_str, today)

    # At noon EST (or later if missed), write daily seed
    if hour >= NOON_HOUR:
        year_data = seed.load_year_file(data_dir, str(today.year))
        existing_dates = {e["timestamp"][:10] for e in year_data}

        if today_str not in existing_dates:
            results = seed.merge_into_year_files(data_dir, entries)
            for year, count in sorted(results.items()):
                if count > 0:
                    log(f"Seed: wrote daily prices for {today_str} "
                        f"(noon+ window, +{count} entries to spot-history-{year}.json)")
        else:
            log(f"Seed: daily data for {today_str} already present — skipping.")

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def log(msg):
    """Print with timestamp for Docker log readability."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def main():
    once = "--once" in sys.argv

    log("StakTrakr Seed Data Poller starting...")
    if once:
        log("Running in single-shot mode (--once).")

    api_key = seed.load_config()
    data_dir = seed.resolve_data_dir()

    log(f"Data directory: {data_dir}")
    if not data_dir.exists():
        log(f"Error: Data directory {data_dir} does not exist. Is the volume mounted?")
        sys.exit(1)

    if once:
        # Single poll — used by GitHub Actions
        poll_once(api_key, data_dir)
        log("Done (single-shot).")
        return

    # Phase 1: catchup
    run_catchup(api_key, data_dir)

    # Phase 2: hourly polling loop
    log(f"Entering polling loop (every {POLL_INTERVAL_SECONDS}s)...")
    while True:
        poll_once(api_key, data_dir)
        log(f"Next poll in {POLL_INTERVAL_SECONDS // 60} minutes.")
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
