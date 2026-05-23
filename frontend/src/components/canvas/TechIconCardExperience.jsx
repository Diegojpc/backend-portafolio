import { Environment, Float, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import WebGLGuard from "./WebGLGuard";

const TechIconCardExperience = ({ model }) => {
  const scene = useGLTF(model.modelPath);

  useEffect(() => {
    if (model.name === "Interactive Developer") {
      scene.scene.traverse((child) => {
        if (child.isMesh) {
          if (child.name === "Object_5") {
            child.material = new THREE.MeshStandardMaterial({ color: "white" });
          }
        }
      });
    }
  }, [scene]);

  const TechFallback = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: "8px",
      }}
    >
      <span style={{ color: "#915EFF", fontSize: "0.9rem", fontWeight: 600 }}>
        {model.name}
      </span>
    </div>
  );

  return (
    <WebGLGuard fallback={TechFallback}>
      <Canvas>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <spotLight
          position={[10, 15, 10]}
          angle={0.3}
          penumbra={1}
          intensity={2}
        />
        <Environment preset="city" />
        <Float speed={5.5} rotationIntensity={1.5} floatIntensity={0.9}>
          <group scale={model.scale} rotation={model.rotation}>
            <primitive object={scene.scene} />
          </group>
        </Float>

        <OrbitControls enableZoom={false} />
      </Canvas>
    </WebGLGuard>
  );
};

export default TechIconCardExperience;