const fs = require('fs');
const raw = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/source_data.json', 'utf8');
const data = JSON.parse(raw);
eval('var B1 = ' + data.B1);

// 输出所有章节标题
console.log('=== 百知思维模型 - 101 章节标题 ===');
B1[0].chapters.forEach(ch => {
  const contentLen = ch.content ? ch.content.length : 0;
  console.log(`${String(ch.chapterId).padStart(3)} | ${contentLen}字 | ${ch.title}`);
});

// 统计总字数
const totalContent = B1[0].chapters.reduce((sum, ch) => sum + (ch.content ? ch.content.length : 0), 0);
console.log(`\n总字数: ${totalContent}`);
console.log(`章节数: ${B1[0].chapters.length}`);
