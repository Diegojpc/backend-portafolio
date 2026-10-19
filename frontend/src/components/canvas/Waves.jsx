import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import WebGLGuard from "./WebGLGuard";
import { isWebGLAvailable } from "../../utils/webglSupport";

const retroWaveColors = ["#2de2e6", "#035ee8", "#f6019d", "#d40078", "#9700cc", "#ffd319", "#ff901f", "#ff2975", "#c700b5", "#b000ff"]
  .map((hex) => new THREE.Color(hex));

// Reusable instance: no per-frame allocations, no CSS string parsing.
const _tmpColor = new THREE.Color();

const isMobileDevice = () => window.innerWidth < 768;

// Displacement runs on the GPU. 2D simplex noise by Ian McEwan / Stefan Gustavson (MIT).
const vertexShader = /* glsl */ `
  uniform vec2 uSize;
  uniform float uFactor;
  uniform float uScale;
  uniform float uCycle;
  uniform vec2 uSeed;

  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Unit plane scaled to world size here (not via mesh.scale) so z is not scaled too.
    vec2 p = position.xy * uSize;
    float z = snoise(p / uFactor + vec2(0.0, uCycle) + uSeed) * uScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, z, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
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

const WaveMesh = ({ position, rotation, factor, speed, scale, size, isMobile, seed, colorRef }) => {
  const meshRef = useRef();
  const { clock } = useThree();

  // Wall-clock offset so the noise cycle is never near 0 on mount.
  const timeOffset = useMemo(() => performance.now() / 1000, []);

  const segmentsX = isMobile ? 60 : 128;
  const segmentsY = isMobile ? 40 : 64;

  // Flat unit plane: no CPU vertex work at mount, rebuilt only when density changes.
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY),
    [segmentsX, segmentsY]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        wireframe: true,
        vertexShader,
        fragmentShader,
        uniforms: {
          uSize: { value: new THREE.Vector2(1, 1) },
          uFactor: { value: factor },
          uScale: { value: scale },
          uCycle: { value: 0 },
          uSeed: { value: new THREE.Vector2(seed, seed * 1.7) },
          uColor: { value: new THREE.Color() },
        },
      }),
    [factor, scale, seed]
  );
  useEffect(() => () => material.dispose(), [material]);

  // Resize only touches a uniform; geometry is not rebuilt.
  useEffect(() => {
    const [w, h] = getGeometrySize(size, window.innerHeight, size);
    material.uniforms.uSize.value.set(w, h);
  }, [size, material]);

  useFrame(() => {
    const t = timeOffset + clock.elapsedTime;
    material.uniforms.uCycle.value = t * speed;
    material.uniforms.uColor.value.copy(colorRef.current);
  });

  return <mesh ref={meshRef} position={position} rotation={rotation} geometry={geometry} material={material} frustumCulled={false} />;
};

// One color interpolation per frame shared by both meshes.
const ColorDriver = ({ colorRef, timeOffset }) => {
  const { clock } = useThree();
  useFrame(() => {
    const time = (timeOffset + clock.elapsedTime) * 0.1;
    const i1 = Math.floor(time % retroWaveColors.length);
    const i2 = (i1 + 1) % retroWaveColors.length;
    colorRef.current.copy(retroWaveColors[i1]).lerp(_tmpColor.copy(retroWaveColors[i2]), time % 1);
  });
  return null;
};

const Waves = ({ size, isMobile }) => {
  const colorRef = useRef(new THREE.Color(retroWaveColors[0]));
  const timeOffset = useMemo(() => performance.now() / 1000, []);
  return (
    <group>
      <ColorDriver colorRef={colorRef} timeOffset={timeOffset} />
      <WaveMesh
        position={[0, 300, -1200]}
        rotation={[1.6, 0, -Math.PI]}
        factor={400}
        speed={0.3}
        scale={50}
        size={size}
        isMobile={isMobile}
        seed={3.1}
        colorRef={colorRef}
      />
      <WaveMesh
        position={[0, -300, -1200]}
        rotation={[1.6, 0, Math.PI]}
        factor={400}
        speed={0.3}
        scale={50}
        size={size}
        isMobile={isMobile}
        seed={17.4}
        colorRef={colorRef}
      />
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

const WavesCanvas = ({ onReady }) => {
  const wrapperRef = useRef(null);
  const [size, setSize] = useState(window.innerWidth);
  const [mobile, setMobile] = useState(isMobileDevice);
  const [waveReady, setWaveReady] = useState(false);
  const [dprMax, setDprMax] = useState(mobile ? 1 : 1.5);

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
        }}
      >
        <Canvas
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
          <Waves size={size} isMobile={mobile} />
          <FadeInController wrapperRef={wrapperRef} onReady={handleReady} />
        </Canvas>
      </div>
    </WebGLGuard>
  );
};

export default WavesCanvas;
