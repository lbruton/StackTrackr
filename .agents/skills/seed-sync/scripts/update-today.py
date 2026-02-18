#!/usr/bin/env python3
"""
Slim seed data updater for Claude Code's /seed-sync skill.
Fetches today's spot prices and appends to the appropriate year file.
No Docker required — run directly with: python3 update-today.py

Requires: METAL_PRICE_API_KEY in environment or devops/spot-poller/.env
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: 'requests' package not installed. Run: pip install requests")
    sys.exit(1)

API_URL = "https://api.metalpriceapi.com/v1/latest"
METALS = {"XAU": "Gold", "XAG": "Silver", "XPT": "Platinum", "XPD": "Palladium"}
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_api_key():
    """Load API key from environment or devops .env file."""
    key = os.getenv("METAL_PRICE_API_KEY")
    if key and key != "your_api_key_here":
        return key
    env_path = DATA_DIR.parent / "devops" / "spot-poller" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("METAL_PRICE_API_KEY="):
                key = line.split("=", 1)[1].strip()
                if key and key != "your_api_key_here":
                    return key
    print("Error: METAL_PRICE_API_KEY not found.")
    print(f"Set it in environment or in {env_path}")
    sys.exit(1)


def fetch_latest(api_key):
    """Fetch today's spot prices from MetalPriceAPI."""
    resp = requests.get(API_URL, params={
        "api_key": api_key, "base": "USD", "currencies": "XAU,XAG,XPT,XPD"
    }, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(data.get("error", {}).get("info", "API error"))
    return data.get("rates", {})


def update_seed_file(date_str, rates):
    """Append today's prices to the appropriate year file."""
    year = date_str[:4]
    path = DATA_DIR / f"spot-history-{year}.json"
    entries = json.load(open(path, encoding="utf-8")) if path.exists() else []

    existing = {(e["timestamp"], e["metal"]) for e in entries}
    added = 0

    for symbol in ["XAU", "XAG", "XPT", "XPD"]:
        if symbol not in rates or not rates[symbol]:
            continue
        entry = {
            "spot": round(1.0 / rates[symbol], 2),
            "metal": METALS[symbol],
            "source": "seed",
            "provider": "MetalPriceAPI",
            "timestamp": f"{date_str} 12:00:00",
        }
        if (entry["timestamp"], entry["metal"]) not in existing:
            entries.append(entry)
            added += 1

    if added:
        entries.sort(key=lambda e: (e["timestamp"], e["metal"]))
        with open(path, "w", encoding="utf-8") as f:
            json.dump(entries, f, separators=(", ", ": "))

    return added, path.name


def main():
    today = datetime.now().date().strftime("%Y-%m-%d")
    print(f"Fetching spot prices for {today}...")

    api_key = load_api_key()
    rates = fetch_latest(api_key)
    added, filename = update_seed_file(today, rates)

    if added:
        # Show prices
        for symbol in ["XAU", "XAG", "XPT", "XPD"]:
            if symbol in rates and rates[symbol]:
                print(f"  {METALS[symbol]}: ${round(1.0 / rates[symbol], 2):,.2f}/oz")
        print(f"\n+{added} entries written to data/{filename}")
    else:
        print(f"Already have data for {today} — no changes.")


if __name__ == "__main__":
    main()
