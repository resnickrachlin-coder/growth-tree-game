const fs = require('fs');

// 直接恢复文件：用我已知的数据重新生成所有模型
// 我从 bundle 数据中有 101 个章节的标题和内容
// 本地方案B文件虽然被损坏，但我只需要解析那些origin/coreConclusion中带引号的模型

// 方案：直接写一个完全不同的解析器，用Python风格的逐字符扫描

function parseModelBlock(code) {
  // 目标：把 JS 对象字面量解析为 JS 对象
  // 不做 eval，而是用 JSON.parse，但先正确转义
  
  // 步骤1：给所有 key 加引号
  let json = code.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
  
  // 步骤2：处理字符串中的嵌套双引号
  // 找到所有 "..." 字符串，如果内部有 "，替换为中文引号
  let result = '';
  let i = 0;
  let inStr = false;
  
  while (i < json.length) {
    const ch = json[i];
    
    if (!inStr) {
      if (ch === '"') {
        inStr = true;
        result += ch;
      } else {
        result += ch;
      }
      i++;
    } else {
      // 在字符串内部
      if (ch === '\\') {
        result += ch + (json[i+1] || '');
        i += 2;
        continue;
      }
      
      if (ch === '"') {
        // 可能是字符串结束，也可能是嵌套引号
        // 检查下一个非空白字符
        let nextIdx = i + 1;
        while (nextIdx < json.length && /[\s]/.test(json[nextIdx])) nextIdx++;
        const next = json[nextIdx] || '';
        
        // 如果下一个字符是 , ] } : 等，说明是字符串结束
        if (',]}:'.includes(next) || next === undefined) {
          inStr = false;
          result += ch;
        } else {
          // 嵌套引号，替换为中文引号
          result += '\u201c';
        }
      } else {
        result += ch;
      }
      i++;
    }
  }
  
  // 步骤3：单引号转双引号
  // 注意：不要在已经用引号括起来的值里转义
  // 直接替换所有单引号为双引号
  result = result.replace(/'/g, '"');
  
  // 尝试解析
  try {
    return JSON.parse(result);
  } catch(e) {
    console.error('JSON parse failed:', e.message.substring(0, 100));
    return null;
  }
}

// 测试
const content = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md', 'utf8');

const delim = '```js\n';
const endDelim = '\n```';
let pos = 0;
let success = 0;
let fail = 0;

while (true) {
  const start = content.indexOf(delim, pos);
  if (start === -1) break;
  
  const bodyStart = start + delim.length;
  const end = content.indexOf(endDelim, bodyStart);
  if (end === -1) break;
  
  const code = content.substring(bodyStart, end);
  pos = end + endDelim.length;
  
  const model = parseModelBlock(code);
  if (model && model.modelName) {
    success++;
  } else {
    fail++;
  }
}

console.log('Success:', success, 'Fail:', fail);
