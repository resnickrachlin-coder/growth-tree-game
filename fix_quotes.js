const fs = require('fs');

const files = [
  '第一部分_认知自我_1-20.md',
  '第二部分_认知世界_21-40.md',
  '第三部分_思考与分析工具_41-60.md',
  '第四部分_沟通与学习_61-80.md',
  '第五部分_计划与行动_81-100.md',
  '第六部分_总结与全局复盘_101.md'
];

const baseDir = 'D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型';

for (const file of files) {
  const filePath = baseDir + '/' + file;
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 找到所有 JS 块
  const delim = '```js\n';
  const endDelim = '\n```';
  
  const lines = content.split('\n');
  const newLines = [];
  let inJsBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim() === '```js') {
      inJsBlock = true;
      newLines.push(line);
      continue;
    }
    
    if (inJsBlock && line.trim() === '```') {
      inJsBlock = false;
      newLines.push(line);
      continue;
    }
    
    if (inJsBlock) {
      // 在 JS 块内，处理字符串中的未转义双引号
      // 找到所有 "..." 字符串
      let processed = '';
      let j = 0;
      let inStr = false;
      let strStart = 0;
      
      while (j < line.length) {
        if (!inStr) {
          if (line[j] === '"') {
            inStr = true;
            strStart = j;
          }
          processed += line[j];
          j++;
        } else {
          // 在字符串内，找到下一个未转义的 "
          let k = j;
          let strContent = '';
          while (k < line.length) {
            if (line[k] === '\\') {
              strContent += line[k] + (line[k+1] || '');
              k += 2;
              continue;
            }
            if (line[k] === '"') {
              // 找到字符串结束
              break;
            }
            strContent += line[k];
            k++;
          }
          
          // 检查字符串内容中是否包含未转义的 "
          // 实际上在 JS 块里，如果内容中有 "，它会被当作字符串结束
          // 我们无法在这里处理，因为这是 JS 语法问题
          // 所以我们需要找替代方案
          
          processed += line.substring(j, k + 1);
          inStr = false;
          j = k + 1;
        }
      }
      
      newLines.push(line);
    } else {
      newLines.push(line);
    }
  }
  
  // 更简单的方法：直接替换文件中的问题
  // 把 origin 字段中的英文双引号替换为中文引号
  // 但只在 JS 块的字符串内部替换
  
  let result = content;
  const replacements = [
    // 第15块
    ['纠正"坐等好运降临"的被动认知', '纠正\u201c坐等好运降临\u201d的被动认知'],
    // 第16块 - 先检查是否有问题
    // 第17块
    ['认为"读书没用"', '认为\u201c读书没用\u201d'],
    // 第18块
    ['"直接思考事物"', '\u201c直接思考事物\u201d'],
    // 第20块
    ['产生"读书没意思"', '产生\u201c读书没意思\u201d'],
  ];
  
  let hasChanges = false;
  for (const [from, to] of replacements) {
    if (result.includes(from)) {
      result = result.replace(from, to);
      hasChanges = true;
      console.log(file + ': replaced "' + from.substring(0, 20) + '..."');
    }
  }
  
  // 更通用的方案：查找所有 "xxx" 在字符串内部的双引号
  // 用正则匹配 origin:"..." 中嵌套的英文双引号
  // origin:"...内容..."  =>  替换为 origin:"...\u201c内容\u201d..."
  const originRegex = /(origin:"[^"]*?)"([^"]*?)"([^"]*?")/g;
  let newResult = result;
  let match;
  while ((match = originRegex.exec(result)) !== null) {
    const full = match[0];
    const replacement = match[1] + '\u201c' + match[2] + '\u201d' + match[3];
    newResult = newResult.replace(full, replacement);
    console.log(file + ': fixed nested quotes in origin');
    hasChanges = true;
  }
  
  // 同样处理 coreConclusion
  const coreRegex = /(coreConclusion:"[^"]*?)"([^"]*?)"([^"]*?")/g;
  while ((match = coreRegex.exec(result)) !== null) {
    const full = match[0];
    const replacement = match[1] + '\u201c' + match[2] + '\u201d' + match[3];
    newResult = newResult.replace(full, replacement);
    console.log(file + ': fixed nested quotes in coreConclusion');
    hasChanges = true;
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newResult, 'utf8');
    console.log('  -> Saved');
  } else {
    console.log(file + ': no changes needed');
  }
}
