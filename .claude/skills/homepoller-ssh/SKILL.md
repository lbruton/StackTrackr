---
name: homepoller-ssh
description: Use when troubleshooting the home poller, checking service health, viewing logs, restarting services, updating poller code, or running any command on the home VM. Also use when the words home poller, homepoller, 192.168.1.81, supervisord, retail-poller.log, or residential proxy appear in context.
---

# Home Poller SSH

Direct SSH access from this Mac to the home poller VM. Replaces the old workflow of delegating to a Claude agent running in the home VM's terminal.

## Connection

| Alias | Network | Host | Latency |
|-------|---------|------|---------|
| `homepoller` | LAN | 192.168.1.81 | ~0.5ms |
| `homepoller-ts` | Tailscale | 100.112.198.50 | ~36ms |

**Always use `-T`** (no PTY) for non-interactive commands — prevents duplicate output:

```bash
ssh -T homepoller '<command>'
```

Use `homepoller-ts` as fallback when off the home LAN or when LAN connectivity is unreliable.

**User:** `stakpoller` — has `NOPASSWD: ALL` sudo via `/etc/sudoers.d/stakpoller`.

**Key:** `~/.ssh/stakpoller_ed25519` — sourced from Infisical prod environment (`STAKPOLLER_SSH_PRIVATE_KEY`). Config: `~/.ssh/config`.

---

## Quick Diagnostics

```bash
# Service health (supervisord — 5 services)
ssh -T homepoller 'sudo /usr/bin/supervisorctl -c /etc/supervisor/supervisord.conf status'

# Service health (systemd — 7 services)
ssh -T homepoller 'systemctl is-active redis-server rabbitmq-server cron tailscaled tinyproxy grafana-server prometheus'

# Recent poller log
ssh -T homepoller 'tail -50 /var/log/retail-poller.log'

# Dashboard / metrics logs
ssh -T homepoller 'sudo tail -20 /var/log/supervisor/dashboard.log'
ssh -T homepoller 'sudo tail -20 /var/log/supervisor/metrics-exporter.log'

# Check if poller lock is stuck
ssh -T homepoller 'ls -la /tmp/retail-poller.lock 2>/dev/null || echo "No lock"'

# Test single coin
ssh -T homepoller 'COINS=ase bash /opt/poller/run-home.sh'

# Check Firecrawl/Playwright
ssh -T homepoller 'curl -sf http://localhost:3002/v1/scrape -X POST -H "Content-Type: application/json" -d "{\"url\":\"https://example.com\"}" | head -c 200'
```

---

## Common Tasks

| Task | Command |
|------|---------|
| Restart all supervisord services | `ssh -T homepoller 'sudo /usr/bin/supervisorctl -c /etc/supervisor/supervisord.conf restart all'` |
| Restart single service | `ssh -T homepoller 'sudo /usr/bin/supervisorctl -c /etc/supervisor/supervisord.conf restart <name>'` |
| Clear stuck lockfile | `ssh -T homepoller 'sudo rm -f /tmp/retail-poller.lock'` |
| Fix log permissions | `ssh -T homepoller 'sudo touch /var/log/retail-poller.log && sudo chown stakpoller:stakpoller /var/log/retail-poller.log && sudo chmod 664 /var/log/retail-poller.log'` |
| View cron schedule | `ssh -T homepoller 'cat /etc/cron.d/retail-poller'` |
| Check .env key names (no values) | `ssh -T homepoller 'grep -oP "^[A-Z_]+" /opt/poller/.env'` |
| Check disk usage | `ssh -T homepoller 'df -h /'` |
| Check Node version | `ssh -T homepoller 'node --version'` |

---

## Pre-Update Backup (MANDATORY before updating poller code)

Before pulling any new code onto the VM, capture the current state of all running scripts. This lets you roll back by copying the backup files back to `/opt/poller/` if an update breaks something.

