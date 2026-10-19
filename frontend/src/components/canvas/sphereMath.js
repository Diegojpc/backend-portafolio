// sphereMath.js — keeps an audio-reactive sphere inside the visible area of its canvas.

/**
 * Largest sphere radius (centred at the origin, camera on +z looking at it) whose silhouette stays inside
 * the canvas. The silhouette of a sphere of radius r seen from distance z has angular radius asin(r / z),
 * and it must stay under the narrower of the vertical/horizontal half field-of-view.
 *
 * @param {number} cameraZ  camera distance to the sphere centre
 * @param {number} fovDeg   vertical field of view in degrees
 * @param {number} aspect   canvas width / height
 * @param {number} margin   fraction of the half-FOV to use (<1 leaves breathing room at the edges)
 */
export const maxSphereRadius = (cameraZ, fovDeg, aspect, margin = 0.88) => {
  const vHalf = (fovDeg / 2) * (Math.PI / 180);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  return cameraZ * Math.sin(Math.min(vHalf, hHalf) * margin);
};

/**
 * Leaves radii at or below `base` untouched and bends anything above it smoothly toward `maxR`
 * (never reaching it), so loud audio swells the sphere without ever clipping or flattening it.
 */
export const softClampRadius = (distance, base, maxR) => {
  if (distance <= base) return distance;
  const room = Math.max(maxR - base, 0.001);
  return base + room * Math.tanh((distance - base) / room);
};

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
