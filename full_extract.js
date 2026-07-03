const fs = require('fs');

function extractBrackets(code, startIdx, bracketType) {
  const openChar = bracketType === 'array' ? '[' : '{';
  const closeChar = bracketType === 'array' ? ']' : '}';
  const start = code.indexOf(openChar, startIdx);
  if (start === -1) return null;
  
  let depth = 0, inStr = false, strChar = '';
  let i = start;
  while (i < code.length) {
    const ch = code[i];
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === strChar) inStr = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; }
      else if (ch === openChar) depth++;
      else if (ch === closeChar) { depth--; if (depth === 0) break; }
    }
    i++;
  }
  return code.slice(start, i + 1);
}

function extractFunction(code, fnName) {
  const idx = code.indexOf('function ' + fnName + '(');
  if (idx === -1) return null;
  const bodyStart = code.indexOf('{', idx);
  let depth = 0, inStr = false, strChar = '';
  let i = bodyStart;
  while (i < code.length) {
    const ch = code[i];
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === strChar) inStr = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; }
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    i++;
  }
  return code.slice(idx, i + 1);
}

const code = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/index_bundle.js', 'utf8');

const result = {};

// B1 - books data
const b1Idx = code.indexOf('const B1=');
if (b1Idx > -1) {
  result.B1 = extractBrackets(code, b1Idx, 'array');
}

// Ql - quotes
const qlIdx = code.indexOf(',Ql=');
if (qlIdx > -1) {
  result.Ql = extractBrackets(code, qlIdx, 'array');
}

// Ye - rewards config
const yeIdx = code.indexOf(',Ye={');
if (yeIdx > -1) {
  result.Ye = extractBrackets(code, yeIdx, 'object');
}

// Yl - stages config
const ylIdx = code.indexOf(',Yl=');
if (ylIdx > -1) {
  result.Yl = extractBrackets(code, ylIdx, 'array');
}

// ei - init function
result.ei = extractFunction(code, 'ei');

// Qo - stage query function
result.Qo = extractFunction(code, 'Qo');

// sd - tree name function
result.sd = extractFunction(code, 'sd');

// _c - exp calculation
const _cIdx = code.indexOf('function _c(');
if (_cIdx > -1) {
  const bodyStart = code.indexOf('{', _cIdx);
  const end = code.indexOf('}', bodyStart) + 1;
  result._c = code.slice(_cIdx, end);
}

// A1 - merge/save function
result.A1 = extractFunction(code, 'A1');

// Also extract the quotes array
const quoteObjIdx = code.indexOf(',Ql=');
if (quoteObjIdx > -1) {
  result.Ql = extractBrackets(code, quoteObjIdx, 'array');
}

// Save all
const output = JSON.stringify(result, null, 2);
fs.writeFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/source_data.json', output);
console.log('Extraction complete.');
console.log('Keys:', Object.keys(result));
for (const [k, v] of Object.entries(result)) {
  console.log(k + ': ' + (v ? v.length + ' chars' : 'NOT FOUND'));
}
