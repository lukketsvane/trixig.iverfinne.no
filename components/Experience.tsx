"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

const FOV = 35;

// How large each model is framed. The drill redesigns are the hero, so they sit
// closer/zoomed; teardown components (motor, pcb) sit a touch smaller for contrast.
function zoomFor(url: string) {
  return /trixig_redesign/i.test(url) ? 1.18 : 0.92;
}

// Models hover this far above the ground plane (the contact shadow sits below).
const HOVER = 0.16;

// A flattering resting pose per model (radians, [x, y, z]); drag spin adds onto Y.
function poseFor(url: string): [number, number, number] {
  if (/gearbox_motor/i.test(url)) return [-0.32, -0.7, 0.06];
  return [0, 0, 0];
}

// Subtle studio backdrop tones; the active color shifts roughly every 3 models.
const BG = ["#ededed", "#f0ebe4", "#e6ecef", "#eceee9"].map(
  (h) => new THREE.Color(h),
);
const _bg = new THREE.Color();
function bgAt(t: number) {
  const seg = t / 3;
  const i = Math.floor(seg);
  let f = seg - i;
  f = f * f * (3 - 2 * f); // smoothstep
  return _bg
    .copy(BG[((i % BG.length) + BG.length) % BG.length])
    .lerp(BG[((i + 1) % BG.length + BG.length) % BG.length], f);
}

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
        const mat = m as THREE.MeshPhysicalMaterial;
        // Kill transmission/volume: it forces a per-frame full-screen render
        // target (heavy on iOS) and the brand is matte anyway.
        if ("transmission" in mat) mat.transmission = 0;
        if ("thickness" in mat) mat.thickness = 0;
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
  const { object, bottomY } = useNormalized(url, zoomFor(url));

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

    const [rx, ry, rz] = poseFor(url);
    g.rotation.set(rx, drag.current.angle + ry, rz);
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
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    scene.background = new THREE.Color("#ededed");
    models.forEach((m) => useGLTF.preload(m, true));
  }, [models, scene]);

  useFrame(() => {
    // smooth the scroll position and let drag velocity coast (inertia)
    scroll.current.current = THREE.MathUtils.lerp(
      scroll.current.current,
      scroll.current.target,
      0.12,
    );
    drag.current.angle += drag.current.vel;
    drag.current.vel *= 0.9;

    // subtle studio backdrop that shifts as you move through the models
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(bgAt(scroll.current.current));
    }

    // ground plane sits a touch below the active model's base, so the model
    // reads as hovering just above it
    if (shadow.current) {
      const active = Math.round(scroll.current.current);
      const target = bottoms.current[active] ?? -1;
      shadow.current.position.y = THREE.MathUtils.lerp(
        shadow.current.position.y,
        target - HOVER,
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
          opacity={0.26}
          blur={3.4}
          far={4}
          scale={7}
          resolution={512}
          color="#000000"
        />
      </group>
    </>
  );
}
