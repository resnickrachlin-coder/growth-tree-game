const fs = require('fs');
const code = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/index_bundle.js', 'utf8');

// 这个 bundle 是 Vite 构建产物，源码被打包成了单个文件
// 但我们需要的只是数据部分，不需要反编译整个 bundle

// 1. 提取 B1 书籍数据
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

const b1Content = code.slice(bracketStart, i + 1);
console.log('B1 data extracted: ' + b1Content.length + ' chars');

// 验证 JSON 有效性 - 把 JS 格式转为 JSON
// B1 的键名没有引号，所以先用 eval 验证
try {
  const data = eval('(' + b1Content + ')');
  console.log('Valid data array with ' + data.length + ' books');
  console.log('Book 0: ' + data[0].bookName);
  console.log('Chapters: ' + data[0].chapters.length);
  console.log('First chapter: ' + data[0].chapters[0].title);
  console.log('Last chapter: ' + data[0].chapters[data[0].chapters.length - 1].title);
} catch(e) {
  console.log('Parse error: ' + e.message);
}

// 2. 提取名言数组 Ql
const qlIdx = code.indexOf(',Ql=');
if (qlIdx > -1) {
  const qlStart = code.indexOf('[', qlIdx);
  depth = 0; inStr = false; strChar = ''; i = qlStart;
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
  const qlContent = code.slice(qlStart, i + 1);
  console.log('\nQuotes extracted: ' + qlContent.length + ' chars');
  try {
    const quotes = eval('(' + qlContent + ')');
    console.log('Total quotes: ' + quotes.length);
  } catch(e) {
    console.log('Quotes parse error: ' + e.message);
  }
}

// 3. 提取奖励配置 Ye
const yeIdx = code.indexOf(',Ye={');
if (yeIdx > -1) {
  const yeStart = code.indexOf('{', yeIdx);
  depth = 0; inStr = false; strChar = ''; i = yeStart;
  while (i < code.length) {
    const ch = code[i];
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === strChar) inStr = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; }
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    i++;
  }
  const yeContent = code.slice(yeStart, i + 1);
  console.log('\nRewards config: ' + yeContent);
}

// 4. 提取阶段配置 Yl
const ylIdx = code.indexOf(',Yl=');
if (ylIdx > -1) {
  const ylStart = code.indexOf('[', ylIdx);
  depth = 0; inStr = false; strChar = ''; i = ylStart;
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
  const ylContent = code.slice(ylStart, i + 1);
  console.log('\nStage config extracted: ' + ylContent.length + ' chars');
}

// 5. 提取初始数据函数 ei
const eiIdx = code.indexOf('function ei()');
if (eiIdx > -1) {
  // 找函数的完整代码
  let braceDepth = 0, fnStart = code.indexOf('{', eiIdx);
  i = fnStart; inStr = false; strChar = '';
  while (i < code.length) {
    const ch = code[i];
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === strChar) inStr = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; }
      else if (ch === '{') braceDepth++;
      else if (ch === '}') { braceDepth--; if (braceDepth === 0) break; }
    }
    i++;
  }
  const fnContent = code.slice(eiIdx, i + 1);
  console.log('\nei() function: ' + fnContent.length + ' chars');
}
