#!/usr/bin/env python3
"""
versionbump.py — Update all 5 version touchpoints for a StakTrakr release.

Usage:
    python3 versionbump.py                      # interactive prompts
    python3 versionbump.py --bump release       # auto-increment RELEASE (3.18.00 → 3.19.00)
    python3 versionbump.py --bump patch         # auto-increment PATCH   (3.19.00 → 3.19.01)
    python3 versionbump.py --version 3.20.00    # explicit version
    python3 versionbump.py --dry-run            # preview changes without writing

Files updated:
    1. js/constants.js       — APP_VERSION string
    2. CHANGELOG.md          — new version section at top
    3. docs/announcements.md — new What's New line at top
    4. js/versionCheck.js    — embedded changelog fallback
    5. js/about.js           — embedded What's New fallback
"""

import argparse
import re
import sys
from datetime import date
from pathlib import Path

# Paths relative to this script (project root)
ROOT = Path(__file__).resolve().parent
FILES = {
    "constants":     ROOT / "js" / "constants.js",
    "changelog":     ROOT / "CHANGELOG.md",
    "announcements": ROOT / "docs" / "announcements.md",
    "versionCheck":  ROOT / "js" / "versionCheck.js",
    "about":         ROOT / "js" / "about.js",
}


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, content):
    path.write_text(content, encoding="utf-8")


def get_current_version():
    """Parse APP_VERSION from constants.js."""
    text = read(FILES["constants"])
    m = re.search(r'const APP_VERSION\s*=\s*"(\d+\.\d+\.\d+)"', text)
    if not m:
        sys.exit("Could not find APP_VERSION in constants.js")
    return m.group(1)


def bump_version(current, part):
    """Increment version. Format: BRANCH.RELEASE.PATCH (zero-padded to 2 digits)."""
    branch, release, patch = (int(x) for x in current.split("."))
    if part == "release":
        release += 1
        patch = 0
    elif part == "patch":
        patch += 1
    else:
        sys.exit(f"Unknown bump part: {part}")
    return f"{branch}.{release:02d}.{patch:02d}"


def html_escape(text):
    """Minimal HTML entity escaping for embedded JS strings."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("→", "&rarr;")


def collect_bullets():
    """Interactive prompt for changelog bullets."""
    print("\nEnter changelog bullets (format: 'Label: Description').")
    print("Empty line when done.\n")
    bullets = []
    while True:
        line = input("  > ").strip()
        if not line:
            break
        if ":" in line:
            label, desc = line.split(":", 1)
            bullets.append((label.strip(), desc.strip()))
        else:
            bullets.append(("", line))
    return bullets


# ---------------------------------------------------------------------------
# File updaters
# ---------------------------------------------------------------------------

def update_constants(new_version, dry_run):
    """1. js/constants.js — swap APP_VERSION."""
    path = FILES["constants"]
    text = read(path)
    updated = re.sub(
        r'(const APP_VERSION\s*=\s*")[\d.]+(")',
        rf"\g<1>{new_version}\2",
        text,
        count=1,
    )
    if text == updated:
        sys.exit("Failed to update APP_VERSION in constants.js")
    if dry_run:
        print(f"  [constants.js] APP_VERSION → \"{new_version}\"")
    else:
        write(path, updated)


def update_changelog(new_version, title, bullets, dry_run):
    """2. CHANGELOG.md — insert new section before previous latest."""
    path = FILES["changelog"]
    text = read(path)
    today = date.today().isoformat()

    md_bullets = "\n".join(
        f"- **{label}**: {desc}" if label else f"- {desc}"
        for label, desc in bullets
    )
    section = f"## [{new_version}] - {today}\n\n### Added — {title}\n\n{md_bullets}\n\n---\n\n"

    # Insert before the first ## [x.y.z] heading
    m = re.search(r"^## \[\d+\.\d+\.\d+\]", text, re.MULTILINE)
    if not m:
        sys.exit("Could not find version heading in CHANGELOG.md")
    updated = text[:m.start()] + section + text[m.start():]

    if dry_run:
        print(f"  [CHANGELOG.md] Insert section for {new_version}")
        for label, desc in bullets:
            print(f"    - {label}: {desc}" if label else f"    - {desc}")
    else:
        write(path, updated)


def update_announcements(new_version, title, bullets, dry_run):
    """3. docs/announcements.md — prepend one-liner to What's New list."""
    path = FILES["announcements"]
    text = read(path)

    summary = ". ".join(
        f"{label}: {desc}" if label else desc for label, desc in bullets
    )
    # Ensure it ends with a period-like character
    if summary and summary[-1] not in ".!?)":
        summary = summary.rstrip()

    line = f"- **{title} (v{new_version})**: {summary}\n"

    # Insert after "## What's New\n\n"
    anchor = "## What's New\n\n"
    idx = text.find(anchor)
    if idx == -1:
        sys.exit("Could not find '## What's New' in announcements.md")
    insert_at = idx + len(anchor)
    updated = text[:insert_at] + line + text[insert_at:]

    if dry_run:
        print(f"  [announcements.md] Prepend: {title} (v{new_version})")
    else:
        write(path, updated)


