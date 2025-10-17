/* -------- helpers -------- */
function parseValue(str) {
  if (str === null || str === undefined) return NaN;
  str = String(str).trim();
  if (str === '') return NaN;
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length !== 2) return NaN;
    const a = parseFloat(parts[0].trim());
    const b = parseFloat(parts[1].trim());
    if (!isFinite(a) || !isFinite(b) || b === 0) return NaN;
    return a / b;
  }
  const v = parseFloat(str);
  return isFinite(v) ? v : NaN;
}
function setHTML(el, html) { el.innerHTML = html; }

/* UI refs */
const generateBtn = document.getElementById('generateBtn');
const calculateBtn = document.getElementById('calculateBtn');
const matrixContainer = document.getElementById('matrixContainer');
const finalResultBox = document.getElementById('finalResultBox');
const resultDiv = document.getElementById('result');
const exportBtn = document.getElementById('exportBtn');

generateBtn.addEventListener('click', generateAllMatrices);
calculateBtn.addEventListener('click', calculateAHPAll);
exportBtn.addEventListener('click', exportToExcel);

/* RI table */
const RI_values = {1:0,2:0,3:0.58,4:0.9,5:1.12,6:1.24,7:1.32,8:1.41,9:1.45,10:1.49,11:1.51,12:1.48};

/* Build UI */
function generateAllMatrices() {
  const n = parseInt(document.getElementById('criteriaCount').value);
  const m = parseInt(document.getElementById('alternativeCount').value);
  if (!Number.isInteger(n) || n < 2 || n > 12) { alert('Enter criteria count between 2 and 12'); return; }
  if (!Number.isInteger(m) || m < 2 || m > 12) { alert('Enter alternative count between 2 and 12'); return; }

  matrixContainer.innerHTML = '';
  finalResultBox.style.display = 'none';
  resultDiv.innerHTML = '';
  exportBtn.style.display = 'none';
  calculateBtn.style.display = 'inline-block';

  // Criteria matrix panel (simplified heading)
  const critPanel = document.createElement('div');
  critPanel.className = 'matrix-panel';
  critPanel.innerHTML = `<h3>Criteria Pairwise Comparison</h3>
    <div class="table-wrap"><table id="criteriaMatrix">${buildSquareTableHTML(n,'C')}</table></div>
    <div id="critInlineResult" class="inline-result"><div class="content" id="critInlineContent"></div></div>`;
  matrixContainer.appendChild(critPanel);

  // Alternatives matrices: one panel per criterion (heading simplified, no numeric prefix)
  for (let k=0;k<n;k++){
    const panel = document.createElement('div');
    panel.className = 'matrix-panel';
    panel.innerHTML = `<h3>Alternatives Pairwise under Criterion C${k+1}</h3>
      <div class="table-wrap"><table id="altMatrix-${k}">${buildSquareTableHTML(m,'A')}</table></div>
      <div id="altInlineResult-${k}" class="inline-result"><div class="content" id="altInlineContent-${k}"></div></div>`;
    matrixContainer.appendChild(panel);
  }

  // attach reciprocity handlers and live calculation handlers
  matrixContainer.querySelectorAll('table').forEach(table=>{
    table.querySelectorAll('input[data-i][data-j]').forEach(inp=>{
      const i = parseInt(inp.dataset.i,10);
      const j = parseInt(inp.dataset.j,10);
      // diagonal readOnly & value 1
      if (i === j) {
        inp.value = '1';
        inp.readOnly = true;
      } else if (i < j) {
        // upper triangle user-editable
        inp.addEventListener('input', (e)=>onUpperInputTable(e, table));
      } else {
        // lower triangle readOnly (reciprocal)
        const target = table.querySelector(`input[data-i="${j}"][data-j="${i}"]`);
        if (target) {
          inp.readOnly = true;
          // initialize reciprocal
          const v = parseValue(target.value);
          if (isFinite(v) && v !== 0) inp.value = (1/v).toFixed(4);
          else inp.value = '';
        }
      }
    });

    // add live-update on any input change (debounced per table)
    table.addEventListener('input', ()=>debouncedComputeTable(table, 300));
    // compute initial inline result
    debouncedComputeTable(table, 50);
  });
}

