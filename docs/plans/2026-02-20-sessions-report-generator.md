# Sessions Tab & Report Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-generate a `report.html` per test run and add a Sessions tab to the Playwright Dashboard for browsing run history.

**Architecture:** Playwright `globalTeardown` writes a self-contained `report.html` into each run's `outputDir` after tests finish. A JSON reporter provides per-test pass/fail data. The dashboard server adds `/api/sessions` to list completed runs. The dashboard UI adds a Sessions tab that links to each report.

**Tech Stack:** Node.js ESM (report-generator), Node.js CJS (server.js), vanilla HTML/JS/CSS (dashboard + report), Playwright JSON reporter.

---

### Task 1: Add JSON reporter and globalTeardown to playwright.config.js

**Files:**
- Modify: `playwright.config.js`

**Context:** `playwright.config.js` already computes `runId` and sets `outputDir: \`test-results/${runId}\``. We add two things: (1) a JSON reporter that writes `results.json` into the same run dir, (2) a globalTeardown reference. The JSON reporter `outputFile` path is resolved relative to the project root, so using the same `runId` variable puts it alongside the test artifacts.

**Step 1: Read current file**

Read `playwright.config.js` to confirm current state.

**Step 2: Apply changes**

The final file should look exactly like this:

```js
// @ts-check
import { defineConfig, devices } from '@playwright/test';

const backend = process.env.BROWSER_BACKEND || 'browserless';
const wsEndpoints = {
  browserless: `ws://localhost:3000/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN || 'local_dev_token'}`,
  browserbase: `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&projectId=${process.env.BROWSERBASE_PROJECT_ID}`,
};

if (!Object.hasOwn(wsEndpoints, backend)) {
  throw new Error(`Unknown BROWSER_BACKEND "${backend}". Valid values: ${Object.keys(wsEndpoints).join(', ')}`);
}
if (backend === 'browserbase' && (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID)) {
  throw new Error('BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID must be set when BROWSER_BACKEND=browserbase');
}

