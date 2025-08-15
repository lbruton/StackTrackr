// Simple CSV formula prototype
// - Parses CSV with PapaParse
// - Translates simple Excel-like formulas to JS per-row
// Supported: + - * /, parentheses, column letters (A, B, C) or column headers in square brackets [col]

let parsedData = null;
let headers = [];

function colLetterToIndex(letter) {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function translateFormula(formula) {
  // Expect formula like =A*B+C or =[col1]*[col2]+10
  let f = formula.trim();
  if (f.startsWith('=')) f = f.slice(1);

  // Replace [col] with row access
  f = f.replace(/\[([^\]]+)\]/g, (m, p1) => `row['${p1}']`);
  // Replace single-letter columns A..Z with row['colname'] using headers
  f = f.replace(/\b([A-Za-z])\b/g, (m, p1) => {
    const idx = colLetterToIndex(p1);
    if (headers[idx]) return `row['${headers[idx]}']`;
    return m;
  });

  // Wrap numeric conversion
  f = f.replace(/row\['([^']+)'\]/g, (m, p1) => `toNumber(${m})`);

  return f;
}

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function applyFormulaToData(jsExpr) {
  const results = [];
  for (const r of parsedData) {
    const row = {};
    headers.forEach((h, i) => row[h] = r[i]);
    try {
      // eslint-disable-next-line no-eval
      const value = eval(jsExpr);
      results.push(value);
    } catch (e) {
      results.push(null);
    }
  }
  return results;
}

function renderTable(results) {
  const table = document.getElementById('table');
  table.innerHTML = '';
  const tbl = document.createElement('table');
  tbl.border = 1;
  const thead = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    thead.appendChild(th);
  });
  const th = document.createElement('th');
  th.textContent = 'FormulaResult';
  thead.appendChild(th);
  tbl.appendChild(thead);

  parsedData.forEach((r, i) => {
    const tr = document.createElement('tr');
    r.forEach(c => {
      const td = document.createElement('td');
      td.textContent = c;
      tr.appendChild(td);
    });
    const td = document.createElement('td');
    td.textContent = results[i];
    tr.appendChild(td);
    tbl.appendChild(tr);
  });
  table.appendChild(tbl);
}

function renderChart(results) {
  const ctx = document.getElementById('chart').getContext('2d');
  if (window._chart) window._chart.destroy();
  window._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: parsedData.map((_, i) => i+1),
      datasets: [{
        label: 'Formula Result',
        data: results
      }]
    }
  });
}

// Events
document.getElementById('csvfile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    complete: (res) => {
      parsedData = res.data.filter(r => r.length > 0);
      headers = parsedData.shift();
      alert(`Loaded ${parsedData.length} rows, ${headers.length} columns`);
  // enable view table button and show filename
  document.getElementById('viewTable').disabled = false;
  document.getElementById('filename').textContent = file.name;
  document.getElementById('viewTable').dataset.filename = file.name;
    }
  });
});

document.getElementById('apply').addEventListener('click', () => {
  const formula = document.getElementById('formulaInput').value;
  if (!parsedData) { alert('Load a CSV first'); return; }
  const jsExpr = translateFormula(formula);
  const results = applyFormulaToData(jsExpr);
  renderTable(results);
  renderChart(results);
});

// Modal table viewer
const modal = document.getElementById('tableModal');
const modalWrap = document.getElementById('modalTableWrap');
const modalFilename = document.getElementById('modalFilename');

function buildModalTable() {
  modalWrap.innerHTML = '';
  const tbl = document.createElement('table');
  tbl.className = 'wide-table';
  const thead = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th'); th.textContent = h; thead.appendChild(th);
  });
  tbl.appendChild(thead);
  parsedData.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(c => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
    tbl.appendChild(tr);
  });
  modalWrap.appendChild(tbl);
}

document.getElementById('viewTable').addEventListener('click', () => {
  if (!parsedData) return;
  modalFilename.textContent = document.getElementById('viewTable').dataset.filename || 'CSV Table';
  buildModalTable();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
});

document.getElementById('closeModal').addEventListener('click', () => {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
});

// Click outside to close
modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); } });
