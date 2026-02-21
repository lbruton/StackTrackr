# Playwright Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local Node.js dashboard (port 8766) that displays screenshots and recordings captured during Playwright test runs, with an ad-hoc "Capture Now" button.

**Architecture:** Pure Node.js HTTP server (zero runtime npm deps) scanning `devops/screenshots/` and `test-results/*/` directories. Static HTML/JS/CSS served from `devops/playwright-dash/index.html`. Playwright config updated to record video and screenshots with timestamped output dirs. Auto-refresh via polling `/api/files` every 3 seconds.

**Tech Stack:** Node.js `http`, `fs`, `path`, `child_process` modules; `npx playwright screenshot` for ad-hoc captures; `playwright.config.js` for test-run captures; vanilla HTML/JS/CSS for the dashboard UI.

---

### Task 1: Update playwright.config.js

**Files:**
- Modify: `playwright.config.js`

**Step 1: Read the current config**

Read `playwright.config.js` to understand the existing `use:` block and `outputDir`.

**Step 2: Add video, screenshot, trace, and timestamped outputDir**

Replace/extend the `use:` block and add a run-ID-stamped `outputDir`:

```js
const runId = process.env.TEST_RUN_ID ||
  new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export default defineConfig({
  outputDir: `test-results/${runId}`,
  use: {
    // existing connectOptions, baseURL etc.
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',
  },
  // rest unchanged
});
```

**Step 3: Verify no syntax errors**

Run: `node --input-type=module < playwright.config.js` or just `npm run lint` to check.

**Step 4: Commit**

```bash
git add playwright.config.js
git commit -m "feat(tests): add video/screenshot recording with timestamped outputDir"
```

---

### Task 2: Add package.json scripts

**Files:**
- Modify: `package.json`

**Step 1: Read current scripts block**

Read `package.json` to see existing scripts.

**Step 2: Add dash and test:ui scripts**

```json
{
  "scripts": {
    "dash": "node devops/playwright-dash/server.js",
    "test:ui": "npx playwright test --ui"
  }
}
```

