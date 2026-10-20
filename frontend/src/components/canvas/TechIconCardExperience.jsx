import { Environment, Float, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import WebGLGuard from "./WebGLGuard";
import useInView from "../../hooks/useInView";
import { techStackIcons } from "../../constants";

// Download the models in the background as soon as this chunk loads, without suspending any UI.
techStackIcons.forEach((m) => useGLTF.preload(m.modelPath));

// Rendered INSIDE the <Canvas>: loading the GLB suspends only the Suspense boundary below, never the page.
const TechModel = ({ model }) => {
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
  }, [scene, model.name]);

  return (
    <Float speed={5.5} rotationIntensity={1.5} floatIntensity={0.9}>
      <group scale={model.scale} rotation={model.rotation}>
        <primitive object={scene.scene} />
      </group>
    </Float>
  );
};

const TechIconCardExperience = ({ model }) => {
  const [viewRef, inView] = useInView();

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
    <div ref={viewRef} style={{ width: "100%", height: "100%" }}>
      {inView && (
        <Suspense fallback={null}>
        <WebGLGuard fallback={TechFallback}>
          <Canvas dpr={[1, 1.5]}>
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <spotLight
              position={[10, 15, 10]}
              angle={0.3}
              penumbra={1}
              intensity={2}
            />
            {/* Without this boundary, R3F's <Canvas> rethrows any pending load (the HDR below, the GLB) to the
                nearest DOM <Suspense>, which in App.jsx wraps EVERY section: React hides them all, the document
                collapses and the browser throws the visitor back to the top of the page. */}
            <Suspense fallback={null}>
              <Environment preset="city" />
              <TechModel model={model} />
            </Suspense>
            <OrbitControls enableZoom={false} />
          </Canvas>
        </WebGLGuard>
        </Suspense>
      )}
    </div>
  );
};

export default TechIconCardExperience;
