"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceColors } from "@/lib/experience/materials";

interface OrigamiFoldProps {
  /** 0–1 authored multi-crease sequence */
  fold: number;
  scale?: number;
  /** Show settled skill solid at end of fold */
  showSkill?: boolean;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Multi-crease origami: diagonal valley → N/S flaps → E/W flaps → skill solid.
 */
export function OrigamiFold({
  fold,
  scale = 1,
  showSkill = true,
}: OrigamiFoldProps) {
  const root = useRef<THREE.Group>(null);
  const skill = useRef<THREE.Mesh>(null);

  const stage1 = smoothstep(0, 0.28, fold);
  const stage2 = smoothstep(0.22, 0.55, fold);
  const stage3 = smoothstep(0.48, 0.78, fold);
  const stage4 = smoothstep(0.72, 1, fold);
  const paperFade = 1 - smoothstep(0.82, 0.98, fold);
  const collapse = 1 - stage4 * 0.45;

  const squareGeo = useMemo(() => new THREE.PlaneGeometry(1, 1, 12, 12), []);
  const flapGeo = useMemo(() => new THREE.PlaneGeometry(1, 0.5, 8, 4), []);

  useFrame(({ clock }) => {
    if (root.current) {
      root.current.rotation.y =
        Math.sin(clock.elapsedTime * 0.4) * 0.08 * (1 - stage4);
    }
    if (skill.current) {
      skill.current.rotation.x = clock.elapsedTime * 0.35;
      skill.current.rotation.y = clock.elapsedTime * 0.55;
    }
  });

  return (
    <group ref={root} scale={scale * collapse}>
      {/* Center face + diagonal valley */}
      <mesh
        geometry={squareGeo}
        castShadow
        rotation={[-stage1 * 0.5, stage1 * 0.3, stage1 * 0.18]}
        position={[0, 0, stage1 * 0.06]}
      >
        <meshStandardMaterial
          color={experienceColors.paper}
          roughness={0.7}
          metalness={0.05}
          side={THREE.DoubleSide}
          transparent
          opacity={0.92 * paperFade}
        />
      </mesh>
      <mesh
        position={[0, 0, 0.012]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[1.25, 0.012, 1]}
      >
        <planeGeometry />
        <meshBasicMaterial
          color={experienceColors.ember}
          transparent
          opacity={0.4 * stage1 * paperFade}
        />
      </mesh>

      {/* North flap */}
      <group position={[0, 0.5, 0]}>
        <group rotation={[stage2 * -Math.PI * 0.92, 0, 0]}>
          <mesh geometry={flapGeo} position={[0, 0.25, 0]} castShadow>
            <meshStandardMaterial
              color={experienceColors.paperSoft}
              roughness={0.75}
              side={THREE.DoubleSide}
              transparent
              opacity={0.9 * paperFade}
            />
          </mesh>
        </group>
      </group>

      {/* South flap */}
      <group position={[0, -0.5, 0]}>
        <group rotation={[stage2 * Math.PI * 0.92, 0, 0]}>
          <mesh
            geometry={flapGeo}
            position={[0, -0.25, 0]}
            rotation={[0, 0, Math.PI]}
            castShadow
          >
            <meshStandardMaterial
              color={experienceColors.paperSoft}
              roughness={0.75}
              side={THREE.DoubleSide}
              transparent
              opacity={0.9 * paperFade}
            />
          </mesh>
        </group>
      </group>

      {/* East flap */}
      <group position={[0.5, 0, 0]}>
        <group rotation={[0, stage3 * -Math.PI * 0.95, 0]}>
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <planeGeometry args={[1, 0.5, 8, 4]} />
            <meshStandardMaterial
              color={experienceColors.paper}
              roughness={0.7}
              side={THREE.DoubleSide}
              transparent
              opacity={0.88 * paperFade}
            />
          </mesh>
        </group>
      </group>

      {/* West flap */}
      <group position={[-0.5, 0, 0]}>
        <group rotation={[0, stage3 * Math.PI * 0.95, 0]}>
          <mesh
            position={[-0.25, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <planeGeometry args={[1, 0.5, 8, 4]} />
            <meshStandardMaterial
              color={experienceColors.paper}
              roughness={0.7}
              side={THREE.DoubleSide}
              transparent
              opacity={0.88 * paperFade}
            />
          </mesh>
        </group>
      </group>

      {showSkill && (
        <mesh
          ref={skill}
          scale={Math.max(0.001, stage4 * 1.15)}
          position={[0, 0, 0.12]}
          castShadow
        >
          <octahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial
            color={experienceColors.ember}
            emissive={experienceColors.ember}
            emissiveIntensity={0.5 * stage4}
            metalness={0.55}
            roughness={0.28}
          />
        </mesh>
      )}
    </group>
  );
}
