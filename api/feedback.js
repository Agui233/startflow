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

    // 异步写入飞书（不阻塞响应）
    const writePromise = (async () => {
      try {
        const tokenResp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
        });
        const tokenData = await tokenResp.json();
        const token = tokenData.tenant_access_token;

        if (!token) {
          console.error('获取飞书 token 失败:', tokenData);
          return;
        }

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
          }
        );
        const writeData = await writeResp.json();
        if (writeData.code !== 0) {
          console.error('飞书写入失败:', JSON.stringify(writeData));
        } else {
          console.log('飞书写入成功');
        }
      } catch (err) {
        console.error('飞书写入异常:', err.message);
      }
    })();

    // 立即返回成功，不等待飞书写入
    res.status(200).json({ saved: true });

  } catch (err) {
    console.error('feedback 处理异常:', err);
    res.status(200).json({ saved: false, error: err.message });
  }
};
