# StartFlow Project Context

Last updated: 2026-06-27

## Product Intent

StartFlow is a behavior-start experiment tool. It is now in the demo / launch phase.

The product is not trying to help users complete a task. It is trying to help users cross the first moment of resistance by giving them a tiny, concrete, immediately executable action chain.

The core product question is:

Can a 2-minute chain of 3 very small actions help a user begin something they have been avoiding?

## Current Demo Flow

1. Home page asks: `哪件事你想开始，但还没启动？`
2. User enters one task.
3. AI generates `3` tiny actions for a `2` minute start chain.
4. User sees a notice:
   `注意：这 3 个动作可能简单到荒谬。我们的目标不是完成任务，而是让你的手指或身体先动起来。`
5. Steps are presented as step-by-step cards: only the current step is shown prominently, next steps are shown weakly below.
6. User clicks `做完了，下一步` to advance through steps 1→2→3.
7. On step 3 completion (or timer end, or "提前完成"), inline feedback expands at the bottom of the page.
8. Feedback: 1 required question (`刚才做到哪里了？`) + 1 optional text field.
9. User clicks `完成` → thank you page with summary.
10. Data saved to localStorage and async-sent to Feishu.

### Alternative paths to feedback
- Step 3 completed → inline feedback
- 2-minute timer ends → inline feedback
- User clicks "我已经做完了" → inline feedback

## Product Principles

- The output must be a 2-minute, 3-action start chain.
- Each action should be very small, concrete, and physically or manually executable.
- The chain should touch the real task scene: files, document, inbox, object, body, environment, tool, material, or last partial draft.
- The AI should understand the user's actual situation, not keyword-match a broad category.
- The third action should leave a tiny but meaningful trace related to the user's task.
- Do not output plans, advice, motivation, task breakdowns, or multiple options.
- Do not ask users to complete the full task.
- Do not ask users to send messages, submit work, finish reports, clear all emails, or complete large actions.

Good example:

Task: `写g3-5的儿童营养课教案`

Output:

```json
[
  "打开一个空白文档。",
  "写下「G3-5儿童营养课：午餐盘」。",
  "在下一行打出「孩子先画自己今天吃了什么」。"
]
```

## AI Generation

Vercel production uses:

- `api/generate.js`

Local development uses:

- `server.js`

Keep their prompt and fallback behavior in sync when changing generation logic.

Important current behavior:

- Initial generation sends the original task.
- Refinement sends structured fields:
  - `task`
  - `tools`
  - `mode: "refine"`
  - `previousActions`
- Refinement is intentionally interpreted as current situation, blocker, preference, or constraint, not only "habit".
- Refinement has a slightly larger generation budget than initial generation because the prompt is longer.

## Fallback Behavior

Fallback exists so users still receive a usable chain when the AI returns empty content, times out, or cannot be parsed.

Important lessons from testing:

- Do not use a narrow frontend action-word list to reject AI outputs. It caused good outputs like `站起来。`, `走向卫生间。`, `定位到段尾。`, and `把一只脚伸进鞋里。` to be incorrectly replaced.
- Frontend validation should only block clearly bad outputs:
  - not a 3-item array
  - empty action
  - newline in action
  - too long
  - obvious advice/planning words
  - obviously oversized completion actions
- Fallback must respect secondary refinement input. Example:
  - Task: `我想查看我的邮箱，里面有五百多封未读邮件`
  - Refinement: `我不想一封一封看，想批量整理`
  - Fallback should shift toward search/filter/bulk operation, not "open the first unread email".

## Diagnostics

The app contains a generation diagnostics panel, but it is hidden for public users.

To show it during debugging, append:

```text
?debug=1
```

Diagnostics include:

- `source`
- `reason`
- `raw AI`
- `final`

How to read diagnostics:

- `source: ai` and good `raw AI`: model returned usable output.
- `source: ai` but bad `final`: frontend validation probably changed or rejected the output.
- `source: fallback` with empty `raw AI`: model returned empty, timed out, or parsing failed.
- `reason: 缺动作词` should no longer happen; the narrow action-word check was removed.

## Feedback Collection

Feedback is designed to validate whether the chain actually lowered start resistance.

