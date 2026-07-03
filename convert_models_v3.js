const fs = require('fs');
const path = require('path');

function extractJSBlocks(mdContent) {
  const blocks = [];
  const regex = /```js\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(mdContent)) !== null) {
    try {
      const jsCode = match[1].trim();
      
      // 方案1: 先用 Function 构造器
      try {
        const obj = new Function('return (' + jsCode + ')')();
        blocks.push(obj);
        continue;
      } catch(e) {}
      
      // 方案2: 替换中文冒号为英文冒号，替换中文引号为英文引号
      try {
        let cleaned = jsCode
          .replace(/：/g, ':')
          .replace(/“/g, '"')
          .replace(/”/g, '"')
          .replace(/‘/g, "'")
          .replace(/’/g, "'")
          .replace(/\r\n/g, '\n');
        
        // 给键加引号
        cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        // 处理单引号
        cleaned = cleaned.replace(/'/g, '"');
        
        const obj = JSON.parse(cleaned);
        blocks.push(obj);
        continue;
      } catch(e) {}
      
      // 方案3: 逐行解析 - 更鲁棒
      const lines = jsCode.split('\n');
      const obj = {};
      let currentKey = null;
      let currentArray = null;
      let arrayKey = null;
      let inString = false;
      let strChar = '';
      let buffer = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 跳过空行和花括号
        if (!line || line === '{' || line === '}' || line === '],') continue;
        
        // 检测键值对
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1 && !line.startsWith('//')) {
          const key = line.substring(0, colonIdx).trim().replace(/["']/g, '');
          let val = line.substring(colonIdx + 1).trim();
          
          // 去除末尾逗号
          if (val.endsWith(',')) val = val.slice(0, -1);
          
          // 数组开始
          if (val === '[') {
            arrayKey = key;
            currentArray = [];
            continue;
          }
          
          // 对象
          if (val === '{') {
            // 跳过，我们直接处理简单值
            continue;
          }
          
          // 字符串值
          if (val.startsWith('"') && val.endsWith('"')) {
            obj[key] = val.slice(1, -1);
          } else if (val.startsWith("'") && val.endsWith("'")) {
            obj[key] = val.slice(1, -1);
          } else if (val === 'true' || val === 'false') {
            obj[key] = val === 'true';
          } else if (!isNaN(Number(val))) {
            obj[key] = Number(val);
          } else {
            obj[key] = val;
          }
        }
        
        // 数组元素
        if (arrayKey && line.endsWith('],')) {
          // 结束数组
          obj[arrayKey] = currentArray;
          arrayKey = null;
          currentArray = null;
        } else if (arrayKey && line.endsWith('{')) {
          // 对象数组元素开始 - 复杂，跳过
        } else if (arrayKey && line.endsWith('},')) {
          // 简单对象结束
        }
      }
      
      if (Object.keys(obj).length > 0) {
        blocks.push(obj);
      } else {
        console.error('Failed to parse block near:', jsCode.substring(0, 80));
      }
      
    } catch (e) {
      console.error('Parse error:', e.message.substring(0, 80));
    }
  }
  return blocks;
}

function modelToMarkdown(model) {
  const lines = [];
  
  lines.push(`# ${model.modelName}`);
  lines.push('');
  
  lines.push('## 一、模型溯源（深度拓展）');
  lines.push(model.origin || '暂无');
  lines.push('');
  
  lines.push('## 二、核心原理');
  lines.push(model.coreConclusion || '暂无');
  lines.push('');
  
  if (model.logicLayer && model.logicLayer.length > 0) {
    lines.push('### 底层逻辑分层拆解');
    if (typeof model.logicLayer[0] === 'string') {
      model.logicLayer.forEach((layer, i) => lines.push(`${i + 1}. ${layer}`));
    }
    lines.push('');
  }
  
  if (model.sceneCase && model.sceneCase.length > 0) {
    lines.push('## 三、落地案例');
    model.sceneCase.forEach((scene, i) => {
      const name = scene.scene || `场景${i + 1}`;
      lines.push(`### ${name}`);
      if (scene.wrong) lines.push(`错误做法：${scene.wrong}`);
      if (scene.right) lines.push(`正确用法：${scene.right}`);
      lines.push('');
    });
  }
  
  if (model.commonMistake && model.commonMistake.length > 0) {
    lines.push('## 四、常见误用误区');
    model.commonMistake.forEach((m, i) => lines.push(`${i + 1}. ${m}`));
    lines.push('');
  }
  
  if (model.operationStep && model.operationStep.length > 0) {
    lines.push('## 五、分阶梯实操步骤');
    model.operationStep.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }
  
  if (model.thinkQuestion && model.thinkQuestion.length > 0) {
    lines.push('## 六、配套每日拆解思考题');
    model.thinkQuestion.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push('');
  }
  
  if (model.gridCombine && model.gridCombine.length > 0) {
    lines.push('## 七、跨模型栅格组合方案');
    model.gridCombine.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    lines.push('');
  }
  
  if (model.selfCheck && model.selfCheck.length > 0) {
    lines.push('## 八、自测校验清单');
    model.selfCheck.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    lines.push('');
  }
  
  if (model.sevenDayPlan && model.sevenDayPlan.length > 0) {
    lines.push('## 九、7天长期内化落地计划');
    model.sevenDayPlan.forEach(p => lines.push(`${p}`));
    lines.push('');
  }
  
  if (model.remind && model.remind.length > 0) {
    lines.push('## 十、避坑提醒');
    model.remind.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    lines.push('');
  }
  
  return lines.join('\n');
}

