const fs = require('fs');
const code = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/index_bundle.js', 'utf8');

// sourcemap
const smIdx = code.indexOf('sourceMappingURL');
console.log('sourceMappingURL at:', smIdx);
console.log('Bundle tail:', code.slice(-300));

// 查看B1之后的核心逻辑
const b1Idx = code.indexOf('const B1');
const bracketStart = code.indexOf('[', b1Idx);

let depth = 0, inStr = false, strChar = '', i = bracketStart;
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

const after = code.slice(i + 1, i + 5000);
console.log('\nCode after B1:');
console.log(after);
