const fs = require('fs');
const path = require('path');

// 读取本地模型文件 - 每个模型是一个 JS 对象格式
// 我们需要从 MD 文件中提取 JS 代码块，解析成对象，再渲染成 Markdown

function extractJSBlocks(mdContent) {
  const blocks = [];
  const regex = /```js\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(mdContent)) !== null) {
    try {
      const jsCode = match[1].trim();
      // 使用 eval 解析 JS 对象（注意：这些是 JS 对象字面量，不是 JSON）
      const obj = eval('(' + jsCode + ')');
      blocks.push(obj);
    } catch (e) {
      console.error('Failed to parse JS block:', e.message);
    }
  }
  return blocks;
}

function modelToMarkdown(model, index) {
  const lines = [];
  
  // 标题
  lines.push(`# ${model.modelName}`);
  lines.push('');
  
  // 一、模型溯源
  lines.push('## 一、模型溯源（深度拓展）');
  lines.push(model.origin || '暂无');
  lines.push('');
  
  // 二、核心原理
  lines.push('## 二、核心原理');
  lines.push(model.coreConclusion || '暂无');
  lines.push('');
  
  // 逻辑层
  if (model.logicLayer && model.logicLayer.length > 0) {
    lines.push('### 底层逻辑分层拆解');
    model.logicLayer.forEach((layer, i) => {
      lines.push(`${i + 1}. ${layer}`);
    });
    lines.push('');
  }
  
  // 三、场景案例
  if (model.sceneCase && model.sceneCase.length > 0) {
    lines.push('## 三、落地案例');
    model.sceneCase.forEach((scene, i) => {
      lines.push(`### 场景${i + 1}：${scene.scene}`);
      if (scene.wrong) {
        lines.push(`错误做法：${scene.wrong}`);
      }
      if (scene.right) {
        lines.push(`正确用法：${scene.right}`);
      }
      lines.push('');
    });
  }
  
  // 四、常见误区
  if (model.commonMistake && model.commonMistake.length > 0) {
    lines.push('## 四、常见误用误区');
    model.commonMistake.forEach((mistake, i) => {
      lines.push(`${i + 1}. ${mistake}`);
    });
    lines.push('');
  }
  
  // 五、实操步骤
  if (model.operationStep && model.operationStep.length > 0) {
    lines.push('## 五、分阶梯实操步骤');
    model.operationStep.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
    lines.push('');
  }
  
  // 六、思考题
  if (model.thinkQuestion && model.thinkQuestion.length > 0) {
    lines.push('## 六、配套每日拆解思考题');
    model.thinkQuestion.forEach((q, i) => {
      lines.push(`${i + 1}. ${q}`);
    });
    lines.push('');
  }
  
  // 七、栅格组合
  if (model.gridCombine && model.gridCombine.length > 0) {
    lines.push('## 七、跨模型栅格组合方案');
    model.gridCombine.forEach((comb, i) => {
      lines.push(`${i + 1}. ${comb}`);
    });
    lines.push('');
  }
  
  // 八、自测清单
  if (model.selfCheck && model.selfCheck.length > 0) {
    lines.push('## 八、自测校验清单');
    model.selfCheck.forEach((check, i) => {
      lines.push(`${i + 1}. ${check}`);
    });
    lines.push('');
  }
  
  // 九、7天计划
  if (model.sevenDayPlan && model.sevenDayPlan.length > 0) {
    lines.push('## 九、7天长期内化落地计划');
    model.sevenDayPlan.forEach((plan, i) => {
      lines.push(`${plan}`);
    });
    lines.push('');
  }
  
  // 十、避坑提醒
  if (model.remind && model.remind.length > 0) {
    lines.push('## 十、避坑提醒');
    model.remind.forEach((r, i) => {
      lines.push(`${i + 1}. ${r}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

// 处理所有模型文件
const modelDir = 'D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型';
const files = fs.readdirSync(modelDir).filter(f => f.endsWith('.md') && f !== '附录.md');

let allModels = [];
let chapterId = 1;

// 先加前言
allModels.push({
  chapterId: chapterId++,
  title: '前言：思维栅格，普通人的认知升级工具',
  content: `### 前言：思维栅格，普通人的认知升级工具

查理·芒格提出多元思维栅格理论：大脑储备多学科底层模型，遇到任何问题自动切换多视角，避开单一认知盲区。熟练掌握80-90个通用思维模型，足以解决生活、职场、人际90%以上难题。

市面上多数思维书籍零散堆砌概念，缺少完整落地链路。本书101个模型分为六大闭环板块：认知自我→看懂世界→拆解问题→高效学习沟通→落地执行→持续复盘迭代。

全书每个模型统一分为5部分：模型来源、核心原理、生活案例、实操用法、避坑提醒；包含90个经典通用模型+11个原创实战模型。不用一次性读完，可当作工具书随时查阅，完整通读能搭建专属个人认知体系。

很多人懂得道理却无法改变现状，根源是缺少标准化思考工具。本书目标：给普通人一套拿来就能用、落地有效果的思维工具箱。`
});

// 章节标题映射（从文件内容动态提取）
const partMap = {
  '第一部分_认知自我_1-20': '第一部分 认知自我',
  '第二部分_认知世界_21-40': '第二部分 认知世界',
  '第三部分_思考与分析工具_41-60': '第三部分 思考分析',
  '第四部分_沟通与学习_61-80': '第四部分 沟通学习',
  '第五部分_计划与行动_81-100': '第五部分 计划行动',
  '第六部分_总结与全局复盘_101': '第六部分 复盘迭代'
};

for (const file of files) {
  const content = fs.readFileSync(path.join(modelDir, file), 'utf8');
  const models = extractJSBlocks(content);
  const partName = partMap[file.replace('.md', '')] || file;
  
  // 计算每个部分内的章节编号
  let localIdx = 1;
  
  models.forEach(model => {
    const title = `${partName}｜第${localIdx}章 ${model.modelName}`;
    const mdContent = modelToMarkdown(model, chapterId);
    
    allModels.push({
      chapterId: chapterId++,
      title: title,
      content: mdContent
    });
    
    localIdx++;
  });
  
  console.log(`${file}: ${models.length} models`);
}

// 加终章
allModels.push({
  chapterId: chapterId++,
  title: '全书终章｜终身思维栅格总览',
  content: `# 全书终章：终身思维栅格总览

## 一、本章定位
全书总结整合章节，汇总101个思维模型完整使用逻辑，对应游戏终身成长设定。

## 二、核心原理
101个模型分为六大闭环板块，构成完整个人思维栅格：认知自我→看懂世界→拆解问题→学习沟通→落地行动→复盘迭代。

没有任何一个模型可以独立解决所有问题，遇到复杂事务多模型交叉组合分析，才能客观全面判断。

成长不存在终点，读完本书只是搭建基础格栅，后续持续阅读新书、吸收新思维，不断扩充完善自身认知体系，对应游戏内结业解锁新书、成长树持续长出新枝干的长效机制。

## 三、全书落地总方案
1. 阅读顺序：严格按照六大板块循序渐进，不跳章学习；
2. 学习标准：每章完成阅读打卡+思维拆解笔记，双进度拉满完成结业；
3. 长期使用：日常遇到问题主动调用对应模型分析，持续实践内化；
4. 迭代升级：结业本书后持续阅读进阶书籍，不断丰富自身思维工具箱。

## 四、长期成长寄语
真正的成长，不是走得快，而是走得远。101个模型只是起点，终身学习才是终点。愿你在游戏里种下一棵树，在现实中长成一片森林。`
});

console.log(`\n总计: ${allModels.length} chapters`);

// 输出结果
const output = JSON.stringify(allModels, null, 2);
fs.writeFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/converted_chapters.json', output);
console.log('Output saved to converted_chapters.json');
