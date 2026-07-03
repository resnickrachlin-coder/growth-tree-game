const fs = require('fs');

const content = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md', 'utf8');

// 按 ```js 分割
const parts = content.split('```js\n');
console.log('Total parts:', parts.length);

for (let i = 1; i < parts.length; i++) {
  const blockEnd = parts[i].indexOf('\n```');
  if (blockEnd === -1) continue;
  const code = parts[i].substring(0, blockEnd);
  
  // 找 modelId 和 modelName
  const idMatch = code.match(/modelId:(\d+)/);
  const nameMatch = code.match(/modelName:"([^"]+)"/);
  const id = idMatch ? idMatch[1] : '?';
  const name = nameMatch ? nameMatch[1] : '?';
  
  // 检查 origin 字段
  const originMatch = code.match(/origin:"([^"]+)"/);
  if (originMatch) {
    const origin = originMatch[1];
    // 检查 origin 中是否包含 " 字符（不是中文引号，而是普通引号导致提前结束）
    if (origin.includes('"')) {
      console.log(`Block ${i} (id=${id}, ${name}): origin has embedded quotes`);
    }
  }
  
  // 尝试解析
  try {
    new Function('return (' + code + ')')();
  } catch(e) {
    console.log(`Block ${i} (id=${id}, ${name}): PARSE FAILED - ${e.message.substring(0, 60)}`);
    // 显示报错位置附近的文本
    const errMsg = e.message;
    const posMatch = errMsg.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const ctx = code.substring(Math.max(0, pos - 20), Math.min(code.length, pos + 30));
      console.log(`  Context around position ${pos}: ...${ctx}...`);
    }
  }
}