```bash
SNAPSHOT_TS=$(date -u '+%Y-%m-%d_%H-%M')
SNAPSHOT_DIR="/Volumes/DATA/GitHub/StakTrakrApi/devops/deploy-backups/home-${SNAPSHOT_TS}"
mkdir -p "$SNAPSHOT_DIR/scripts" "$SNAPSHOT_DIR/logs"

# Copy all running scripts from the VM via tar (excludes node_modules, .env, secrets)
ssh -T homepoller 'tar -czf - -C /opt/poller --exclude=node_modules --exclude=.git --exclude=.env --exclude="*.lock" .' \
  | tar -xzf - -C "$SNAPSHOT_DIR/scripts/" 2>/dev/null

# Capture service state
ssh -T homepoller 'sudo /usr/bin/supervisorctl -c /etc/supervisor/supervisord.conf status' \
  > "$SNAPSHOT_DIR/logs/supervisord-status.txt" 2>&1
ssh -T homepoller 'tail -200 /var/log/retail-poller.log' \
  > "$SNAPSHOT_DIR/logs/retail-poller.log" 2>&1
ssh -T homepoller 'node --version && echo "npm: $(npm --version)"' \
  > "$SNAPSHOT_DIR/logs/node-info.txt" 2>&1

# Record metadata
cat > "$SNAPSHOT_DIR/README.txt" <<EOF
Pre-update snapshot: $(date -u '+%Y-%m-%d %H:%M UTC')
Home VM: 192.168.1.81 (/opt/poller)
Purpose: VM state before curl-update from StakTrakrApi main
EOF

# Commit the snapshot to StakTrakrApi main
cd /Volumes/DATA/GitHub/StakTrakrApi
git add devops/deploy-backups/
git commit -m "chore: pre-home-update snapshot ${SNAPSHOT_TS}

VM state captured before curl-update of /opt/poller from StakTrakrApi main

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

**Why:** The home poller often has files edited directly on the VM that haven't been synced to the repo yet. This snapshot captures the live state — if the update breaks something, copy `$SNAPSHOT_DIR/scripts/` files back to `/opt/poller/` via `scp`.

**Retention:** Prune snapshots older than 30 days when `ls devops/deploy-backups/` gets crowded.

---

## Updating Poller Code

Pull latest from StakTrakrApi main branch:

```bash
ssh -T homepoller 'bash -s' << 'SCRIPT'
cd /opt/poller

# Shared scraper files — source: devops/fly-poller/
FLY=https://raw.githubusercontent.com/lbruton/StakTrakrApi/main/devops/fly-poller
for f in price-extract.js capture.js db.js turso-client.js provider-db.js merge-prices.js \
         api-export.js serve.js vision-patch.js extract-vision.js import-from-log.js \
         goldback-scraper.js monitor-oos.sh spot-extract.js backfill-spot.js package.json; do
  curl -sf "$FLY/$f" -o "$f" || echo "WARN: $f not found in fly-poller"
done

# Home-only files — source: devops/home-scraper/
HOME=https://raw.githubusercontent.com/lbruton/StakTrakrApi/main/devops/home-scraper
for f in run-home.sh run-fbp.sh check-flyio.sh setup-lxc.sh; do
  curl -sf "$HOME/$f" -o "$f" || echo "WARN: $f not found in home-scraper"
done

npm install
echo "Update complete"
SCRIPT
```

---

## Stack Reference

| Component | Manager | Port |
|-----------|---------|------|
| Firecrawl API | supervisord | localhost:3002 |
| Firecrawl Worker | supervisord | — |
| Playwright Service | supervisord | localhost:3003 |
| Dashboard | supervisord | 0.0.0.0:3010 |
| Metrics Exporter | supervisord | 0.0.0.0:9100 |
| Redis | systemd | localhost:6379 |
| RabbitMQ | systemd | localhost:5672 |
| Grafana | systemd | 0.0.0.0:3000 |
| Prometheus | systemd | 0.0.0.0:9090 |
| tinyproxy | systemd | 0.0.0.0:8888 |
| Tailscale | systemd | tailscale0 |
| Cron | systemd | — |

**Key paths:** `/opt/poller/` (scripts), `/var/log/retail-poller.log` (poller), `/var/log/supervisor/` (services), `/etc/supervisor/conf.d/staktrakr.conf` (supervisord config).

---

## Common Mistakes

**Running without `-T`**: Commands output twice (once from PTY, once from stdout). Always `ssh -T`.

**Forgetting sudo for supervisorctl**: The supervisord socket requires root. Always prefix with `sudo`.

**Editing files on the VM directly**: Poller source is owned by `StakTrakrApi`. Edit there, then curl-update on the VM. Only home-only files (dashboard.js, check-flyio.sh, supervisord config) should be edited directly.

**Using the wrong supervisorctl path**: Must include `-c /etc/supervisor/supervisord.conf` — the default config path doesn't work on this VM.
