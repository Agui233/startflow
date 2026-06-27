// ============================================
// StartFlow — Backend Server
// Node.js http server (no dependencies needed)
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// ============================================
// 读取 .env 文件（如果存在）
// ============================================
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // 去掉引号
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log('.env 文件已加载');
}

// ============================================
// SYSTEM_PROMPT — 产品核心规则，不要改写
// ============================================
const SYSTEM_PROMPT = `你是 StartFlow 的行为启动翻译器。你的任务不是给建议、不是做计划、不是拆解任务，而是把用户正在拖延的一件事，翻译成 3 个连续、极小、具体、可立即执行的身体动作或手指动作。

目标：让用户在 2 分钟内接触任务现场，跨过开始前的阻力。

你不是模板填空器。你需要根据用户原话里的具体对象、场景、工具、材料、情绪阻力和常用条件，生成更贴近真实现场的启动链。

# 核心原则
1. 三个动作必须都非常小，小到近乎荒谬。
2. 三个动作必须能按顺序在 2 分钟内完成。
3. 三个动作只负责启动，不负责完成任务。
4. 优先让用户接触真实任务现场：相关文件、旧版本、聊天窗口、邮箱、输入框、资料、工具、物品、环境、上一次做到一半的材料。
5. 如果用户提供了常用条件，优先围绕常用条件生成动作。
6. 如果用户没有提供常用条件，不要虚构具体文件名、联系人、地点、账号、章节、页码或材料。
7. 可以自然使用用户原话里的具体名词，例如客户、周报、报价单、跑鞋、PPT、论文、邮箱、书、文件夹、行李箱。
8. 动作可以有现场感，不必套固定句式。
9. 输出要像一个理解拖延现场的人给出的微小推动，而不是机器模板。
10. 判断任务时，具体对象优先于泛动词。例如「起诉材料整理」的核心对象是起诉材料、文件、证据、文件夹，不是普通收纳；不要因为出现「整理」就输出袋子、衣服、杂物。
11. 如果任务是休息、睡觉、午觉、上厕所、洗澡、吃饭、喝水等身体状态，核心现场是身体和环境，不是备忘录。动作应让用户接触床、枕头、灯、窗帘、水杯、卫生间、浴室等真实对象。
12. 如果用户给出了具体主题、对象、人群、年级、课程、材料名或产出物，启动链必须复用这些具体信息，留下一个和任务主题有关的可见痕迹。不要输出「相关文档」「一个标题」「今天日期」这种泛占位动作。
13. 区分「发邮件/联系某人」和「查看邮箱/处理未读邮件」。如果用户说查看邮箱、未读邮件、收件箱、邮件太多，核心现场是收件箱和一封邮件，不是输入框和称呼。
14. 如果用户补充了「当前情况」「卡点」「偏好」或「上一版不贴近」，必须优先根据补充重新判断真实阻力和启动位置，不要坚持上一版方向。
15. 如果用户提到 Codex、AI 做的项目、用 AI 生成的网站、vibe coding、自然语言编程或类似表述，默认用户不是程序员。不要输出涉及查看、编辑、定位代码文件的动作。任务现场应是 AI 编程工具的会话窗口、项目预览页面、部署页面或输入框，而不是代码文件本身。第一步让用户打开对应项目会话或预览页面，第二步让用户看当前页面上一个具体区域（首页第一屏、按钮、标题、反馈区域），第三步让用户在 AI 输入框里写一句很短的修改请求，先不发送。

# 三步结构
第 1 步：进入任务现场。打开、拿出、点开或移动到真正承载任务的地方。
第 2 步：接触核心对象。写下、选中、复制、翻到、点开或触摸用户任务里最关键的对象。
第 3 步：留下一个极小但具体的任务痕迹。这个痕迹要和用户任务语义相关，不能只是日期、标题、「开始」、「待办」等泛占位。

第三步是发挥 AI 价值的关键：它应该提供一个低压力的语义切入口，而不是替用户完成任务。
创作类任务的第三步可以是一句极短的开头、一个活动名、一个例子、一个小标题、一个素材词。教案/课程类优先给出一个具体课堂活动入口，不要只写「课程目标：」「材料：」这类字段名。
整理类任务的第三步可以是移动一个具体文件或物品到临时位置。
沟通类任务的第三步可以是一个不发送的称呼、标题或草稿开头。
身体类任务的第三步可以是一个让身体进入状态的动作。
AI 项目类（Codex / vibe coding / AI 生成）的第三步可以是在 AI 输入框里写一句很短的修改请求，先不发送。

# 你需要隐式完成的判断
只做极短判断，不要展开推理，不要输出判断过程。你必须先在心里回答：
1. 用户真正想开始接触的对象是什么？
2. 用户可能害怕或回避的是哪一部分？
3. 哪个真实物品、文件、窗口、材料、工具或环境最能把用户带进现场？
4. 三个动作怎样从「碰到现场」推进到「留下一个微小痕迹」？

你回答的不是「这个任务属于哪一类」，而是：用户现在最应该触碰什么真实对象，才能进入这件事？

# 绝对禁止
禁止使用这些词：分析、规划、拆解、构思、列出、梳理、评估、思考、研究、复盘、总结、步骤、首先、建议、计划。
禁止输出任务计划、原因解释、心理建议、多个方案。
禁止要求用户完成完整任务。
禁止让用户写完整邮件、发出消息、完成报告、整理全部文件、学完课程、跑完步。
高情绪沟通任务中，禁止要求用户发送实质内容，只能打开、定位、输入无压力内容或停住。
AI 项目类任务（Codex / vibe coding / AI 生成）中，禁止要求用户打开 index.html、找 main.py、点开可能有问题的代码文件、在代码末尾添加注释、找项目主入口代码。用户非程序员，任务现场是 AI 工具界面，不是代码文件。

# 生成方式
不要套关键词模板。
不要只根据动词判断任务。
不要因为用户说「整理」就默认生活收纳。
不要因为用户说「开始」就输出备忘录。
优先使用用户原话里的具体对象、材料、关系和场景。
如果任务有真实对象，就进入真实对象现场；只有任务本身非常抽象时，才使用备忘录废稿纸法。

# 好输出示例
用户：写g3-5的儿童营养课教案
输出：["打开一个空白文档。","写下「G3-5儿童营养课：午餐盘」。","在下一行打出「孩子先画自己今天吃了什么」。"]

用户：写拖了一周的周报
输出：["打开上周周报。","复制一个小标题到新文档。","在下面打出本周最容易想起的一件事。"]

用户：整理起诉材料
输出：["打开材料文件夹。","新建一个「先放这里」文件夹。","拖入一个你最确定的材料文件。"]

用户：查看五百多封未读邮件
输出：["打开邮箱收件箱。","点开最上面一封未读邮件。","只读邮件标题和第一行。"]

用户：我想睡个午觉
输出：["关掉手机屏幕。","拉上窗帘。","躺到枕头上。"]

用户：用Codex完善我的项目首页
输出：["打开 Codex 项目会话。","看首页第一屏的标题和按钮。","在 AI 输入框里写「把标题改成更有吸引力的版本」，先不发送。"]

用户：用 AI 做了个落地页想继续改
输出：["打开项目预览页面。","看落地页的导航栏和首屏内容。","在 AI 输入框里写一句调整需求，先不发送。"]

# 输出格式
重要：不要展开推理，不要解释，不要先分析。直接输出最终 JSON 数组。
只返回 JSON 数组。
数组长度必须是 3。
数组中每一项是一个动作字符串。
不要返回 Markdown。
不要返回对象。
不要返回解释。
不要返回编号。
不要返回前后缀。
`.trim();

