import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

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

const Sphere = ({ analyser }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const noise3D = useRef(createNoise3D());
  const clock = useMemo(() => new THREE.Clock(), []);
  const dataArrayRef = useRef(null);
  const [isAudioConnected, setIsAudioConnected] = useState(false);

  useEffect(() => {
    if (analyser) {
      setIsAudioConnected(true);
    }
  }, [analyser]);

  const warpSphere = (mesh, bassFr, midFr, treFr) => {
    const pos = mesh.geometry.attributes.position;

    const offset = mesh.geometry.parameters.radius * 1;
    const amp = 5;
    const time = window.performance.now();
    const rf = 0.00001;

    for (let i = 0; i < pos.count; i++) {
      _vertex.fromBufferAttribute(pos, i);
      _vertex.normalize();

      const distance = (offset + bassFr) +
        noise3D.current(
          _vertex.x + time * rf * 4,
          _vertex.y + time * rf * 6,
          _vertex.z + time * rf * 7
        ) * amp * (treFr * 2 + midFr);

      _vertex.multiplyScalar(distance);
      pos.setXYZ(i, _vertex.x, _vertex.y, _vertex.z);
    }

    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  };

  useFrame(() => {
    if (!meshRef.current) return;

    // Always rotate and cycle color
    meshRef.current.rotation.x += 0.001;
    meshRef.current.rotation.y += 0.003;
    meshRef.current.rotation.z += 0.005;

    const time = clock.getElapsedTime() * 0.1;
    const colorIndex1 = Math.floor(time % retroWaveColors.length);
    const colorIndex2 = (colorIndex1 + 1) % retroWaveColors.length;
    const color = interpolateColor(retroWaveColors[colorIndex1], retroWaveColors[colorIndex2], time % 1);
    if (materialRef.current) materialRef.current.color = color;

    // Frequency-driven deformation only when audio is active
    if (!analyser || !isAudioConnected) return;

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

    warpSphere(
      meshRef.current,
      modulate(lowerMaxFr * 2, 0, 1, 0, 5),
      modulate(midAvgFr   * 1.6, 0, 1, 0, 4),
      modulate(upperAvgFr * 1.4, 0, 1, 0, 3)
    );
  });

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

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  return (
    <Canvas
      shadows
      camera={{
        position: [0, 0, 100],
        fov: isMobile ? 65 : 80,
      }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[0, 50, 100]} intensity={0.8} />
      <Sphere analyser={isAudioReady ? analyserRef.current : null} />
      <Preload all />
    </Canvas>
  );
};

export default AudioVisualizer;