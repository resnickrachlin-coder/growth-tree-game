const fs = require('fs');
const path = require('path');

function extractJSBlocks(mdContent) {
  const blocks = [];
  const regex = /```js\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(mdContent)) !== null) {
    try {
      const jsCode = match[1].trim();
      
      // 策略：先替换中文引号为英文引号，同时确保它们不会破坏字符串
      // 关键：把中文双引号 "" 替换为英文双引号时，要确保它们出现在字符串内
      let cleaned = jsCode
        .replace(/\u201c/g, '"')  // " -> "
        .replace(/\u201d/g, '"')  // " -> "
        .replace(/\u2018/g, "'")  // ' -> '
        .replace(/\u2019/g, "'")  // ' -> '
        .replace(/：/g, ':')
        .replace(/\r\n/g, '\n');
      
      // 先尝试 Function 解析
      try {
        const obj = new Function('return (' + cleaned + ')')();
        blocks.push(obj);
        continue;
      } catch(e) {
        // 如果 Function 失败，尝试 JSON 解析
      }
      
      // JSON 方式：给 key 加引号，单引号转双引号
      try {
        let jsonStr = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        jsonStr = jsonStr.replace(/'/g, '"');
        const obj = JSON.parse(jsonStr);
        blocks.push(obj);
        continue;
      } catch(e) {
        // 如果 JSON 也失败，打印错误并跳过
        console.error('Parse failed:', e.message.substring(0, 80));
        console.error('First line:', cleaned.split('\n')[0]);
      }
      
    } catch (e) {
      console.error('Fatal parse error:', e.message.substring(0, 80));
    }
  }
  return blocks;
}

// 只测试第一部分
const content = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md', 'utf8');
const models = extractJSBlocks(content);
console.log('Parsed:', models.length, 'models');
models.forEach(m => console.log(`  ${m.modelId}: ${m.modelName}`));
