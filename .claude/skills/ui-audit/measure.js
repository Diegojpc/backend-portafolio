// Run with chrome-devtools evaluate_script (sourcePath = this file). Returns layout facts for the chat/call UI
// at the CURRENT viewport. It never clicks anything: put the UI in the state you want to measure first.
async () => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const vw = innerWidth, vh = innerHeight;
  const out = { viewport: `${vw}x${vh}`, dpr: devicePixelRatio, problems: [] };
  const flag = (severity, what, detail) => out.problems.push({ severity, what, detail });

  const doc = document.documentElement;
  if (doc.scrollWidth > vw + 1) flag("high", "page has horizontal scroll", `scrollWidth ${doc.scrollWidth} > viewport ${vw}`);

  const panel = document.querySelector('[data-testid="chat-panel"]');
  out.panel = panel ? rect(panel) : null;
  if (!panel) { out.note = "chat panel is not open"; return out; }
  const pr = panel.getBoundingClientRect();
  if (pr.top < 0 || pr.bottom > vh + 1 || pr.left < 0 || pr.right > vw + 1) flag("high", "panel exceeds the viewport", JSON.stringify(rect(panel)));

  const interactive = [...panel.querySelectorAll("button, input, textarea, a, [role=button]")];
  out.interactive = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const label = (el.getAttribute("data-testid") || el.getAttribute("aria-label") || el.innerText || el.placeholder || el.tagName).trim().slice(0, 40);
    const clipped = r.bottom > pr.bottom + 1 || r.top < pr.top - 1 || r.right > pr.right + 1 || r.left < pr.left - 1;
    // an element inside a scroll container may be legitimately below the fold of that container
    let scrollParent = el.parentElement, scrollable = false;
    while (scrollParent && scrollParent !== panel) {
      const oy = getComputedStyle(scrollParent).overflowY;
      if ((oy === "auto" || oy === "scroll") && scrollParent.scrollHeight > scrollParent.clientHeight) scrollable = true;
      scrollParent = scrollParent.parentElement;
    }
    const tooSmall = Math.min(r.width, r.height) < 32;
    out.interactive.push({ label, ...rect(el), clipped, tooSmall });
    if (clipped && !scrollable) flag("high", `control not reachable: "${label}"`, JSON.stringify(rect(el)));
    else if (clipped) flag("medium", `control needs scrolling to reach: "${label}"`, JSON.stringify(rect(el)));
    if (tooSmall) flag("low", `tap target under 32px: "${label}"`, `${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // Content that forces a scroll inside the panel (the visitor should not have to scroll to read core UI).
  out.scrollAreas = [];
  for (const el of panel.querySelectorAll("*")) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      const id = el.getAttribute("data-testid") || el.className.toString().slice(0, 50);
      out.scrollAreas.push({ id, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, hiddenPx: el.scrollHeight - el.clientHeight });
      if (el.getAttribute("data-testid") === "call-middle") flag("medium", "call panel content needs scrolling", `${el.scrollHeight - el.clientHeight}px hidden`);
    }
  }

  // Text cut off horizontally.
  for (const el of panel.querySelectorAll("p, span, h3, button, label")) {
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") flag("medium", "text clipped horizontally", (el.innerText || "").slice(0, 50));
  }
  return out;
}
