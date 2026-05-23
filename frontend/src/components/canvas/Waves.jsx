import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import WebGLGuard from "./WebGLGuard";

const retroWaveColors = ["#2de2e6", "#035ee8", "#f6019d", "#d40078", "#9700cc", "#ffd319", "#ff901f", "#ff2975", "#c700b5", "#b000ff"];

// FIX: Reusable color instances to avoid per-frame allocations
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const interpolateColor = (color1, color2, factor) => {
  _c1.set(color1);
  _c2.set(color2);
  return _c1.lerp(_c2, factor).getStyle();
};

const isMobileDevice = () => window.innerWidth < 768;

const WaveMesh = ({ position, rotation, factor, speed, scale, size, isMobile }) => {
  const meshRef = useRef();
  const simplex = useMemo(() => createNoise2D(), []);
  const { clock } = useThree();

  // Wall-clock offset so the noise cycle is never near 0 on mount.
  const timeOffset = useMemo(() => performance.now() / 1000, []);

  const segmentsX = isMobile ? 60 : 180;
  const segmentsY = isMobile ? 40 : 90;

  const getGeometrySize = (windowWidth, windowHeight) => {
    if (windowWidth <= 950 && windowHeight <= 450) {
      return { width: size * 4.5, height: size * 2 };
    } else if (windowWidth <= 750 && windowHeight <= 600) {
      return { width: size * 5, height: size * 2 };
    } else if (windowWidth <= 350) {
      return { width: size * 3, height: size * 6 };
    } else if (windowWidth <= 900) {
      return { width: size * 3, height: size * 5 };
    } else if (windowWidth <= 1700) {
      return { width: size * 2.8, height: size * 2 };
    } else {
      return { width: size * 3, height: size };
    }
  };

  const { width, height } = getGeometrySize(size, window.innerHeight);

  // Create geometry with wave shape PRE-BAKED so it is NEVER flat,
  // not even on frame 0 before the first useFrame runs.
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    const cycle = timeOffset * speed;
    const verts = geo.attributes.position.array;
    for (let i = 0; i < verts.length; i += 3) {
      verts[i + 2] = simplex(verts[i] / factor, verts[i + 1] / factor + cycle) * scale;
    }
    geo.attributes.position.needsUpdate = true;
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, segmentsX, segmentsY]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const geo = meshRef.current?.geometry;
    if (!geo) return;

    const cycle = (timeOffset + clock.elapsedTime) * speed;
    const vertices = geo.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 2] = simplex(vertices[i] / factor, vertices[i + 1] / factor + cycle) * scale;
    }
    geo.attributes.position.needsUpdate = true;

    const time = (timeOffset + clock.elapsedTime) * 0.1;
    const colorIndex1 = Math.floor(time % retroWaveColors.length);
    const colorIndex2 = (colorIndex1 + 1) % retroWaveColors.length;
    const t = time % 1;

    const interpolatedColor = interpolateColor(retroWaveColors[colorIndex1], retroWaveColors[colorIndex2], t);
    meshRef.current.material.color.set(interpolatedColor);
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} geometry={geometry}>
      <meshBasicMaterial wireframe={true} />
    </mesh>
  );
};

const Waves = ({ size, isMobile }) => (
  <group>
    <WaveMesh
      position={[0, 300, -1200]}
      rotation={[1.6, 0, -Math.PI]}
      factor={400}
      speed={0.3}
      scale={50}
      size={size}
      isMobile={isMobile}
    />
    <WaveMesh
      position={[0, -300, -1200]}
      rotation={[1.6, 0, Math.PI]}
      factor={400}
      speed={0.3}
      scale={50}
      size={size}
      isMobile={isMobile}
    />
  </group>
);

// Runs inside the R3F render loop. Only fades in the wrapper AFTER
// the render loop has been running long enough for the waves to be
// visibly animating — guaranteeing the user never sees a frozen mesh.
const FadeInController = ({ wrapperRef, onReady }) => {
  const revealed = useRef(false);
  const { gl, scene, camera, clock } = useThree();

  // Force shader compilation synchronously so the GPU pipeline is
  // primed before the first rendered frame.
  useMemo(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);

  useFrame(() => {
    // Wait until R3F has been animating for at least 0.6s.
    // This ensures multiple real GPU frames have been rendered
    // with the wave already in motion — 0.4s was too aggressive
    // for slower GPUs during cold shader compilation.
    if (!revealed.current && clock.elapsedTime > 0.6) {
      revealed.current = true;
      if (wrapperRef.current) {
        wrapperRef.current.style.opacity = "1";
      }
      // Signal the parent that waves are visible
      onReady?.();
      console.info('[Waves] Canvas revealed after shader warm-up.');
    }
  });

  return null;
};

const WavesCanvas = () => {
  const wrapperRef = useRef(null);
  const [size, setSize] = useState(window.innerWidth);
  const [mobile, setMobile] = useState(isMobileDevice);
  const [waveReady, setWaveReady] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSize(window.innerWidth);
      setMobile(isMobileDevice());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
          dpr={mobile ? [1, 1] : [1, 2]}
          camera={{ near: 0.01, far: 1200, position: [0, 0, 0] }}
          gl={{ antialias: false }}
        >

          <Waves size={size} isMobile={mobile} />
          <FadeInController wrapperRef={wrapperRef} onReady={() => setWaveReady(true)} />
          <Preload all />
        </Canvas>
      </div>
    </WebGLGuard>
  );
};

export default WavesCanvas;