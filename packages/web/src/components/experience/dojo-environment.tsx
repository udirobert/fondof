"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, SoftShadows } from "@react-three/drei";
import * as THREE from "three";
import { experienceColors } from "@/lib/experience/materials";

interface DojoEnvironmentProps {
  progress: number;
}

/** Lit workshop room — warm parchment air, not a black void. */
export function DojoEnvironment({ progress }: DojoEnvironmentProps) {
  const ember = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const foldHeat = Math.max(0, (progress - 0.35) / 0.45);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ember.current) {
      ember.current.intensity = 1.4 + foldHeat * 1.4 + Math.sin(t * 2.2) * 0.1;
    }
    if (fill.current) {
      fill.current.intensity = 0.7 + Math.sin(t * 0.7) * 0.06;
    }
  });

  return (
    <>
      <color attach="background" args={[experienceColors.parchment]} />
      <fog attach="fog" args={[experienceColors.parchment, 10, 28]} />
      <SoftShadows size={16} samples={8} focus={0.55} />

      <ambientLight intensity={0.72} color="#fff6ea" />
      <directionalLight
        castShadow
        position={[4, 8, 3]}
        intensity={1.35}
        color="#fff8ee"
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight
        ref={ember}
        position={[-1.2, 1.6, 2.4]}
        color={experienceColors.ember}
        distance={18}
        decay={2}
      />
      <pointLight
        ref={fill}
        position={[2.8, 1.2, -1.2]}
        color="#9eb4c4"
        distance={14}
        decay={2}
      />

      {/* Workshop floor — warm clay, readable */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.85, 0]}
        receiveShadow
      >
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial
          color="#d9cbb8"
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.84, 0]}>
        <ringGeometry args={[2.8, 2.95, 64]} />
        <meshBasicMaterial
          color={experienceColors.ember}
          transparent
          opacity={0.22 + foldHeat * 0.2}
        />
      </mesh>

      <ContactShadows
        position={[0, -1.83, 0]}
        opacity={0.28}
        scale={14}
        blur={2.6}
        far={6}
        color="#3a2e22"
      />

      <Environment
        preset="apartment"
        environmentIntensity={0.55 + foldHeat * 0.2}
      />
    </>
  );
}