// ============================================
// SUPPLEMENT_RULES — 用户条件前置规则
// ============================================
const SUPPLEMENT_RULES = `
补充规则——用户条件前置：

StartFlow 的页面会收集两个输入：
1. 用户目标：用户想开始但拖延的任务。
2. 常用条件：用户通常会用来完成这件事的材料、工具、软件、设备、地点、环境或学习资源。该项可能为空。

你在生成"第一步指令"时，必须优先读取"常用条件"。

如果用户填写了常用条件：
- 第一指令应尽量围绕该条件生成，让动作贴近用户真实场景。
- 如果常用条件不完整，但足以判断一个低阻力启动方式，可以使用合理的最低阻力假设。
- 对学习资料，如果用户没有说明是纸质版还是电子版，默认用户可以通过手机、电脑或 iPad 使用电子资料。
- 对软件或平台，如果用户只填写名称，默认用户可以在常用设备上打开它，但不要假设具体文件、页面、账号、历史记录或内容已经存在。
- 对地点或环境，如果用户填写"家里、办公室、健身房、图书馆"等，应让第一步从进入该环境后最容易触碰到的动作开始。

如果用户没有填写常用条件：
- 使用现有的最低资源保底规则。
- 第一指令只能依赖用户当前设备、当前输入框、观察、回忆、轻量身体动作，或极常见的随手工具。
- 不要假设用户拥有课本、打印资料、专业软件、器材、特定文件、特定账号、特定场地或他人协助。

禁止事项：
- 不要反问用户补充条件。
- 不要把"告诉我你有什么工具""选择一个材料""回复你的习惯"作为第一步。
- 不要虚构具体页码、章节、课文编号、文件名、账号、联系人或地点，除非用户明确提供。
- 不要因为用户填写了一个材料名称，就指定不存在的具体位置。
- 不要使用"如果你有……"开头，因为这会把判断成本还给用户。

生成策略：
- 用户目标决定任务类型。
- 常用条件决定动作载体。
- 如果目标和常用条件冲突，优先保证第一步可执行，而不是强行使用条件。
- 如果常用条件太模糊，只取其中最确定、最容易触碰的部分。
- 第一指令应该让用户接触任务载体，而不是开始真正完成任务。
`.trim();

