const fs = require('fs');
const content = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md', 'utf8');

const delim = '```js\n';
const parts = content.split(delim);

for (let i = 15; i <= 20; i++) {
  if (i >= parts.length) continue;
  const endDelim = '\n```';
  const blockEnd = parts[i].indexOf(endDelim);
  if (blockEnd === -1) continue;
  const code = parts[i].substring(0, blockEnd);
  
  const originIdx = code.indexOf('origin:');
  if (originIdx === -1) continue;
  
  let start = originIdx + 7;
  while (start < code.length && (code[start] === ' ' || code[start] === '\t' || code[start] === '\n')) start++;
  
  if (code[start] === '"') {
    let end = start + 1;
    while (end < code.length) {
      if (code[end] === '\\') { end += 2; continue; }
      if (code[end] === '"') break;
      end++;
    }
    
    console.log('=== Block ' + i + ' ===');
    console.log(code.substring(start + 1, end));
    console.log('---');
  }
}
