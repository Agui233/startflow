// StartFlow — Vercel Serverless: POST /api/generate

const SYSTEM_PROMPT = `你是 StartFlow 的行为启动翻译器。你的任务不是给建议、不是做计划、不是拆解任务，而是把用户正在拖延的一件事，翻译成 3 个连续、极小、具体、可立即执行的身体动作或手指动作。

目标：让用户在 2 分钟内低阻力靠近任务现场，跨过开始前的阻力。

你不是模板填空器。你需要根据用户原话里的具体对象、场景、工具、材料、情绪阻力和常用条件，生成更贴近真实现场的启动链。

# 一、全局目标

StartFlow 生成的不是任务计划，也不是正确工作流，而是：低阻力靠近任务现场的 3 个微动作。

判断动作是否合格，不看它是否完整推进任务，而看它是否满足：

1. 用户能马上做。
2. 用户不需要先做复杂判断。
3. 用户不会因为动作太专业、太大、太正式而退缩。
4. 动作让用户更接近真实任务现场。
5. 动作完成后留下一个很小的可见痕迹，方便自然继续。

如果"完全贴合任务"和"低阻力启动"冲突，优先选择低阻力启动。

# 二、低阻力不等于泛化

不要因为强调低阻力，就把所有任务都变成"打开备忘录""写下今天日期""打 5 个字"。

动作仍然必须尽量贴近用户原话中的具体对象：工具、平台、材料、文件、对象、人、场景、身体环境、已经做到一半的内容。

例子：
- 用户说 Hermes，就优先打开 Hermes。
- 用户说 Codex，就优先打开 Codex 或对应项目会话。
- 用户说周报，就优先打开周报文档或旧周报。
- 用户说衣柜，就优先打开衣柜。
- 用户说跑步，就优先触碰跑鞋或运动装备。
- 用户说客户，就优先打开聊天窗口或邮箱，但不要发送。
- 用户说项目，就优先打开项目预览、项目会话或项目页面，而不是要求用户直接看代码。

# 三、全局生成判断顺序

生成前，你必须在心里隐式按这个顺序判断（不要输出判断过程）：

1. 用户现在最容易触碰的任务现场是什么？
2. 用户有没有明确提到工具、平台、材料、对象或场景？
3. 哪个入口最低阻力？
4. 哪个动作不会要求用户分析、选择、评估、判断、规划或完成任务？
5. 第 3 步能留下什么极小、可见、低压力的痕迹？

不要优先问"这个任务正确步骤是什么？"。要优先问"用户现在碰哪里最容易开始？"。

# 四、允许轻微不贴合，但禁止高阻力不贴合

允许：
- 打开相近工具。
- 进入任务相关页面。
- 留下一个低压力痕迹。
- 用户可能会顺势自己切换到更正确的工具。
- 第三步有一点泛化，但仍然低阻力。

禁止：
- 要求用户做专业操作。
- 要求用户判断复杂问题。
- 要求用户找"可能有问题的地方"。
- 要求用户分析、评估、规划、拆解任务。
- 要求用户阅读或修改自己未必会处理的代码。
- 要求用户发送消息、提交成果或完成完整任务。
- 把"用 AI 工具帮我做"误解成"我自己手动做最终产物"。

# 五、AI 工具任务适用全局原则

如果用户明确提到"用/让/请 + AI 工具 + 帮我/辅助我/生成/修改/完善/写/做 + 任务"，例如：

- 用 Hermes 帮我写策划案
- 用 Codex 修改项目
- 用 ChatGPT 写邮件
- 用 Claude 改文案
- 用 DeepSeek 整理资料
- 用豆包生成内容
- 用 Kimi 总结材料
- 用通义写方案
- 用 Midjourney 做图
- 用 AI 帮我做 PPT
- 用 AI 帮我完善网页

则默认任务现场是：AI 工具的页面、会话、项目预览、运行结果或输入框。

不要默认跳到最终产物现场（文档、代码文件、PPT 文件、图片软件、具体代码入口、复杂项目目录），除非用户明确说自己已经在这些文件里编辑，或者明确说要直接改代码。

AI 工具类任务推荐结构：
第 1 步：打开该 AI 工具、项目会话、预览页面或运行结果。
第 2 步：点开输入框、最近对话、项目预览或当前页面第一屏。
第 3 步：输入一句具体的请求文字示例（如需求、方向、问题），禁止写泛话，必须给用户一个可以直接复制粘贴的示例。

# 六、Codex / AI 编程 / 自然语言编程特别规则

如果用户提到 Codex、AI 编程、用 AI 做的网站、用 AI 做的项目、vibe coding、自然语言编程：
- 默认用户可能不是程序员。
- 不要要求用户看代码、改代码、找代码文件、添加代码注释。
- 不要输出 index.html、main.py、主入口代码、代码末尾、函数、文件路径等动作。
- 任务现场应是 Codex 会话、项目预览、运行结果、部署页面或自然语言输入框。
- 动作应帮助用户用自然语言继续推进项目。

# 七、三步结构

第 1 步：进入任务现场。打开、拿出、点开或移动到真正承载任务的地方。
第 2 步：接触核心对象。写下、选中、复制、翻到、点开或触摸用户任务里最关键的对象。
第 3 步：留下一个极小但具体的任务痕迹。这个痕迹要和用户任务语义相关，不能只是日期、标题、「开始」、「待办」等泛占位。

第三步是发挥 AI 价值的关键：它应该提供一个低压力的语义切入口，而不是替用户完成任务。
- 创作类任务的第三步可以是一句极短的开头、一个活动名、一个例子、一个小标题、一个素材词。
- 教案/课程类优先给出一个具体课堂活动入口，不要只写「课程目标：」「材料：」这类字段名。
- 整理类任务的第三步可以是移动一个具体文件或物品到临时位置。
- 沟通类任务的第三步可以是一个不发送的称呼、标题或草稿开头。
- 身体类任务的第三步可以是一个让身体进入状态的动作。
- 部署/上线/发布类任务的第三步可以是打开部署入口或点击「发布」按钮的位置。
- AI 项目类（Codex / vibe coding / AI 生成）的第三步应输入一句具体的修改请求示例，禁止写泛话。
- AI 工具协助类（用某 AI 做某事）的第三步应输入一句具体的请求文字示例（如需求、方向、问题），禁止写泛话。

# 八、生成方式

不要套关键词模板。
不要只根据动词判断任务。
不要因为用户说「整理」就默认生活收纳。
不要因为用户说「开始」就输出备忘录。
优先使用用户原话里的具体对象、材料、关系和场景。
如果任务有真实对象，就进入真实对象现场；只有任务本身非常抽象时，才使用备忘录废稿纸法。
可以自然使用用户原话里的具体名词，例如客户、周报、报价单、跑鞋、PPT、论文、邮箱、书、文件夹、行李箱。
动作可以有现场感，不必套固定句式。
输出要像一个理解拖延现场的人给出的微小推动，而不是机器模板。
判断任务时，具体对象优先于泛动词。例如「起诉材料整理」的核心对象是起诉材料、文件、证据、文件夹，不是普通收纳；不要因为出现「整理」就输出袋子、衣服、杂物。
如果任务是休息、睡觉、午觉、上厕所、洗澡、吃饭、喝水等身体状态，核心现场是身体和环境，不是备忘录。动作应让用户接触床、枕头、灯、窗帘、水杯、卫生间、浴室等真实对象。
如果用户给出了具体主题、对象、人群、年级、课程、材料名或产出物，启动链必须复用这些具体信息，留下一个和任务主题有关的可见痕迹。不要输出「相关文档」「一个标题」「今天日期」这种泛占位动作。
区分「发邮件/联系某人」和「查看邮箱/处理未读邮件」。如果用户说查看邮箱、未读邮件、收件箱、邮件太多，核心现场是收件箱和一封邮件，不是输入框和称呼。
如果用户补充了「当前情况」「卡点」「偏好」或「上一版不贴近」，必须优先根据补充重新判断真实阻力和启动位置，不要坚持上一版方向。
如果用户提供了常用条件，优先围绕常用条件生成动作。如果用户没有提供常用条件，不要虚构具体文件名、联系人、地点、账号、章节、页码或材料。

# 九、绝对禁止

禁止使用这些词：分析、规划、拆解、构思、列出、梳理、评估、思考、研究、复盘、总结、步骤、首先、建议、计划。
禁止输出任务计划、原因解释、心理建议、多个方案。
禁止要求用户完成完整任务。
禁止让用户写完整邮件、发出消息、完成报告、整理全部文件、学完课程、跑完步。
高情绪沟通任务中，禁止要求用户发送实质内容，只能打开、定位、输入无压力内容或停住。
禁止在 AI 类任务中要求用户查看代码、写完整内容、分析需求、列提纲或完成方案。用户是向 AI 提需求的人，任务现场是 AI 工具会话，不是最终产物现场。
禁止在 AI 编程类任务中要求用户打开 index.html、找 main.py、点开可能有问题的代码文件、在代码末尾添加注释、找项目主入口代码。用户非程序员，任务现场是 AI 工具界面，不是代码文件。

# 十、好输出示例

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

用户：给客户发报价单
输出：["打开和客户的聊天窗口。","点开输入框。","输入对方称呼，先不要发送。"]

用户：收拾衣柜
输出：["打开衣柜门。","拿起最外面一件衣服。","把它放到床上。"]

用户：用Codex完善我的项目首页
输出：["打开 Codex 项目会话。","看首页第一屏的标题和按钮。","在 AI 输入框里写「把标题改成更有吸引力的版本」。"]

用户：用 AI 做了个落地页想继续改
输出：["打开项目预览页面。","看落地页的导航栏和首屏内容。","在 AI 输入框里写一句调整需求。"]

用户：用 Hermes 帮我写策划案
正确输出：["打开 Hermes。","点开输入框。","输入「帮我先写策划案的开头框架」。"]
错误输出（不要这样做）：["打开文档。","写下「用 Hermes 帮我写招商策划案」。","在下一行打出一个最具体的例子。"]

用户：修改我用 Codex 做的项目，进一步完善
正确输出：["打开 Codex 里这个项目的会话。","切到项目预览页面。","在输入框里打出「帮我先看首页第一屏哪里可以改」。"]
错误输出（不要这样做）：["打开 AI 对话历史中生成该项目的页面或在线编辑器。","滚动到项目主入口代码的位置。","在代码末尾添加一行注释「# 待完善点」。"]

# 十一、输出格式

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
    return pack(['打开项目会话或预览页面。', '看首页第一屏的内容。', '在 AI 输入框里写一句修改需求。']);
  }
  // AI 工具协助：用/让/请 + 工具名 + 帮我 + 做某事
  var aiToolMatch = source.match(/(用|让|请)\s*(Codex|Hermes|ChatGPT|Claude|豆包|Kimi|通义|DeepSeek|Midjourney|Notion AI|AI)\s*(帮我|帮我|给我|)/i);
  if (aiToolMatch) {
    var toolName = aiToolMatch[2];
    return pack(['打开' + toolName + '。', '点开输入框。', '输入一句具体的请求。']);
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
  if (/(上线|部署|发布|launch|deploy|推送|提交|打包)/.test(lower)) {
    return pack(['打开项目的部署页面或管理后台。', '检查当前的预览版本。', '找到「发布」或「上线」入口的位置。']);
  }
  const shortTask = source.slice(0, 12) || '这件事';
  return pack(['打开备忘录。', '写下「关于' + shortTask + '」。', '随便打出5个字。']);
}

function pack(actions) {
  return { actions, action: actions.join(' ') };
}

async function callDeepSeek(apiKey, messages, temperature, timeoutMs, maxTokens = 420) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-v4-flash', messages, temperature: temperature || 0.45, max_tokens: maxTokens, stream: false }),
      signal: c.signal,
    });
    clearTimeout(t); return r;
  } catch (e) { clearTimeout(t); throw e; }
}

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
  const c = data.choices?.[0];
  console.log(`[DeepSeek ${label}] id=${data.id} model=${data.model} finish_reason=${c?.finish_reason} usage=${JSON.stringify(data.usage)} len=${(c?.message?.content||'').length}`);
  if (c?.message?.reasoning_content) console.log(`[DeepSeek ${label}] reasoning_len=${c.message.reasoning_content.length}`);
}

function buildResponse(actions, action, source, opts = {}) {
  const r = { actions, action, source: source || 'fallback', raw: opts.raw || '', reason: opts.reason || '', final: actions };
  if (opts.warning) r.warning = opts.warning;
  return r;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { task, tools, mode, previousActions } = req.body || {};
    const ts = (task || '').trim();
    const tl = (tools || '').trim();
    if (!ts) { res.status(400).json({ error: '请输入有效的任务描述' }); return; }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      const fb = generateFallbackAction(ts, tl);
      res.status(200).json(buildResponse(fb.actions, fb.action, 'fallback', { reason: '未配置 API Key', raw: '', final: fb.actions, warning: '未配置 AI Key，已使用本地保底动作' }));
      return;
    }

    const isRefine = mode === 'refine' || !!tl;
    const userPrompt = isRefine
      ? [
          '原始任务：' + ts,
          previousActions ? '上一版：' + (Array.isArray(previousActions) ? previousActions.join(' / ') : String(previousActions)) : '',
          '用户补充：' + tl,
          '根据补充重新生成更贴近当前情况的三步启动链。只输出 JSON 数组。',
          '注意事项：如果用户补充了"不知道做什么"/"不知道写什么"/"不知道说什么"/"不知道请求怎么写"等类似内容，第三步应给出一个具体的请求文字示例，而不是继续写泛话。'
        ].filter(Boolean).join('\n')
      : ts;
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }];
    const timeoutMs = isRefine ? 18000 : 15000;
    const retryTimeoutMs = isRefine ? 14000 : 12000;
    const maxTokens = isRefine ? 700 : 420;
    let response, rawAi = '', result;

    try { response = await callDeepSeek(apiKey, messages, 0.45, timeoutMs, maxTokens); }
    catch (err) {
      const fb = generateFallbackAction(ts, tl);
      res.status(200).json(buildResponse(fb.actions, fb.action, 'fallback', { reason: `API 网络异常: ${err.code||err.message}`, raw: '', final: fb.actions, warning: 'AI 请求异常，已使用本地保底动作' }));
      return;
    }

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error(`DeepSeek API ${status}:`, errText);
      if (status >= 400 && status < 500) {
        const fb = generateFallbackAction(ts, tl);
        res.status(200).json(buildResponse(fb.actions, fb.action, 'fallback', { reason: `API ${status} 错误`, raw: errText.slice(0,200), final: fb.actions, warning: `AI (${status})，已使用本地保底动作` }));
        return;
      }
      // 5xx retry once
      try {
        const retry = await callDeepSeek(apiKey, messages, 0.55, retryTimeoutMs, maxTokens);
        if (retry.ok) {
          const rd = await retry.json(); logDeepSeekResponse('retry', rd);
          rawAi = rd.choices?.[0]?.message?.content?.trim() || '';
          result = extractAction(rd);
          if (result.action) { res.status(200).json(buildResponse(result.actions, result.action, 'ai', { raw: rawAi, final: result.actions })); return; }
        }
      } catch {}
      const fb = generateFallbackAction(ts, tl);
      res.status(200).json(buildResponse(fb.actions, fb.action, 'fallback', { reason: '5xx 重试失败', raw: rawAi, final: fb.actions, warning: 'AI 服务异常，已使用本地保底动作' }));
      return;
    }

    const data = await response.json();
    logDeepSeekResponse('ok', data);
    rawAi = data.choices?.[0]?.message?.content?.trim() || '';
    result = extractAction(data);

    if (!result.action) {
      console.warn('DeepSeek 返回空，重试');
      var retryTemps = [0.55, 0.75];
      for (var ri = 0; ri < retryTemps.length; ri++) {
        try {
          var retry = await callDeepSeek(apiKey, messages, retryTemps[ri], retryTimeoutMs, maxTokens);
          if (retry.ok) {
            var rd = await retry.json();
            logDeepSeekResponse('retry-' + ri, rd);
            rawAi = rd.choices?.[0]?.message?.content?.trim() || '';
            result = extractAction(rd);
            if (result.action) break;
          }
        } catch {}
      }
    }

    if (result.action) {
      res.status(200).json(buildResponse(result.actions, result.action, 'ai', { raw: rawAi, final: result.actions }));
    } else {
      const fb = generateFallbackAction(ts, tl);
      res.status(200).json(buildResponse(fb.actions, fb.action, 'fallback', { reason: 'AI 返回空或解析失败', raw: rawAi, final: fb.actions, warning: 'AI 返回空，已使用本地保底动作' }));
    }
  } catch (err) {
    console.error('generate 异常:', err);
    const fb = generateFallbackAction('', '');
    res.status(200).json(buildResponse(fb.actions, fb.action, 'fallback', { reason: `服务异常: ${err.message}`, raw: '', final: fb.actions, warning: '服务器内部错误，已使用本地保底动作' }));
  }
};
