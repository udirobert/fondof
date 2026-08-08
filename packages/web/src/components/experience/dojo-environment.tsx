"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  SoftShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { experienceColors } from "@/lib/experience/materials";

interface DojoEnvironmentProps {
  /** 0–1 — ember light intensifies through fold */
  progress: number;
}

/**
 * One emotional room: warm night HDRI, training-floor mat, contact shadows, ember key.
 */
export function DojoEnvironment({ progress }: DojoEnvironmentProps) {
  const ember = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const foldHeat = Math.max(0, (progress - 0.35) / 0.45);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ember.current) {
      ember.current.intensity = 1.1 + foldHeat * 1.8 + Math.sin(t * 2.2) * 0.08;
    }
    if (fill.current) {
      fill.current.intensity = 0.35 + Math.sin(t * 0.7) * 0.05;
    }
  });

  return (
    <>
      <color attach="background" args={[experienceColors.ink]} />
      <fog attach="fog" args={[experienceColors.ink, 7, 20]} />
      <SoftShadows size={12} samples={8} focus={0.65} />

      <ambientLight intensity={0.22} color="#c4b8a8" />
      <directionalLight
        castShadow
        position={[3.5, 7, 2.5]}
        intensity={0.85}
        color="#f0e6d6"
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight
        ref={ember}
        position={[-1.2, 1.4, 2.2]}
        color={experienceColors.ember}
        distance={16}
        decay={2}
      />
      <pointLight
        ref={fill}
        position={[2.5, 0.8, -1.5]}
        color={experienceColors.steel}
        distance={12}
        decay={2}
      />

      {/* Training floor / mat */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.85, 0]}
        receiveShadow
      >
        <circleGeometry args={[4.2, 64]} />
        <meshStandardMaterial
          color="#1c1814"
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.84, 0]}>
        <ringGeometry args={[2.6, 2.72, 64]} />
        <meshBasicMaterial
          color={experienceColors.ember}
          transparent
          opacity={0.12 + foldHeat * 0.18}
        />
      </mesh>

      <ContactShadows
        position={[0, -1.83, 0]}
        opacity={0.45}
        scale={12}
        blur={2.4}
        far={6}
        color="#000000"
      />

      <Environment preset="night" environmentIntensity={0.35 + foldHeat * 0.15} />
    </>
  );
}
