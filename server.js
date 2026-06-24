// ============================================
// StartFlow — Backend Server
// Node.js http server (no dependencies needed)
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

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
const SYSTEM_PROMPT = `
你是一个行为启动翻译器。你的唯一任务是把用户输入的拖延任务翻译成一句极小的物理启动动作。

你的职责：
- 判断用户输入的任务类型
- 提取任务中可触碰的具体对象
- 选择一个极小动作模板
- 输出一句物理启动动作

# 核心心法
你不是给建议，不是分析任务，不是制定计划。
你的目标不是让用户完成任务，而是让用户的手指或身体先动起来。
禁止出现"思考类"动词。
每类任务都对应一个固定动作句式，不要自由发挥。

# 绝对禁忌
1. 绝对禁止使用这些词：分析、规划、拆解、构思、列出、梳理、评估、思考、研究、复盘、总结、步骤、首先、建议、计划。
2. 绝对禁止输出计划、步骤列表、原因解释、心理建设建议或多个方案。
3. 绝对禁止输出任何前缀和后缀，例如"你的第一步是：""建议你""你可以""祝你成功"。
4. 绝对禁止让用户完成完整任务或过大的动作（如"完成报告""写完邮件""整理所有资料"）。
5. 绝对禁止输出超过一个动作链。

# 强制动作词
你必须且必须使用以下身体或手指动作词之一：
打开、拿出、触摸、按下、写下、写出、打出、输入、放进、系上、翻到、找出、右键、点开、移动

每次输出必须包含至少一个上述动作词。

# 分类映射模板

【空白创造类】
触发词：写、画、设计、码代码、做PPT、做方案、写文案、写报告、做海报、剪视频、做视频、写论文、作品集、做幻灯片
模板：打开[具体软件或文档]，只打出[标题、文件名或日期]。

【物理整理类】
触发词：收拾、打扫、搬家、整理、清理、归档、洗衣服、刷碗、发票、文件、文件夹、储物
模板：拿出[一个容器或工具]，只把[1个最小单位物品]放进去。

【沟通类】
触发词：联系、汇报、发邮件、发消息、打电话、找客户、问人、回复、通知、沟通
模板：打开[沟通工具]，只在输入框打出[对方称呼或一句无意义开头]。

【高情绪阻力沟通类】
触发词：拖延很久、不敢联系、愧疚、害怕、尴尬、客户、老板、前任、道歉、催、报价单
模板：打开[沟通工具]，只输入[对方名字首字母或号码前3位]，然后停止，光标闪烁3秒。

【身体行动类】
触发词：跑步、锻炼、运动、健身、瑜伽、冥想、跳舞、散步、拉伸
模板：找出[工具或装备]，让身体接触它，只做[1个惯性动作]。

【学习输入类】
触发词：看书、学习、背单词、学英语、读资料、阅读、看论文、学Python、学编程、上课、听课
模板：打开[书、资料、课程或软件]，只翻到第一页、点开第一课或触摸第一行字。

【抽象目标类】
触发词：提升自己、找灵感、人生方向、做副业、变好、变自律、改变现状、迷茫、成长
模板：打开备忘录，写下"关于[任务]"的第一念，然后打出3个略相关的词。

【无法判断类】
适用于无法归入以上任何类的任务。
模板：打开备忘录，写下"关于[任务]的第一念"，然后随便打5个字。

# 输出格式
只输出一句话。
20字以内。不要引号。不要加粗。不要换行。不要编号。除了句号不要使用多余标点。
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
function generateFallbackAction(task, tools) {
  const lower = task.toLowerCase();
  const toolHint = (tools && tools.trim()) ? tools.trim() : null;

  // 如果用户填了常用条件，优先围绕条件生成
  if (toolHint) {
    if (toolHint.includes('Notion') || toolHint.includes('notion')) return `打开 Notion，只新建一个空白页。`;
    if (toolHint.includes('手机') || toolHint.includes('iPhone') || toolHint.includes('ipad') || toolHint.includes('iPad')) return `拿起${toolHint}，只打开相关应用。`;
    if (toolHint.includes('电脑') || toolHint.includes('Mac') || toolHint.includes('mac')) return `打开电脑，只启动相关软件。`;
    if (toolHint.includes('美团') || toolHint.includes('饿了么')) return `打开${toolHint}，只浏览第一个推荐。`;
    if (toolHint.includes('微信') || toolHint.includes('WeChat')) return `打开微信，只输入对方称呼。`;
    if (toolHint.includes('邮箱') || toolHint.includes('mail')) return `打开邮箱，只写一个标题。`;
    if (toolHint.includes('书') || toolHint.includes('课本') || toolHint.includes('教材')) return `翻开${toolHint}，用手指触摸第一行字。`;
    if (toolHint.includes('瑜伽垫')) return `铺开瑜伽垫，站到垫子边缘。`;
    if (toolHint.includes('跑鞋') || toolHint.includes('运动鞋')) return `找出${toolHint}，系上左脚鞋带。`;
    return `拿出${toolHint}，只做一个最小动作。`;
  }

  // 无工具时按关键词匹配
  if (/写|报告|文案|PPT|方案|做ppt|代码|设计|论文|周报/.test(lower)) return `打开一个空白文档，只打出任务标题。`;
  if (/发邮件|发消息|联系|客户|老板|同事|回复|微信/.test(lower)) return `打开聊天或邮箱，只输入对方称呼。`;
  if (/跑步|运动|锻炼|健身/.test(lower)) return `找出运动鞋，系上左脚鞋带。`;
  if (/看书|学习|背单词|读资料|阅读|读书/.test(lower)) return `打开学习资料，用手指触摸第一行字。`;
  if (/收拾|整理|打扫|清理|归档|发票|文件夹/.test(lower)) return `拿出一个袋子，只放进一个物品。`;
  if (/瑜伽|冥想/.test(lower)) return `铺开垫子，坐下来闭上眼。`;

  // 默认保底
  return `打开备忘录，写下关于这个任务的第一念。`;
}

// ============================================
// 调用 DeepSeek API（带超时）
// ============================================
async function callDeepSeek(apiKey, messages, temperature, timeoutMs) {
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
        temperature,
        max_tokens: 200,
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
  return data.choices?.[0]?.message?.content?.trim()
      || data.choices?.[0]?.text?.trim()
      || data.output_text?.trim()
      || '';
}

// ============================================
// 打印 DeepSeek 响应日志（不含 API Key）
// ============================================
function logDeepSeekResponse(label, data) {
  const choice = data.choices?.[0];
  console.log(`[DeepSeek ${label}] id=${data.id} model=${data.model} finish_reason=${choice?.finish_reason} usage=${JSON.stringify(data.usage)} content_length=${(choice?.message?.content || '').length}`);
  if (choice?.message?.reasoning_content) {
    console.log(`[DeepSeek ${label}] reasoning_content_length=${choice.message.reasoning_content.length}`);
  }
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

      if (!task || typeof task !== 'string' || task.trim().length < 1) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '请输入有效的任务描述' }));
        return;
      }

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        // 没有 API Key 时直接返回本地保底
        const fallbackAction = generateFallbackAction(task, tools);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ action: fallbackAction, source: 'fallback', warning: '未配置 AI Key，已使用本地保底动作' }));
        return;
      }

      // 构建消息
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: task },
      ];

      // 第一次调用
      let response;
      try {
        response = await callDeepSeek(apiKey, messages, 0.1, 12000);
      } catch (err) {
        // 网络/超时错误 → 直接 fallback，不重试
        console.error(`DeepSeek 调用异常:`, err.code || err.message);
        const fallbackAction = generateFallbackAction(task, tools);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ action: fallbackAction, source: 'fallback', warning: 'AI 请求异常，已使用本地保底动作' }));
        return;
      }

      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();
        console.error(`DeepSeek API 错误 (${status}):`, errorText);

        // 4xx 不重试，直接 fallback
        if (status >= 400 && status < 500) {
          let briefError = 'AI 生成失败';
          try { const e = JSON.parse(errorText); briefError = e.error?.message || e.message || briefError; } catch {}
          const fallbackAction = generateFallbackAction(task, tools);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ action: fallbackAction, source: 'fallback', warning: `AI (${status})，已使用本地保底动作` }));
          return;
        }

        // 5xx → 重试一次
        console.warn('DeepSeek 5xx，重试一次');
        try {
          const retryResp = await callDeepSeek(apiKey, messages, 0.3, 12000);
          if (retryResp.ok) {
            const retryData = await retryResp.json();
            logDeepSeekResponse('retry', retryData);
            const action = extractAction(retryData);
            if (action) {
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ action, source: 'ai' }));
              return;
            }
          }
        } catch {}
        // 重试也失败 → fallback
        const fallbackAction = generateFallbackAction(task, tools);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ action: fallbackAction, source: 'fallback', warning: 'AI 服务异常，已使用本地保底动作' }));
        return;
      }

      // 2xx → 解析
      const data = await response.json();
      logDeepSeekResponse('ok', data);
      let action = extractAction(data);

      // 空内容 → 重试一次
      if (!action) {
        console.warn('DeepSeek 返回空内容，重试一次');
        try {
          const retryResp = await callDeepSeek(apiKey, messages, 0.5, 12000);
          if (retryResp.ok) {
            const retryData = await retryResp.json();
            logDeepSeekResponse('retry', retryData);
            action = extractAction(retryData);
          }
        } catch {}
      }

      if (action) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ action, source: 'ai' }));
        return;
      }

      // 最终失败 → fallback
      const fallbackAction = generateFallbackAction(task, tools);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ action: fallbackAction, source: 'fallback', warning: 'AI 返回空，已使用本地保底动作' }));

    } catch (err) {
      console.error('generate 处理异常:', err);
      // 即使解析错误也返回 fallback
      const fallbackAction = generateFallbackAction('', '');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ action: fallbackAction, source: 'fallback', warning: '服务器内部错误，已使用本地保底动作' }));
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
