const fs = require('fs');

// 修复所有模型文件中的中文引号问题
const files = fs.readdirSync('百知思维模型').filter(f => f.endsWith('.md'));

for (const file of files) {
  const filePath = '百知思维模型/' + file;
  let content = fs.readFileSync(filePath, 'utf8');
  
  const parts = content.split('```js\n');
  let modified = false;
  
  for (let i = 1; i < parts.length; i++) {
    const endIdx = parts[i].indexOf('\n```');
    if (endIdx === -1) continue;
    
    let jsBlock = parts[i].substring(0, endIdx);
    
    if (/[\u201c\u201d]/.test(jsBlock)) {
      jsBlock = jsBlock.replace(/\u201c/g, '\\"').replace(/\u201d/g, '\\"');
      parts[i] = jsBlock + parts[i].substring(endIdx);
      modified = true;
    }
  }
  
  if (modified) {
    const newContent = parts.join('```js\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed:', file);
  } else {
    console.log('OK:', file);
  }
}
