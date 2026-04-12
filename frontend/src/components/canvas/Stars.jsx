import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Preload } from "@react-three/drei";

import * as THREE from 'three';

// Función personalizada para generar puntos dentro de una esfera
function generatePointsInSphere(count, radius) {
  const points = new Float32Array(count * 3);
  const vector = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // Generamos un vector aleatorio en la superficie de una esfera unitaria
    vector.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    
    // Escalamos el vector con una raíz cuadrada para reducir la concentración en el centro
    const scale = Math.pow(Math.random(), 1/3); // Cambia esta función para alterar la concentración
    
    vector.multiplyScalar(scale * radius); // Escalamos al radio deseado

    points[i * 3] = vector.x;
    points[i * 3 + 1] = vector.y;
    points[i * 3 + 2] = vector.z;
  }

  return points;
}

const Stars = (props) => {
  const ref = useRef();
  const [sphere] = useState(() => generatePointsInSphere(5000, 1.2));

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled {...props}>
        <PointMaterial
          transparent
          color='#f272c8'
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

const StarsCanvas = () => {
  return (
    <div className='w-full h-auto absolute inset-0 z-[-1]'>
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Suspense fallback={null}>
          <Stars />
        </Suspense>

        <Preload all />
      </Canvas>
    </div>
  );
};

export default StarsCanvas;
