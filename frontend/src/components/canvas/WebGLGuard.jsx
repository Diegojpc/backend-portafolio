/**
 * WebGLGuard — Graceful degradation wrapper for Three.js Canvas components.
 *
 * Wraps any R3F <Canvas> tree. When WebGL is not available the guard renders
 * either the provided `fallback` prop or a default CSS-only visual that
 * keeps the page layout intact and visually coherent.
 *
 * Usage:
 *   <WebGLGuard fallback={<MyCustomFallback />}>
 *     <Canvas> ... </Canvas>
 *   </WebGLGuard>
 */
import { Component } from "react";
import { isWebGLAvailable } from "../../utils/webglSupport";

/**
 * Default fallback: a subtle animated gradient that matches the retrowave
 * aesthetic so the site doesn't look broken — just "GPU-lite".
 */
const DefaultFallback = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 25%, #16213e 50%, #0f3460 75%, #0a0a0a 100%)",
      backgroundSize: "400% 400%",
      animation: "webgl-fallback-shift 12s ease-in-out infinite",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Inject the keyframe once via a scoped <style> */}
    <style>{`
      @keyframes webgl-fallback-shift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `}</style>
  </div>
);

/**
 * ErrorBoundary that catches Three.js runtime explosions (e.g. shader
 * compilation failures after the context was initially created).
 */
class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(
      "[WebGLGuard] Runtime error caught by boundary:",
      error.message,
      "\nComponent stack:",
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultFallback />;
    }
    return this.props.children;
  }
}

/**
 * Primary guard component. Performs the WebGL availability check and wraps
 * children in an error boundary as a second safety net.
 *
 * @param {React.ReactNode} children  – The R3F Canvas tree
 * @param {React.ReactNode} fallback  – Optional custom fallback UI
 */
const WebGLGuard = ({ children, fallback }) => {
  const webglAvailable = isWebGLAvailable();

  if (!webglAvailable) {
    console.warn(
      "[WebGLGuard] WebGL is not available on this device/browser. Rendering CSS fallback."
    );
    return fallback || <DefaultFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={fallback || <DefaultFallback />}>
      {children}
    </WebGLErrorBoundary>
  );
};

export default WebGLGuard;
