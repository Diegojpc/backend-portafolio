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
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView];
};

export default useInView;