// ============================================
// 静态文件 MIME 类型
// ============================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ============================================
// 本地保底动作生成
// ============================================
function cleanTask(task) {
  return String(task || '')
    .replace(/^用户目标：/m, '')
    .replace(/常用条件：[\s\S]*$/m, '')
    .trim()
    .slice(0, 60);
}

function extractTopic(task) {
  return cleanTask(task)
    .replace(/^我想要?/, '')
    .replace(/^开始/, '')
    .replace(/^(写|做|设计|准备|制作|整理)/, '')
    .replace(/[。.!！]$/, '')
    .trim()
    .slice(0, 24) || '这件事';
}

function generateFallbackAction(task, tools) {
  const source = cleanTask(task);
  const lower = source.toLowerCase();
  const toolHint = (tools && tools.trim()) ? tools.trim() : null;
  const context = (source + '\n' + (toolHint || '')).toLowerCase();

  if (toolHint) {
    if (/Notion/i.test(toolHint)) return pack(['打开 Notion。', '新建一个空白页。', '写下「' + extractTopic(source) + '」。']);
    if (/微信|WeChat/i.test(toolHint)) return pack(['打开微信。', '点开相关聊天。', '输入对方称呼但不发送。']);
    if (/邮箱|mail/i.test(toolHint) && /(批量|筛选|过滤|分类|归档|整理|全选|搜索)/.test(context)) return pack(['打开邮箱收件箱。', '点开搜索或筛选入口。', '输入一个最明显的发件人或关键词。']);
    if (/邮箱|mail/i.test(toolHint) && /(查看|处理|清理|读|看|未读|收件箱)/.test(lower)) return pack(['打开邮箱收件箱。', '点开最上面一封未读邮件。', '只读邮件标题和第一行。']);
    if (/邮箱|mail/i.test(toolHint)) return pack(['打开邮箱。', '点开新邮件标题栏。', '输入一个无压力标题。']);
    if (/书|课本|教材/.test(toolHint)) return pack(['翻开' + toolHint + '。', '找到当前页。', '用手指触摸第一行字。']);
    if (/跑鞋|运动鞋/.test(toolHint)) return pack(['找出' + toolHint + '。', '穿上左脚鞋。', '系上左脚鞋带。']);
    if (/瑜伽垫/.test(toolHint)) return pack(['铺开瑜伽垫。', '站到垫子边缘。', '放下手机。']);
  }

  if (/(邮箱|邮件|收件箱|未读)/.test(context) && /(批量|筛选|过滤|分类|归档|整理|全选|搜索)/.test(context)) {
    return pack(['打开邮箱收件箱。', '点开搜索或筛选入口。', '输入一个最明显的发件人或关键词。']);
  }
  if (/(查看|处理|清理|读|看).*(邮箱|邮件|收件箱|未读)|(邮箱|邮件|收件箱|未读).*(太多|五百|几百|未读|积压|爆满)/.test(lower)) {
    return pack(['打开邮箱收件箱。', '点开最上面一封未读邮件。', '只读邮件标题和第一行。']);
  }
  if (/(睡|午觉|小睡|休息|躺一会|补觉)/.test(lower)) {
    return pack(['关掉手机屏幕。', '拉上窗帘。', '躺到枕头上。']);
  }
  if (/(代码|编程|码|项目|app|应用|网页|网站|程序|系统|codex|开发|页面|功能)/.test(lower) && /(完善|改|优化|修改|调整|加|添加)/.test(lower)) {
    return pack(['打开项目会话或预览页面。', '看首页第一屏的内容。', '在 AI 输入框里写一句修改需求，先不发送。']);
  }
  if (/(行李|打包|旅行|旅游|出差|回家|箱子|行李箱|背包|护照|证件|充电器|洗漱)/.test(lower)) {
    return pack(['找出行李箱。', '拉开箱子拉链。', '放进一件最容易拿到的衣服。']);
  }
  if (/(起诉|诉讼|法院|律师|证据|材料|资料|合同|发票|报销|申请|文件|文档)/.test(lower)) {
    if (/(起诉|诉讼|法院|律师|证据)/.test(lower)) return pack(['打开起诉材料文件夹。', '新建一个「待整理」文件夹。', '拖入一个相关文件。']);
    return pack(['打开材料文件夹。', '新建一个「待整理」文件夹。', '拖入一个相关文件。']);
  }
  if (/(客户|老板|前任|道歉|催|报价单|不敢联系|愧疚|尴尬|害怕)/.test(lower)) {
    const tool = /(邮箱|邮件|报价)/.test(lower) ? '邮箱' : '沟通工具';
    return pack(['打开' + tool + '。', '点开搜索框。', '输入对方名字首字母。']);
  }
  if (/(邮件|消息|联系|回复|汇报|沟通|电话|微信)/.test(lower)) {
    return pack(['打开沟通工具。', '点开输入框。', '输入一个称呼但不发送。']);
  }
  if (/(跑步|锻炼|健身|瑜伽|冥想|散步|运动|拉伸)/.test(lower)) {
    if (/跑/.test(lower)) return pack(['找出跑鞋。', '穿上左脚跑鞋。', '系上左脚鞋带。']);
    if (/瑜伽/.test(lower)) return pack(['铺开瑜伽垫。', '站到垫子边缘。', '放下手机。']);
    if (/冥想/.test(lower)) return pack(['坐下。', '按下计时器。', '闭眼呼吸一次。']);
    return pack(['找出运动装备。', '让手触摸它。', '穿上其中一件。']);
  }
  if (/(看书|学习|背单词|学英语|阅读|论文|课程|听课|资料)/.test(lower) && !/(写|制作|准备|教案)/.test(lower)) {
    if (/(英语|单词)/.test(lower)) return pack(['打开单词资料。', '点开第一个单词。', '读出这个单词。']);
    return pack(['打开学习资料。', '翻到当前页。', '用手指触摸第一行字。']);
  }
  if (/(写|画|设计|ppt|PPT|方案|文案|报告|海报|剪视频|代码|论文|教案|课件|课程)/.test(lower)) {
    const topic = extractTopic(source);
    if (/(教案|课程|课件)/.test(lower)) {
      if (/(营养|儿童|g3|g4|g5)/.test(lower)) return pack(['打开一个空白文档。', '写下「G3-5儿童营养课：午餐盘」。', '在下一行打出「孩子先画自己今天吃了什么」。']);
      return pack(['打开教案文档。', '写下「' + topic + '」。', '在下一行打出一个课堂开场问题。']);
    }
    if (/(周报|报告)/.test(lower)) return pack(['打开上周周报。', '复制一个小标题到新文档。', '在下面打出本周最容易想起的一件事。']);
    if (/(海报|设计)/.test(lower)) return pack(['打开设计软件。', '新建空白画布。', '把「' + topic + '」打在画布中央。']);
    if (/(代码|编程|码)/.test(lower)) return pack(['打开编辑器。', '新建一个空文件。', '输入一行描述目标的注释。']);
    return pack(['打开文档。', '写下「' + topic + '」。', '在下一行打出一个最具体的例子。']);
  }
  if (/(收拾|打扫|搬家|整理|清理|归档|洗衣服|刷碗|衣柜|桌面|房间|厨房)/.test(lower)) {
    if (/(桌面|电脑)/.test(lower)) return pack(['右键桌面。', '新建一个文件夹。', '拖入一个文件。']);
    if (/(衣柜|衣服)/.test(lower)) return pack(['打开衣柜。', '找出一件衣服。', '把它挂回衣架。']);
    if (/(碗|厨房)/.test(lower)) return pack(['打开水龙头。', '拿起一个碗。', '冲洗碗的内侧。']);
    return pack(['拿出一个袋子。', '找出一个最显眼的小物品。', '把它放进袋子。']);
  }
  const shortTask = source.slice(0, 12) || '这件事';
  return pack(['打开备忘录。', '写下「关于' + shortTask + '」。', '随便打出5个字。']);
}

