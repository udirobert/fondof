"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceColors } from "@/lib/experience/materials";
import { OrigamiShard } from "./origami-material";

interface PaperShardsProps {
  /** 0–1 scroll progress through arrival/fold */
  progress: number;
  count?: number;
}

export function PaperShards({ progress, count = 20 }: PaperShardsProps) {
  const group = useRef<THREE.Group>(null);
  const skill = useRef<THREE.Mesh>(null);

  const shards = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const angle = (i / count) * Math.PI * 2;
      return {
        id: i,
        x: (col - 2) * 1.2 + Math.sin(i) * 0.15,
        y: (row - 1.5) * 1.0 + Math.cos(i * 1.3) * 0.12,
        z: Math.sin(i * 1.7) * 0.35,
        rotX: (i % 4) * 0.12,
        rotY: (i % 3) * 0.18,
        rotZ: (i % 5) * 0.1,
        delay: i * 0.018,
        orbit: angle,
      };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.12) * 0.1;
    if (skill.current) {
      skill.current.rotation.x = t * 0.25;
      skill.current.rotation.y = t * 0.4;
    }
  });

  const fold = Math.max(0, Math.min(1, (progress - 0.32) / 0.42));
  const settle = Math.max(0, Math.min(1, (progress - 0.72) / 0.28));
  const easeFold = fold * fold * (3 - 2 * fold);

  return (
    <group ref={group}>
      {shards.map((s) => {
        const appear = Math.max(0, Math.min(1, (progress - s.delay) * 3.2));
        const swirl = easeFold * 1.4;
        const targetX = Math.cos(s.orbit) * (1 - easeFold) * 0.15;
        const targetY = Math.sin(s.orbit) * (1 - easeFold) * 0.15;
        const x = THREE.MathUtils.lerp(s.x, targetX, easeFold);
        const y = THREE.MathUtils.lerp(s.y, targetY, easeFold);
        const z = THREE.MathUtils.lerp(s.z, 0.15 + Math.sin(swirl + s.id) * 0.05, easeFold);
        const scale = THREE.MathUtils.lerp(appear * 0.95, 0.12, easeFold);
        const opacity = THREE.MathUtils.lerp(appear * 0.9, 0, easeFold * 0.98);

        return (
          <OrigamiShard
            key={s.id}
            position={[x, y, z]}
            rotation={[
              s.rotX * (1 - easeFold) + easeFold * Math.PI * 0.5,
              s.rotY + swirl * 0.4,
              s.rotZ * (1 - easeFold),
            ]}
            scale={Math.max(0.001, scale)}
            fold={easeFold}
            opacity={Math.max(0, opacity)}
          />
        );
      })}

      {/* Settled skill — dense ember form */}
      <mesh
        ref={skill}
        position={[THREE.MathUtils.lerp(0, -0.4, settle), 0, 0.35]}
        scale={Math.max(0.001, settle * 1.05)}
      >
        <octahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial
          color={experienceColors.ember}
          roughness={0.28}
          metalness={0.55}
          emissive={experienceColors.ember}
          emissiveIntensity={0.35 * settle}
        />
      </mesh>

      {/* Luminous threads into repo wireframe */}
      {settle > 0.05 &&
        [-0.55, 0, 0.55].map((oy, i) => {
          const len = settle * 2.6;
          return (
            <mesh
              key={i}
              position={[1.1 + len / 2, oy * settle, 0.2]}
              scale={[len, 0.018 + i * 0.004, 0.018]}
            >
              <boxGeometry />
              <meshBasicMaterial
                color={
                  i === 1 ? experienceColors.ember : experienceColors.novel
                }
                transparent
                opacity={0.65 * settle}
              />
            </mesh>
          );
        })}

      <group position={[3.4, 0, 0]} scale={Math.max(0.001, settle)}>
        <mesh>
          <boxGeometry args={[1.0, 1.7, 0.25]} />
          <meshStandardMaterial
            color={experienceColors.steel}
            wireframe
            transparent
            opacity={0.75}
          />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.85, 1.45, 0.12]} />
          <meshBasicMaterial
            color={experienceColors.mist}
            transparent
            opacity={0.35}
          />
        </mesh>
      </group>
    </group>
  );
}