Feedback now lives inline on the action page (no separate View 4). It appears after step 3 completion, timer end, or "已经做完了" click.

### Current required question

1. `刚才做到哪里了？`
   - `还没开始`
   - `做了第 1 步`
   - `做到第 2 步`
   - `3 步都做完了`
   - `做完后继续做了`

### Optional open question

`哪一步有用，或哪里不贴合？`

### Key data saved to localStorage & Feishu

- `progressReached` — the selected value from the required question (primary metric)
- `openFeedback` — optional free text
- `task` — the original task
- `actions` / `action` — the 3 action steps
- `durationSeconds` — how long the user ran the timer
- `createdAt` — timestamp

### Backward compatibility

Deprecated fields (`completed`, `stateAfterAction`, `chainFeeling`, `completionDepth`, `taskFit`, `resistanceChange`, `wouldStartWithoutPrompt`) are still included in the payload as empty strings, and the Feishu table and CSV export already account for them.

## Data / Feishu

Feedback is sent to:

- `api/feedback.js`

It writes to a Feishu Bitable using environment variables:

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_BASE_TOKEN`
- `FEISHU_TABLE_ID`

DeepSeek uses:

- `DEEPSEEK_API_KEY`

Do not commit `.env`.

The frontend keeps backward-compatible aliases in the payload so the existing Feishu table can continue collecting data:

- `completed` → maps to `progressReached`
- `stateAfterAction` → empty (no longer collected)
- `chainFeeling` → empty (no longer collected)

Newer fields in local history / CSV:

- `progressReached` (primary metric)
- `openFeedback`
- `actions`
- `actionMode`
- `durationSeconds`

Deprecated fields from earlier MVP (still saved as empty strings for CSV backward compat):
- `completionDepth`, `taskFit`, `resistanceChange`, `wouldStartWithoutPrompt`

If changing Feishu table schema, update `api/feedback.js` carefully. Feishu Bitable writes can fail if fields do not exist or field types mismatch.

## Deployment

### Primary (Railway)

Production URL: https://startflow-production.up.railway.app

Deployment flow:
1. Commit changes locally.
2. Push to GitHub.
3. Railway auto-deploys from GitHub (`main` branch).
4. Railway environment variables are configured in Dashboard → Variables:
   - `DEEPSEEK_API_KEY`
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
   - `FEISHU_BASE_TOKEN`
   - `FEISHU_TABLE_ID`

Railway runs `server.js` via `npm start`. The `server.js` handles both static file serving and API routes (`/api/generate`, `/api/feedback`).

### Old (Vercel — archived)

The project was originally deployed on Vercel using `api/generate.js` and `api/feedback.js` as serverless functions. The Vercel deployment (`startflow-mvp30`) is no longer the primary deployment. The `api/` directory and `vercel.json` remain in the repo for reference.

### Local Development

```text
http://localhost:8080
http://192.168.0.103:8080
```

uses:

```bash
node server.js
```

If `server.js` changes, restart the local server. Otherwise local tests may still run old code.

## Public Test Copy

Suggested short invite text:

```text
大家好，我做了一个很小的产品 demo，想邀请你帮忙测试一下。

它叫 StartFlow，用途很简单：当你有一件事想开始、但一直拖着没动时，你可以把这件事输入进去，它会给你生成一个 2 分钟内可以完成的 3 步启动链。目标不是帮你完成整件事，而是帮你先动起来。

测试地址：https://startflow-production.up.railway.app

使用方式：
1. 输入一件你想开始但还没启动的事
2. 按照页面给出的 3 个小动作做 2 分钟
3. 如果动作不贴合，可以点"换一个更贴近我的方式"补充你的情况
4. 结束后提交一下反馈

测试时欢迎尽量真实地输入你正在拖延的事，比如写作、整理资料、查看邮件、学习、收拾东西等。
我最想知道的是：它给出的动作有没有真的降低你开始的阻力。

谢谢大家！
```

## Known Tradeoffs

- DeepSeek may occasionally return empty content. Fallback is expected to cover this.
- Public demo prioritizes reasonable response time over perfect AI completion rate.
- The app is still a focused experiment, not a finished productivity product.
- Do not overbuild user accounts, task management, streaks, habit tracking, or workflow features beyond the validated core loop.

