// ============================================
// StartFlow — Vercel Serverless Function
// POST /api/feedback — 写入飞书多维表格
// ============================================

// 飞书多维表格配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const TABLE_ID = process.env.FEISHU_TABLE_ID || '';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { task, action, completed, stateAfterAction, wouldStartWithoutPrompt, openFeedback, durationSeconds, createdAt } = req.body || {};

    if (!task || !completed || !stateAfterAction || !wouldStartWithoutPrompt) {
      res.status(200).json({ saved: false, error: '缺少必填字段' });
      return;
    }

    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !BASE_TOKEN || !TABLE_ID) {
      console.warn('飞书凭证未完整配置');
      res.status(200).json({ saved: false, reason: 'Feishu not configured' });
      return;
    }

    // 同步写入飞书（带 8 秒超时）
    let saved = false;
    try {
      const tokenResp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
        signal: AbortSignal.timeout(8000),
      });
      const tokenData = await tokenResp.json();
      const token = tokenData.tenant_access_token;

      if (token) {
        const writeResp = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              fields: {
                task,
                action: action || '',
                completed,
                stateAfterAction,
                wouldStartWithoutPrompt,
                openFeedback: openFeedback || '',
                durationSeconds: durationSeconds || 0,
                createdAt: createdAt || new Date().toISOString(),
              }
            }),
            signal: AbortSignal.timeout(8000),
          }
        );
        const writeData = await writeResp.json();
        saved = writeData.code === 0;
        if (!saved) console.error('飞书写入失败:', JSON.stringify(writeData));
      } else {
        console.error('飞书 token 获取失败:', tokenData);
      }
    } catch (err) {
      console.error('飞书写入异常:', err.message);
    }

    res.status(200).json({ saved });

  } catch (err) {
    console.error('feedback 处理异常:', err);
    res.status(200).json({ saved: false, error: err.message });
  }
};