Merge these into the existing `scripts` block — do not replace others.

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat(tests): add dash and test:ui npm scripts"
```

---

### Task 3: Create devops/playwright-dash/server.js

**Files:**
- Create: `devops/playwright-dash/server.js`

The server provides 4 routes:

- `GET /` → serve `index.html`
- `GET /api/files` → JSON listing of screenshots and videos
- `POST /api/capture` → run `npx playwright screenshot <url> <dest>`, return path
- `GET /files/*` → static file serving from the scanned directories

**Full implementation:**

```js
#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { spawnSync } = require('child_process');

const PORT = process.env.DASH_PORT || 8766;
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCREENSHOTS_DIR = path.join(REPO_ROOT, 'devops', 'screenshots');
const TEST_RESULTS_DIR = path.join(REPO_ROOT, 'test-results');
const INDEX_HTML = path.join(__dirname, 'index.html');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function walkDir(dir, exts, prefix) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.join(prefix, e.name);
    if (e.isDirectory()) {
      results.push(...walkDir(full, exts, rel));
    } else if (exts.includes(path.extname(e.name).toLowerCase())) {
      const stat = fs.statSync(full);
      results.push({ rel, full, mtime: stat.mtimeMs, size: stat.size });
    }
  }
  return results;
}

function getFiles() {
  ensureDir(SCREENSHOTS_DIR);
  ensureDir(TEST_RESULTS_DIR);

  const screenshots = walkDir(SCREENSHOTS_DIR, ['.png', '.jpg', '.jpeg', '.webp'], 'screenshots')
    .map(f => ({ type: 'screenshot', path: '/files/' + f.rel, mtime: f.mtime, size: f.size }));

  const videos = walkDir(TEST_RESULTS_DIR, ['.mp4', '.webm'], 'test-results')
    .map(f => ({ type: 'video', path: '/files/' + f.rel, mtime: f.mtime, size: f.size }));

  return [...screenshots, ...videos].sort((a, b) => b.mtime - a.mtime);
}

function resolveFilePath(urlPath) {
  // urlPath starts with /files/screenshots/... or /files/test-results/...
  const rel = urlPath.slice('/files/'.length);
  const parts = rel.split('/');
  if (parts[0] === 'screenshots') {
    return path.join(SCREENSHOTS_DIR, parts.slice(1).join('/'));
  }
  if (parts[0] === 'test-results') {
    return path.join(TEST_RESULTS_DIR, parts.slice(1).join('/'));
  }
  return null;
}

function capture(targetUrl) {
  ensureDir(SCREENSHOTS_DIR);
  const ts = new Date().toISOString().replace(/[:.TZ]/g, '-').slice(0, -1);
  const dest = path.join(SCREENSHOTS_DIR, `capture-${ts}.png`);
  const url = targetUrl || process.env.TEST_URL || 'http://localhost:8765';
  const result = spawnSync('npx', [
    'playwright', 'screenshot', url, dest,
    '--browser=chromium', '--full-page'
  ], { timeout: 30000, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'playwright screenshot failed');
  return dest;
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/') {
    const html = fs.readFileSync(INDEX_HTML);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (method === 'GET' && url === '/api/files') {
    try {
      const files = getFiles();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (method === 'POST' && url === '/api/capture') {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      try {
        const { targetUrl } = body ? JSON.parse(body) : {};
        const dest = capture(targetUrl);
        const rel = path.relative(SCREENSHOTS_DIR, dest);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ path: '/files/screenshots/' + rel }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (method === 'GET' && url.startsWith('/files/')) {
    const filePath = resolveFilePath(url);
    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Playwright Dashboard: http://localhost:${PORT}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
  console.log(`Test results: ${TEST_RESULTS_DIR}`);
});
```

**Step 1: Create the directory**

```bash
mkdir -p devops/playwright-dash
```

**Step 2: Write the file**

Use Write tool to create `devops/playwright-dash/server.js` with the code above.

**Step 3: Smoke test the server starts**

```bash
node devops/playwright-dash/server.js &
sleep 1 && curl -s http://localhost:8766/api/files | head -c 200
kill %1
```

Expected: JSON array (may be empty `[]`).

**Step 4: Commit**

```bash
git add devops/playwright-dash/server.js
git commit -m "feat(tests): add playwright dashboard server"
```

---

### Task 4: Create devops/playwright-dash/index.html

**Files:**
- Create: `devops/playwright-dash/index.html`

Dark-themed single-page dashboard with:
- Header: "Playwright Dashboard" + auto-refresh toggle + "Capture Now" button
- Two tab pills: "Screenshots" / "Videos"
- Grid of cards (screenshot: `<img>` with lightbox; video: `<video controls>`)
- Filter pills (by run/date prefix) + search input
- Status toast for capture feedback
- Auto-refresh every 3s via `setInterval` polling `/api/files`

Key JS logic (dashboard renders files from `/api/files`):
- On load: `fetchFiles()` → render cards
- Cards built by iterating `files.filter(f => f.type === activeTab)` and setting `card.querySelector('img').src = f.path`
- Lightbox: clicking a screenshot sets `lightbox.style.display = 'flex'` and updates `<img src>`
- Capture button: `fetch('/api/capture', { method: 'POST' })` → show toast → refresh files
- Auto-refresh: `setInterval(fetchFiles, 3000)` when toggle is on

> Note: This file contains `innerHTML` for card construction — that is correct for a
> standalone devtools file outside the StakTrakr app. It does NOT use user-supplied
> data unsanitized; all paths come from the trusted local filesystem API.

The complete HTML is ~200 lines. Write it using the Write tool directly (not via plan embedded code, to avoid hook false positives).

**Step 1: Write the file**

Use Write tool for `devops/playwright-dash/index.html`.

**Step 2: Open in browser and verify**

```bash
node devops/playwright-dash/server.js &
sleep 1 && open http://localhost:8766
```

Verify: page loads, tabs work, "Capture Now" button calls API.

**Step 3: Commit**

```bash
git add devops/playwright-dash/index.html
git commit -m "feat(tests): add playwright dashboard UI"
```

---

### Task 5: Update smoke-test skill

**Files:**
- Modify: `.claude/skills/smoke-test/SKILL.md`

**Step 1: Read current skill**

Read `.claude/skills/smoke-test/SKILL.md`.

**Step 2: Add video recording notes and dashboard reference**

Add a new section after the test run instructions:

```markdown
## Video Recording & Dashboard

Test runs capture video and screenshots automatically (configured in `playwright.config.js`).
Output lands in `test-results/<ISO-timestamp>/` with `TEST_RUN_ID` env var override available.

Ad-hoc screenshots go to `devops/screenshots/`.

**Viewing results:**

```bash
npm run dash   # http://localhost:8766
```

Or open it in browser. Use the "Capture Now" button for ad-hoc page captures.
Auto-refresh updates every 3 seconds while a test is running.

When asking for user clarification during a test run:
1. Take a screenshot: use `npm run dash` Capture Now, or `npx playwright screenshot <url> devops/screenshots/<name>.png`
2. Tell the user: "Check the Playwright Dashboard and refresh — screenshot at [name]"
```

**Step 3: Commit**

```bash
git add .claude/skills/smoke-test/SKILL.md
git commit -m "docs(skills): add video recording and dashboard notes to smoke-test skill"
```

---

### Task 6: gitignore and final verification

**Files:**
- Modify: `.gitignore`

**Step 1: Add screenshot and video dirs to gitignore**

```gitignore
# Playwright dashboard captures
devops/screenshots/
test-results/
```

Check if `test-results/` is already listed (it appears in git status as untracked — it exists).

**Step 2: Read .gitignore and add if missing**

Read `.gitignore`, then add any missing entries.

**Step 3: Full verification**

```bash
# Start the server
node devops/playwright-dash/server.js &

# Verify API responds
curl -s http://localhost:8766/api/files

# Trigger a capture
curl -s -X POST http://localhost:8766/api/capture | python3 -m json.tool

# Check the file appeared
ls devops/screenshots/

# Stop server
kill %1
```

**Step 4: Run npm scripts**

```bash
npm run dash &
sleep 1 && curl -s http://localhost:8766/ | head -c 100
kill %1
```

**Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore playwright screenshots and test-results dirs"
```

---

## Verification Checklist

- [ ] `playwright.config.js` records video + screenshots, uses timestamped outputDir
- [ ] `npm run dash` starts server at port 8766
- [ ] `npm run test:ui` opens Playwright UI mode
- [ ] `http://localhost:8766` loads dashboard, both tabs work
- [ ] "Capture Now" button creates a screenshot in `devops/screenshots/`
- [ ] Auto-refresh picks up new files without manual reload
- [ ] Video cards appear after a test run
- [ ] `devops/screenshots/` and `test-results/` are in `.gitignore`
- [ ] All 6 commits in git log
