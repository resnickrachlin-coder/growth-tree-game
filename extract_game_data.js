const fs = require('fs');
const code = fs.readFileSync('index_bundle.js', 'utf8');

function extractBrackets(startIdx, openChar, closeChar) {
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

// B1
const b1Idx = code.indexOf('const B1=');
const B1 = extractBrackets(b1Idx, '[', ']');

// Ql
const qlIdx = code.indexOf(',Ql=');
const Ql = extractBrackets(qlIdx, '[', ']');

// Ye
const yeIdx = code.indexOf(',Ye={');
const Ye = extractBrackets(yeIdx, '{', '}');

// Yl
const ylIdx = code.indexOf('Yl=');
const Yl = extractBrackets(ylIdx, '[', ']');

console.log('B1:', B1 ? B1.length + ' chars' : 'NOT FOUND');
console.log('Ql:', Ql ? Ql.length + ' chars' : 'NOT FOUND');
console.log('Ye:', Ye ? 'FOUND' : 'NOT FOUND');
console.log('Yl:', Yl ? Yl.length + ' chars' : 'NOT FOUND');

const output = 
  'export const B1 = ' + B1 + ';\n\n' +
  'export const Ql = ' + Ql + ';\n\n' +
  'export const Ye = ' + Ye + ';\n\n' +
  'export const Yl = ' + Yl + ';\n';

fs.writeFileSync('extracted_data.js', output);
console.log('Saved extracted_data.js');
