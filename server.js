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
const SYSTEM_PROMPT = `你是 StartFlow 的行为启动翻译器。你的任务：把用户正在拖延的一件事，翻译成 3 个连续、极小、可立即执行的身体或手指动作。

目标：让用户在 2 分钟内接触任务现场，跨过开始前的阻力。

# 核心原则（必须遵守）
1. 输出必须且只输出 3 个动作。
2. 每个动作必须非常小——小到用户不会找理由跳过。
3. 3 个动作必须在 2 分钟内按顺序完成。
4. 动作只负责启动，不负责完成任务。
5. 优先让用户接触真实任务现场：相关文件、旧版本、聊天窗口、邮箱、输入框、资料、工具、物品、环境、上一次做到一半的材料。
6. 如果用户提供了常用条件，优先围绕常用条件生成动作。
7. 如果用户没有提供常用条件，不要虚构具体文件、联系人、地点、账号、章节、页码或材料。
8. 可以自然使用用户原话里的具体名词。
9. 第 3 个动作应留下一个具体但很小的任务痕迹——让用户停下时已经有一个可见的进展标记。
10. 输出要像理解拖延现场的人给出的微小推动，避免任何机器模板感。

# 绝对禁止
- 禁止分析、规划、拆解、构思、列出、梳理、评估、思考、研究、复盘、总结。
- 禁止输出任务计划、原因解释、心理建议、多个方案。
- 禁止要求用户完成完整任务。
- 禁止使用"首先""建议""计划""步骤"等表达。
- 禁止让用户：写完整邮件、发出消息、完成报告、整理全部文件、学完课程、跑完全程。
- 高情绪沟通任务中，禁止要求用户发送任何实质内容——只能打开、定位、输入无压力内容或让光标停住。

# 动作方向参考（不是模板，不是必选项）
让用户：打开、拿出、触摸、按下、写下、打出、输入、放进、系上、翻到、找出、右键、点开、移动、复制、粘贴、选中、拖入、放下、站到、坐下、穿上。

你不必每次都用这些词，但每个动作必须包含至少一个物理动作（让手指或身体真的动一下）。

# 关于第三步
好的第三步不是"完成"，而是一个微小但可感知的进展：比如光标已经停在输入框里、标题已经写了一半、一个文件已经拖到了目标位置——用户停下时能看到"我已经开始了一点"。

# 输出格式
只返回 JSON 数组。数组长度必须是 3。每一项是一个动作字符串。不要返回 Markdown。不要返回对象。不要返回解释。不要返回编号。不要返回前后缀。
示例：["打开上周的周报文件。","复制标题到新文档。","粘贴日期。"]
注意：动作字符串内部不要使用双引号，可以用中文引号「」或直接省略。
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

  let action1, action2, action3;

  if (toolHint) {
    if (toolHint.includes('Notion') || toolHint.includes('notion')) { action1='打开 Notion。'; action2='新建一个空白页。'; action3='只写一个标题。'; }
    else if (toolHint.includes('手机') || toolHint.includes('iPhone') || toolHint.includes('ipad')) { action1=`拿起${toolHint}。`; action2=`打开相关应用。`; action3='只看第一屏。'; }
    else if (toolHint.includes('电脑') || toolHint.includes('Mac') || toolHint.includes('mac')) { action1='打开电脑。'; action2='启动相关软件。'; action3='新建一个空白文件。'; }
    else if (toolHint.includes('美团') || toolHint.includes('饿了么')) { action1=`打开${toolHint}。`; action2='浏览第一个推荐。'; action3='点进去看看。'; }
    else if (toolHint.includes('微信') || toolHint.includes('WeChat')) { action1='打开微信。'; action2='找到对方的聊天。'; action3='只输入对方称呼。'; }
    else if (toolHint.includes('邮箱') || toolHint.includes('mail')) { action1='打开邮箱。'; action2='点新建邮件。'; action3='只写一个标题。'; }
    else if (toolHint.includes('书') || toolHint.includes('课本') || toolHint.includes('教材')) { action1=`翻开${toolHint}。`; action2='找到第一页。'; action3='用手指触摸第一行字。'; }
    else if (toolHint.includes('瑜伽垫')) { action1='铺开瑜伽垫。'; action2='站到垫子边缘。'; action3='闭上眼睛深呼吸一次。'; }
    else if (toolHint.includes('跑鞋') || toolHint.includes('运动鞋')) { action1=`找出${toolHint}。`; action2='穿上一只。'; action3='系上鞋带。'; }
    else { action1=`拿出${toolHint}。`; action2='放在手边。'; action3='做一个最小动作。'; }
  } else if (/写|报告|文案|PPT|方案|做ppt|代码|设计|论文|周报/.test(lower)) {
    action1='打开一个空白文档。'; action2='只打出任务标题。'; action3='把日期改成今天。';
  } else if (/发邮件|发消息|联系|客户|老板|同事|回复|微信/.test(lower)) {
    action1='打开聊天或邮箱。'; action2='找到相关联系人。'; action3='只输入对方称呼。';
  } else if (/跑步|运动|锻炼|健身/.test(lower)) {
    action1='找出运动鞋。'; action2='穿上一只。'; action3='系上左脚鞋带。';
  } else if (/看书|学习|背单词|读资料|阅读|读书/.test(lower)) {
    action1='打开学习资料。'; action2='翻到第一页。'; action3='用手指触摸第一行字。';
  } else if (/收拾|整理|打扫|清理|归档|发票|文件夹/.test(lower)) {
    action1='拿出一个袋子。'; action2='找一个最小物品。'; action3='把它放进去。';
  } else if (/瑜伽|冥想/.test(lower)) {
    action1='铺开垫子。'; action2='坐下来。'; action3='闭上眼深呼吸三次。';
  } else {
    action1='打开备忘录。'; action2=`写下关于${task.slice(0,10)}。`; action3='随便打出5个字。';
  }
  return { actions: [action1, action2, action3].filter(Boolean), action: [action1, action2, action3].filter(Boolean).join(' ') };
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
        temperature: temperature || 0.45,
        max_tokens: 220,
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
  // Try JSON parse for array format
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return { actions: parsed, action: parsed.join(' ') };
    }
  } catch {}
  // Try extracting JSON array from text
  const match = raw.match(/\[[\s\S]*?\]/);
  if (match) {
    // Fix common JSON issues: unescaped inner double quotes
    let jsonStr = match[0];
    // Replace inner " inside strings (e.g. 名为"周报"的 → 名为「周报」的)
    jsonStr = jsonStr.replace(/(?<=[^,\[\]"])\"([^\"]*?)\"(?=[^,\[\]"])/g, '「$1」');
    // Also handle cases where quotes are embedded between text
    jsonStr = jsonStr.replace(/""/g, '\\"\\"');
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length === 3) {
        return { actions: parsed, action: parsed.join(' ') };
      }
    } catch {}
    // Try fallback: split by "," and clean
    try {
      const parts = jsonStr.replace(/^\[|\]$/g, '').split('","').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
      if (parts.length === 3) return { actions: parts, action: parts.join(' ') };
    } catch {}
  }
  // Fallback: treat whole text as single action
  return { actions: [raw, '', ''], action: raw };
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
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: task },
      ];

      // 第一次调用
      let response;
      let rawAiOutput = '';
      try {
        response = await callDeepSeek(apiKey, messages, 0.45, 12000);
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
          const retryResp = await callDeepSeek(apiKey, messages, 0.55, 12000);
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
          const retryResp = await callDeepSeek(apiKey, messages, 0.55, 12000);
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
