#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        total = (raw.stats?.expected ?? 0) + (raw.stats?.unexpected ?? 0) + (raw.stats?.skipped ?? 0);
        passed = raw.stats?.expected ?? 0;
        failed = raw.stats?.unexpected ?? 0;
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

function resolveFilePath(urlPath) {
  const rel = urlPath.slice('/files/'.length);
  const parts = rel.split('/');
  let base;
  if (parts[0] === 'screenshots') {
    base = SCREENSHOTS_DIR;
  } else if (parts[0] === 'test-results') {
    base = TEST_RESULTS_DIR;
  } else {
    return null;
  }
  const resolved = path.resolve(base, parts.slice(1).join('/'));
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return resolved;
}

async function capture(targetUrl) {
  ensureDir(SCREENSHOTS_DIR);
  const ts = new Date().toISOString().replace(/[:.TZ]/g, '-').slice(0, -1);
  const dest = path.join(SCREENSHOTS_DIR, `capture-${ts}.png`);
  const url = targetUrl || process.env.TEST_URL || 'http://localhost:8765';

  const browserlessUrl = process.env.BROWSERLESS_URL;
  if (browserlessUrl) {
    // In Docker: use browserless REST API — no Playwright install needed
    const token = process.env.BROWSERLESS_TOKEN || 'local_dev_token';
    const res = await fetch(`${browserlessUrl}/screenshot?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, options: { fullPage: true } }),
    });
    if (!res.ok) throw new Error(`Browserless screenshot failed: ${res.status} ${await res.text()}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return dest;
  }

  // Local fallback: npx playwright screenshot
  const result = spawnSync('npx', [
    'playwright', 'screenshot', url, dest,
    '--browser=chromium', '--full-page',
  ], { timeout: 30000, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'playwright screenshot failed');
  return dest;
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/') {
    const html = fs.readFileSync(INDEX_HTML);
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
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

  if (method === 'GET' && url === '/api/sessions') {
    try {
      const sessions = getSessions();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sessions));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (method === 'POST' && url === '/api/capture') {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', async () => {
      try {
        const { targetUrl } = body ? JSON.parse(body) : {};
        const dest = await capture(targetUrl);
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
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  if (method === 'DELETE' && url.startsWith('/api/sessions/')) {
    const id = url.slice('/api/sessions/'.length);
    if (!/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(id)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid session id' }));
      return;
    }
    const target = path.join(TEST_RESULTS_DIR, id);
    if (!fs.existsSync(target)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    try {
      fs.rmSync(target, { recursive: true, force: true });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (method === 'DELETE' && url === '/api/files') {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      try {
        let parsed;
        try { parsed = JSON.parse(body); } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }
        const { path: urlPath } = parsed;
        if (!urlPath || typeof urlPath !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing path' }));
          return;
        }
        const filePath = resolveFilePath(urlPath);
        if (!filePath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        fs.unlinkSync(filePath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (method === 'DELETE' && url === '/api/all') {
    try {
      let dirs = 0, files = 0;
      if (fs.existsSync(TEST_RESULTS_DIR)) {
        for (const e of fs.readdirSync(TEST_RESULTS_DIR, { withFileTypes: true })) {
          if (e.isDirectory()) {
            fs.rmSync(path.join(TEST_RESULTS_DIR, e.name), { recursive: true, force: true });
            dirs++;
          }
        }
      }
      if (fs.existsSync(SCREENSHOTS_DIR)) {
        for (const e of fs.readdirSync(SCREENSHOTS_DIR, { withFileTypes: true })) {
          if (e.isFile()) {
            try { fs.unlinkSync(path.join(SCREENSHOTS_DIR, e.name)); files++; } catch { /* skip */ }
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, dirs, files }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (method === 'GET' && /^\/api\/sessions\/[^/]+\/videos$/.test(url)) {
    const id = decodeURIComponent(url.split('/')[3]);
    if (!/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(id)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid session id' }));
      return;
    }
    const sessionDir = path.join(TEST_RESULTS_DIR, id);
    if (!fs.existsSync(sessionDir)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    const videos = walkDir(sessionDir, ['.webm', '.mp4'], path.join('test-results', id))
      .sort((a, b) => a.mtime - b.mtime)
      .map(f => {
        const parts = f.rel.split(path.sep);
        // parts: ['test-results', sessionId, testDir, 'video.webm']
        const label = parts.length >= 3 ? parts[parts.length - 2] : basename(f.rel);
        return { path: '/files/' + f.rel.split(path.sep).join('/'), label };
      });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(videos));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Playwright Dashboard: http://localhost:${PORT}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
  console.log(`Test results: ${TEST_RESULTS_DIR}`);
});
