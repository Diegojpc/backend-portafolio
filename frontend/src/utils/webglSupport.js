/**
 * WebGL Support Detection Utility
 *
 * Performs a real canvas probe to determine whether the browser can
 * instantiate a WebGL rendering context. The result is cached after the
 * first invocation so subsequent calls are essentially free.
 */

let _cachedResult = null;

/**
 * Returns `true` when the current browser/device supports at least WebGL 1.
 * The probe creates a temporary off-screen canvas, attempts to get a context,
 * and caches the boolean so the DOM work only happens once.
 */
export function isWebGLAvailable() {
  if (_cachedResult !== null) return _cachedResult;

  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");

    _cachedResult = ctx instanceof WebGLRenderingContext || ctx instanceof WebGL2RenderingContext;

    // Explicitly lose the context to free GPU resources from the probe
    if (ctx) {
      const ext = ctx.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }

    console.info(`[WebGL] Support check: ${_cachedResult ? "AVAILABLE" : "UNAVAILABLE"}`);
  } catch (err) {
    console.warn("[WebGL] Support check threw — treating as unavailable:", err.message);
    _cachedResult = false;
  }

  return _cachedResult;
}