def update_version_check(new_version, bullets, dry_run):
    """4. js/versionCheck.js — insert new version key in changelogs object."""
    path = FILES["versionCheck"]
    text = read(path)

    li_items = "\n".join(
        f'      <li><strong>{html_escape(label)}</strong>: {html_escape(desc)}</li>'
        if label else f"      <li>{html_escape(desc)}</li>"
        for label, desc in bullets
    )
    entry = f'    "{new_version}": `\n{li_items}\n    `,\n'

    # Insert after "const changelogs = {\n"
    anchor = "const changelogs = {\n"
    idx = text.find(anchor)
    if idx == -1:
        sys.exit("Could not find changelogs object in versionCheck.js")
    insert_at = idx + len(anchor)
    updated = text[:insert_at] + entry + text[insert_at:]

    if dry_run:
        print(f"  [versionCheck.js] Insert changelog for {new_version} ({len(bullets)} bullets)")
    else:
        write(path, updated)


def update_about(new_version, title, bullets, dry_run):
    """5. js/about.js — prepend <li> to embedded What's New."""
    path = FILES["about"]
    text = read(path)

    summary = ". ".join(
        f"{html_escape(label)}: {html_escape(desc)}" if label else html_escape(desc)
        for label, desc in bullets
    )
    if summary and summary[-1] not in ".!?)":
        summary = summary.rstrip()

    li = f'    <li><strong>v{new_version} &ndash; {html_escape(title)}</strong>: {summary}</li>\n'

    # Insert after "return `\n"
    anchor = "const getEmbeddedWhatsNew"
    idx = text.find(anchor)
    if idx == -1:
        sys.exit("Could not find getEmbeddedWhatsNew in about.js")
    # Find the return `\n after the function
    ret_idx = text.find("return `\n", idx)
    if ret_idx == -1:
        sys.exit("Could not find 'return `' in getEmbeddedWhatsNew")
    insert_at = ret_idx + len("return `\n")
    updated = text[:insert_at] + li + text[insert_at:]

    if dry_run:
        print(f"  [about.js] Prepend What's New for v{new_version}")
    else:
        write(path, updated)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Bump StakTrakr version across all 5 files")
    parser.add_argument("--version", help="Explicit new version (e.g., 3.20.00)")
    parser.add_argument("--bump", choices=["release", "patch"], help="Auto-increment release or patch")
    parser.add_argument("--title", help="Release title (e.g., 'Filter chip enhancements')")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    args = parser.parse_args()

    current = get_current_version()
    print(f"Current version: {current}")

    # Determine new version
    if args.version:
        new_version = args.version
    elif args.bump:
        new_version = bump_version(current, args.bump)
    else:
        choice = input("Bump [r]elease or [p]atch? (r/p): ").strip().lower()
        if choice in ("r", "release"):
            new_version = bump_version(current, "release")
        elif choice in ("p", "patch"):
            new_version = bump_version(current, "patch")
        else:
            sys.exit("Cancelled.")

    print(f"New version:     {new_version}")

    # Collect title
    title = args.title or input("\nRelease title: ").strip()
    if not title:
        sys.exit("Title is required.")

    # Collect bullets
    bullets = collect_bullets()
    if not bullets:
        sys.exit("At least one bullet is required.")

    # Confirm
    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Updating 5 files:")
    update_constants(new_version, args.dry_run)
    update_changelog(new_version, title, bullets, args.dry_run)
    update_announcements(new_version, title, bullets, args.dry_run)
    update_version_check(new_version, bullets, args.dry_run)
    update_about(new_version, title, bullets, args.dry_run)

    if args.dry_run:
        print("\nDry run complete — no files modified.")
    else:
        print(f"\nDone! Version bumped to {new_version} across all 5 files.")
        print("Next: review changes with `git diff`, then commit.")


if __name__ == "__main__":
    main()
