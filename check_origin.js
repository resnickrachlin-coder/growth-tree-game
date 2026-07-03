const fs = require('fs');

const content = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md', 'utf8');

// 按 ```js 分割
const parts = content.split('```js\n');

for (let i = 15; i <= 20; i++) {
  if (i >= parts.length) continue;
  const blockEnd = parts[i].indexOf('\n```');
  if (blockEnd === -1) continue;
  const code = parts[i].substring(0, blockEnd);
  
  const idMatch = code.match(/modelId:(\d+)/);
  const nameMatch = code.match(/modelName:"([^"]+)"/);
  const id = idMatch ? idMatch[1] : '?';
  const name = nameMatch ? nameMatch[1] : '?';
  
  console.log(`=== Block ${i} (id=${id}, ${name}) ===`);
  
  // 找到 origin 字段的值
  const originStart = code.indexOf('origin:');
  if (originStart > -1) {
    // origin: 后面跟着字符串
    let pos = originStart + 7;
    // 跳过空格
    while (code[pos] === ' ' || code[pos] === '\t') pos++;
    
    if (code[pos] === '"') {
      // 找到完整的字符串
      let end = pos + 1;
      while (end < code.length) {
        if (code[end] === '\\') { end += 2; continue; }
        if (code[end] === '"') break;
        end++;
      }
      const originStr = code.substring(pos + 1, end);
      console.log('origin value:', originStr.substring(0, 100) + '...');
      console.log('origin length:', originStr.length);
      
      // 检查是否有未转义的中文引号
      for (let c = 0; c < originStr.length; c++) {
        const ch = originStr.charCodeAt(c);
        if (ch === 0x201C || ch === 0x201D) {
          console.log(`  Found Chinese quote at pos ${c}: ${originStr.substring(Math.max(0,c-10), c+15)}`);
        }
      }
    }
  }
  console.log();
}