/* build html for an n x n table with labelType prefix ('C' or 'A') */
function buildSquareTableHTML(n, labelType) {
  let html = '<tr><th></th>';
  for (let j=0;j<n;j++) html += `<th>${labelType}${j+1}</th>`;
  html += '</tr>';
  for (let i=0;i<n;i++){
    html += `<tr><th>${labelType}${i+1}</th>`;
    for (let j=0;j<n;j++){
      const readonly = (i===j) ? 'readonly' : (i>j ? 'readonly' : '');
      const val = (i===j) ? '1' : '1';
      html += `<td><input class="cell" data-i="${i}" data-j="${j}" type="text" value="${val}" ${readonly}></td>`;
    }
    html += '</tr>';
  }
  return html;
}

/* when user types into upper triangle cell, update reciprocal cell */
function onUpperInputTable(e, table) {
  const inp = e.target;
  const i = parseInt(inp.dataset.i, 10);
  const j = parseInt(inp.dataset.j, 10);
  const val = parseValue(inp.value);
  const target = table.querySelector(`input[data-i="${j}"][data-j="${i}"]`);
  if (!target) return;
  if (!isFinite(val) || val === 0) {
    target.value = '';
  } else {
    target.value = (1 / val).toFixed(4);
  }
}

/* debounce helper per table element */
function debouncedComputeTable(table, wait) {
  if (!table) return;
  if (table._timeout) clearTimeout(table._timeout);
  table._timeout = setTimeout(()=>{ computeAndShowForTable(table); }, wait);
}

/* read a matrix from a table element into numeric 2D array, validates */
function readMatrixFromTable(table) {
  const rows = table.querySelectorAll('tr');
  const n = rows.length - 1;
  const matrix = Array.from({length:n}, ()=>Array(n).fill(0));
  const errors = [];
  for (let i=0;i<n;i++){
    const inputs = rows[i+1].querySelectorAll('input');
    for (let j=0;j<n;j++){
      const raw = (inputs[j] && inputs[j].value) ? inputs[j].value : '';
      const v = parseValue(raw);
      if (!isFinite(v) || v <= 0) {
        errors.push(`Invalid at table "${table.id}" row ${i+1}, col ${j+1}: "${raw}"`);
      } else matrix[i][j] = v;
    }
  }
  return {matrix, errors, n};
}

/* compute priorities using column normalization method; returns object with details */
function computePriorities(matrix) {
  const n = matrix.length;
  const colSums = Array(n).fill(0);
  for (let j=0;j<n;j++){
    for (let i=0;i<n;i++) colSums[j] += matrix[i][j];
    if (colSums[j] === 0) colSums[j] = 1e-12;
  }
  const normalized = Array.from({length:n}, ()=>Array(n).fill(0));
  for (let i=0;i<n;i++) for (let j=0;j<n;j++) normalized[i][j] = matrix[i][j] / colSums[j];
  const priorities = normalized.map(row => row.reduce((a,b)=>a+b,0)/n);
  // weighted sum vector
  const weighted = Array(n).fill(0);
  for (let i=0;i<n;i++){
    let s=0;
    for (let j=0;j<n;j++) s += matrix[i][j] * priorities[j];
    weighted[i] = s;
  }
  const lambdaVec = weighted.map((w,i)=> w / priorities[i]);
  const lambdaMax = lambdaVec.reduce((a,b)=>a+b,0) / n;
  const CI = (lambdaMax - n) / (n - 1);
  const RI = RI_values[n] ?? 1.49;
  const CR = RI === 0 ? 0 : CI / RI;
  return {normalized, priorities, lambdaMax, CI, RI, CR};
}

/* compute & show inline result for a particular table */
function computeAndShowForTable(table) {
  if (!table || !table.id) return;
  const {matrix, errors, n} = readMatrixFromTable(table);
  // find corresponding inline result container
  let inlineContent = null;
  if (table.id === 'criteriaMatrix') inlineContent = document.getElementById('critInlineContent');
  else if (table.id.startsWith('altMatrix-')) {
    const idx = table.id.split('-')[1];
    inlineContent = document.getElementById(`altInlineContent-${idx}`);
  }
  if (!inlineContent) return;

  if (errors.length) {
    inlineContent.innerHTML = `<div class="small">Please correct inputs.</div><pre>${errors.join('\n')}</pre>`;
    return;
  }

  const res = computePriorities(matrix);

  let html = `<p class="small"><strong>λmax:</strong> ${res.lambdaMax.toFixed(4)} &nbsp; <strong>CI:</strong> ${res.CI.toFixed(4)} &nbsp; <strong>RI:</strong> ${res.RI.toFixed(4)} &nbsp; <strong>CR:</strong> ${res.CR.toFixed(4)}</p>`;
  html += `${res.CR < 0.1 ? '<p class="good">✓ Consistency acceptable (CR &lt; 0.10)</p>' : '<p class="bad">✗ Consistency NOT acceptable (CR ≥ 0.10)</p>'}`;
  html += `<p><strong>Priority vector:</strong></p><pre>[ ${res.priorities.map(v=>v.toFixed(4)).join(', ')} ]</pre>`;

  inlineContent.innerHTML = html;
}

