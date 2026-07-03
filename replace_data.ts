import fs from 'fs'
import path from 'path'

// 方案B文件中的模型结构（JS对象字面量，键名无引号）
interface Model {
  modelId: number
  modelName: string
  part: string
  origin: string
  coreConclusion: string
  logicLayer: string[]
  sceneCase: { scene: string; wrong?: string; right?: string }[]
  commonMistake: string[]
  operationStep: string[]
  thinkQuestion: string[]
  gridCombine: string[]
  selfCheck: string[]
  sevenDayPlan: string[]
  remind: string[]
}

function parseModelBlock(code: string): Model | null {
  try {
    // 把中文引号替换为英文引号，避免JS解析失败
    let cleaned = code
      .replace(/\u201c/g, '"')
      .replace(/\u201d/g, '"')
      .replace(/\u2018/g, "'")
      .replace(/\u2019/g, "'")
      .replace(/：/g, ':')

    // 给所有键加引号（modelId:1 -> "modelId":1）
    cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')

    // 单引号转双引号
    cleaned = cleaned.replace(/'/g, '"')

    return JSON.parse(cleaned)
  } catch (e) {
    // 如果JSON解析失败，尝试用Function构造器
    try {
      return new Function('return (' + code + ')')()
    } catch (e2) {
      console.error('Parse failed:', e)
      return null
    }
  }
}

function modelToMarkdown(model: Model): string {
  const lines: string[] = []

  lines.push(`# ${model.modelName}`)
  lines.push('')

  lines.push('## 一、模型溯源（深度拓展）')
  lines.push(model.origin || '暂无')
  lines.push('')

  lines.push('## 二、核心原理')
  lines.push(model.coreConclusion || '暂无')
  lines.push('')

  if (model.logicLayer && model.logicLayer.length > 0) {
    lines.push('### 底层逻辑分层拆解')
    model.logicLayer.forEach((layer) => {
      const clean = layer.replace(/^\d+[\.\、\s]+/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  if (model.sceneCase && model.sceneCase.length > 0) {
    lines.push('## 三、落地案例')
    model.sceneCase.forEach((scene, i) => {
      lines.push(`### 场景${i + 1}：${scene.scene}`)
      if (scene.wrong) lines.push(`错误做法：${scene.wrong}`)
      if (scene.right) lines.push(`正确用法：${scene.right}`)
      lines.push('')
    })
  }

  if (model.commonMistake && model.commonMistake.length > 0) {
    lines.push('## 四、常见误用误区')
    model.commonMistake.forEach((m) => {
      const clean = m.replace(/^误区\d+[\.\、\s]*/, '').replace(/^\d+[\.\、\s]+/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  if (model.operationStep && model.operationStep.length > 0) {
    lines.push('## 五、分阶梯实操步骤')
    model.operationStep.forEach((s) => {
      const clean = s.replace(/^\d+[\.\、\s]+/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  if (model.thinkQuestion && model.thinkQuestion.length > 0) {
    lines.push('## 六、配套每日拆解思考题')
    model.thinkQuestion.forEach((q) => {
      const clean = q.replace(/^\d+[\.\、\s]+/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  if (model.gridCombine && model.gridCombine.length > 0) {
    lines.push('## 七、跨模型栅格组合方案')
    model.gridCombine.forEach((c) => {
      const clean = c.replace(/^\d+[\.\、\s]+/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  if (model.selfCheck && model.selfCheck.length > 0) {
    lines.push('## 八、自测校验清单')
    model.selfCheck.forEach((c) => {
      const clean = c.replace(/^\d+[\.\、\s]+/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  if (model.sevenDayPlan && model.sevenDayPlan.length > 0) {
    lines.push('## 九、7天长期内化落地计划')
    model.sevenDayPlan.forEach((p) => {
      const clean = p.replace(/^Day\d+[\.\、\s]*/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  if (model.remind && model.remind.length > 0) {
    lines.push('## 十、避坑提醒')
    model.remind.forEach((r) => {
      const clean = r.replace(/^\d+[\.\、\s]+/, '')
      lines.push(`- ${clean}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

// 读取所有模型文件
const modelDir = 'D:/工具/workbuddy/2026-07-02-14-53-23/百知思维模型'
const files = fs.readdirSync(modelDir)
  .filter(f => f.endsWith('.md') && f !== '附录.md')
  .sort((a, b) => {
    // 按编号排序
    const getNum = (s: string) => {
      const m = s.match(/(\d+)-(\d+)/)
      if (m) return parseInt(m[1])
      const m2 = s.match(/(\d+)/)
      if (m2) return parseInt(m2[1])
      return 999
    }
    return getNum(a) - getNum(b)
  })

console.log('Files to process:', files)

// 前言
const chapters: { chapterId: number; title: string; content: string }[] = [{
  chapterId: 1,
  title: '前言：思维栅格，普通人的认知升级工具',
  content: `### 前言：思维栅格，普通人的认知升级工具

查理·芒格提出多元思维栅格理论：大脑储备多学科底层模型，遇到任何问题自动切换多视角，避开单一认知盲区。熟练掌握80-90个通用思维模型，足以解决生活、职场、人际90%以上难题。

市面上多数思维书籍零散堆砌概念，缺少完整落地链路。本书101个模型分为六大闭环板块：认知自我→看懂世界→拆解问题→高效学习沟通→落地执行→持续复盘迭代。

全书每个模型统一分为5部分：模型来源、核心原理、生活案例、实操用法、避坑提醒；包含90个经典通用模型+11个原创实战模型。不用一次性读完，可当作工具书随时查阅，完整通读能搭建专属个人认知体系。

很多人懂得道理却无法改变现状，根源是缺少标准化思考工具。本书目标：给普通人一套拿来就能用、落地有效果的思维工具箱。`
}]

let chapterId = 2
let totalModels = 0
let failedModels = 0

for (const file of files) {
  const content = fs.readFileSync(path.join(modelDir, file), 'utf8')

  // 提取所有 JS 代码块
  const regex = /```js\n([\s\S]*?)```/g
  let match
  const models: Model[] = []

  while ((match = regex.exec(content)) !== null) {
    const model = parseModelBlock(match[1].trim())
    if (model && model.modelName) {
      models.push(model)
      totalModels++
    } else {
      failedModels++
    }
  }

  // 按 modelId 排序
  models.sort((a, b) => a.modelId - b.modelId)

  // 确定部分名称
  let partName = '未知部分'
  if (file.includes('认知自我')) partName = '第一部分 认知自我'
  else if (file.includes('认知世界')) partName = '第二部分 认知世界'
  else if (file.includes('思考')) partName = '第三部分 思考分析'
  else if (file.includes('沟通')) partName = '第四部分 沟通学习'
  else if (file.includes('计划')) partName = '第五部分 计划行动'
  else if (file.includes('总结')) partName = '第六部分 复盘迭代'

  let localIdx = 1
  for (const model of models) {
    const title = `${partName}｜第${localIdx}章 ${model.modelName}`
    const mdContent = modelToMarkdown(model)

    chapters.push({
      chapterId: chapterId++,
      title,
      content: mdContent
    })

    localIdx++
  }

  console.log(`${file}: ${models.length} models parsed`)
}

// 终章
chapters.push({
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
})

console.log(`\nTotal models parsed: ${totalModels}`)
console.log(`Failed: ${failedModels}`)
console.log(`Total chapters: ${chapters.length}`)

// 生成新的 initialBooks.ts
const bookData = {
  bookId: "book_baizhi",
  bookName: "百知思维模型",
  status: "unlock",
  readProgress: 0,
  thinkProgress: 0,
  finishTime: "",
  unlockLevel: 1,
  branchColor: "#7FB069",
  summary: "101个思维模型串联成完整成长闭环：认知自我、看懂世界、拆解问题、学习沟通、落地行动、复盘迭代。",
  readRecords: [],
  thinkRecords: [],
  finishSummary: "",
  chapters
}

// 读取现有的其他书籍数据
const existingData = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/src/initialBooks.ts', 'utf8')
// 提取其他书籍（B1[1]到B1[5]）
const otherBooksMatch = existingData.match(/export const B1 = \[\{[\s\S]*?\}\],(\[\{[\s\S]*?\}\])\];/)

// 构建新的文件内容
let newContent = 'export const B1 = [' + JSON.stringify(bookData).replace(/"/g, '"') + '];\n\n'

// 添加其他导出
const otherExports = existingData.match(/export const (Ql|Ye|Yl) = [\s\S]*?;/g)
if (otherExports) {
  newContent += otherExports.join('\n\n')
}

fs.writeFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/src/initialBooks.ts', newContent)
console.log('\nSaved new initialBooks.ts')

// 验证
const verify = fs.readFileSync('D:/工具/workbuddy/2026-07-02-14-53-23/src/initialBooks.ts', 'utf8')
const chMatch = verify.match(/"chapterId":(\d+)/g)
console.log('Chapters in file:', chMatch ? chMatch.length : 0)
