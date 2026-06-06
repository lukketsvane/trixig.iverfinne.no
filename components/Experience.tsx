"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

const FOV = 35;

// Pull the camera back so a unit-radius sphere fits on the limiting axis
// (width on a portrait phone), with margin. Keeps every model — tall or wide —
// fully framed regardless of viewport aspect.
function Rig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const margin = 1.25; // fit a slightly larger sphere => padding around the model
    const halfFov = (FOV * Math.PI) / 180 / 2;
    const fitV = margin / Math.tan(halfFov);
    const fitH = fitV / aspect;
    camera.position.set(0, 0, Math.max(fitV, fitH));
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export type DragState = { angle: number; vel: number };
export type ScrollState = { target: number; current: number };

// Normalize a loaded model so its bounding box is centered at the origin and
// scaled to a consistent height, regardless of the source export's units.
function useNormalized(url: string, targetRadius = 1) {
  const { scene } = useGLTF(url, true);
  return useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const scale = targetRadius / sphere.radius;

    root.position.sub(sphere.center); // center at origin
    const wrapper = new THREE.Group();
    wrapper.add(root);
    wrapper.scale.setScalar(scale);

    // actual bottom of the model in scaled space, so the shadow can sit on it
    const bottomY = (box.min.y - sphere.center.y) * scale;

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        mat.transparent = true; // enable crossfade; depthWrite stays on for clean dissolve
        mat.depthWrite = true;
      });
    });
    return { object: wrapper, bottomY };
  }, [scene, targetRadius]);
}

function Model({
  url,
  index,
  drag,
  scroll,
  renderOrder,
  bottoms,
}: {
  url: string;
  index: number;
  drag: React.MutableRefObject<DragState>;
  scroll: React.MutableRefObject<ScrollState>;
  renderOrder: number;
  bottoms: React.MutableRefObject<number[]>;
}) {
  const group = useRef<THREE.Group>(null);
  const { object, bottomY } = useNormalized(url);

  useEffect(() => {
    bottoms.current[index] = bottomY;
  }, [bottoms, index, bottomY]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;

    // Sequential fade: a model is fully gone by the time its neighbour starts
    // to appear, so two transmissive models never overlap into a ghost.
    const d = Math.abs(scroll.current.current - index);
    let opacity = THREE.MathUtils.clamp(1 - d * 2, 0, 1);
    opacity = opacity * opacity * (3 - 2 * opacity); // smoothstep ease

    const visible = opacity > 0.001;
    g.visible = visible;
    if (!visible) return;

    g.rotation.y = drag.current.angle;
    // slight scale pop so the swap reads as motion, not a blink
    const s = 0.94 + 0.06 * opacity;
    g.scale.setScalar(s);

    object.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.renderOrder = renderOrder;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => ((m as THREE.MeshStandardMaterial).opacity = opacity));
    });
  });

  return (
    <group ref={group}>
      <primitive object={object} />
    </group>
  );
}

export default function Experience({
  models,
  drag,
  scroll,
}: {
  models: string[];
  drag: React.MutableRefObject<DragState>;
  scroll: React.MutableRefObject<ScrollState>;
}) {
  const bottoms = useRef<number[]>([]);
  const shadow = useRef<THREE.Group>(null);

  useEffect(() => {
    models.forEach((m) => useGLTF.preload(m, true));
  }, [models]);

  useFrame(() => {
    // smooth the scroll position and let drag velocity coast (inertia)
    scroll.current.current = THREE.MathUtils.lerp(
      scroll.current.current,
      scroll.current.target,
      0.12,
    );
    drag.current.angle += drag.current.vel;
    drag.current.vel *= 0.9;

    // keep the contact shadow under whichever model is currently in view
    if (shadow.current) {
      const active = Math.round(scroll.current.current);
      const target = bottoms.current[active] ?? -1;
      shadow.current.position.y = THREE.MathUtils.lerp(
        shadow.current.position.y,
        target - 0.02,
        0.15,
      );
    }
  });

  return (
    <>
      <Rig />
      <Environment preset="studio" environmentIntensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <ambientLight intensity={0.25} />

      {models.map((url, i) => (
        <Model
          key={url}
          url={url}
          index={i}
          drag={drag}
          scroll={scroll}
          renderOrder={i}
          bottoms={bottoms}
        />
      ))}

      <group ref={shadow} position={[0, -1.05, 0]}>
        <ContactShadows
          opacity={0.32}
          blur={2.6}
          far={4}
          scale={8}
          resolution={1024}
          color="#000000"
        />
      </group>
    </>
  );
}
