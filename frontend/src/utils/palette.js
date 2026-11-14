import * as THREE from "three";

// The original retrowave colour cycle of the hero waves / Contact sphere, shared so both visuals drift
// through the same colours. One full step every 10 s (time * 0.1), as before the redesign.
const RETRO_HEX = ["#2de2e6", "#035ee8", "#f6019d", "#d40078", "#9700cc", "#ffd319", "#ff901f", "#ff2975", "#c700b5", "#b000ff"];
export const RETRO_COLORS = RETRO_HEX.map((hex) => new THREE.Color(hex));
const _next = new THREE.Color();
const WHITE = new THREE.Color("#ffffff");

/** Writes the cycling base colour for `seconds` into `base`, and its brighter peak tint into `peak`. */
export const cycleColors = (seconds, base, peak) => {
  const t = seconds * 0.1;
  const i1 = Math.floor(t % RETRO_COLORS.length);
  const i2 = (i1 + 1) % RETRO_COLORS.length;
  base.copy(RETRO_COLORS[i1]).lerp(_next.copy(RETRO_COLORS[i2]), t % 1);
  // Peaks keep reading as "louder" whatever the hue: the same colour pushed toward white.
  if (peak) peak.copy(base).lerp(WHITE, 0.55);
};
