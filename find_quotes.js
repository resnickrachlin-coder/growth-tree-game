const fs = require('fs');
const content = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md', 'utf8');
const regex = /```js\n([\s\S]*?)```/g;
let m;
let idx = 0;
while ((m = regex.exec(content)) !== null) {
  idx++;
  const code = m[1];
  if (/[\u201c\u201d]/.test(code)) {
    const nameMatch = code.match(/modelName:"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : 'unknown';
    console.log('Block ' + idx + ': ' + name + ' has Chinese quotes');
    const pos = code.indexOf('\u201c');
    const ctx = code.substring(Math.max(0, pos - 20), pos + 30);
    console.log('  Context: ...' + ctx + '...');
  }
}