function pack(actions) {
  return { actions, action: actions.join(' ') };
}

// ============================================
// 调用 DeepSeek API（带超时）
// ============================================
async function callDeepSeek(apiKey, messages, temperature, timeoutMs, maxTokens = 420) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages,
        temperature: temperature || 0.45,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ============================================
// 提取 action（兼容多种返回格式）
// ============================================
function extractAction(data) {
  const raw = data.choices?.[0]?.message?.content?.trim()
      || data.choices?.[0]?.text?.trim()
      || data.output_text?.trim()
      || '';

  const valid = arr => Array.isArray(arr) && arr.length === 3 && arr.every(x => typeof x === 'string' && x.trim());
  const pack = arr => ({ actions: arr.map(x => String(x).trim()), action: arr.map(x => String(x).trim()).join(' ') });

  try {
    const parsed = JSON.parse(raw);
    if (valid(parsed)) return pack(parsed);
  } catch {}

  const bracketStart = raw.indexOf('[');
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch || bracketStart !== -1) {
    const text = arrayMatch ? arrayMatch[0] : raw.slice(bracketStart);
    try {
      const parsed = JSON.parse(text);
      if (valid(parsed)) return pack(parsed);
    } catch {}

    const quoted = [];
    const re = /"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(text)) && quoted.length < 3) {
      quoted.push(m[1].replace(/\\"/g, '"').trim());
    }
    if (valid(quoted)) return pack(quoted);
  }

  const lines = raw
    .split(/\n+/)
    .map(line => line.replace(/^\s*(?:\d+|[一二三]|第[一二三]步)[.、.)）]?\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  if (valid(lines)) return pack(lines);

  return { actions: [], action: '' };
}

function logDeepSeekResponse(label, data) {
  const choice = data.choices?.[0];
  console.log(`[DeepSeek ${label}] id=${data.id} model=${data.model} finish_reason=${choice?.finish_reason} usage=${JSON.stringify(data.usage)} content_length=${(choice?.message?.content || '').length}`);
  if (choice?.message?.reasoning_content) {
    console.log(`[DeepSeek ${label}] reasoning_content_length=${choice.message.reasoning_content.length}`);
  }
}

// ============================================
// 构建诊断响应
// ============================================
function buildResponse(actions, action, source, opts = {}) {
  const resp = {
    actions,
    action,
    source: source || 'fallback',
    raw: opts.raw || '',
    reason: opts.reason || '',
    final: actions,
  };
  if (opts.warning) resp.warning = opts.warning;
  return resp;
}

// ============================================
// 路由：POST /api/generate
// ============================================
async function handleGenerate(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      const task = parsed.task || '';
      const tools = parsed.tools || '';
      const mode = parsed.mode || '';
      const previousActions = parsed.previousActions || '';

      if (!task || typeof task !== 'string' || task.trim().length < 1) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '请输入有效的任务描述' }));
        return;
      }

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        const fb = generateFallbackAction(task, tools);
        const resp = buildResponse(fb.actions, fb.action, 'fallback', { reason: '未配置 API Key', raw: '', final: fb.actions, warning: '未配置 AI Key，已使用本地保底动作' });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(resp));
        return;
      }

      // 构建消息
      const isRefine = mode === 'refine' || !!tools;
      const userPrompt = isRefine
        ? [
            '原始任务：' + task,
            previousActions ? '上一版：' + (Array.isArray(previousActions) ? previousActions.join(' / ') : String(previousActions)) : '',
            '用户补充：' + tools,
            '根据补充重新生成更贴近当前情况的三步启动链。只输出 JSON 数组。'
          ].filter(Boolean).join('\n')
        : task;
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];
      const timeoutMs = isRefine ? 10000 : 8000;
      const retryTimeoutMs = isRefine ? 8000 : 6000;
      const maxTokens = isRefine ? 700 : 420;

      // 第一次调用
      let response;
      let rawAiOutput = '';
      try {
        response = await callDeepSeek(apiKey, messages, 0.45, timeoutMs, maxTokens);
      } catch (err) {
        console.error(`DeepSeek 调用异常:`, err.code || err.message);
        const fb = generateFallbackAction(task, tools);
        const resp = buildResponse(fb.actions, fb.action, 'fallback', { reason: `API 网络异常: ${err.code || err.message}`, raw: '', final: fb.actions, warning: 'AI 请求异常，已使用本地保底动作' });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(resp));
        return;
      }

      // 处理非 2xx
      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();
        console.error(`DeepSeek API 错误 (${status}):`, errorText);

        if (status >= 400 && status < 500) {
          const fb = generateFallbackAction(task, tools);
          const resp = buildResponse(fb.actions, fb.action, 'fallback', { reason: `API ${status} 错误`, raw: errorText.slice(0, 200), final: fb.actions, warning: `AI (${status})，已使用本地保底动作` });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(resp));
          return;
        }

        // 5xx → 重试一次
        console.warn('DeepSeek 5xx，重试一次');
        try {
          const retryResp = await callDeepSeek(apiKey, messages, 0.55, retryTimeoutMs, maxTokens);
          if (retryResp.ok) {
            const retryData = await retryResp.json();
            logDeepSeekResponse('retry', retryData);
            rawAiOutput = retryData.choices?.[0]?.message?.content?.trim() || '';
            const result = extractAction(retryData);
            if (result.action) {
              const resp = buildResponse(result.actions, result.action, 'ai', { raw: rawAiOutput, final: result.actions });
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify(resp));
              return;
            }
          }
        } catch {}
        const fb = generateFallbackAction(task, tools);
        const resp = buildResponse(fb.actions, fb.action, 'fallback', { reason: '5xx 重试失败', raw: rawAiOutput, final: fb.actions, warning: 'AI 服务异常，已使用本地保底动作' });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(resp));
        return;
      }

      // 2xx → 解析
      const data = await response.json();
      logDeepSeekResponse('ok', data);
      rawAiOutput = data.choices?.[0]?.message?.content?.trim() || '';
      let result = extractAction(data);

      // 空内容 → 重试一次
      if (!result.action) {
        console.warn('DeepSeek 返回空内容，重试一次');
        try {
          const retryResp = await callDeepSeek(apiKey, messages, 0.55, retryTimeoutMs, maxTokens);
          if (retryResp.ok) {
            const retryData = await retryResp.json();
            logDeepSeekResponse('retry', retryData);
            rawAiOutput = retryData.choices?.[0]?.message?.content?.trim() || '';
            result = extractAction(retryData);
          }
        } catch {}
      }

      if (result.action) {
        const resp = buildResponse(result.actions, result.action, 'ai', { raw: rawAiOutput, final: result.actions });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(resp));
        return;
      }

      const fb = generateFallbackAction(task, tools);
      const resp = buildResponse(fb.actions, fb.action, 'fallback', { reason: 'AI 返回内容为空或解析失败', raw: rawAiOutput, final: fb.actions, warning: 'AI 返回空，已使用本地保底动作' });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(resp));

    } catch (err) {
      console.error('generate 处理异常:', err);
      const fb = generateFallbackAction('', '');
      const resp = buildResponse(fb.actions, fb.action, 'fallback', { reason: `服务异常: ${err.message}`, raw: '', final: fb.actions, warning: '服务器内部错误，已使用本地保底动作' });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(resp));
    }
  });
}

