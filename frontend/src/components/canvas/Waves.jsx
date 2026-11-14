import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import WebGLGuard from "./WebGLGuard";
import { isWebGLAvailable } from "../../utils/webglSupport";
import { getAudioGraph, SpectrumFollower } from "../../utils/audioGraph";
import { cycleColors } from "../../utils/palette";


const isMobileDevice = () => window.innerWidth < 768;

// Real-time sound topography ("the music sculpts the space").
// Every ~1/28 s the current frequency spectrum is written as a new row of a history texture. The newest
// row emerges in the foreground (bottom of the screen) and travels toward the horizon, leaving a physical
// trail of the last ~4.5 s of the song before it dissolves into the fog.
//  - Two mirrored meshes (floor and ceiling) sample the same history texture in the vertex shader.
//  - Across the screen, frequency is log-spaced: bass at the sides (tall mountains), highs toward the
//    centre, so a clear valley stays behind the headline. Mapping uses the screen-space angle, so a given
//    frequency keeps the same screen column at every depth (a waterfall seen in perspective).
//  - Thin triangulated wireframe drawn in the fragment shader (no glow), colour cycling through the
//    retrowave palette; the cross lines travel with the sound. Ridges brighten as they rise.
//  - Mids slightly thicken the lines, highs brighten the peaks (uniforms from the shared analyser).
const vertexShader = /* glsl */ `
  uniform sampler2D uSpec;
  uniform vec2 uSize;
  uniform float uNow;     // continuous row clock (rows written + fraction)
  uniform float uHead;    // last row written
  uniform float uRows;    // history length in rows
  uniform float uCols;    // spectrum columns
  uniform float uTanX;    // tan(horizontal half FOV)
  uniform float uNearZ;   // view distance where the newest row appears (bottom edge of the screen)
  uniform float uFarZ;    // view distance where the oldest row dissolves
  uniform float uRoad;    // screen fraction (from centre) kept flat
  uniform float uScale;
  uniform float uDir;
  uniform float uCell;

  varying vec2 vGrid;
  varying float vViewZ;
  varying float vPeak;

  void main() {
    vec2 p = position.xy * uSize;
    vec4 mv0 = modelViewMatrix * vec4(p, 0.0, 1.0);
    float z = max(-mv0.z, 1.0);

    // Depth → age: newest at uNearZ, oldest at uFarZ.
    float dRaw = (z - uNearZ) / (uFarZ - uNearZ);
    float d = clamp(dRaw, 0.0, 1.0);
    // Texture lookups clamp to the newest row written; the grid coordinate must NOT be clamped:
    // a constant coordinate has zero derivative, and fwidth() would light the whole strip up as one
    // "line" every few rows (the flash where each row is born).
    float id = min(uNow - d * uRows, uHead);
    float idGrid = uNow - dRaw * uRows;
    float v = (mod(id, uRows) + 0.5) / uRows;

    // Screen column → frequency: 0 at the road edge (highs) … 1 at the screen edge (bass).
    float s = abs(mv0.x) / (z * uTanX);
    float k = clamp((s - uRoad) / (1.0 - uRoad), 0.0, 1.0);
    float u = ((1.0 - k) * (uCols - 1.0) + 0.5) / uCols;

    float amp = texture2D(uSpec, vec2(u, v)).r;
    float roadMask = smoothstep(uRoad * 0.5, uRoad, s);
    float fade = 1.0 - smoothstep(0.8, 1.0, d);        // dissolve the oldest rows
    float emerge = smoothstep(uNearZ * 0.55, uNearZ, z); // rise out of the flat ground in the foreground
    float h = pow(amp, 1.35) * uScale * roadMask * fade * emerge;

    vGrid = vec2(p.x / uCell, idGrid / 9.0);             // a cross line every 9 history rows (~square cells with uCell 36)
    vPeak = amp * roadMask * fade * emerge;
    vec4 mv = modelViewMatrix * vec4(p, h * uDir, 1.0);
    vViewZ = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;     // wire colour (cycles through the retrowave palette)
  uniform vec3 uPeak;     // brighter tint the mesh takes as the sound lifts it
  uniform float uMid;
  uniform float uHigh;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec2 vGrid;
  varying float vViewZ;
  varying float vPeak;

  // Thin anti-aliased triangulated wireframe: the two grid families plus one diagonal,
  // constant width in pixels thanks to fwidth(). No glow: a quiet, technical look.
  float wire(vec2 g, float widthPx) {
    vec2 d = fwidth(g);
    vec2 a = abs(fract(g - 0.5) - 0.5) / max(d, vec2(1e-4));
    float diag = g.x + g.y;
    float ad = abs(fract(diag - 0.5) - 0.5) / max(fwidth(diag), 1e-4);
    return 1.0 - min(min(min(a.x, a.y), ad) / widthPx, 1.0);
  }

  void main() {
    float line = wire(vGrid, 0.9 + uMid * 0.5);
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vViewZ);
    // Height brightens the mesh: the louder a frequency, the brighter its ridge.
    float hot = smoothstep(0.45, 0.95, vPeak);   // only the tallest ridges reach the peak tint
    vec3 col = mix(uBase, uPeak, hot) * (1.0 + uHigh * 0.25 * hot);
    float alpha = clamp(line * fog * (0.5 + hot * 0.45), 0.0, 1.0);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;
const getGeometrySize = (windowWidth, windowHeight, size) => {
  if (windowWidth <= 950 && windowHeight <= 450) {
    return [size * 4.5, size * 2];
  } else if (windowWidth <= 750 && windowHeight <= 600) {
    return [size * 5, size * 2];
  } else if (windowWidth <= 350) {
    return [size * 3, size * 6];
  } else if (windowWidth <= 900) {
    return [size * 3, size * 5];
  } else if (windowWidth <= 1700) {
    return [size * 2.8, size * 2];
  }
  return [size * 3, size];
};

const WaveMesh = ({ position, rotation, dir, scale, size, isMobile, shared }) => {
  // Dense in depth: the history texture has 128 rows across the visible part of the plane.
  const segmentsX = isMobile ? 100 : 240;
  const segmentsY = isMobile ? 200 : 420;

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY),
    [segmentsX, segmentsY]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Uniform objects shared by both meshes (one update per frame drives the floor and the ceiling).
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          ...shared,
          uSize: { value: new THREE.Vector2(1, 1) },
          uDir: { value: dir },
          uScale: { value: scale },
        },
      }),
    [shared, dir, scale]
  );
  useEffect(() => () => material.dispose(), [material]);

  // Resize only touches a uniform; geometry is not rebuilt.
  useEffect(() => {
    const [w, h] = getGeometrySize(size, window.innerHeight, size);
    material.uniforms.uSize.value.set(w, h);
  }, [size, material]);

  return <mesh position={position} rotation={rotation} geometry={geometry} material={material} frustumCulled={false} />;
};

// Colour: the wire drifts through the original retrowave cycle (utils/palette.js); ridges lifted by
// the sound take a brighter tint of the current colour.

// History texture: COLS log-spaced frequencies × ROWS time steps.
const COLS = 160;
const ROWS = 192;
const ROW_RATE = 36;          // rows per second → ~5.3 s of the song visible
// Camera: fov 75°, planes 300 above/below. The floor enters the screen at 300 / tan(37.5°) ≈ 391.
const NEAR_Z = 380;
const FAR_Z = 1150;

// Band envelopes for the line glow / sound ring (fast attack, quicker release).
const ATTACK = 25;
const RELEASE = 9;
const SLOW_RATE = 0.5;
const PEAK_DECAY = 0.35;
const BAND_KEYS = ["bass", "mid", "high"];
const ZERO_BANDS = { bass: 0, mid: 0, high: 0 };

/** Automatic gain control: 20% loudness + 80% transient above the band's own ~2 s average. */
const agcLevel = (env, slow, peak) => {
  const loud = THREE.MathUtils.clamp(slow * 1.2, 0, 1);
  const transient = THREE.MathUtils.clamp((env - slow) / Math.max(peak, 0.02), 0, 1);
  return 0.2 * loud + 0.8 * THREE.MathUtils.smoothstep(transient, 0.15, 0.85);
};

/** Gentle synthetic spectrum for when nothing plays, so the topography keeps flowing. */
const idleColumn = (c, t) => {
  const bassiness = Math.pow(1 - c / COLS, 1.6);
  const a = 0.5 + 0.5 * Math.sin(c * 0.33 + t * 1.9);
  const b = 0.5 + 0.5 * Math.sin(c * 0.11 - t * 0.7);
  return 0.42 * bassiness * (0.35 + 0.65 * a * b);
};

const Waves = ({ size, isMobile, audioElement, sceneRef }) => {
  const { camera } = useThree();
  const timeOffset = useMemo(() => performance.now() / 1000, []);

  const spec = useMemo(() => {
    const data = new Uint8Array(COLS * ROWS);
    const tex = new THREE.DataTexture(data, COLS, ROWS, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return { data, tex, row: new Float32Array(COLS), smooth: new Float32Array(COLS) };
  }, []);
  useEffect(() => () => spec.tex.dispose(), [spec]);

  const shared = useMemo(() => ({
    uSpec: { value: spec.tex },
    uNow: { value: 0 },
    uHead: { value: 0 },
    uRows: { value: ROWS },
    uCols: { value: COLS },
    uTanX: { value: 1 },
    uNearZ: { value: NEAR_Z },
    uFarZ: { value: FAR_Z },
    uRoad: { value: 0.16 },
    uCell: { value: 36 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uFogNear: { value: 700 },
    uFogFar: { value: 1150 },
    uBase: { value: new THREE.Color() },
    uPeak: { value: new THREE.Color() },
  }), [spec]);

  const followerRef = useRef(null);
  const audio = useRef({
    live: 0,                       // 0 = idle spectrum, 1 = real music (crossfaded)
    head: 0,
    acc: 0,
    env: { bass: 0, mid: 0, high: 0 },
    slow: { bass: 0, mid: 0, high: 0 },
    peak: { bass: 0.05, mid: 0.05, high: 0.05 },
    out: { bass: 0, mid: 0, high: 0 },
    pulses: [-1, -1, -1],          // age (s) of each ring pulse, -1 = idle
    nextPulse: 0,
    sinceOnset: 1,
    prevBass: 0,
  });
  const pulseEls = useRef(null);

  // Hook into the shared analyser as soon as the player hands over its <audio> element.
  useEffect(() => {
    if (!audioElement) return;
    const graph = getAudioGraph(audioElement);
    if (!graph) return;
    // Temporal smoothing is done below (after mixing with the idle spectrum), so the follower doesn't.
    followerRef.current = new SpectrumFollower(graph.analyser, graph.context.sampleRate, COLS, { smooth: false });
    console.info("[Waves] Linked to shared audio analyser; spectrum history texture active.", { cols: COLS, rows: ROWS, rowRate: ROW_RATE });
  }, [audioElement]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const a = audio.current;
    const t = timeOffset + clock.elapsedTime;

    // Keep the frequency → screen-column mapping right after resizes. Portrait screens are narrow,
    // so the same height covers more of the view: widen the clear valley there.
    shared.uTanX.value = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    shared.uRoad.value = camera.aspect < 1 ? 0.3 : 0.16;

    // 1. Read the spectrum (shared follower: float dB, gain, contrast, blur) and build the current row.
    const follower = followerRef.current;
    const playing = Boolean(follower && audioElement && !audioElement.paused);
    a.live += ((playing ? 1 : 0) - a.live) * (1 - Math.exp(-(playing ? 4 : 1.5) * dt));
    const row = spec.row;
    const raw = playing ? follower.bands : ZERO_BANDS;

    if (playing) {
      row.set(follower.update(dt));
    } else {
      row.fill(0);
    }
    if (a.live < 0.999) {
      for (let c = 0; c < COLS; c++) row[c] = row[c] * a.live + idleColumn(c, t) * (1 - a.live);
    }
    // Temporal smoothing per column (fast rise, slower fall) so the relief reads as terrain, not flicker.
    const sm = spec.smooth;
    for (let c = 0; c < COLS; c++) {
      const k = row[c] > sm[c] ? 18 : 7;
      sm[c] += (row[c] - sm[c]) * (1 - Math.exp(-k * dt));
    }

    // 2. Push rows into the history ring at a fixed rate (the time axis stays faithful to the song).
    a.acc += dt * ROW_RATE;
    let wrote = false;
    while (a.acc >= 1) {
      a.acc -= 1;
      a.head += 1;
      const base = (a.head % ROWS) * COLS;
      for (let c = 0; c < COLS; c++) spec.data[base + c] = Math.round(sm[c] * 255);
      wrote = true;
    }
    if (wrote) spec.tex.needsUpdate = true;
    shared.uHead.value = a.head;
    shared.uNow.value = a.head + a.acc;

    // 3. Band envelopes → line width, peak brightness, sound ring.
    for (const k of BAND_KEYS) {
      const rate = raw[k] > a.env[k] ? ATTACK : RELEASE;
      a.env[k] += (raw[k] - a.env[k]) * (1 - Math.exp(-rate * dt));
      a.slow[k] += (a.env[k] - a.slow[k]) * (1 - Math.exp(-SLOW_RATE * dt));
      a.peak[k] = Math.max(a.peak[k] * Math.exp(-PEAK_DECAY * dt), a.env[k] - a.slow[k], 0.02);
      const target = playing ? agcLevel(a.env[k], a.slow[k], a.peak[k]) : 0;
      a.out[k] += (target - a.out[k]) * (1 - Math.exp(-(playing ? 30 : 3) * dt));
    }
    shared.uMid.value = a.out.mid;
    shared.uHigh.value = a.out.high;
    cycleColors(t, shared.uBase.value, shared.uPeak.value);

    // 4. The CSS ring/horizon outside the canvas follow the same envelopes.
    const scene = sceneRef?.current;
    if (scene) {
      scene.style.setProperty("--bass", a.out.bass.toFixed(3));
      scene.style.setProperty("--high", a.out.high.toFixed(3));

      // Bass onset (rising through 0.6, at most ~3 per second) emits a wavefront from the ring.
      a.sinceOnset += dt;
      if (playing && a.out.bass > 0.6 && a.prevBass <= 0.6 && a.sinceOnset > 0.3) {
        a.pulses[a.nextPulse] = 0;
        a.nextPulse = (a.nextPulse + 1) % a.pulses.length;
        a.sinceOnset = 0;
      }
      a.prevBass = a.out.bass;

      if (!pulseEls.current) pulseEls.current = scene.querySelectorAll(".sound-ring-pulse");
      const PULSE_LIFE = 1.6;
      a.pulses.forEach((age, i) => {
        const el = pulseEls.current[i];
        if (!el || age < 0) return;
        const next = age + dt;
        const k = next / PULSE_LIFE;
        if (k >= 1) {
          a.pulses[i] = -1;
          el.style.opacity = "0";
          return;
        }
        a.pulses[i] = next;
        el.style.transform = `scale(${(1 + k * 0.9).toFixed(3)})`;
        el.style.opacity = ((1 - k) * (1 - k) * 0.8).toFixed(3);
      });
    }
  });

  return (
    <group>
      {/* Ceiling: the same sound, hanging downward as a softer reflection */}
      <WaveMesh position={[0, 300, -1200]} rotation={[1.6, 0, -Math.PI]} dir={1} scale={isMobile ? 28 : 62} size={size} isMobile={isMobile} shared={shared} />
      {/* Floor: the spectrum rises as mountains */}
      <WaveMesh position={[0, -300, -1200]} rotation={[1.6, 0, Math.PI]} dir={-1} scale={isMobile ? 80 : 125} size={size} isMobile={isMobile} shared={shared} />
    </group>
  );
};

// Compiles shaders asynchronously (KHR_parallel_shader_compile) so the main thread
// is not blocked, then reveals the canvas after two real rendered frames.
const FadeInController = ({ wrapperRef, onReady }) => {
  const { gl, scene, camera } = useThree();
  const compiled = useRef(false);
  const framesAfterCompile = useRef(0);
  const revealed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    console.info("[Waves] Async shader compile started.");
    const compile = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve();
    compile
      .catch((err) => {
        console.error("[Waves] compileAsync failed, continuing anyway:", err?.message, { gl: gl.info?.programs?.length });
      })
      .finally(() => {
        if (cancelled) return;
        compiled.current = true;
        console.info(`[Waves] Async shader compile finished in ${(performance.now() - start).toFixed(0)}ms.`);
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  useFrame(() => {
    if (revealed.current || !compiled.current) return;
    framesAfterCompile.current += 1;
    if (framesAfterCompile.current < 2) return;
    revealed.current = true;
    if (wrapperRef.current) wrapperRef.current.style.opacity = "1";
    onReady?.();
    console.info("[Waves] Canvas revealed after shader warm-up.");
  });

  return null;
};

const WavesCanvas = ({ onReady, audioElement }) => {
  const wrapperRef = useRef(null);
  // Holds the CSS sound ring + horizon; Waves writes --bass/--high on it every frame.
  const sceneRef = useRef(null);
  const [size, setSize] = useState(window.innerWidth);
  const [mobile, setMobile] = useState(isMobileDevice);
  const [waveReady, setWaveReady] = useState(false);
  const [dprMax, setDprMax] = useState(mobile ? 1 : 2);

  useEffect(() => {
    // If WebGL is not supported, notify the parent immediately
    // so we do not trap the page text in an invisible state.
    if (!isWebGLAvailable()) {
      console.warn("[WavesCanvas] WebGL not supported, firing onReady immediately.");
      onReady?.();
    }
  }, [onReady]);

  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setSize(window.innerWidth);
        setMobile(isMobileDevice());
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleReady = useCallback(() => {
    setWaveReady(true);
    onReady?.();
  }, [onReady]);

  return (
    <WebGLGuard>
      {/* Loading indicator — visible while waves are initializing */}
      {!waveReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <div className="wave-loader" />
        </div>
      )}

      <div
        ref={wrapperRef}
        style={{
          opacity: 0,
          transition: "opacity 0.5s ease",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Sound ring on the floor's horizon: a thin outline that emits a wavefront on every bass hit
            (pure CSS elements, animated from the Waves frame loop; no extra WebGL work) */}
        <div ref={sceneRef} className="retro-scene" aria-hidden="true">
          <div className="sound-ring-wrap">
            <div className="sound-ring" />
            <div className="sound-ring-pulse" />
            <div className="sound-ring-pulse" />
            <div className="sound-ring-pulse" />
          </div>
          <div className="retro-horizon" />
        </div>
        <Canvas
          style={{ position: "absolute", inset: 0 }}
          dpr={[1, mobile ? 1 : dprMax]}
          camera={{ near: 0.01, far: 1200, position: [0, 0, 0] }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <PerformanceMonitor
            onDecline={() => {
              console.warn("[Waves] Performance decline detected, lowering DPR to 1.");
              setDprMax(1);
            }}
          />
          <Waves size={size} isMobile={mobile} audioElement={audioElement} sceneRef={sceneRef} />
          <FadeInController wrapperRef={wrapperRef} onReady={handleReady} />
        </Canvas>
      </div>
    </WebGLGuard>
  );
};

export default WavesCanvas;
