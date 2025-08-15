// Simple CSV formula prototype
// - Parses CSV with PapaParse
// - Translates simple Excel-like formulas to JS per-row
// Supported: + - * /, parentheses, column letters (A, B, C) or column headers in square brackets [col]

let parsedData = null;
let headers = [];
// histories will hold per-panel arrays of {file,date,value}
let histories = [[],[],[],[],[]];

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

function renderTable(results, opts = {previewRows:10}) {
  const table = document.getElementById('table');
  table.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'table-preview-wrap';
  const tbl = document.createElement('table');
  tbl.className = 'preview-table';
  // helper: 0 -> A, 25 -> Z, 26 -> AA
  function colIndexToLetter(index) {
    let s = '';
    let n = index + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  // Top row: column letters (plus top-left corner)
  const topRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.className = 'rownum top-left sticky-top';
  corner.textContent = '';
  topRow.appendChild(corner);
  for (let j = 0; j < headers.length; j++) {
    const th = document.createElement('th');
    th.className = 'col-letter sticky-top';
    th.textContent = colIndexToLetter(j);
    topRow.appendChild(th);
  }
  const resTop = document.createElement('th');
  resTop.className = 'sticky-top';
  resTop.textContent = '';
  topRow.appendChild(resTop);
  tbl.appendChild(topRow);

  // Header row: actual header names
  const headerRow = document.createElement('tr');
  const headerCorner = document.createElement('th');
  headerCorner.className = 'rownum';
  headerCorner.textContent = 'Header';
  headerRow.appendChild(headerCorner);
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  const resHead = document.createElement('th');
  resHead.textContent = 'FormulaResult';
  headerRow.appendChild(resHead);
  tbl.appendChild(headerRow);

  const rowsToShow = Math.min(opts.previewRows || 10, parsedData.length);
  for (let i = 0; i < rowsToShow; i++) {
    const r = parsedData[i];
    const tr = document.createElement('tr');
    const rowNumTd = document.createElement('td');
    rowNumTd.className = 'rownum';
    rowNumTd.textContent = String(i + 1);
    tr.appendChild(rowNumTd);
    for (let j = 0; j < r.length; j++) {
      const td = document.createElement('td');
      td.textContent = r[j];
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = results && results[i] !== undefined ? results[i] : '';
    tr.appendChild(td);
    tbl.appendChild(tr);
  }

  wrap.appendChild(tbl);
  table.appendChild(wrap);

  // add small footer note
  const note = document.createElement('div');
  note.className = 'table-note';
  note.textContent = `Showing ${rowsToShow} of ${parsedData.length} rows. Use CSV history for more.`;
  table.appendChild(note);
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
  // show filename
  document.getElementById('filename').textContent = file.name;
  // populate the fixed inline preview table immediately
  try {
    const sel = document.getElementById('previewRowsSelect');
    const rows = parseInt(localStorage.getItem('previewRows') || sel.value || '10', 10);
    sel.value = String(rows);
    renderTable(null, {previewRows: rows});
  } catch (e) { console.warn('renderTable failed on upload', e); }
    }
  });
});

document.getElementById('apply').addEventListener('click', () => {
  const formula = document.getElementById('formulaInput').value;
  if (!parsedData) { alert('Load a CSV first'); return; }
  const jsExpr = translateFormula(formula);
  const results = applyFormulaToData(jsExpr);
  const rows = parseInt(localStorage.getItem('previewRows') || document.getElementById('previewRowsSelect').value || '10',10);
  renderTable(results, {previewRows: rows});
  renderChart(results);
});

// preview rows selector handling
const previewSel = document.getElementById('previewRowsSelect');
previewSel.addEventListener('change', () => {
  const v = parseInt(previewSel.value,10) || 10;
  localStorage.setItem('previewRows', String(v));
  if (parsedData) renderTable(null, {previewRows: v});
});
// initialize selector from storage
const storedPreview = parseInt(localStorage.getItem('previewRows') || '10',10);
if (document.getElementById('previewRowsSelect')) document.getElementById('previewRowsSelect').value = String(storedPreview);

// Sample data generator for testing before any upload
function generateSampleData(cols = 8, rows = 50) {
  // headers as single letters A..Z, AA.. etc.
  function colIndexToLetter(index) {
    let s = '';
    let n = index + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }
  headers = [];
  for (let c = 0; c < cols; c++) headers.push(colIndexToLetter(c));
  parsedData = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      // random numbers with small variance
      const val = (Math.random() * 100).toFixed(2);
      row.push(val);
    }
    parsedData.push(row);
  }
  document.getElementById('filename').textContent = 'sample-data';
  try {
    const sel = document.getElementById('previewRowsSelect');
    const p = parseInt(localStorage.getItem('previewRows') || sel.value || '10', 10);
    sel.value = String(p);
    renderTable(null, {previewRows: p});
  } catch (e) { console.warn('renderTable failed on sample data', e); }
}

// If no CSV is uploaded, populate with sample data for testing
if (!parsedData || parsedData.length === 0) {
  generateSampleData(12, 149);
}

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

// Track changes
function setTrackedPanel(id) {
  localStorage.setItem('trackedPanel', String(id));
  document.querySelectorAll('.panel-track').forEach(b=>b.textContent='Track Changes');
  document.querySelector(`.panel-track[data-panel="${id}"]`).textContent = 'Tracking';
  document.getElementById('trackedCard').textContent = `Tracking panel ${id}`;
}

document.querySelectorAll('.panel-track').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.panel;
    setTrackedPanel(id);
  });
});

// init tracked panel from storage
const initialTracked = localStorage.getItem('trackedPanel');
if (initialTracked) setTrackedPanel(initialTracked);

