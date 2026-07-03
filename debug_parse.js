const fs = require('fs');
const path = require('path');

function findFailedBlocks(mdContent) {
  const results = [];
  const regex = /```js\n([\s\S]*?)```/g;
  let match;
  let idx = 0;
  while ((match = regex.exec(mdContent)) !== null) {
    idx++;
    const jsCode = match[1].trim();
    try {
      new Function('return (' + jsCode + ')')();
    } catch(e) {
      // 尝试找出问题
      console.log(`\n=== Block ${idx} (line ${match.input.substring(0, match.index).split('\n').length}) ===`);
      console.log('First line:', jsCode.split('\n')[0]);
      console.log('Error:', e.message.substring(0, 100));
      
      // 检查是否有中文引号
      const hasChineseQuotes = /["\u201c\u201d\u2018\u2019]/.test(jsCode);
      console.log('Has Chinese quotes:', hasChineseQuotes);
      
      // 显示前300个字符
      console.log('Preview:', jsCode.substring(0, 300));
    }
  }
  return results;
}

const file = 'D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md';
const content = fs.readFileSync(file, 'utf8');
findFailedBlocks(content);
