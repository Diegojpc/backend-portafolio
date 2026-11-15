// A 24x24 SVG logo outline turned into a bevelled 3D solid, optionally orbited by small "agent" nodes.
// Used for tools that have no GLB model (Claude, MCP). Built once per card with useMemo; no network load.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three-stdlib";

const buildGeometry = (pathData, depth, bevel) => {
  // evenodd: logos with holes (Claude Code's eyes) must cut them out instead of filling them.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill-rule="evenodd" d="${pathData}"/></svg>`;
  try {
    const { paths } = new SVGLoader().parse(svg);
    const shapes = paths.flatMap((p) => SVGLoader.createShapes(p));
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel * 2,
      bevelSize: bevel,
      bevelSegments: bevel < 0.1 ? 1 : 4,
      curveSegments: 24,
    });
    geometry.center();
    // SVG y grows downward; flip so the logo is not upside down.
    geometry.scale(1, -1, 1);
    geometry.computeVertexNormals();
    console.info("[ExtrudedLogo] Geometry built", { shapes: shapes.length, vertices: geometry.attributes.position.count });
    return geometry;
  } catch (error) {
    console.error("[ExtrudedLogo] Could not build geometry from SVG path:", error);
    return null;
  }
};

// Small nodes circling the logo on tilted orbits: the "agents" working around the model.
const Orbiters = ({ colors, radius }) => {
  const group = useRef();
  const orbits = useMemo(
    () => colors.map((color, i) => ({
      color,
      tilt: [0.5 + i * 0.55, i * 1.1, 0.2 * i],
      speed: 0.9 + i * 0.25,
      phase: (i / colors.length) * Math.PI * 2,
      r: radius * (1 + i * 0.08),
    })),
    [colors, radius]
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((orbit, i) => {
      const o = orbits[i];
      const node = orbit.children[0];
      const a = t * o.speed + o.phase;
      node.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0);
    });
  });

  return (
    <group ref={group}>
      {orbits.map((o, i) => (
        <group key={i} rotation={o.tilt}>
          <mesh>
            <sphereGeometry args={[1.15, 24, 24]} />
            <meshStandardMaterial color={o.color} emissive={o.color} emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[o.r, 0.07, 8, 128]} />
            <meshBasicMaterial color={o.color} transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const ExtrudedLogo = ({ model }) => {
  const geometry = useMemo(
    () => buildGeometry(model.svgPath, model.depth ?? 2.4, model.bevel ?? 0.18),
    [model.svgPath, model.depth, model.bevel]
  );
  if (!geometry) return null;

  return (
    <Float speed={4} rotationIntensity={1.1} floatIntensity={0.8}>
      <group scale={model.scale} rotation={model.rotation}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color={model.color} emissive={model.color} emissiveIntensity={0.12} metalness={0.25} roughness={0.32} envMapIntensity={1.2} />
        </mesh>
        {model.orbiters && <Orbiters colors={model.orbiters} radius={model.orbitRadius ?? 15} />}
      </group>
    </Float>
  );
};

export default ExtrudedLogo;
