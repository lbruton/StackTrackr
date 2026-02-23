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

NOON_HOUR = 17  # noon EST = 17:00 UTC — market reference price for daily seed

# ---------------------------------------------------------------------------
# 24-hour backfill (fills gaps from missed polls)
# ---------------------------------------------------------------------------

def backfill_recent_hours(api_key, data_dir, hours_back=24):
    """
    Backfill missing hourly files from the last N hours.
    Uses /timeframe endpoint for accurate historical prices.
    Called in --once mode (GitHub Actions) to ensure no 404s.
    """
    now = datetime.utcnow()
    missing = []

    # Scan for missing hourly files
    for h in range(1, hours_back + 1):
        target = now - timedelta(hours=h)
        hour_str = f"{target.hour:02d}"
        target_date = target.date()
        hourly_dir = (
            Path(data_dir) / "hourly"
            / str(target_date.year)
            / f"{target_date.month:02d}"
            / f"{target_date.day:02d}"
        )
        path = hourly_dir / f"{hour_str}.json"
        if not path.exists():
            missing.append((target_date, hour_str))

    if not missing:
        log("Backfill: no gaps in last 24 hours.")
        return

    log(f"Backfill: {len(missing)} missing hourly files found.")

    # Group missing by date for efficient /timeframe calls
    dates_needed = sorted(set(d for d, _ in missing))
    start_date = dates_needed[0]
    end_date = dates_needed[-1]

    try:
        data = seed.fetch_timeframe(api_key, start_date, end_date)
        rates_by_date = data.get("rates", {})
    except Exception as e:
        log(f"Backfill: /timeframe fetch failed: {e}")
        return

    filled = 0
    for target_date, hour_str in missing:
        date_str = target_date.strftime("%Y-%m-%d")
        if date_str not in rates_by_date:
            continue
        inverted = seed.invert_rates(rates_by_date[date_str])
        entries = []
        for symbol in ["XAU", "XAG", "XPT", "XPD"]:
            if symbol not in inverted:
                continue
            entries.append({
                "spot": inverted[symbol],
                "metal": seed.SYMBOL_TO_METAL[symbol],
                "source": "hourly",
                "provider": "StakTrakr",
                "timestamp": f"{date_str} {hour_str}:00:00",
            })
        if entries:
            written = seed.save_hourly_file(data_dir, entries, target_date, hour_str)
            if written:
                filled += 1

    log(f"Backfill: filled {filled} of {len(missing)} missing hourly files.")

def write_hourly(entries, data_dir, hour_str, date_obj):
    """
    Write hourly price snapshot to data/hourly/YYYY/MM/DD/HH.json.
    Uses the source "hourly" instead of "seed" for provenance.
    Always overwrites — poller runs every 15 min for freshness.
    """
    # Re-tag entries with "hourly" source for the sharded files
    hourly_entries = []
    for e in entries:
        hourly_entry = dict(e)
        hourly_entry["source"] = "hourly"
        hourly_entries.append(hourly_entry)

    seed.save_hourly_file(data_dir, hourly_entries, date_obj, hour_str, overwrite=True)
    log(f"Hourly: wrote {len(hourly_entries)} entries → "
        f"hourly/{date_obj.year}/{date_obj.month:02d}/{date_obj.day:02d}/{hour_str}.json")

# ---------------------------------------------------------------------------
# Hourly poll
# ---------------------------------------------------------------------------

def poll_once(api_key, data_dir):
    """
    Poll /latest prices every hour.
    - Always writes to the hourly sharded tree (data/hourly/YYYY/MM/DD/HH.json)
    - At noon EST (hour >= 12), also writes/overwrites the daily seed file
    """
    now = datetime.utcnow()  # UTC for timezone-neutral hourly file paths
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

    # Fix timestamps for hourly files — use actual poll time (not floored to hour)
    minute_str = f"{now.minute:02d}"
    hourly_entries = []
    for e in entries:
        he = dict(e)
        he["timestamp"] = f"{today_str} {hour_str}:{minute_str}:00"
        hourly_entries.append(he)

    # Always write hourly data (with actual-hour timestamps)
    write_hourly(hourly_entries, data_dir, hour_str, today)

    # Write 15-min snapshot (immutable per-poll, never overwritten)
    written_15min = seed.save_15min_file(data_dir, hourly_entries, today, hour_str, minute_str)
    if written_15min:
        log(f"15min: wrote {len(hourly_entries)} entries → "
            f"15min/{today.year}/{today.month:02d}/{today.day:02d}/{hour_str}{minute_str}.json")
    else:
        log(f"15min: {hour_str}{minute_str}.json already exists — skipped.")

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
        # First backfill any missing hours from the last 24h (prevents 404s)
        backfill_recent_hours(api_key, data_dir)
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