// ============================================
// 路由：POST /api/feedback — 写入飞书多维表格
// ============================================
async function handleFeedback(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      const { task, action, completed, stateAfterAction, wouldStartWithoutPrompt, openFeedback, durationSeconds, progressReached, actions } = parsed;

      if (!task || !completed) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ saved: false, error: 'missing_fields' }));
        return;
      }

      const appId = process.env.FEISHU_APP_ID;
      const appSecret = process.env.FEISHU_APP_SECRET;
      const baseToken = process.env.FEISHU_BASE_TOKEN;
      const tableId = process.env.FEISHU_TABLE_ID;

      if (!appId || !appSecret || !baseToken || !tableId) {
        console.log('[feedback] missing env vars');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ saved: false, error: 'not_configured' }));
        return;
      }

      // 获取飞书 token
      let token = '';
      try {
        const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        token = d.tenant_access_token || '';
        if (!token) {
          console.log('[feedback] token failed:', JSON.stringify(d));
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ saved: false, error: 'token_failed', detail: d }));
          return;
        }
      } catch (e) {
        console.log('[feedback] token error:', e.message);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ saved: false, error: 'token_error', detail: e.message }));
        return;
      }

      // 写入飞书记录（只写当前收集的字段，避免旧字段不匹配）
      try {
        const fields = {
          task,
          action: action || (Array.isArray(actions) ? actions.join(' / ') : ''),
          completed,
          openFeedback: openFeedback || '',
          durationSeconds: durationSeconds || 0,
          createdAt: Date.now(),
        };

        const r = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ fields }),
            signal: AbortSignal.timeout(8000),
          }
        );
        const d = await r.json();
        if (d.code === 0) {
          console.log('[feedback] saved');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ saved: true }));
        } else {
          console.log('[feedback] write failed:', d.code, d.msg);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ saved: false, error: 'write_failed', detail: d.msg }));
        }
      } catch (e) {
        console.log('[feedback] write error:', e.message);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ saved: false, error: 'write_error', detail: e.message }));
      }
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ saved: false, error: 'parse_error', detail: err.message }));
    }
  });
}

// ============================================
// 路由：静态文件
// ============================================
function serveStatic(url, res) {
  // 默认首页
  let filePath = url === '/' ? '/index.html' : url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ============================================
// 主服务器
// ============================================
const server = http.createServer((req, res) => {
  // CORS headers (允许同源访问)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 路由分发
  if (req.method === 'POST' && req.url === '/api/generate') {
    handleGenerate(req, res);
  } else if (req.method === 'POST' && req.url === '/api/feedback') {
    handleFeedback(req, res);
  } else {
    serveStatic(req.url, res);
  }
});

server.listen(PORT, () => {
  console.log(`StartFlow 服务器已启动`);
  console.log(`  本地: http://localhost:${PORT}`);
  console.log(`  API:  POST http://localhost:${PORT}/api/generate`);
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log(`  请设置环境变量 DEEPSEEK_API_KEY 后再使用 AI 生成`);
  }
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n服务器已关闭');
  process.exit(0);
});
