# StartFlow Project Context

Last updated: 2026-06-28

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
6. Timer auto-starts when the action view appears (lightweight: `建议用时：约 2 分钟 · 已用 0:12`). No manual "start" button.
7. User clicks `做完了，下一步` to advance through steps 1→2→3.
8. On step 3 completion (or 2-minute timer end), inline feedback expands at the bottom of the page.
9. Feedback: 1 required question (`刚才做到哪里了？`) + 1 optional text field.
10. User clicks `完成` → thank you page with summary.
11. Data saved to localStorage and async-sent to Feishu.

### Triggers for inline feedback
- Step 3 completed → inline feedback
- 2-minute timer ends → inline feedback (no popup, no alert, page shows "2 分钟到了。刚才做到哪里了？")

### Refinement
- User clicks `换一个更贴合我的` to open a single input field.
- The input's placeholder adapts to the user's task via `getRefinePlaceholder()`: 7 categories with tailored example prompts (代码/项目, 沟通, 运动/身体, 学习, 写作/文档, 整理, 默认).

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

### SYSTEM_PROMPT structure

The SYSTEM_PROMPT is defined identically in `server.js` and `api/generate.js`. It is organized into 11 sections:

1. **全局目标** — 低阻力靠近任务现场，5 条合格判断标准
2. **低阻力不等于泛化** — 禁止因强调低阻力而输出泛化动作
3. **全局生成判断顺序** — 5 步隐式判断流程
4. **允许轻微不贴合** — 允许低阻力泛化，禁止高阻力操作
5. **AI 工具任务适用全局原则** — 用/让/请 + AI 工具的场景处理
6. **Codex / AI 编程特别规则** — 默认用户非程序员，任务现场是 AI 界面
7. **三步结构** — 各类任务的第三步指导
8. **生成方式** — 具体名词优先、禁止关键词模板
9. **绝对禁止** — 禁止分析/规划/说教等
10. **好输出示例** — 含正确/错误对比示例
11. **输出格式** — JSON 数组

### Refinement prompt

When user refines, the server constructs a user prompt with:

- 原始任务
- 上一版动作
- 用户补充
- 重新生成指令
- 注意事项（如果用户说"不知道做什么/写什么"，第三步应给出具体示例）

### Vercel production uses:

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

Feedback now lives inline on the action page (no separate View 4). It appears after step 3 completion or 2-minute timer end.

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

- `completed` / `progressReached` — the selected value from the required question (primary metric)
- `openFeedback` — optional free text
- `task` — the original task
- `actions` / `action` — the 3 action steps
- `durationSeconds` — how long the user ran the timer (auto-started on action view)
- `createdAt` — timestamp

### Feishu table fields written

The `api/feedback.js` and `server.js` `handleFeedback` now write only the currently collected fields to the Feishu Bitable:

- `task`
- `action`
- `completed`
- `openFeedback`
- `durationSeconds`
- `createdAt`

Deprecated fields (`stateAfterAction`, `wouldStartWithoutPrompt`, `progressReached`) are no longer sent to the Feishu API to avoid schema mismatch errors. They remain in localStorage and CSV export for backward compatibility.

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

The frontend sends the following fields to `/api/feedback`:

- `task` — the original task
- `action` — concatenated action string
- `completed` — the selected value (same as `progressReached`)
- `openFeedback` — optional free text
- `durationSeconds` — elapsed time
- `createdAt` — ISO timestamp
- `progressReached` — the selected value (backward compat with localStorage/CSV)
- `actions` — array of 3 action strings (backward compat with localStorage/CSV)

The server-side validation only requires `task` and `completed` to be present. All other fields are optional.

If changing Feishu table schema, update both `api/feedback.js` and `server.js` (`handleFeedback` function) carefully. Feishu Bitable writes can fail if fields do not exist or field types mismatch.

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
2. 页面会展示第 1 步，点"做完了，下一步"依次完成 3 步（计时自动开始）
3. 如果动作不贴合，可以点"换一个更贴合我的"补充你的情况
4. 3 步做完或 2 分钟到，页面底部会展开一题反馈，选完点完成即可

测试时欢迎尽量真实地输入你正在拖延的事，比如写作、整理资料、查看邮件、学习、收拾东西等。
我最想知道的是：它给出的动作有没有真的降低你开始的阻力。

谢谢大家！
```

## Known Tradeoffs

- DeepSeek may occasionally return empty content. Fallback is expected to cover this.
- Public demo prioritizes reasonable response time over perfect AI completion rate.
- The app is still a focused experiment, not a finished productivity product.
- Do not overbuild user accounts, task management, streaks, habit tracking, or workflow features beyond the validated core loop.

