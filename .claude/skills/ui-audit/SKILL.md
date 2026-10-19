---
name: ui-audit
description: Audit the portfolio's chat widget and voice-call UI for clipping, scrolling, overflow and tap-target problems across a fixed matrix of viewports (mobile, tablet, short laptop, desktop). Use after any change to ChatWidget.jsx, call/VoiceCall.jsx, locales (text length!) or global layout, or when asked to check responsiveness/mobile.
---

# ui-audit

Prerequisites (do NOT start or stop servers you did not start; the user usually runs them): frontend on `http://localhost:5173`
(`npm run dev`) and backend on `http://localhost:8000` with `REALTIME_ENABLED=true` (otherwise the mic button is hidden).
If they are down, report that instead of guessing.

## Matrix
Use `mcp__chrome-devtools__emulate` with these viewports (`WxHxDPR[,mobile,touch]`), reload the page after each change:

| name | viewport |
|---|---|
| small phone | `320x568x2,mobile,touch` |
| phone | `375x667x2,mobile,touch` |
| large phone | `430x932x3,mobile,touch` |
| phone landscape | `844x390x3,mobile,touch,landscape` |
| tablet | `768x1024x2,mobile,touch` |
| short laptop | `1100x520x1.5` |
| laptop | `1366x768x1` |
| desktop | `1920x1080x1` |

## States to measure at each viewport
1. Chat open (click the floating bubble: the `button` whose class contains `w-14`).
2. Call idle (click `[data-testid="open-call"]`).
3. Call error state (in Brave/Chromium without mic permission "Iniciar llamada" produces an error; or just note it as untested).
4. Both languages: ES (default) and EN (`localStorage.setItem('portfolio_lang','en')` then reload). EN/ES text length differs and is the usual cause of overflow.

## Measuring
Run `evaluate_script` with `sourcePath` = absolute path of `.claude/skills/ui-audit/measure.js` in this repo (if `sourcePath` fails, Read the file and pass it as `function`).
It returns `problems[]` (severity high/medium/low), the rect of every control and the scroll areas. Take one screenshot per viewport for the states that have problems.
Stable hooks: `data-testid` = `chat-panel`, `open-call`, `call-panel`, `call-middle`, `call-start`, `call-hangup`, `call-interrupt`, `call-back`.

## Report
A table: viewport × state × language → problems, with the measured numbers and the file/line of the likely cause. Rank by severity. A "high" is any control a visitor cannot reach;
a "medium" is core content that needs scrolling (e.g. the privacy notice); a "low" is cosmetics (small tap targets, crowded spacing). Do not edit code unless asked; hand the report back.
Reset emulation at the end (`emulate` with only `pageId`).