// Bulk run across files in csvhistory
document.getElementById('bulkRun').addEventListener('click', async () => {
  // ensure we have a sample uploaded to define header and filename conventions
  const warningsEl = document.getElementById('bulkWarnings');
  warningsEl.innerHTML = '';
  if (!headers || headers.length === 0) {
    warningsEl.innerHTML = '<div class="warn">Upload a sample CSV first to establish header and filename conventions.</div>';
    return;
  }

  // build filename regex from uploaded filename (digit sequences -> \d+)
  const fnameSample = document.getElementById('filename').textContent || '';
  function filenamePatternFrom(name) {
    if (!name) return null;
    // escape regex chars, then replace digit groups with \d+
    const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = escaped.replace(/\\\d\+/g, '\\d+');
    // fallback: replace any digit sequences with \d+
    const pat2 = pattern.replace(/\\d\{1,\}/g, '\\d+');
    // simpler approach: replace contiguous digits with \d+
    const simple = escaped.replace(/\d+/g, '\\d+');
    return new RegExp('^' + simple + '$');
  }

  const namePattern = filenamePatternFrom(fnameSample);
  if (!namePattern) {
    warningsEl.innerHTML = '<div class="warn">Unable to determine filename pattern from uploaded file name.</div>';
    return;
  }

  // fetch index.json
  const idx = await fetch('csvhistory/index.json').then(r=>r.json());
  const panelFormulas = [];
  for (let i=1;i<=5;i++) panelFormulas.push(document.getElementById(`formula-${i}`).value || '');

  // reset histories
  histories = [[],[],[],[],[]];
  const processedLabels = [];
  const skipped = [];

  // canonical headers (from uploaded sample)
  const canonHeaders = headers.map(h => String(h).trim());

  for (const fname of idx) {
    // filename must match pattern
    if (!namePattern.test(fname)) {
      skipped.push({file: fname, reason: 'filename pattern mismatch'});
      continue;
    }

    const text = await fetch(`csvhistory/${fname}`).then(r=>r.text());
    const data = Papa.parse(text).data.filter(r=>r.length>0);
    if (data.length === 0) { skipped.push({file: fname, reason: 'empty file'}); continue; }
    const h = data.shift(); // headers

    // header match check (simple exact match case-insensitive)
    const hdrs = h.map(x => String(x).trim());
    const headersEqual = hdrs.length === canonHeaders.length && hdrs.every((v,i)=> v.toLowerCase() === canonHeaders[i].toLowerCase());
    if (!headersEqual) { skipped.push({file: fname, reason: 'header mismatch'}); continue; }

    // accepted file
    processedLabels.push(fname);

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

  // show warnings for skipped files
  if (skipped.length) {
    warningsEl.innerHTML = '<div class="warn"><strong>Skipped files:</strong><ul>' + skipped.map(s=>`<li>${s.file}: ${s.reason}</li>`).join('') + '</ul></div>';
  }

  // render charts for each panel using only processedLabels
  for (let p=0;p<5;p++){
    const ctx = document.getElementById(`histchart-${p+1}`).getContext('2d');
    if (window[`_hist_${p+1}`]) window[`_hist_${p+1}`].destroy();
    const points = histories[p].map(pt => pt? pt.value : null);
    window[`_hist_${p+1}`] = new Chart(ctx,{
      type:'line',
      data:{labels:processedLabels, datasets:[{label:`Panel ${p+1} Mean`, data:points}]},
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

  // Render histories (used for import/export to rebuild charts and tables)
  function renderHistories() {
    const processedLabels = histories[0].map(h=>h? h.file : '');
    for (let p=0;p<5;p++){
      const ctx = document.getElementById(`histchart-${p+1}`).getContext('2d');
      if (window[`_hist_${p+1}`]) window[`_hist_${p+1}`].destroy();
      const points = histories[p].map(pt => pt? pt.value : null);
      window[`_hist_${p+1}`] = new Chart(ctx,{type:'line',data:{labels:processedLabels,datasets:[{label:`Panel ${p+1} Mean`,data:points}]},options:{responsive:true,maintainAspectRatio:false}});

      const tableDiv = document.getElementById(`histtable-${p+1}`);
      tableDiv.innerHTML = '';
      const tbl = document.createElement('table'); tbl.className = 'history-table';
      const thead = document.createElement('tr'); ['File','Date','Value'].forEach(hh => { const th = document.createElement('th'); th.textContent = hh; thead.appendChild(th); }); tbl.appendChild(thead);
      const rows = histories[p].map(pt=> ({file:pt?pt.file:'', dateRaw: pt? pt.date:'', value:pt?pt.value:null}));
      rows.forEach(r=>{ const tr=document.createElement('tr'); const td1=document.createElement('td'); td1.textContent=r.file; tr.appendChild(td1); const td2=document.createElement('td'); td2.textContent=r.dateRaw; tr.appendChild(td2); const td3=document.createElement('td'); td3.textContent=r.value!==null? r.value.toFixed(2):''; tr.appendChild(td3); tbl.appendChild(tr); });
      tableDiv.appendChild(tbl);
    }
  }

  // Export histories to JSON
  document.getElementById('exportHistory').addEventListener('click', () => {
    const payload = { exportedAt: new Date().toISOString(), histories };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `csvtools-history-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // Import histories from JSON
  document.getElementById('importHistory').addEventListener('click', () => {
    document.getElementById('importHistoryFile').click();
  });
  document.getElementById('importHistoryFile').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data && data.histories) {
          histories = data.histories;
          renderHistories();
          alert('Imported history JSON and rebuilt charts.');
        } else alert('Invalid history JSON file');
      } catch (err) { alert('Failed to parse JSON: ' + err.message); }
    }; reader.readAsText(f);
  });