/* Main calculation: criteria + alternative matrices -> final ranking */
function calculateAHPAll() {
  resultDiv.innerHTML = '';
  finalResultBox.style.display = 'none';
  const critTable = document.getElementById('criteriaMatrix');
  if (!critTable) { alert('Generate matrices first'); return; }

  const {matrix:critM, errors:critErrs, n:critN} = readMatrixFromTable(critTable);
  if (critErrs.length) {
    setHTML(resultDiv, `<div class="bad">Please correct inputs for Criteria matrix.</div><pre>${critErrs.join('\n')}</pre>`);
    finalResultBox.style.display = 'block';
    return;
  }
  const critRes = computePriorities(critM);

  const altCount = parseInt(document.getElementById('alternativeCount').value,10);
  const criteriaCount = critN;
  const altPriorityUnderCriterion = [];
  const allErrors = [];

  for (let k=0;k<criteriaCount;k++){
    const tid = `altMatrix-${k}`;
    const t = document.getElementById(tid);
    if (!t) { allErrors.push(`Missing table ${tid}`); continue; }
    const {matrix:am, errors:amErrs, n:amN} = readMatrixFromTable(t);
    if (amErrs.length) { allErrors.push(...amErrs); continue; }
    if (amN !== altCount) { allErrors.push(`Alternative matrix size mismatch for ${tid}`); continue; }
    const res = computePriorities(am);
    altPriorityUnderCriterion.push(res.priorities);
  }

  if (allErrors.length) {
    setHTML(resultDiv, `<div class="bad">Please correct inputs for Alternatives matrices.</div><pre>${allErrors.join('\n')}</pre>`);
    finalResultBox.style.display = 'block';
    return;
  }

  // Final aggregation
  const finalWeights = Array(altCount).fill(0);
  for (let j=0;j<altCount;j++){
    let s = 0;
    for (let i=0;i<criteriaCount;i++){
      s += critRes.priorities[i] * altPriorityUnderCriterion[i][j];
    }
    finalWeights[j] = s;
  }
  const ranking = finalWeights.map((w,idx)=>({alt:`A${idx+1}`, weight:w}));
  ranking.sort((a,b)=>b.weight - a.weight);

  // Build final HTML
  let html = `<h3>Final Results</h3>`;
  html += `<div><p class="small"><strong>Criteria (n):</strong> ${criteriaCount} &nbsp; <strong>λmax:</strong> ${critRes.lambdaMax.toFixed(4)} &nbsp; <strong>CI:</strong> ${critRes.CI.toFixed(4)} &nbsp; <strong>RI:</strong> ${critRes.RI.toFixed(4)} &nbsp; <strong>CR:</strong> ${critRes.CR.toFixed(4)}</p>`;
  html += `${critRes.CR < 0.1 ? '<p class="good">✓ Criteria consistency acceptable (CR &lt; 0.10)</p>' : '<p class="bad">✗ Criteria consistency NOT acceptable (CR ≥ 0.10)</p>'}`;
  html += `<p><strong>Criteria priority vector:</strong></p><pre>[ ${critRes.priorities.map(v=>v.toFixed(4)).join(', ')} ]</pre></div>`;

  html += `<div style="margin-top:10px;"><p><strong>Composite weights & ranking:</strong></p>`;
  html += `<table><tr><th>Rank</th><th>Alternative</th><th>Weight</th></tr>`;
  for (let r=0;r<ranking.length;r++){
    html += `<tr><td>${r+1}</td><td>${ranking[r].alt}</td><td>${ranking[r].weight.toFixed(4)}</td></tr>`;
  }
  html += `</table></div>`;

  setHTML(resultDiv, html);
  finalResultBox.style.display = 'block';
  exportBtn.style.display = 'inline-block';
}

