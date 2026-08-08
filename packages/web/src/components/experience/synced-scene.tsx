"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrigamiShard } from "./origami-material";
import { OrigamiFold } from "./origami-fold";
import { DojoEnvironment } from "./dojo-environment";
import { CameraRig } from "./camera-rig";
import { experienceColors } from "@/lib/experience/materials";
import {
  anchorCenterWorld,
  type ScrollSyncState,
} from "@/lib/experience/scroll-sync";

interface SyncedSceneProps {
  sync: MutableRefObject<ScrollSyncState>;
  progress: number;
}

function AnchorCluster({
  sync,
  anchorId,
  progress,
  mode,
}: {
  sync: MutableRefObject<ScrollSyncState>;
  anchorId: string;
  progress: number;
  mode: "paper" | "fold" | "settle";
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const state = sync.current;
    const anchor = state.anchors[anchorId];
    if (!group.current || !anchor) {
      if (group.current) group.current.visible = false;
      return;
    }

    const { x, y, visibility } = anchorCenterWorld(anchor, state);
    group.current.visible = visibility > 0.02;
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      x,
      0.18,
    );
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      y,
      0.18,
    );
    group.current.rotation.y =
      Math.sin(clock.elapsedTime * 0.35 + progress) * 0.1;
    const scale = 0.55 + visibility * 0.55;
    group.current.scale.setScalar(
      THREE.MathUtils.lerp(group.current.scale.x || scale, scale, 0.12),
    );
  });

  if (mode === "paper") {
    return (
      <group ref={group}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <OrigamiShard
              key={i}
              position={[Math.cos(a) * 0.85, Math.sin(a) * 0.55, (i % 3) * 0.08]}
              rotation={[0.2, a, 0.1]}
              scale={0.55}
              fold={Math.max(0, (progress - 0.25) * 1.2)}
              opacity={0.85}
            />
          );
        })}
      </group>
    );
  }

  if (mode === "fold") {
    // Local fold amount from global progress (fold chapter ~0.35–0.65)
    const localFold = Math.min(1, Math.max(0, (progress - 0.32) / 0.35));
    return (
      <group ref={group}>
        <OrigamiFold fold={localFold} scale={1.35} showSkill />
      </group>
    );
  }

  // settle — skill + threads + repo cage
  return (
    <group ref={group}>
      <mesh castShadow>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={experienceColors.ember}
          emissive={experienceColors.ember}
          emissiveIntensity={0.4}
          metalness={0.55}
          roughness={0.28}
        />
      </mesh>
      {[-0.35, 0, 0.35].map((oy, i) => (
        <mesh key={i} position={[0.85, oy, 0]} scale={[1.4, 0.02, 0.02]}>
          <boxGeometry />
          <meshBasicMaterial
            color={i === 1 ? experienceColors.ember : experienceColors.novel}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
      <mesh position={[1.9, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 1.2, 0.18]} />
        <meshStandardMaterial
          color={experienceColors.steel}
          wireframe
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

export function SyncedScene({ sync, progress }: SyncedSceneProps) {
  return (
    <>
      <DojoEnvironment progress={progress} />
      <CameraRig progress={progress} />

      <AnchorCluster
        sync={sync}
        anchorId="gl-enter"
        progress={progress}
        mode="paper"
      />
      <AnchorCluster
        sync={sync}
        anchorId="gl-arrival"
        progress={progress}
        mode="paper"
      />
      <AnchorCluster
        sync={sync}
        anchorId="gl-fold"
        progress={progress}
        mode="fold"
      />
      <AnchorCluster
        sync={sync}
        anchorId="gl-settle"
        progress={progress}
        mode="settle"
      />
    </>
  );
}
