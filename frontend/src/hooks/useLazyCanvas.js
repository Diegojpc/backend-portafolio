import { useEffect, useRef, useState } from "react";

/**
 * Decides WHEN a heavy WebGL <Canvas> should exist and WHEN it should draw.
 *
 *  mounted  Latches to true once and never goes back. It becomes true when the element comes within
 *           `rootMargin` of the viewport, or after `warmupMs` (in an idle slot) so the canvas is ready
 *           before the visitor arrives. Never unmounting matters: creating a WebGL context, parsing the
 *           GLB and building the environment costs seconds on a slow CPU, and doing it again every time
 *           the section scrolled back into view froze the page.
 *  visible  Current visibility. Use it for R3F's `frameloop` ("always" when visible, "demand" otherwise)
 *           so off-screen canvases cost nothing but still render their first frame while warming up.
 *
 * @param {{rootMargin?: string, warmupMs?: number|null}} options
 * @returns {[React.RefObject, boolean, boolean]} [ref for the placeholder element, mounted, visible]
 */
const useLazyCanvas = ({ rootMargin = "800px", warmupMs = null } = {}) => {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      console.warn("[useLazyCanvas] IntersectionObserver unavailable, mounting immediately.");
      setMounted(true);
      setVisible(true);
      return;
    }

    // One callback can carry several entries (e.g. "left" then "entered" during a slide-in animation):
    // the LAST one is the current state.
    const observer = new IntersectionObserver(
      (entries) => {
        const nowVisible = entries[entries.length - 1].isIntersecting;
        setVisible(nowVisible);
        if (nowVisible) setMounted(true);
      },
      { rootMargin }
    );
    observer.observe(el);

    let timer;
    let idle;
    if (warmupMs !== null) {
      timer = setTimeout(() => {
        const mount = () => setMounted(true);
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(mount, { timeout: 4000 });
        else mount();
      }, warmupMs);
    }

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      if (idle !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
    };
  }, [rootMargin, warmupMs]);

  return [ref, mounted, visible];
};

export default useLazyCanvas;
