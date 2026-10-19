import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise3D } from 'simplex-noise';
import WebGLGuard from './WebGLGuard';
import useInView from '../../hooks/useInView';
import { clamp, maxSphereRadius, softClampRadius } from './sphereMath';

// Helper functions
const fractionate = (val, minVal, maxVal) => {
  return (val - minVal) / (maxVal - minVal);
};

const modulate = (val, minVal, maxVal, outMin, outMax) => {
  const fr = fractionate(val, minVal, maxVal);
  const delta = outMax - outMin;
  return outMin + (fr * delta);
};

const avg = (arr) => {
  const total = arr.reduce((sum, b) => sum + b);
  return (total / arr.length);
};

const max = (arr) => {
  return arr.reduce((a, b) => Math.max(a, b));
};

const retroWaveColors = ["#2de2e6", "#035ee8", "#f6019d", "#d40078", "#9700cc", "#ffd319", "#ff901f", "#ff2975", "#c700b5", "#b000ff"];

// FIX: Reusable THREE.Color instances — no allocations per frame
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const interpolateColor = (color1, color2, factor) => {
  _c1.set(color1);
  _c2.set(color2);
  return _c1.lerp(_c2, factor);
};

// FIX: Reusable Vector3 — avoids heap allocation per vertex per frame
const _vertex = new THREE.Vector3();

// Procedural studio lighting for the water look: gives the glossy surface something to reflect
// without downloading an HDR from a CDN.
const WaterEnvironment = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

// Indexed (welded) icosphere: vertices are shared, so computeVertexNormals() yields smooth shading.
// The default non-indexed one would look faceted, which is wrong for liquid.
const WATER_RADIUS = 20;
const WATER_AMP = 0.3;

const createWaterGeometry = () => {
  const geo = new THREE.IcosahedronGeometry(WATER_RADIUS, 10);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const welded = mergeVertices(geo);
  welded.computeVertexNormals();
  geo.dispose();
  return welded;
};

// material: "wire" (retro wireframe, default) | "water" (glossy liquid sphere)
export const Sphere = ({ analyser, material = 'wire' }) => {
  const isWater = material === 'water';
  const waterGeometry = useMemo(() => (isWater ? createWaterGeometry() : null), [isWater]);
  useEffect(() => () => waterGeometry?.dispose(), [waterGeometry]);

  const meshRef = useRef();
  const materialRef = useRef();
  const noise3D = useRef(createNoise3D());
  const clock = useMemo(() => new THREE.Clock(), []);
  const dataArrayRef = useRef(null);
  const [isAudioConnected, setIsAudioConnected] = useState(false);

  useEffect(() => {
    if (analyser) {
      setIsAudioConnected(true);
      console.info("[AudioVisualizer] Audio analyser linked to Sphere.");
    }
  }, [analyser]);

  const warpSphere = (mesh, bassFr, midFr, treFr, maxRadius = Infinity, ampScale = 1) => {
    const pos = mesh.geometry.attributes.position;

    // The welded water geometry has no `parameters`, so fall back to its known radius.
    const offset = mesh.geometry.parameters?.radius ?? WATER_RADIUS;
    // Water uses gentler swells: the original amplitude folds the surface over itself (crumpled-plastic look).
    const amp = 5 * ampScale;
    const time = window.performance.now();
    const rf = 0.00001;

    for (let i = 0; i < pos.count; i++) {
      _vertex.fromBufferAttribute(pos, i);
      _vertex.normalize();

      const raw = (offset + bassFr) +
        noise3D.current(
          _vertex.x + time * rf * 4,
          _vertex.y + time * rf * 6,
          _vertex.z + time * rf * 7
        ) * amp * (treFr * 2 + midFr);
      const distance = softClampRadius(raw, offset, maxRadius);

      _vertex.multiplyScalar(distance);
      pos.setXYZ(i, _vertex.x, _vertex.y, _vertex.z);
    }

    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  };

  useFrame((state) => {
    if (!meshRef.current) return;
    // The water sphere must never leave its canvas, however loud the audio is.
    let maxRadius = Infinity;
    if (isWater) {
      const fits = maxSphereRadius(state.camera.position.z, state.camera.fov, state.size.width / state.size.height);
      // Very narrow canvases cannot even hold the resting sphere: shrink it, and bound the swell in local units.
      const fit = Math.min(1, fits / (WATER_RADIUS * 1.25));
      meshRef.current.scale.setScalar(fit);
      maxRadius = fits / fit;
    }

    // Always rotate (and, for the wire look, cycle color)
    meshRef.current.rotation.x += 0.001;
    meshRef.current.rotation.y += 0.003;
    meshRef.current.rotation.z += 0.005;

    if (!isWater) {
      const time = clock.getElapsedTime() * 0.1;
      const colorIndex1 = Math.floor(time % retroWaveColors.length);
      const colorIndex2 = (colorIndex1 + 1) % retroWaveColors.length;
      const color = interpolateColor(retroWaveColors[colorIndex1], retroWaveColors[colorIndex2], time % 1);
      if (materialRef.current) materialRef.current.color = color;
    }

    // Frequency-driven deformation only when audio is active
    if (!analyser || !isAudioConnected) {
      // Water keeps a gentle ripple at rest so it reads as a living liquid, not a frozen ball.
      if (isWater) warpSphere(meshRef.current, 0, 0.1, 0.06, maxRadius, WATER_AMP);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;

    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Uint8Array(bufferLength);
    }
    analyser.getByteFrequencyData(dataArrayRef.current);
    const dataArray = dataArrayRef.current;

    const lowerHalf = dataArray.slice(0, bufferLength / 4);
    const midRange = dataArray.slice(bufferLength / 4, (bufferLength / 4) * 3);
    const upperHalf = dataArray.slice((bufferLength / 4) * 3, bufferLength);

    const lowerMaxFr = max(lowerHalf) / lowerHalf.length;
    const midAvgFr   = avg(midRange)  / midRange.length;
    const upperAvgFr = avg(upperHalf) / upperHalf.length;

    // modulate() extrapolates past its range for loud input; bound each band to its intended range
    // for the water sphere (the wireframe one keeps its original behaviour).
    const bound = (v, hi) => (isWater ? clamp(v, 0, hi) : v);
    warpSphere(
      meshRef.current,
      bound(modulate(lowerMaxFr * 2, 0, 1, 0, 5), 5),
      bound(modulate(midAvgFr   * 1.6, 0, 1, 0, 4), 4),
      bound(modulate(upperAvgFr * 1.4, 0, 1, 0, 3), 3),
      maxRadius,
      isWater ? WATER_AMP : 1
    );
  });

  if (isWater) {
    return (
      <>
        <WaterEnvironment />
        <directionalLight position={[40, 60, 80]} intensity={1.2} />
        <mesh ref={meshRef} geometry={waterGeometry}>
          <meshPhysicalMaterial
            ref={materialRef}
            color="#1f9bff"
            emissive="#0359c4"
            emissiveIntensity={0.3}
            roughness={0.03}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.02}
            envMapIntensity={1.3}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </>
    );
  }

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[20, 12]} />
      <meshBasicMaterial
        ref={materialRef}
        wireframe={true}
        wireframeLinewidth={1}
      />
    </mesh>
  );
};

