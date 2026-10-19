---
name: perf-check
description: Measure load performance of the portfolio (FCP, LCP, TBT, long tasks, WebGL context count) against a production build. Use after any change to frontend/src/components/canvas/, App.jsx or lazy-loading, or when asked about startup lag/Web Vitals.
---

# perf-check

1. `cd frontend && npm run build`, then `npm run preview -- --port 4173` in the background.
2. With the chrome-devtools MCP: `new_page` → `http://localhost:4173`, `emulate` CPU throttling 4x for a realistic low-end run.
3. `performance_start_trace` (reload + autostop), then `performance_stop_trace` and `performance_analyze_insight` for LongTasks / LCP.
4. `lighthouse_audit` (mobile, performance only).
5. `evaluate_script` to count WebGL contexts alive after 3s:
   `document.querySelectorAll('canvas').length` (target at first paint: 1, the waves).
6. Check `list_console_messages` for the `[Waves]` / `[App]` timing logs (shader compile ms, reveal, below-the-fold mount).
7. Report a table: FCP, LCP, TBT, longest task, canvases at load. Compare against the previous run if one exists; stop the preview server when done.
