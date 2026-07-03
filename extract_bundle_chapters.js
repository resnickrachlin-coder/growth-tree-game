const fs = require('fs');

// 方案：从线上 bundle 的数据 + 本地模型文件中仍可读取的部分重新生成
// 但最简单的方案是：直接用线上 bundle 的数据（它已经是完整的 101 章）
// 从 source_data.json 中取 B1 数据，然后从中提取百知思维模型的章节

const raw = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/source_data.json', 'utf8');
const data = JSON.parse(raw);

// 用 Function 解析 B1
eval('var B1 = ' + data.B1);

// 百知思维模型是 B1[0]
const baizhiBook = B1[0];
console.log('Book:', baizhiBook.bookName);
console.log('Chapters:', baizhiBook.chapters.length);

// 直接输出章节列表
console.log('\n=== 章节列表 ===');
baizhiBook.chapters.forEach(ch => {
  console.log(`${ch.chapterId}: ${ch.title} (${ch.content.length} chars)`);
});

// 保存完整的章节数据
const chaptersOutput = JSON.stringify(baizhiBook.chapters, null, 2);
fs.writeFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/bundle_chapters.json', chaptersOutput);
console.log('\nSaved bundle_chapters.json');
