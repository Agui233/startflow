// StartFlow — POST /api/feedback — 写入飞书多维表格

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const TABLE_ID = process.env.FEISHU_TABLE_ID || '';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { task, action, completed, stateAfterAction, wouldStartWithoutPrompt, openFeedback, durationSeconds, createdAt } = req.body || {};

  if (!task || !completed || !stateAfterAction || !wouldStartWithoutPrompt) {
    res.status(200).json({ saved: false, error: 'missing_fields' });
    return;
  }

  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !BASE_TOKEN || !TABLE_ID) {
    res.status(200).json({ saved: false, error: 'not_configured' });
    return;
  }

  // 获取飞书 token
  let token = '';
  try {
    const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    token = d.tenant_access_token || '';
    if (!token) {
      res.status(200).json({ saved: false, error: 'token_failed', detail: d });
      return;
    }
  } catch (e) {
    res.status(200).json({ saved: false, error: 'token_error', detail: e.message });
    return;
  }

  // 写入飞书记录
  try {
    const r = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          fields: {
            task,
            action: action || '',
            completed,
            stateAfterAction,
            wouldStartWithoutPrompt,
            openFeedback: openFeedback || '',
            durationSeconds: durationSeconds || 0,
            createdAt: Date.now(),
          }
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    const d = await r.json();
    if (d.code === 0) {
      res.status(200).json({ saved: true });
    } else {
      res.status(200).json({ saved: false, error: 'write_failed', detail: d.msg });
    }
  } catch (e) {
    res.status(200).json({ saved: false, error: 'write_error', detail: e.message });
  }
};
