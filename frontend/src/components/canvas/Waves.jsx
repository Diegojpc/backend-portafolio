import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

const retroWaveColors = ["#2de2e6", "#035ee8", "#f6019d", "#d40078", "#9700cc", "#ffd319", "#ff901f", "#ff2975", "#c700b5", "#b000ff"];

// FIX: Reusable color instances to avoid per-frame allocations
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const interpolateColor = (color1, color2, factor) => {
  _c1.set(color1);
  _c2.set(color2);
  return _c1.lerp(_c2, factor).getStyle();
};

const WaveMesh = ({ position, rotation, factor, speed, scale, size }) => {
  const meshRef = useRef();
  const geometryRef = useRef();
  const simplex = useMemo(() => createNoise2D(), []);
  // FIX: Use R3F's shared clock instead of global THREE.Clock
  // This avoids the getDelta() bug where two WaveMeshes share one clock
  const { clock } = useThree();

  useFrame(() => {
    const cycle = clock.elapsedTime * speed;

    const vertices = geometryRef.current.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const xoff = vertices[i] / factor;
      const yoff = vertices[i + 1] / factor + cycle;
      const rand = simplex(xoff, yoff) * scale;
      vertices[i + 2] = rand;
    }
    geometryRef.current.attributes.position.needsUpdate = true;

    // Change color over time for a retro wave effect
    const time = clock.elapsedTime * 0.1;
    const colorIndex1 = Math.floor(time % retroWaveColors.length);
    const colorIndex2 = (colorIndex1 + 1) % retroWaveColors.length;
    const t = time % 1;

    const interpolatedColor = interpolateColor(retroWaveColors[colorIndex1], retroWaveColors[colorIndex2], t);
    meshRef.current.material.color.set(interpolatedColor);
  });

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

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry ref={geometryRef} args={[width, height, 200, 100]} />
      <meshLambertMaterial 
        wireframe={true}
      />
    </mesh>
  );
};

const Waves = ({ size }) => (
  <group>
    <WaveMesh
      position={[0, 300, -1200]}
      rotation={[1.6, 0, -Math.PI]}
      factor={400}
      speed={0.3}
      scale={50}
      size={size}
    />
    <WaveMesh
      position={[0, -300, -1200]}
      rotation={[1.6, 0, Math.PI]}
      factor={400}
      speed={0.3}
      scale={50}
      size={size}
    />
  </group>
);

const WavesCanvas = () => {
  const [size, setSize] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setSize(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ near: 0.01, far: 1200, position: [0, 0, 0] }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <ambientLight intensity={1.2} />
      <Waves size={size} />
      <Preload all />
    </Canvas>
  );
};

export default WavesCanvas;