const runId = process.env.TEST_RUN_ID ||
  new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export default defineConfig({
  outputDir: `test-results/${runId}`,
  globalTeardown: './devops/playwright-dash/report-generator.js',
  reporter: [['json', { outputFile: `test-results/${runId}/results.json` }]],
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  timeout: 60_000,
  use: {
    connectOptions: { wsEndpoint: wsEndpoints[backend] },
    // host.docker.internal resolves to the host machine from inside Docker (macOS/Windows).
    // Use TEST_URL env var to override for CI or remote targets.
    baseURL: process.env.TEST_URL || 'http://host.docker.internal:8765',
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Write this with the Write tool (overwrite the file).

**Step 3: Verify**

```bash
node --input-type=module --eval "import './playwright.config.js'" 2>&1 | head -5
```

Expected: no output (no errors). If there's an error, fix it before proceeding.

**Step 4: Commit**

```bash
git add playwright.config.js
git commit -m "feat(tests): add JSON reporter and globalTeardown for session reports"
```

---

### Task 2: Create devops/playwright-dash/report-generator.js

**Files:**
- Create: `devops/playwright-dash/report-generator.js`

**Context:** This is a Playwright `globalTeardown` module. Playwright imports it as ESM (because `package.json` has `"type": "module"`). It receives `config` (a `FullConfig` object) — the only property we use is `config.outputDir`, which points to the timestamped run folder that just completed.

The generator:
1. Reads `results.json` from the run folder (written by the JSON reporter during the run)
2. Walks the run folder for test subdirectories (one per test, each containing `video.webm` and `screenshot.png`)
3. Matches test results to directories by index (tests run in order)
4. Writes `report.html` into the run folder

**Step 1: Create the file using Bash heredoc** (avoids security hook on innerHTML patterns inside strings):

```bash
cat > /Volumes/DATA/GitHub/StakTrakr/devops/playwright-dash/report-generator.js << 'GENEOF'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Flatten Playwright JSON reporter suite tree into a list of test results. */
function flattenSuites(suites) {
  const out = [];
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      const result = spec.tests?.[0]?.results?.[0];
      out.push({
        title: spec.title,
        status: result?.status || 'unknown',
        duration: result?.duration || 0,
      });
    }
    out.push(...flattenSuites(suite.suites));
  }
  return out;
}

/** Format milliseconds as "4.2s" or "1m 3s". */
function fmtDuration(ms) {
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
}

/** Clean a Playwright output directory name into a human-readable test title. */
function cleanDirName(name) {
  return name
    .replace(/^chromium-/, '')
    .replace(/-[a-f0-9]{6,10}$/, '')
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
}

function generateHtml({ runDir, runId, tests, passed, failed, total }) {
  const runDate = new Date().toLocaleString();
  const overallIcon = failed > 0 ? '❌' : '✅';

  const speedBtns = [0.1, 0.2, 0.5, 1, 2, 5, 10].map(r =>
    `<button class="spd${r === 1 ? ' active' : ''}" data-rate="${r}">${r}×</button>`
  ).join('');

  const testCards = tests.map(t => {
    const icon = t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : '⏭️';
    const badgeCls = t.status === 'passed' ? 'badge-ok' : t.status === 'failed' ? 'badge-err' : 'badge-skip';
    const screenshotHtml = t.screenshot
      ? `<img class="thumb" src="${t.screenshot}" alt="screenshot" loading="lazy">`
      : `<div class="no-media">No screenshot</div>`;
    const videoHtml = t.video
      ? `<div class="video-wrap">
          <video class="test-video" src="${t.video}" preload="metadata"></video>
          <div class="speed-row">${speedBtns}</div>
        </div>`
      : `<div class="no-media">No video</div>`;
    return `
      <div class="test-card">
        <div class="test-header">
          <span class="test-icon">${icon}</span>
          <span class="test-name">${t.name}</span>
          <span class="badge ${badgeCls}">${t.status}</span>
          <span class="dur">${fmtDuration(t.duration)}</span>
        </div>
        <div class="media-row">
          <div class="media-col">${screenshotHtml}</div>
          <div class="media-col">${videoHtml}</div>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Run Report — ${runId}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f1117;--surface:#1a1d27;--border:#2a2d3a;--primary:#3b82f6;--text:#e2e8f0;--muted:#94a3b8;--ok:#22c55e;--err:#ef4444;--skip:#f59e0b;--r:8px}
body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;font-size:14px;padding:24px}
h1{font-size:1.1rem;font-weight:600;margin-bottom:4px}
.run-meta{font-size:12px;color:var(--muted);margin-bottom:20px;display:flex;gap:16px;flex-wrap:wrap}
.stat{display:flex;align-items:center;gap:4px}
.test-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px;overflow:hidden}
.test-header{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border)}
.test-icon{font-size:16px}
.test-name{flex:1;font-weight:500;font-size:13px}
.badge{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid}
.badge-ok{background:rgba(34,197,94,.1);color:var(--ok);border-color:var(--ok)}
.badge-err{background:rgba(239,68,68,.1);color:var(--err);border-color:var(--err)}
.badge-skip{background:rgba(245,158,11,.1);color:var(--skip);border-color:var(--skip)}
.dur{font-size:11px;color:var(--muted)}
.media-row{display:grid;grid-template-columns:1fr 1fr;gap:0}
.media-col{padding:12px 16px}
.media-col:first-child{border-right:1px solid var(--border)}
.thumb{width:100%;border-radius:4px;cursor:zoom-in;transition:opacity .15s}
.thumb:hover{opacity:.85}
.no-media{font-size:12px;color:var(--muted);padding:20px 0;text-align:center}
.video-wrap{display:flex;flex-direction:column;gap:8px}
.test-video{width:100%;border-radius:4px;background:#000;cursor:pointer}
.speed-row{display:flex;gap:4px;flex-wrap:wrap}
.spd{padding:2px 8px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-size:11px;transition:all .15s}
.spd:hover{border-color:var(--primary);color:var(--primary)}
.spd.active{background:var(--primary);border-color:var(--primary);color:#fff}
/* Lightbox */
.lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:100;align-items:center;justify-content:center}
.lb.open{display:flex}
.lb img,.lb video{max-width:92vw;max-height:88vh;border-radius:var(--r)}
.lb-close{position:absolute;top:16px;right:20px;font-size:28px;color:#fff;cursor:pointer;opacity:.7;line-height:1}
.lb-close:hover{opacity:1}
.lb-speed{position:absolute;bottom:24px;display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
</style>
</head>
<body>
<h1>${overallIcon} Run Report — ${runId}</h1>
<div class="run-meta">
  <span class="stat">📅 ${runDate}</span>
  <span class="stat">🧪 ${total} tests</span>
  <span class="stat" style="color:var(--ok)">✅ ${passed} passed</span>
  ${failed > 0 ? `<span class="stat" style="color:var(--err)">❌ ${failed} failed</span>` : ''}
</div>
${testCards}
<!-- Image lightbox -->
<div class="lb" id="imgLb"><span class="lb-close" id="imgLbClose">&times;</span><img id="lbImg" src="" alt=""></div>
<!-- Video lightbox -->
<div class="lb" id="vidLb">
  <span class="lb-close" id="vidLbClose">&times;</span>
  <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
    <video id="lbVid" controls style="max-width:92vw;max-height:82vh;border-radius:var(--r);background:#000"></video>
    <div class="lb-speed" id="lbSpeed">${speedBtns}</div>
  </div>
</div>
<script>
const imgLb=document.querySelector('#imgLb'),lbImg=document.querySelector('#lbImg');
const vidLb=document.querySelector('#vidLb'),lbVid=document.querySelector('#lbVid');
document.querySelectorAll('.thumb').forEach(img=>{
  img.addEventListener('click',()=>{lbImg.src=img.src;imgLb.classList.add('open');});
});
document.querySelectorAll('.test-video').forEach(vid=>{
  vid.addEventListener('click',()=>{
    lbVid.src=vid.src;vidLb.classList.add('open');lbVid.play();
  });
});
function closeVid(){lbVid.pause();lbVid.src='';vidLb.classList.remove('open');setSpeed(1);}
function setSpeed(r){
  lbVid.playbackRate=r;
  document.querySelectorAll('#lbSpeed .spd').forEach(b=>b.classList.toggle('active',Number(b.dataset.rate)===r));
}
document.querySelectorAll('#lbSpeed .spd').forEach(b=>{
  b.addEventListener('click',e=>{e.stopPropagation();setSpeed(Number(b.dataset.rate));});
});
imgLb.addEventListener('click',e=>{if(e.target===imgLb||e.target.id==='imgLbClose')imgLb.classList.remove('open');});
vidLb.addEventListener('click',e=>{if(e.target===vidLb||e.target.id==='vidLbClose')closeVid();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){imgLb.classList.remove('open');closeVid();}});
</script>
</body>
</html>`;
}

export default async function globalTeardown(config) {
  const outputDir = config.outputDir;
  if (!outputDir || !fs.existsSync(outputDir)) {
    console.log('report-generator: outputDir not found, skipping');
    return;
  }

  // Read results.json written by the JSON reporter
  const resultsFile = path.join(outputDir, 'results.json');
  let flatResults = [];
  try {
    const raw = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    flatResults = flattenSuites(raw.suites);
  } catch {
    console.log('report-generator: no results.json found, names/status will be inferred');
  }

  // Walk test subdirectories (sorted for stable ordering)
  const entries = fs.readdirSync(outputDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const tests = entries.map((e, i) => {
    const dir = path.join(outputDir, e.name);
    const files = fs.readdirSync(dir);
    const video = files.find(f => /\.(webm|mp4)$/i.test(f));
    const screenshot = files.find(f => /\.(png|jpg|jpeg)$/i.test(f));
    const matched = flatResults[i];
    return {
      name: matched?.title || cleanDirName(e.name),
      status: matched?.status || 'unknown',
      duration: matched?.duration || 0,
      video: video ? `./${e.name}/${video}` : null,
      screenshot: screenshot ? `./${e.name}/${screenshot}` : null,
    };
  });

  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const runId = path.basename(outputDir);

  const html = generateHtml({ runDir: outputDir, runId, tests, passed, failed, total: tests.length });
  const reportPath = path.join(outputDir, 'report.html');
  fs.writeFileSync(reportPath, html, 'utf8');
  console.log(`\n📋 Report generated: ${reportPath}`);
}
GENEOF
```

**Step 2: Verify it's valid ESM**

```bash
node --input-type=module --eval "import '/Volumes/DATA/GitHub/StakTrakr/devops/playwright-dash/report-generator.js'; console.log('ok')"
```

Expected: `ok`

**Step 3: Commit**

```bash
git add devops/playwright-dash/report-generator.js
git commit -m "feat(tests): add report-generator globalTeardown for per-run HTML reports"
```

---

### Task 3: Add /api/sessions to server.js

**Files:**
- Modify: `devops/playwright-dash/server.js`

**Context:** The server needs a new route `GET /api/sessions` that scans `test-results/` for subdirectories containing `report.html`. It reads `results.json` from each to get counts. Falls back to directory count if `results.json` is missing.

**Step 1: Read current server.js**

Read `devops/playwright-dash/server.js` to find the right insertion point (before the catch-all 404 handler at the bottom).

**Step 2: Add the getSessions function and route**

Add the `getSessions` function after the existing `getFiles` function:

```js
function getSessions() {
  if (!fs.existsSync(TEST_RESULTS_DIR)) return [];
  return fs.readdirSync(TEST_RESULTS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .filter(e => fs.existsSync(path.join(TEST_RESULTS_DIR, e.name, 'report.html')))
    .map(e => {
      const runDir = path.join(TEST_RESULTS_DIR, e.name);
      const stat = fs.statSync(path.join(runDir, 'report.html'));
      let total = 0, passed = 0, failed = 0;
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(runDir, 'results.json'), 'utf8'));
        total = (raw.stats?.expected || 0) + (raw.stats?.unexpected || 0) + (raw.stats?.skipped || 0);
        passed = raw.stats?.expected || 0;
        failed = raw.stats?.unexpected || 0;
      } catch {
        total = fs.readdirSync(runDir, { withFileTypes: true }).filter(x => x.isDirectory()).length;
      }
      return {
        id: e.name,
        reportUrl: `/files/test-results/${e.name}/report.html`,
        mtime: stat.mtimeMs,
        total,
        passed,
        failed,
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
}
```

Add the route inside the request handler, before the final 404 block:

```js
  if (method === 'GET' && url === '/api/sessions') {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getSessions()));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
```

**Step 3: Smoke test**

```bash
pkill -f "playwright-dash/server.js" 2>/dev/null; sleep 0.3
node /Volumes/DATA/GitHub/StakTrakr/devops/playwright-dash/server.js &
sleep 0.5
curl -s http://localhost:8766/api/sessions | python3 -m json.tool | head -30
```

Expected: JSON array. May be empty `[]` if no runs have `report.html` yet (that's fine — runs after this task will generate them).

**Step 4: Commit**

```bash
git add devops/playwright-dash/server.js
git commit -m "feat(dash): add /api/sessions endpoint for run history"
```

---

### Task 4: Add Sessions tab to index.html

**Files:**
- Modify: `devops/playwright-dash/index.html`

**Context:** Add a third tab pill "Sessions" to the toolbar. When active, hide the grid and show a sessions list. Each session card shows the run ID (formatted as a date), test counts, pass/fail badges, and an "Open Report" button that opens `report.html` in a new tab.

The sessions list is separate from `allFiles` — it's fetched from `/api/sessions` and rendered into a separate `<div id="sessions">` element that shows/hides with the tab.

**Step 1: Read current index.html**

Read `devops/playwright-dash/index.html` to understand current structure before editing.

**Step 2: Add Sessions tab pill**

In the `.tabs` div, add the third tab after the Videos button:

```html
<button class="tab" data-tab="sessions">Sessions</button>
```

**Step 3: Add sessions panel div and CSS**

After `<div class="grid" id="grid"></div>`, add:

```html
<div id="sessions" style="display:none;padding:20px;"></div>
```

Add CSS for session cards (alongside existing card styles):

```css
.session-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 18px; display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
.session-card:hover { border-color: var(--primary); }
.session-info { flex: 1; }
.session-id { font-weight: 500; font-size: 13px; }
.session-meta { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; gap: 10px; }
```

**Step 4: Add sessions JS logic**

Add a `fetchSessions` function and wire up the Sessions tab:

```js
const sessionsPanel = document.getElementById('sessions');

async function fetchSessions() {
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    if (sessions.length === 0) {
      sessionsPanel.innerHTML = '<div class="empty"><p>No completed sessions yet.<br>Run <code>npm test</code> to generate a report.</p></div>';
      return;
    }
    sessionsPanel.innerHTML = sessions.map(s => {
      const date = new Date(s.mtime).toLocaleString();
      const passColor = s.failed > 0 ? 'var(--danger)' : 'var(--success)';
      return `<div class="session-card">
        <div class="session-info">
          <div class="session-id">${s.id}</div>
          <div class="session-meta">
            <span>📅 ${date}</span>
            <span>🧪 ${s.total} tests</span>
            <span style="color:var(--success)">✅ ${s.passed}</span>
            ${s.failed > 0 ? `<span style="color:var(--danger)">❌ ${s.failed}</span>` : ''}
          </div>
        </div>
        <a href="${s.reportUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="text-decoration:none">Open Report</a>
      </div>`;
    }).join('');
  } catch (e) {
    sessionsPanel.innerHTML = '<div class="empty"><p>Error loading sessions</p></div>';
  }
}
```

Update the tab click handler to handle the Sessions tab:

```js
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    if (activeTab === 'sessions') {
      grid.style.display = 'none';
      sessionsPanel.style.display = 'block';
      fetchSessions();
    } else {
      grid.style.display = 'grid';
      sessionsPanel.style.display = 'none';
      renderGrid();
    }
  });
});
```

**Step 5: Restart and verify**

```bash
pkill -f "playwright-dash/server.js" 2>/dev/null; sleep 0.3
node /Volumes/DATA/GitHub/StakTrakr/devops/playwright-dash/server.js &
sleep 0.5
curl -s -o /dev/null -w "%{http_code}" http://localhost:8766/
```

Expected: `200`. Then open `http://localhost:8766` in browser (Cmd+Shift+R) and verify:
- "Sessions" tab appears in the toolbar
- Clicking it hides the grid and shows the sessions panel
- Panel shows "No completed sessions yet" (since no run has generated a report yet)

**Step 6: Commit**

```bash
git add devops/playwright-dash/index.html
git commit -m "feat(dash): add Sessions tab with run history and report links"
```

---

### Task 5: End-to-end verification

**Goal:** Generate an actual report by running the test suite against a live app instance, then verify it appears in the Sessions tab.

**Step 1: Generate a report from existing test-results dirs**

The existing `test-results/` dirs don't have `report.html` yet (they predate the report generator). Generate one manually for the most recent run:

```bash
cd /Volumes/DATA/GitHub/StakTrakr
# Find most recent test-results subdir
LATEST=$(ls -t test-results/ | head -1)
echo "Latest run: $LATEST"

# Run the generator manually against it
node --input-type=module --eval "
import teardown from './devops/playwright-dash/report-generator.js';
teardown({ outputDir: 'test-results/$LATEST' });
"
```

Expected: `📋 Report generated: test-results/<runId>/report.html`

**Step 2: Verify report.html was created**

```bash
ls test-results/$LATEST/report.html
wc -l test-results/$LATEST/report.html
```

Expected: file exists, 100+ lines.

**Step 3: Check Sessions tab in dashboard**

Open `http://localhost:8766`, Cmd+Shift+R, click Sessions tab.
Expected: session card appears with the run ID, test count, "Open Report" button.

**Step 4: Open report**

Click "Open Report". Expected: `report.html` opens in a new tab showing the dark-themed run report with test cards, screenshots, and videos.

**Step 5: Verify video speed controls work in report**

Click a video thumbnail in the report → video lightbox opens. Click `0.1×` → video slows to 0.1× speed. Close with Escape.

**Step 6: Commit plan doc as done (no code change needed)**

```bash
git add docs/plans/2026-02-20-sessions-report-generator.md
git commit -m "docs: mark sessions report generator plan complete"
```

---

## Verification Checklist

- [ ] `playwright.config.js` has `globalTeardown` and JSON reporter
- [ ] `npm test` auto-generates `report.html` in the run's output dir
- [ ] `report.html` is self-contained: dark theme, screenshots, videos, speed controls
- [ ] `/api/sessions` returns runs that have `report.html`
- [ ] Dashboard Sessions tab lists runs with Open Report button
- [ ] "Open Report" opens correct `report.html` in new tab
- [ ] Video lightbox in report has 0.1× → 10× speed controls
- [ ] Screenshot thumbnails in report open image lightbox on click
