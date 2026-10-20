import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is within `rootMargin` of the viewport.
 * Used to mount/pause WebGL canvases so only visible ones consume GPU.
 *
 * @param {string} rootMargin  – IntersectionObserver margin (default pre-loads 200px early)
 * @returns {[React.RefObject, boolean]} ref to attach and the current in-view flag
 */
const useInView = (rootMargin = "200px") => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      console.warn("[useInView] IntersectionObserver unavailable, assuming visible.");
      setInView(true);
      return;
    }
    // One callback can deliver several entries (e.g. "left" then "entered" during a slide-in animation):
    // the LAST one is the current state. Reading entries[0] left the canvas unmounted while on screen.
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[entries.length - 1].isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView];
};

export default useInView;
