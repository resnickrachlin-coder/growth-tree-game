const fs = require('fs');
const code = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/index_bundle.js', 'utf8');

const b1Idx = code.indexOf('const B1');
const bracketStart = code.indexOf('[', b1Idx);

let depth = 0;
let inStr = false;
let strChar = '';
let i = bracketStart;

while (i < code.length) {
  const ch = code[i];
  if (inStr) {
    if (ch === '\\') { i += 2; continue; }
    if (ch === strChar) inStr = false;
  } else {
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; }
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) break; }
  }
  i++;
}

const b1Content = code.slice(bracketStart, i + 1);
fs.writeFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/B1_data.json', b1Content);
console.log('B1 data length:', b1Content.length);

// Also extract what comes after - the rest of the app code
const afterB1 = code.slice(i + 1, i + 2000);
console.log('After B1:');
console.log(afterB1);
