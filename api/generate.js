// StartFlow — Vercel Serverless: POST /api/generate

const SYSTEM_PROMPT = `你是 StartFlow 的行为启动翻译器。你的任务：把用户正在拖延的一件事，翻译成 3 个连续、极小、可立即执行的身体或手指动作。

目标：让用户在 2 分钟内接触任务现场，跨过开始前的阻力。

# 核心原则（必须遵守）
1. 输出必须且只输出 3 个动作。
2. 每个动作必须非常小。
3. 3 个动作必须在 2 分钟内按顺序完成。
4. 动作只负责启动，不负责完成任务。
5. 优先让用户接触真实任务现场。
6. 如果用户提供了常用条件，优先围绕常用条件生成。
7. 没有常用条件时，不要虚构具体文件、联系人、账号、页码。
8. 可以自然使用用户原话里的具体名词。
9. 第 3 个动作应留下一个微小但可感知的进展标记。
10. 避免机器模板感。

# 绝对禁止
- 禁止分析、规划、拆解、构思、列出、梳理、评估、思考、研究、复盘、总结。
- 禁止输出计划、原因解释、心理建议、多个方案。
- 禁止要求完成完整任务。
- 禁止使用"首先""建议""计划""步骤"。
- 禁止让用户写完整邮件、发出消息、完成报告、整理全部、学完、跑完。
- 高情绪沟通任务中，禁止要求发送实质内容——只能打开、定位、输入无压力内容或让光标停住。

# 每个动作必须包含至少一个物理动作词
打开、拿出、触摸、按下、写下、打出、输入、放进、系上、翻到、找出、右键、点开、移动、复制、粘贴、选中、拖入、放下、站到、坐下、穿上

# 输出格式
只返回 JSON 数组，长度 3。不要 Markdown，不要对象，不要解释，不要编号，不要前后缀。
示例：["打开上周的周报文件。","复制标题到新文档。","粘贴日期。"]
动作字符串内不要使用双引号，可以用「」或省略。
`.trim();

function generateFallbackAction(task, tools) {
  const lower = task.toLowerCase();
  const toolHint = (tools && tools.trim()) ? tools.trim() : null;
  let a1, a2, a3;
  if (toolHint) {
    if (toolHint.includes('Notion')) { a1='打开 Notion。'; a2='新建一个空白页。'; a3='只写一个标题。'; }
    else if (toolHint.includes('手机') || toolHint.includes('iPhone')) { a1=`拿起${toolHint}。`; a2='打开相关应用。'; a3='只看第一屏。'; }
    else if (toolHint.includes('电脑') || toolHint.includes('Mac')) { a1='打开电脑。'; a2='启动相关软件。'; a3='新建一个空白文件。'; }
    else if (toolHint.includes('微信') || toolHint.includes('WeChat')) { a1='打开微信。'; a2='找到对方的聊天。'; a3='只输入对方称呼。'; }
    else if (toolHint.includes('邮箱') || toolHint.includes('mail')) { a1='打开邮箱。'; a2='点新建邮件。'; a3='只写一个标题。'; }
    else if (toolHint.includes('书') || toolHint.includes('课本')) { a1=`翻开${toolHint}。`; a2='找到第一页。'; a3='用手指触摸第一行字。'; }
    else if (toolHint.includes('跑鞋') || toolHint.includes('运动鞋')) { a1=`找出${toolHint}。`; a2='穿上一只。'; a3='系上鞋带。'; }
    else if (toolHint.includes('瑜伽垫')) { a1='铺开瑜伽垫。'; a2='站到垫子边缘。'; a3='闭上眼睛深呼吸一次。'; }
    else { a1=`拿出${toolHint}。`; a2='放在手边。'; a3='做一个最小动作。'; }
  } else if (/写|报告|文案|PPT|方案|代码|设计|论文|周报/.test(lower)) {
    a1='打开一个空白文档。'; a2='只打出任务标题。'; a3='把日期改成今天。';
  } else if (/发邮件|发消息|联系|客户|老板|同事|回复|微信/.test(lower)) {
    a1='打开聊天或邮箱。'; a2='找到相关联系人。'; a3='只输入对方称呼。';
  } else if (/跑步|运动|锻炼|健身/.test(lower)) {
    a1='找出运动鞋。'; a2='穿上一只。'; a3='系上左脚鞋带。';
  } else if (/看书|学习|背单词|读资料|阅读/.test(lower)) {
    a1='打开学习资料。'; a2='翻到第一页。'; a3='用手指触摸第一行字。';
  } else if (/收拾|整理|打扫|清理|归档/.test(lower)) {
    a1='拿出一个袋子。'; a2='找一个最小物品。'; a3='把它放进去。';
  } else {
    a1='打开备忘录。'; a2=`写下关于${task.slice(0,10)}。`; a3='随便打出5个字。';
  }
  return { actions: [a1, a2, a3].filter(Boolean), action: [a1, a2, a3].filter(Boolean).join(' ') };
}

async function callDeepSeek(apiKey, messages, temperature, timeoutMs) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-v4-flash', messages, temperature: temperature || 0.45, max_tokens: 220, stream: false }),
      signal: c.signal,
    });
    clearTimeout(t); return r;
  } catch (e) { clearTimeout(t); throw e; }
}

function extractAction(data) {
  const raw = (data.choices?.[0]?.message?.content?.trim() || data.choices?.[0]?.text?.trim() || data.output_text?.trim() || '');
  try { const p = JSON.parse(raw); if (Array.isArray(p) && p.length === 3) return { actions: p, action: p.join(' ') }; } catch {}
  const m = raw.match(/\[[\s\S]*?\]/);
  if (m) {
    let j = m[0];
    j = j.replace(/(?<=[^,\[\]"])\"([^\"]*?)\"(?=[^,\[\]"])/g, '「$1」');
    try { const p = JSON.parse(j); if (Array.isArray(p) && p.length === 3) return { actions: p, action: p.join(' ') }; } catch {}
    try { const p = j.replace(/^\[|\]$/g,'').split('","').map(s=>s.replace(/^"|"$/g,'').trim()).filter(Boolean); if (p.length===3) return { actions: p, action: p.join(' ') }; } catch {}
  }
  return { actions: [raw, '', ''], action: raw };
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
    const { task, tools } = req.body || {};
    const ts = (task || '').trim();
    const tl = (tools || '').trim();
    if (!ts) { res.status(400).json({ error: '请输入有效的任务描述' }); return; }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      const fb = generateFallbackAction(ts, tl);
      res.status(200).json(buildResponse(fb.actions, fb.action, 'fallback', { reason: '未配置 API Key', raw: '', final: fb.actions, warning: '未配置 AI Key，已使用本地保底动作' }));
      return;
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: ts }];
    let response, rawAi = '', result;

    try { response = await callDeepSeek(apiKey, messages, 0.45, 12000); }
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
        const retry = await callDeepSeek(apiKey, messages, 0.55, 12000);
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
      try {
        const retry = await callDeepSeek(apiKey, messages, 0.55, 12000);
        if (retry.ok) { const rd = await retry.json(); logDeepSeekResponse('retry', rd); rawAi = rd.choices?.[0]?.message?.content?.trim()||''; result = extractAction(rd); }
      } catch {}
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
