import { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise3D } from 'simplex-noise';
import WebGLGuard from './WebGLGuard';
import useLazyCanvas from '../../hooks/useLazyCanvas';
import { clamp, maxSphereRadius, softClampRadius } from './sphereMath';
import { getAudioGraph, SpectrumFollower } from '../../utils/audioGraph';
import { cycleColors } from '../../utils/palette';

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

// Same colour cycle as the hero mesh (utils/palette.js): belts lifted by the sound get a brighter tint.
const BASE_COLOR = new THREE.Color();
const PEAK_COLOR = new THREE.Color();
const _mixColor = new THREE.Color();

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

// Spectral sphere (wire look): latitude = frequency. The equator (the widest ring, where the music has
// most energy) carries the bass, and the bands climb log-spaced toward both poles (highs), so every part
// of the spectrum sculpts its own belt of the sphere and the whole range is visible at once.
const SPECTRAL_COLS = 64;
const SPECTRAL_AMP = 14;     // world units a fully driven band pushes its belt outward
const SPECTRAL_BASE = 4;     // extra resting radius, keeps the old on-screen size
const BASS_COLS = 8;         // first columns averaged as "bass" for the global swell
const HIGH_COLS = 16;        // last columns averaged as "highs" for the surface shimmer
const REST_RADIUS = 20 + SPECTRAL_BASE;          // icosahedron radius + resting offset
const REST_VALUES = new Float32Array(SPECTRAL_COLS); // silence: the surface only breathes with the noise
const DEFAULT_FREQ_RANGE = [35, 12500];