const modelDir = 'D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型';
const files = fs.readdirSync(modelDir).filter(f => f.endsWith('.md') && f !== '附录.md');

let allModels = [];
let chapterId = 1;

// 前言
allModels.push({
  chapterId: chapterId++,
  title: '前言：思维栅格，普通人的认知升级工具',
  content: `### 前言：思维栅格，普通人的认知升级工具

查理·芒格提出多元思维栅格理论：大脑储备多学科底层模型，遇到任何问题自动切换多视角，避开单一认知盲区。熟练掌握80-90个通用思维模型，足以解决生活、职场、人际90%以上难题。

市面上多数思维书籍零散堆砌概念，缺少完整落地链路。本书101个模型分为六大闭环板块：认知自我→看懂世界→拆解问题→高效学习沟通→落地执行→持续复盘迭代。

全书每个模型统一分为5部分：模型来源、核心原理、生活案例、实操用法、避坑提醒；包含90个经典通用模型+11个原创实战模型。不用一次性读完，可当作工具书随时查阅，完整通读能搭建专属个人认知体系。

很多人懂得道理却无法改变现状，根源是缺少标准化思考工具。本书目标：给普通人一套拿来就能用、落地有效果的思维工具箱。`
});

const partMap = {
  '第一部分_认知自我_1-20': '第一部分 认知自我',
  '第二部分_认知世界_21-40': '第二部分 认知世界',
  '第三部分_思考与分析工具_41-60': '第三部分 思考分析',
  '第四部分_沟通与学习_61-80': '第四部分 沟通学习',
  '第五部分_计划与行动_81-100': '第五部分 计划行动',
  '第六部分_总结与全局复盘_101': '第六部分 复盘迭代'
};

let totalModels = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(modelDir, file), 'utf8');
  const models = extractJSBlocks(content);
  const partName = partMap[file.replace('.md', '')] || file;
  
  let localIdx = 1;
  
  models.forEach(model => {
    totalModels++;
    const title = `${partName}｜第${localIdx}章 ${model.modelName}`;
    const mdContent = modelToMarkdown(model);
    
    allModels.push({
      chapterId: chapterId++,
      title: title,
      content: mdContent
    });
    
    localIdx++;
  });
  
  console.log(`${file}: ${models.length} models`);
}

// 终章
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

console.log(`\n总计: ${totalModels} models, ${allModels.length} chapters`);

const output = JSON.stringify(allModels, null, 2);
fs.writeFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/converted_chapters.json', output);
console.log('Done');
