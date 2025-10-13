/* -------- helpers -------- */
function parseValue(str) {
  if (str === null || str === undefined) return NaN;
  str = String(str).trim();
  if (str === '') return NaN;
  // allow fraction like "1/3"
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length !== 2) return NaN;
    const a = parseFloat(parts[0].trim());
    const b = parseFloat(parts[1].trim());
    if (!isFinite(a) || !isFinite(b) || b === 0) return NaN;
    return a / b;
  }
  // normal decimal or integer
  const v = parseFloat(str);
  return isFinite(v) ? v : NaN;
}

function setHTML(el, html) { el.innerHTML = html; }

/* -------- UI elements -------- */
const generateBtn = document.getElementById('generateBtn');
const calculateBtn = document.getElementById('calculateBtn');
const matrixContainer = document.getElementById('matrixContainer');
const resultDiv = document.getElementById('result');

generateBtn.addEventListener('click', generateMatrix);
calculateBtn.addEventListener('click', calculateAHP);

/* -------- build matrix UI -------- */
function generateMatrix() {
  const n = parseInt(document.getElementById('criteriaCount').value);
  if (!Number.isInteger(n) || n < 2 || n > 20) {
    alert('Enter an integer between 2 and 9.');
    return;
  }

  // Build table
  const table = document.createElement('table');
  table.id = 'matrix';

  // header row
  const thead = document.createElement('tr');
  thead.appendChild(document.createElement('th')); // blank corner
  for (let j=0;j<n;j++){
    const th = document.createElement('th');
    th.textContent = `C${j+1}`;
    thead.appendChild(th);
  }
  table.appendChild(thead);

  // body
  for (let i=0;i<n;i++){
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = `C${i+1}`;
    tr.appendChild(th);

    for (let j=0;j<n;j++){
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.className = 'cell';
      inp.setAttribute('data-i', i);
      inp.setAttribute('data-j', j);
      inp.type = 'text';
      if (i === j) {
        inp.value = '1';
        inp.readOnly = true;
      } else if (i < j) {
        inp.value = '1';
        inp.addEventListener('input', onUpperInput);
      } else {
        inp.value = '1';
        inp.readOnly = true;
      }
      td.appendChild(inp);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  matrixContainer.innerHTML = '';
  matrixContainer.appendChild(table);

  calculateBtn.style.display = 'inline-block';
  resultDiv.innerHTML = '';
}

/* when user types into upper triangle cell, update reciprocal cell */
function onUpperInput(e) {
  const inp = e.target;
  const i = parseInt(inp.dataset.i, 10);
  const j = parseInt(inp.dataset.j, 10);
  const val = parseValue(inp.value);
  const target = document.querySelector(`#matrix input[data-i="${j}"][data-j="${i}"]`);
  if (!target) return;
  if (!isFinite(val) || val === 0) {
    target.value = '';
  } else {
    target.value = (1 / val).toFixed(4);
  }
}

/* -------- calculation -------- */
function calculateAHP() {
  const table = document.getElementById('matrix');
  if (!table) { alert('Generate the matrix first.'); return; }

  const headerRow = table.querySelector('tr');
  const n = headerRow ? headerRow.children.length - 1 : 0;

  const matrix = Array.from({length:n}, () => Array(n).fill(0));
  const errors = [];

  for (let i=0;i<n;i++){
    const row = table.querySelectorAll('tr')[i+1];
    const inputs = row.querySelectorAll('input');
    for (let j=0;j<n;j++){
      const raw = inputs[j].value;
      const val = parseValue(raw);
      if (!isFinite(val) || val <= 0) {
        errors.push(`Invalid value at row ${i+1}, col ${j+1}: "${raw}"`);
      } else {
        matrix[i][j] = val;
      }
    }
  }

  if (errors.length) {
    setHTML(resultDiv, `<div class="bad">Error: please correct inputs.</div><pre>${errors.join('\n')}</pre>`);
    return;
  }

  const colSums = Array(n).fill(0);
  for (let j=0;j<n;j++){
    for (let i=0;i<n;i++) colSums[j] += matrix[i][j];
    if (colSums[j] === 0) {
      setHTML(resultDiv, `<div class="bad">Error: column ${j+1} sums to zero.</div>`);
      return;
    }
  }

  const normalized = matrix.map((row) => row.slice());
  for (let i=0;i<n;i++){
    for (let j=0;j<n;j++){
      normalized[i][j] = matrix[i][j] / colSums[j];
    }
  }

  const priorities = normalized.map(row => {
    const s = row.reduce((a,b)=>a+b,0);
    return s / n;
  });

  const weighted = Array(n).fill(0);
  for (let i=0;i<n;i++){
    let s=0;
    for (let j=0;j<n;j++) s += matrix[i][j] * priorities[j];
    weighted[i] = s;
  }

  const lambdaVec = weighted.map((w,i)=> w / priorities[i]);
  const lambdaMax = lambdaVec.reduce((a,b)=>a+b,0) / n;

  const CI = (lambdaMax - n) / (n - 1);
  const RI_values = {1:0,2:0,3:0.58,4:0.9,5:1.12,6:1.24,7:1.32,8:1.41,9:1.45};
  const RI = RI_values[n] ?? 1.49;
  const CR = RI === 0 ? 0 : CI / RI;

  let html = `<h3>Results</h3>`;
  html += `<p class="small"><strong>Given Number of Criteria:</strong> ${n} &nbsp; <strong>λ<sub>max</sub>:</strong> ${lambdaMax.toFixed(4)} &nbsp; <strong>CI:</strong> ${CI.toFixed(4)} &nbsp; <strong>RI:</strong> ${RI.toFixed(4)} &nbsp; <strong>CR:</strong> ${CR.toFixed(4)}</p>`;

  if (CR < 0.1) html += `<p class="good">✓ Consistency acceptable (CR &lt; 0.10)</p>`;
  else html += `<p class="bad">✗ Consistency NOT acceptable (CR ≥ 0.10). Consider revising judgments.</p>`;

  html += `<p ><strong>Priority vector (weights):</strong></p>`;
  html += `<pre style="color:purple">[ ${priorities.map(v => v.toFixed(4)).join(', ')} ]</pre>`;

  html += `<p><strong>Normalized matrix (rounded):</strong></p>`;
  html += `<table><tr><th></th>`;
  for (let j=0;j<n;j++) html += `<th>C${j+1}</th>`;
  html += `</tr>`;
  for (let i=0;i<n;i++){
    html += `<tr><th>C${i+1}</th>`;
    for (let j=0;j<n;j++){
      html += `<td>${normalized[i][j].toFixed(4)}</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;

  setHTML(resultDiv, html);
  showExportButton();
}
// ===== Excel Export Feature =====
const exportBtn = document.getElementById('exportBtn');
exportBtn.addEventListener('click', exportToExcel);

function showExportButton() {
  exportBtn.style.display = 'inline-block';
}

function exportToExcel() {
  const resultSection = document.getElementById('result');
  const matrixContainer = document.getElementById('matrixContainer');

  if (!resultSection || resultSection.innerHTML.trim() === '') {
    alert('Please calculate AHP before exporting.');
    return;
  }

  // ---- 1️⃣ Pairwise Comparison Matrix ----
  const pairwiseTable = matrixContainer.querySelector('table');
  const pairwiseData = [];

  if (pairwiseTable) {
    const rows = pairwiseTable.querySelectorAll('tr');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('th, td');
      const rowData = [];
      cells.forEach((cell) => {
        // If the cell contains an input, read its value
        const input = cell.querySelector('input');
        if (input) {
          rowData.push(input.value);
        } else {
          rowData.push(cell.textContent);
        }
      });
      pairwiseData.push(rowData);
    });
  }

  // ---- 2️⃣ Normalized Matrix ----
  const normalizedTable = resultSection.querySelector('table');
  const normalizedData = [];

  if (normalizedTable) {
    const rows = normalizedTable.querySelectorAll('tr');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('th, td');
      const rowData = [];
      cells.forEach((cell) => rowData.push(cell.textContent));
      normalizedData.push(rowData);
    });
  }

  // ---- 3️⃣ Priority Vector ----
  const priorityText = resultSection.querySelector('pre')?.textContent || "";
  let priorityData = [["Criteria", "Weight"]];
  if (priorityText.includes(",")) {
    const weights = priorityText
      .replace(/\[|\]/g, "")
      .split(",")
      .map((x) => parseFloat(x.trim()))
      .filter((x) => !isNaN(x));
    weights.forEach((w, i) => priorityData.push([`C${i + 1}`, w]));
  }

  // ---- 4️⃣ Consistency Information ----
  const infoText = resultSection.querySelector('p.small')?.textContent || "";
  const CRstatus = resultSection.querySelector('.good, .bad')?.textContent || "";

  // Extract λmax, CI, RI, CR from text
  const infoRegex = /λ.*?([\d.]+).*?CI.*?([\d.]+).*?RI.*?([\d.]+).*?CR.*?([\d.]+)/;
  const match = infoText.match(infoRegex);
  let lambdaMax = "", CI = "", RI = "", CR = "";
  if (match) {
    [, lambdaMax, CI, RI, CR] = match;
  }

  const consistencyData = [
    ["Metric", "Value"],
    ["λ max", lambdaMax],
    ["Consistency Index (CI)", CI],
    ["Random Index (RI)", RI],
    ["Consistency Ratio (CR)", CR],
    ["Judgment", CRstatus],
  ];

  // ---- 5️⃣ Build the Excel Workbook ----
  const wb = XLSX.utils.book_new();

  // Sheet 1: Pairwise Comparison Matrix
  if (pairwiseData.length > 0) {
    const ws1 = XLSX.utils.aoa_to_sheet(pairwiseData);
    XLSX.utils.book_append_sheet(wb, ws1, "Pairwise Matrix");
  }

  // Sheet 2: Normalized Matrix
  if (normalizedData.length > 0) {
    const ws2 = XLSX.utils.aoa_to_sheet(normalizedData);
    XLSX.utils.book_append_sheet(wb, ws2, "Normalized Matrix");
  }

  // Sheet 3: Priority Vector
  if (priorityData.length > 1) {
    const ws3 = XLSX.utils.aoa_to_sheet(priorityData);
    XLSX.utils.book_append_sheet(wb, ws3, "Priority Vector");
  }

  // Sheet 4: Consistency Info
  const ws4 = XLSX.utils.aoa_to_sheet(consistencyData);
  XLSX.utils.book_append_sheet(wb, ws4, "Consistency Info");

  // ---- Save Excel File ----
  XLSX.writeFile(wb, "AHP_Full_Result.xlsx");
}


