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

// Calculation panels
function computeAggregates(results) {
  const vals = results.filter(v => typeof v === 'number');
  const sum = vals.reduce((a,b)=>a+b,0);
  const count = vals.length;
  const mean = count? sum/count : 0;
  const min = count? Math.min(...vals) : 0;
  const max = count? Math.max(...vals) : 0;
  return {count, sum, mean, min, max};
}

document.querySelectorAll('.panel-apply').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.panel;
    const formula = document.getElementById(`formula-${id}`).value;
    if (!parsedData) { alert('Load a CSV first'); return; }
    const jsExpr = translateFormula(formula);
    const results = applyFormulaToData(jsExpr);
    const agg = computeAggregates(results);
    const out = document.getElementById(`output-${id}`);
    out.innerHTML = `<div>Count: ${agg.count}</div><div>Sum: ${agg.sum.toFixed(2)}</div><div>Mean: ${agg.mean.toFixed(2)}</div><div>Min: ${agg.min}</div><div>Max: ${agg.max}</div>`;
  });
});

// Bulk run across files in csvhistory
document.getElementById('bulkRun').addEventListener('click', async () => {
  // fetch index.json
  const idx = await fetch('csvhistory/index.json').then(r=>r.json());
  const panelFormulas = [];
  for (let i=1;i<=5;i++) panelFormulas.push(document.getElementById(`formula-${i}`).value || '');

  const histories = [[],[],[],[],[]];
  const labels = [];

  for (const fname of idx) {
    labels.push(fname);
    const text = await fetch(`csvhistory/${fname}`).then(r=>r.text());
    const data = Papa.parse(text).data.filter(r=>r.length>0);
    const h = data.shift(); // headers
    // set temporary parsedData and headers for translation
    const backupParsed = parsedData;
    const backupHeaders = headers;
    parsedData = data;
    headers = h;

    for (let p=0;p<5;p++){
      const formula = panelFormulas[p] || '';
      if (!formula) { histories[p].push(null); continue; }
      const jsExpr = translateFormula(formula);
      const results = applyFormulaToData(jsExpr);
      const agg = computeAggregates(results);
      // attempt to extract a date from the CSV - look for common date column names
      const dateColCandidates = ['date','Date','timestamp','Timestamp','time','Time'];
      let dateVal = null;
      const dateIdx = h.findIndex(col => dateColCandidates.includes(col));
      if (dateIdx !== -1 && data[0] && data[0][dateIdx]) {
        // pick first row date as file-level date if present
        dateVal = data[0][dateIdx];
      }
      histories[p].push({file: fname, date: dateVal, value: agg.mean});
    }

    parsedData = backupParsed;
    headers = backupHeaders;
  }

  // render charts for each panel
  for (let p=0;p<5;p++){
    const ctx = document.getElementById(`histchart-${p+1}`).getContext('2d');
    if (window[`_hist_${p+1}`]) window[`_hist_${p+1}`].destroy();
    const points = histories[p].map(pt => pt? pt.value : null);
    window[`_hist_${p+1}`] = new Chart(ctx,{
      type:'line',
      data:{labels, datasets:[{label:`Panel ${p+1} Mean`, data:points}]},
      options:{responsive:true,maintainAspectRatio:false}
    });

    // build history table for panel
    const tableDiv = document.getElementById(`histtable-${p+1}`);
    tableDiv.innerHTML = '';
    const tbl = document.createElement('table'); tbl.className = 'history-table';
    const thead = document.createElement('tr');
    ['File','Date','Value'].forEach(hh => { const th = document.createElement('th'); th.textContent = hh; thead.appendChild(th); });
    tbl.appendChild(thead);
    // parse date strings into Date objects for sorting
    const rows = histories[p].map(pt => {
      let parsedDate = null;
      if (pt && pt.date) {
        const d = new Date(pt.date);
        if (!isNaN(d.getTime())) parsedDate = d;
      }
      return {file: pt?pt.file:'', date: parsedDate, dateRaw: pt?pt.date:'', value: pt?pt.value:null};
    }).sort((a,b) => (a.date? a.date.getTime():0) - (b.date? b.date.getTime():0));

    rows.forEach(r => {
      const tr = document.createElement('tr');
      const tdFile = document.createElement('td'); tdFile.textContent = r.file; tr.appendChild(tdFile);
      const tdDate = document.createElement('td'); tdDate.textContent = r.date? r.date.toISOString().slice(0,10): r.dateRaw; tr.appendChild(tdDate);
      const tdVal = document.createElement('td'); tdVal.textContent = r.value !== null? r.value.toFixed(2): ''; tr.appendChild(tdVal);
      tbl.appendChild(tr);
    });

    tableDiv.appendChild(tbl);
  }
});