export const AudioVisualizer = ({ audioElement }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [viewRef, inView] = useInView();
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const [isAudioReady, setIsAudioReady] = useState(false);

  useEffect(() => {
    if (!audioElement) return;

    const initializeAudio = async () => {
      // Guard: don't double-connect the same element
      if (sourceRef.current) {
        console.warn("[AudioVisualizer] Audio source already connected, skipping.");
        return;
      }

      try {
        // FIX: Set crossOrigin BEFORE any audio context operations
        audioElement.crossOrigin = "anonymous";

        contextRef.current = new AudioContext();
        analyserRef.current = contextRef.current.createAnalyser();
        sourceRef.current = contextRef.current.createMediaElementSource(audioElement);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(contextRef.current.destination);
        analyserRef.current.fftSize = 1024;
        setIsAudioReady(true);
        console.info("[AudioVisualizer] Audio context initialized successfully.");
      } catch (error) {
        console.error('[AudioVisualizer] Error initializing audio:', error);
      }
    };

    initializeAudio();

    return () => {
      if (contextRef.current) {
        contextRef.current.close().catch((err) => {
          console.warn("[AudioVisualizer] Error closing AudioContext:", err);
        });
        contextRef.current = null;
        sourceRef.current = null;
      }
    };
  }, [audioElement]);

  // FIX: Use { once: true } to avoid stacking listeners on every re-render
  useEffect(() => {
    if (!contextRef.current) return;

    const handleUserInteraction = async () => {
      if (!contextRef.current || contextRef.current.state === 'running') return;
      try {
        await contextRef.current.resume();
        console.info("[AudioVisualizer] Audio context resumed after user interaction.");
      } catch (error) {
        console.error('[AudioVisualizer] Error resuming audio context:', error);
      }
    };

    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [audioElement]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 500px)");
    setIsMobile(mediaQuery.matches);

    const handleMediaQueryChange = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    console.info("[AudioVisualizer] Canvas mounted with OrbitControls enabled.");

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  return (
    <div ref={viewRef} style={{ width: "100%", height: "100%" }}>
    {inView && (
    <WebGLGuard>
      <Canvas
        shadows
        camera={{
          position: [0, 0, 100],
          fov: isMobile ? 65 : 80,
        }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 50, 100]} intensity={0.8} />
        <Sphere analyser={isAudioReady ? analyserRef.current : null} />
        <OrbitControls enableZoom={false} enablePan={false} />
        <Preload all />
      </Canvas>
    </WebGLGuard>
    )}
    </div>
  );
};

export default AudioVisualizer;