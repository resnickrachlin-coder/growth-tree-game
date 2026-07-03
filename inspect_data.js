const fs = require('fs');
const raw = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/source_data.json', 'utf8');
const data = JSON.parse(raw);

// Parse B1
eval('var B1 = ' + data.B1);

console.log('=== Books ===');
B1.forEach((book, i) => {
  console.log(`[${i}] ${book.bookName} | status: ${book.status} | chapters: ${book.chapters.length} | level: ${book.unlockLevel}`);
  console.log(`     branchColor: ${book.branchColor}`);
  console.log(`     summary: ${book.summary.substring(0, 50)}...`);
});

// Show first book chapter list
console.log('\n=== 百知思维模型 Chapters (first 10) ===');
B1[0].chapters.slice(0, 10).forEach(ch => {
  console.log(`  ${ch.chapterId}: ${ch.title}`);
});
console.log('...');
B1[0].chapters.slice(-5).forEach(ch => {
  console.log(`  ${ch.chapterId}: ${ch.title}`);
});

// Show quotes
console.log('\n=== Quotes ===');
eval('var Ql = ' + data.Ql);
console.log('Total quotes:', Ql.length);

// Show stages
console.log('\n=== Stages ===');
eval('var Yl = ' + data.Yl);
Yl.forEach(s => console.log(`  ${s.name}: lv${s.minLevel}-${s.maxLevel}, tree: ${s.tree}`));

// Show rewards
console.log('\n=== Rewards ===');
eval('var Ye = ' + data.Ye);
console.log(Ye);

// Show init data
console.log('\n=== Init function ===');
console.log(data.ei);
