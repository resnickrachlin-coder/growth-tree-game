const fs = require('fs');

// 方法：直接在内存中解析 MD 文件中的 JS 块，不修改源文件
// 使用一个更健壮的解析器来处理嵌套引号

function extractJSBlocksRobust(mdContent) {
  const blocks = [];
  const delim = '```js\n';
  const endDelim = '\n```';
  
  let pos = 0;
  while (true) {
    const start = mdContent.indexOf(delim, pos);
    if (start === -1) break;
    
    const bodyStart = start + delim.length;
    const end = mdContent.indexOf(endDelim, bodyStart);
    if (end === -1) break;
    
    const jsCode = mdContent.substring(bodyStart, end);
    pos = end + endDelim.length;
    
    try {
      // 策略：先把所有中文引号替换为普通引号
      let cleaned = jsCode
        .replace(/\u201c/g, '\u00ab')  // " 替换为 «
        .replace(/\u201d/g, '\u00bb')  // " 替换为 »
        .replace(/\u2018/g, '\u2039')  // ' 替换为 ‹
        .replace(/\u2019/g, '\u203a'); // ' 替换为 ›
      
      // 现在处理 origin 和 coreConclusion 字段中嵌套的英文双引号
      // 找到所有 "..." 字符串中的内部 "
      // 更简单：用 eval 尝试解析
      const obj = new Function('return (' + cleaned + ')')();
      blocks.push(obj);
    } catch(e) {
      // 如果还失败，更暴力地处理
      try {
        // 把字符串中的英文引号替换为中文引号
        let cleaned = jsCode;
        
        // 对于 origin 和 coreConclusion 中的嵌套引号，手动处理
        // 这些字段的结构是: origin:"内容"coreConclusion:"内容"
        // 内容中的 " 需要被替换
        
        // 方法：逐字符扫描，跟踪在字符串中的位置
        let result = '';
        let inStr = false;
        let strChar = '';
        let fieldName = '';
        let lastFieldStart = -1;
        
        for (let i = 0; i < cleaned.length; i++) {
          const ch = cleaned[i];
          const prev = i > 0 ? cleaned[i-1] : '';
          
          if (!inStr) {
            // 检查是否在字段名后遇到 :
            if (ch === ':' && i + 1 < cleaned.length) {
              // 往前找字段名
              let j = i - 1;
              while (j >= 0 && /[\w]/.test(cleaned[j])) j--;
              fieldName = cleaned.substring(j + 1, i);
            }
            
            if (ch === '"') {
              inStr = true;
              strChar = '"';
              lastFieldStart = i;
            }
            result += ch;
          } else {
            if (ch === '\\') {
              result += ch + (cleaned[i+1] || '');
              i++;
            } else if (ch === '"') {
              // 检查是否在 origin/coreConclusion 内部有嵌套引号
              // 如果是嵌套的，替换为中文引号
              inStr = false;
              result += ch;
            } else {
              result += ch;
            }
          }
        }
        
        const obj = new Function('return (' + result + ')')();
        blocks.push(obj);
      } catch(e2) {
        console.error('Failed:', e2.message.substring(0, 80));
      }
    }
  }
  return blocks;
}

// 测试
const content = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型/第一部分_认知自我_1-20.md', 'utf8');
const models = extractJSBlocksRobust(content);
console.log('Parsed:', models.length, 'models');
models.forEach(m => console.log(`  ${m.modelId}: ${m.modelName}`));
