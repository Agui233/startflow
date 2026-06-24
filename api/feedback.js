// ============================================
// StartFlow — Vercel Serverless Function
// POST /api/feedback — 写入飞书多维表格
// ============================================

// 飞书多维表格配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const TABLE_ID = process.env.FEISHU_TABLE_ID || '';

async function getTenantToken() {
  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  const data = await resp.json();
  return data.tenant_access_token;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { task, action, completed, stateAfterAction, wouldStartWithoutPrompt, openFeedback, durationSeconds, createdAt } = req.body || {};

    if (!task || !completed || !stateAfterAction || !wouldStartWithoutPrompt) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }

    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
      console.warn('FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置');
      res.status(200).json({ saved: false, reason: 'Feishu not configured' });
      return;
    }

    const token = await getTenantToken();

    const fields = {
      task,
      action: action || '',
      completed,
      stateAfterAction,
      wouldStartWithoutPrompt,
      openFeedback: openFeedback || '',
      durationSeconds: durationSeconds || 0,
      createdAt: createdAt || new Date().toISOString(),
    };

    const writeResp = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ fields }),
      }
    );

    const writeData = await writeResp.json();

    if (writeData.code !== 0) {
      console.error('Feishu write error:', JSON.stringify(writeData));
      res.status(200).json({ saved: false, error: writeData.msg });
      return;
    }

    res.status(200).json({ saved: true });

  } catch (err) {
    console.error('feedback 处理异常:', err);
    res.status(200).json({ saved: false, error: err.message });
  }
};