// material: "wire" (retro wireframe, default) | "water" (glossy liquid sphere)
// fit: keep the sphere inside its canvas however loud it gets (small panels, e.g. the voice call).
// freqRange: [fMin, fMax] in Hz mapped from equator to poles (voice uses a narrower range than music).
export const Sphere = ({ analyser, material = 'wire', fit = false, freqRange = DEFAULT_FREQ_RANGE }) => {
  const isWater = material === 'water';
  const waterGeometry = useMemo(() => (isWater ? createWaterGeometry() : null), [isWater]);
  useEffect(() => () => waterGeometry?.dispose(), [waterGeometry]);

  const meshRef = useRef();
  const materialRef = useRef();
  const noise3D = useRef(createNoise3D());
  const dataArrayRef = useRef(null);
  const spectralRef = useRef(null);
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

  // Wire look: each vertex is pushed out by the spectrum value of its latitude band.
  const warpSpectral = (mesh, values, maxRadius = Infinity) => {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    if (!geo.attributes.color) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    const col = geo.attributes.color;
    const radius = mesh.geometry.parameters.radius;
    const last = SPECTRAL_COLS - 1;
    let bass = 0;
    for (let c = 0; c < BASS_COLS; c++) bass += values[c];
    bass /= BASS_COLS;
    let high = 0;
    for (let c = SPECTRAL_COLS - HIGH_COLS; c < SPECTRAL_COLS; c++) high += values[c];
    high /= HIGH_COLS;
    const t = window.performance.now() * 0.00004;
    cycleColors(window.performance.now() / 1000, BASE_COLOR, PEAK_COLOR);

    for (let i = 0; i < pos.count; i++) {
      _vertex.fromBufferAttribute(pos, i).normalize();
      // 0 at the equator (bass) → 1 at either pole (highs), interpolated between bands.
      const x = Math.abs(_vertex.y) * last;
      const i0 = x | 0;
      const fr = x - i0;
      const band = values[i0] * (1 - fr) + values[Math.min(i0 + 1, last)] * fr;
      const nz = noise3D.current(_vertex.x * 1.5 + t, _vertex.y * 1.5 + t * 1.3, _vertex.z * 1.5 + t * 1.7);
      // Noise breaks the belts up along the longitude so they read as terrain, not rings.
      const raw = radius + SPECTRAL_BASE + bass * 3 + band * SPECTRAL_AMP * (0.75 + 0.25 * nz) + nz * (0.5 + high * 2.5);
      const r = softClampRadius(raw, REST_RADIUS, maxRadius);
      _vertex.multiplyScalar(r);
      pos.setXYZ(i, _vertex.x, _vertex.y, _vertex.z);
      // Only the strongest belts reach the bright tint, as in the hero mesh.
      const hot = THREE.MathUtils.smoothstep(band, 0.45, 0.95);
      _mixColor.copy(BASE_COLOR).lerp(PEAK_COLOR, hot);
      col.setXYZ(i, _mixColor.r, _mixColor.g, _mixColor.b);
    }
    pos.needsUpdate = true; // wireframe + basic material: no normals needed
    col.needsUpdate = true;
  };

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    // The water sphere must never leave its canvas, however loud the audio is.
    let maxRadius = Infinity;
    if (isWater || fit) {
      const fits = maxSphereRadius(state.camera.position.z, state.camera.fov, state.size.width / state.size.height);
      // Very narrow canvases cannot even hold the resting sphere: shrink it, and bound the swell in local units.
      const rest = isWater ? WATER_RADIUS : REST_RADIUS;
      const scale = Math.min(1, fits / (rest * 1.25));
      meshRef.current.scale.setScalar(scale);
      maxRadius = fits / scale;
    }

    meshRef.current.rotation.x += 0.001;
    meshRef.current.rotation.y += 0.003;
    meshRef.current.rotation.z += 0.005;

    // Frequency-driven deformation only when audio is active
    if (!analyser || !isAudioConnected) {
      // At rest both looks keep breathing so the sphere never reads as frozen.
      if (isWater) warpSphere(meshRef.current, 0, 0.1, 0.06, maxRadius, WATER_AMP);
      else warpSpectral(meshRef.current, REST_VALUES, maxRadius);
      return;
    }

    if (!isWater) {
      if (!spectralRef.current || spectralRef.current.analyser !== analyser) {
        spectralRef.current = new SpectrumFollower(analyser, analyser.context.sampleRate, SPECTRAL_COLS, {
          blurPasses: 1, attack: 22, release: 6, fMin: freqRange[0], fMax: freqRange[1],
        });
        console.info('[AudioVisualizer] Spectral sphere active', { bands: SPECTRAL_COLS, freqRange });
      }
      warpSpectral(meshRef.current, spectralRef.current.update(Math.min(delta, 0.1)), maxRadius);
      return;
    }

    // Water sphere (voice call avatar): original band behaviour, unchanged.
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

    // modulate() extrapolates past its range for loud input; bound each band to its intended range.
    const bound = (v, hi) => clamp(v, 0, hi);
    warpSphere(
      meshRef.current,
      bound(modulate(lowerMaxFr * 2, 0, 1, 0, 5), 5),
      bound(modulate(midAvgFr   * 1.6, 0, 1, 0, 4), 4),
      bound(modulate(upperAvgFr * 1.4, 0, 1, 0, 3), 3),
      maxRadius,
      WATER_AMP
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
      {/* Small fitted panels (voice call) get a coarser mesh so the wire still reads as wire */}
      <icosahedronGeometry args={[20, fit ? 6 : 12]} />
      <meshBasicMaterial
        ref={materialRef}
        wireframe={true}
        wireframeLinewidth={1}
        vertexColors
      />
    </mesh>
  );
};

export const AudioVisualizer = ({ audioElement }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [viewRef, mounted, visible] = useLazyCanvas({ rootMargin: '800px', warmupMs: 7500 });
  const contextRef = useRef(null);
  const analyserRef = useRef(null);
  const [isAudioReady, setIsAudioReady] = useState(false);

  // The analyser comes from the shared graph (utils/audioGraph.js): the hero waves read the same one,
  // and an <audio> element can be wired into Web Audio only once. The graph lives for the whole page,
  // so it is not closed on unmount; it also resumes its own AudioContext on play / first interaction.
  useEffect(() => {
    if (!audioElement) return;
    const graph = getAudioGraph(audioElement);
    if (!graph) return;
    contextRef.current = graph.context;
    analyserRef.current = graph.analyser;
    setIsAudioReady(true);
    console.info("[AudioVisualizer] Audio context initialized successfully (shared graph).");
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
    {mounted && (
    <Suspense fallback={null}>
    <WebGLGuard>
      <Canvas
        shadows
        camera={{
          position: [0, 0, 100],
          fov: isMobile ? 65 : 80,
        }}
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'demand'}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 50, 100]} intensity={0.8} />
        {/* Keep any pending load inside the canvas: see TechIconCardExperience.jsx */}
        <Suspense fallback={null}>
          <Sphere analyser={isAudioReady ? analyserRef.current : null} />
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} />
        <Preload all />
      </Canvas>
    </WebGLGuard>
    </Suspense>
    )}
    </div>
  );
};

export default AudioVisualizer;