/* ===== Export to Excel (XLSX) ===== */
function exportToExcel() {
  const wb = XLSX.utils.book_new();

  // Criteria pairwise
  const critTable = document.getElementById('criteriaMatrix');
  if (critTable) {
    const pairwiseData = tableToAOA(critTable);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pairwiseData), 'Criteria_Pairwise');
    const {matrix:critM} = readMatrixFromTable(critTable);
    const critRes = computePriorities(critM);
    const headerRow = [''].concat(Array.from({length:critM.length},(_,i)=>`C${i+1}`));
    const normAoa = [headerRow];
    for (let i=0;i<critRes.normalized.length;i++){
      normAoa.push([`C${i+1}`].concat(critRes.normalized[i].map(v=>v)));
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(normAoa), 'Criteria_Normalized');
    const pv = [['Criteria','Weight']].concat(critRes.priorities.map((v,i)=>[`C${i+1}`, v]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pv), 'Criteria_Priorities');
    const csInfo = [['Metric','Value'],['lambda_max',critRes.lambdaMax],['CI',critRes.CI],['RI',critRes.RI],['CR',critRes.CR]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(csInfo), 'Criteria_Consistency');
  }

  // Alternatives per criterion
  matrixContainer.querySelectorAll('table').forEach(table=>{
    if (table.id && table.id.startsWith('altMatrix-')) {
      const idx = table.id.split('-')[1];
      const aoa = tableToAOA(table);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), `Alt_Pair_C${parseInt(idx,10)+1}`);
      const {matrix:am} = readMatrixFromTable(table);
      const res = computePriorities(am);
      const headerRow = [''].concat(Array.from({length:am.length},(_,i)=>`A${i+1}`));
      const normAoa = [headerRow];
      for (let i=0;i<res.normalized.length;i++){
        normAoa.push([`A${i+1}`].concat(res.normalized[i].map(v=>v)));
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(normAoa), `Alt_Norm_C${parseInt(idx,10)+1}`);
      const pv = [['Alternative','Weight']].concat(res.priorities.map((v,i)=>[`A${i+1}`, v]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pv), `Alt_Prio_C${parseInt(idx,10)+1}`);
      const cs = [['Metric','Value'],['lambda_max',res.lambdaMax],['CI',res.CI],['RI',res.RI],['CR',res.CR]];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cs), `Alt_Cons_C${parseInt(idx,10)+1}`);
    }
  });

  // Final ranking (recompute)
  const critTable2 = document.getElementById('criteriaMatrix');
  const {matrix:critMagain} = readMatrixFromTable(critTable2);
  const critResAgain = computePriorities(critMagain);
  const altPriorityUnderCriterion = [];
  const altCount = parseInt(document.getElementById('alternativeCount').value,10);
  const criteriaCount = critMagain.length;
  for (let k=0;k<criteriaCount;k++){
    const {matrix:am} = readMatrixFromTable(document.getElementById(`altMatrix-${k}`));
    const res = computePriorities(am);
    altPriorityUnderCriterion.push(res.priorities);
  }
  const finalWeights = Array(altCount).fill(0);
  for (let j=0;j<altCount;j++){
    let s=0;
    for (let i=0;i<criteriaCount;i++){
      s += critResAgain.priorities[i] * altPriorityUnderCriterion[i][j];
    }
    finalWeights[j] = s;
  }
  const finalAoa = [['Rank','Alternative','Weight']];
  const ranking = finalWeights.map((w,idx)=>({alt:`A${idx+1}`, weight:w})).sort((a,b)=>b.weight - a.weight);
  for (let r=0;r<ranking.length;r++) finalAoa.push([r+1, ranking[r].alt, ranking[r].weight]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(finalAoa), 'Final_Ranking');

  XLSX.writeFile(wb, 'AHP_Criteria_Alternatives_Result.xlsx');
}

/* helper: convert table DOM to array-of-arrays */
function tableToAOA(table) {
  const rows = table.querySelectorAll('tr');
  const aoa = [];
  rows.forEach(row=>{
    const cells = row.querySelectorAll('th, td');
    const rowdata = [];
    cells.forEach(cell=>{
      const input = cell.querySelector('input');
      if (input) rowdata.push(input.value);
      else rowdata.push(cell.textContent);
    });
    aoa.push(rowdata);
  });
  return aoa;
}
