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

function generateHtml({ runId, tests, passed, failed, total }) {
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
  <span>📅 ${runDate}</span>
  <span>🧪 ${total} tests</span>
  <span style="color:var(--ok)">✅ ${passed} passed</span>
  ${failed > 0 ? `<span style="color:var(--err)">❌ ${failed} failed</span>` : ''}
</div>
${testCards}
<div class="lb" id="imgLb"><span class="lb-close" id="imgLbClose">&times;</span><img id="lbImg" src="" alt=""></div>
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
  vid.addEventListener('click',()=>{lbVid.src=vid.src;vidLb.classList.add('open');lbVid.play();});
});
function setSpeed(r){
  lbVid.playbackRate=r;
  document.querySelectorAll('#lbSpeed .spd').forEach(b=>b.classList.toggle('active',Number(b.dataset.rate)===r));
}
function closeVid(){lbVid.pause();lbVid.src='';vidLb.classList.remove('open');setSpeed(1);}
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

/**
 * Delete test-result run dirs and screenshot files older than DASH_RETAIN_DAYS (default 7).
 * Run dirs use the YYYY-MM-DD-HH-MM-SS naming convention so date is parsed from the name.
 * Screenshot files are pruned by mtime (no date in filename).
 */
function pruneOld() {
  const RETAIN_MS = (Number(process.env.DASH_RETAIN_DAYS) || 7) * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - RETAIN_MS;

  const resultsDir = path.resolve(__dirname, '..', '..', 'test-results');
  const screenshotsDir = path.resolve(__dirname, '..', 'screenshots');

  let prunedDirs = 0;
  let prunedFiles = 0;

  // Prune run directories by parsing date from name (YYYY-MM-DD-HH-MM-SS)
  if (fs.existsSync(resultsDir)) {
    for (const entry of fs.readdirSync(resultsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const m = entry.name.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})$/);
      if (!m) continue;
      const runMs = new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]).getTime();
      if (runMs < cutoff) {
        fs.rmSync(path.join(resultsDir, entry.name), { recursive: true, force: true });
        prunedDirs++;
      }
    }
  }

  // Prune screenshot files by mtime
  if (fs.existsSync(screenshotsDir)) {
    for (const entry of fs.readdirSync(screenshotsDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const full = path.join(screenshotsDir, entry.name);
      const { mtimeMs } = fs.statSync(full);
      if (mtimeMs < cutoff) {
        fs.unlinkSync(full);
        prunedFiles++;
      }
    }
  }

  if (prunedDirs > 0 || prunedFiles > 0) {
    const days = process.env.DASH_RETAIN_DAYS || 7;
    console.log(`\n🧹 Pruned ${prunedDirs} run dir(s), ${prunedFiles} screenshot(s) older than ${days} days`);
  }
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
    console.log('report-generator: no results.json found, names/status will be inferred from dir names');
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

  const html = generateHtml({ runId, tests, passed, failed, total: tests.length });
  const reportPath = path.join(outputDir, 'report.html');
  fs.writeFileSync(reportPath, html, 'utf8');
  console.log(`\n📋 Report generated: ${reportPath}`);
  pruneOld();
}
