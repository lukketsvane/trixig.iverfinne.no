"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

const FOV = 35;

// Framing per model. `zoom` is the post-scale framing radius (the Rig fits a
// ~1.25-radius sphere, so larger = closer). `robust`/`keep` frame on the dense
// body only, discarding the farthest (1-keep) of verts — the original's lanyard
// thread sticks far out and would otherwise shrink the product in frame.
type Framing = { zoom: number; robust: boolean; keep: number };
function framingFor(url: string): Framing {
  if (/trixig_parts/i.test(url)) {
    // The split-parts original: framed on the body shells (see useNormalized),
    // so the lanyard/internals don't distort the fit.
    return { zoom: 1.05, robust: false, keep: 1 };
  }
  if (/orginal|original/i.test(url)) {
    // Frame tight on the screwdriver body; the thread runs off-frame.
    return { zoom: 1.5, robust: true, keep: 0.8 };
  }
  // concept_06 (gallery #11) ends in a thin dangling hook; framing/grounding on
  // the full AABB anchors its base at the hook tip, so the body floats. Frame on
  // the dense body only (discard the farthest 18% of verts) so it sits grounded.
  if (/concept_06/i.test(url)) return { zoom: 1.18, robust: true, keep: 0.82 };
  if (/trixig_redesign/i.test(url)) return { zoom: 1.18, robust: false, keep: 1 };
  // Default for the scroll-through asset gallery — a comfortable product frame.
  return { zoom: 1.15, robust: false, keep: 1 };
}

// Per-model vertical nudge (world units, applied to the model group after
// scaling). Positive lifts the model up in frame while the ground shadow stays
// put — so the model reads as floating higher above the ground.
function liftFor(url: string): number {
  if (/concept_04/i.test(url)) return 0.4; // #09: raise it off the ground
  return 0;
}

// Bounding center/size computed from the dense vertex cloud, ignoring the
// farthest (1-keep) fraction. This excludes thin outlier appendages (the
// original's thread) so framing locks onto the product body. Center/minY come
// from the AABB of the inlier verts for a stable, well-centred frame.
function robustBounds(root: THREE.Object3D, keep: number) {
  root.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const pos = mesh.isMesh ? mesh.geometry?.attributes?.position : null;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos as THREE.BufferAttribute, i).applyMatrix4(
        mesh.matrixWorld,
      );
      xs.push(v.x);
      ys.push(v.y);
      zs.push(v.z);
    }
  });
  const n = xs.length;
  const cx = xs.reduce((a, b) => a + b, 0) / n;
  const cy = ys.reduce((a, b) => a + b, 0) / n;
  const cz = zs.reduce((a, b) => a + b, 0) / n;
  const dist = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - cx,
      dy = ys[i] - cy,
      dz = zs[i] - cz;
    dist[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  const cutoff =
    Float64Array.from(dist).sort()[Math.floor(keep * (n - 1))] ?? Infinity;
  let minx = Infinity,
    maxx = -Infinity,
    miny = Infinity,
    maxy = -Infinity,
    minz = Infinity,
    maxz = -Infinity;
  for (let i = 0; i < n; i++) {
    if (dist[i] > cutoff) continue;
    if (xs[i] < minx) minx = xs[i];
    if (xs[i] > maxx) maxx = xs[i];
    if (ys[i] < miny) miny = ys[i];
    if (ys[i] > maxy) maxy = ys[i];
    if (zs[i] < minz) minz = zs[i];
    if (zs[i] > maxz) maxz = zs[i];
  }
  const center = new THREE.Vector3(
    (minx + maxx) / 2,
    (miny + maxy) / 2,
    (minz + maxz) / 2,
  );
  const radius =
    0.5 *
    Math.sqrt(
      (maxx - minx) ** 2 + (maxy - miny) ** 2 + (maxz - minz) ** 2,
    );
  return { center, radius, minY: miny };
}

// Gap between a model's base and its ground shadow. The teardown internals are
// now isolated in-place (no separate floating component models), so every model
// in the sequence — the original and the redesigns — sits grounded.
function shadowGapFor(url: string) {
  // Gap between a model's base and its ground shadow — larger = ground sits
  // further below the model. concept_05 (the mounted/docked Trixig) wants the
  // ground dropped well clear of its base.
  if (/concept_05/i.test(url)) return 0.5;
  if (/concept_09/i.test(url)) return -0.02;
  return 0.22;
}

// --- Multi-step exploded "breakdown" view (the split-parts original only) ---
// Driven by a dedicated `breakdown` progress (0..1) that the Gallery maps from a
// few screens of scroll BEFORE the model index advances — so the teardown is its
// own interactive section, then it hands off (fully apart) to the real motor
// component. Each part has a role: when it starts moving (`delay`), how long its
// move takes (`window`), how far it flies (`push`, a fraction of EXPLODE_K), and
// optionally `fade`/`ghost` (the facing shell dissolves to a barely-visible
// husk so you can see the internals through it).
// --- X-ray "breakdown" (the split-parts original only) ---
// Nothing ever MOVES. Scrolling fades the two outer shells to translucent so the
// internals (motor, pcb/battery) read through them — an x-ray reveal. Tapping any
// part HIGHLIGHTS it (full opacity) while everything else dims to a faint ghost.
const SHELL = new Set(["Body_Front", "Body_Back"]);
const INTERNALS = new Set(["motor", "pcb_mainboard", "battery"]);

// --- Rotatable-joint animation (the pre-segmented concept_13) ---
// The model arrives split into ~13 parts with generic Tripo names, so we target
// the moving piece by id. JOINT_PART is the bit/chuck at the working end; it
// turns steadily around the tool's drive axis (Y) — a calm "it works" motion.
// To retarget, change JOINT_PART (and JOINT_AXIS if it spins on x/z instead).
const JOINT_MODEL = /concept_13/i;
const JOINT_PART = "tripo_part_27";
const JOINT_AXIS: "x" | "y" | "z" = "y";
const JOINT_SPEED = 6; // radians per second
// Parts to drop on the segmented model — the dangling thread/strap reads as
// clutter next to the joint, so it's removed before framing (model re-centres).
const HIDE_PARTS = ["tripo_part_10"];

// Shell opacity at full x-ray (see the guts through the housing).
const SHELL_XRAY = 0.14;
// Opacity of the non-selected parts while one part is highlighted.
const SEL_DIM = 0.08;

// Radians a model spins per unit of scroll (i.e. per model scrolled through).
// Higher = more turntable motion while scrolling.
const SCROLL_SPIN = 2.0;
// Global starting angle so the first model opens at a flattering 3/4 view;
// applied to every model, so the continuous spin is unaffected.
const SPIN_PHASE = -0.7;

// A flattering resting tilt per model (radians, [x, y, z]). Y is left at 0 so
// the scroll-driven spin stays continuous from one model to the next.
function poseFor(url: string): [number, number, number] {
  if (/gearbox_motor/i.test(url)) return [-0.32, 0, 0.06];
  // #09 (concept_04): turn it to a clearer 3/4 so you can read the tool, with a
  // slight nose-up tilt. ry offsets this model's resting angle only.
  if (/concept_04/i.test(url)) return [-0.12, 0.6, 0];
  return [0, 0, 0];
}

// Subtle studio backdrop tones. Light: around --grey-100 (matches the document
// field so the hero hands off seamlessly). Dark: near-black around the Trixig
// matte-black surface (--paper #141414), with the same faint warm/cool drift.
// Both shift roughly every 3 models.
const BG_LIGHT = ["#eeeeee", "#f1ece5", "#e7edf0", "#edefe9"].map(
  (h) => new THREE.Color(h),
);
const BG_DARK = ["#141414", "#16130e", "#101316", "#131510"].map(
  (h) => new THREE.Color(h),
);
const _bg = new THREE.Color();
function bgAt(t: number, dark: boolean) {
  const pal = dark ? BG_DARK : BG_LIGHT;
  const seg = t / 3;
  const i = Math.floor(seg);
  let f = seg - i;
  f = f * f * (3 - 2 * f); // smoothstep
  return _bg
    .copy(pal[((i % pal.length) + pal.length) % pal.length])
    .lerp(pal[(((i + 1) % pal.length) + pal.length) % pal.length], f);
}

// --- Light direction (three-finger pan) ---
// The key directional light is steered by azimuth/elevation (radians) rather
// than a fixed position, so a three-finger drag can swing it around the model.
// Defaults reproduce the original [3, 5, 4] key light.
export type LightState = { az: number; el: number };
export const LIGHT_RADIUS = 7;
export const LIGHT_DEFAULT: LightState = {
  az: Math.atan2(3, 4), // ≈ 0.64
  el: Math.atan2(5, Math.hypot(3, 4)), // ≈ 0.79
};

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
// Both in "model index" units (0..count-1). Gallery maps scrollY to a target
// model position (piecewise, with the document as a gap in the middle); pos is
// the smoothed value chased toward target in the rAF loop and read by the scene.
export type ScrollState = {
  target: number;
  pos: number;
  // Teardown progress (0..1) for the split-parts original, smoothed like `pos`.
  targetBreakdown: number;
  breakdown: number;
};

// How many screens of scroll each model occupies (a longer, calmer read).
export const MODEL_LEN = 1.4;

// One selectable part: its node and the mesh(es) under it (for opacity/depth).
// Nothing moves, so no displacement data is needed.
type ExplodePart = {
  name: string;
  node: THREE.Object3D;
  meshes: THREE.Mesh[];
};


// Which part (if any) the user has tapped to isolate. A ref so the rAF loop can
// read it without re-rendering; Gallery also mirrors it to state for the label.
export type SelectionState = { name: string | null };

// Friendly labels for an isolated part (Norwegian, matching the design system).
const PART_LABELS: Record<string, string> = {
  motor: "Girmotor",
  pcb_mainboard: "Krinskort",
  battery: "Batteri",
  Body_Front: "Frontdeksel",
  Body_Back: "Bakdeksel",
  Trigger: "Avtrekkar",
  Button: "Knapp",
  Clip: "Klips",
  Bit_Holder: "Bitshaldar",
  Top_Panel: "Topplate",
};
export function partLabel(name: string): string {
  return PART_LABELS[name] ?? name.replace(/_/g, " ");
}

// Normalize a loaded model so its bounding box is centered at the origin and
// scaled to a consistent height, regardless of the source export's units.
function useNormalized(url: string, framing: Framing) {
  const { scene } = useGLTF(url, true);
  return useMemo(() => {
    const root = scene.clone(true);

    // Drop hidden parts (e.g. the strap on concept_13) before anything else so
    // they're not drawn and don't pull on the framing / shadow.
    if (JOINT_MODEL.test(url)) {
      for (const name of HIDE_PARTS) root.getObjectByName(name)?.removeFromParent();
    }

    // Pick the framing volume.
    let center: THREE.Vector3;
    let radius: number;
    let minY: number;
    const isParts = /trixig_parts/i.test(url);
    const shellBox = new THREE.Box3();
    if (isParts) {
      // Frame on the body shells ONLY. The dense internals would pull a
      // whole-model fit's centroid inward and the lanyard would push it out,
      // both of which over-zoom the body; the shells are the true silhouette.
      root.updateWorldMatrix(true, true);
      for (const node of root.children) {
        if (node.name === "Body_Front" || node.name === "Body_Back")
          shellBox.expandByObject(node);
      }
    }
    if (isParts && !shellBox.isEmpty()) {
      const sphere = shellBox.getBoundingSphere(new THREE.Sphere());
      center = sphere.center;
      radius = sphere.radius;
      minY = shellBox.min.y;
    } else if (framing.robust) {
      const b = robustBounds(root, framing.keep);
      center = b.center;
      radius = b.radius;
      minY = b.minY;
    } else {
      const box = new THREE.Box3().setFromObject(root);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      center = sphere.center;
      radius = sphere.radius;
      minY = box.min.y;
    }
    const scale = framing.zoom / radius;

    // Collect selectable parts (split-parts original only). Nothing moves, so we
    // only need each named node's meshes (for opacity/highlight) and a mesh→part
    // map (for tap raycasting). The two outer shells are made non-raycastable so
    // taps pass through the x-rayed housing to the internals behind it.
    const parts: ExplodePart[] = [];
    const meshToPart = new Map<THREE.Object3D, string>();
    if (/trixig_parts/i.test(url)) {
      for (const node of [...root.children]) {
        const meshes: THREE.Mesh[] = [];
        node.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          // Parts share materials in the export, so clone per mesh — otherwise
          // setting one part's opacity (x-ray / dim) clobbers every part that
          // shares that material instance.
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();
          meshes.push(mesh);
          meshToPart.set(mesh, node.name);
          if (SHELL.has(node.name)) mesh.raycast = () => {};
        });
        parts.push({ name: node.name, node, meshes });
      }
    }

    root.position.sub(center); // center at origin
    const wrapper = new THREE.Group();
    wrapper.add(root);
    wrapper.scale.setScalar(scale);

    // actual bottom of the (framed) model in scaled space, so the shadow sits on it
    const bottomY = (minY - center.y) * scale;

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
        // The crossfade drives mat.opacity, but some exports (e.g. the original
        // Trixig's baseColor PNG) ship a spurious alpha channel on an OPAQUE
        // material. Once `transparent` is on, three.js would honour that alpha
        // and punch see-through holes through the body. Force the final alpha to
        // the opacity uniform so ONLY the crossfade controls transparency —
        // map/vertex alpha is ignored.
        mat.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphamap_fragment>",
            "#include <alphamap_fragment>\n\tdiffuseColor.a = opacity;",
          );
        };
        mat.needsUpdate = true;

        // Some exports ship a bogus KHR_texture_transform offset (the original
        // Trixig carries [0, 1.5]) on UVs that already span [0,1]. three.js
        // applies it faithfully, shifting the atlas half a tile and scrambling
        // the texture. Drop any offset that lands outside the normal [0,1) wrap
        // range; legitimate sub-tile offsets are left untouched.
        (
          [
            mat.map,
            mat.metalnessMap,
            mat.roughnessMap,
            mat.aoMap,
            mat.normalMap,
            mat.emissiveMap,
          ] as (THREE.Texture | null)[]
        ).forEach((tex) => {
          if (!tex) return;
          if (Math.abs(tex.offset.x) >= 1 || Math.abs(tex.offset.y) >= 1) {
            tex.offset.set(0, 0);
            tex.updateMatrix();
          }
        });
      });
    });

    // Grab the rotatable-joint node (concept_13) so the Model loop can turn it.
    const joint: THREE.Object3D | null = JOINT_MODEL.test(url)
      ? (root.getObjectByName(JOINT_PART) ?? null)
      : null;

    return { object: wrapper, bottomY, parts, meshToPart, joint };
  }, [scene, url, framing.robust, framing.keep, framing.zoom]);
}

function Model({
  url,
  index,
  drag,
  scroll,
  renderOrder,
  bottoms,
  selection,
  didDrag,
  onSelect,
}: {
  url: string;
  index: number;
  drag: React.MutableRefObject<DragState>;
  scroll: React.MutableRefObject<ScrollState>;
  renderOrder: number;
  bottoms: React.MutableRefObject<number[]>;
  selection: React.MutableRefObject<SelectionState>;
  didDrag: React.MutableRefObject<boolean>;
  onSelect: (name: string | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { object, bottomY, parts, meshToPart, joint } = useNormalized(
    url,
    framingFor(url),
  );
  const focus = useRef(0); // smoothed highlight amount (0 none, 1 a part is held)

  useEffect(() => {
    bottoms.current[index] = bottomY;
  }, [bottoms, index, bottomY]);

  // Dispose cloned materials when this model unmounts so GPU memory is freed.
  // Geometries and textures stay in the useGLTF cache (shared), only materials
  // explicitly cloned in useNormalized (trixig_parts path) are ours to dispose.
  useEffect(() => {
    return () => {
      if (!parts.length) return;
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => (m as THREE.Material)?.dispose());
      });
    };
  }, [object, parts]);

  // Tap a part (once the x-ray has revealed the guts, and it wasn't a drag) to
  // highlight it; tap again to release. Only the split-parts model has parts.
  const onClick = (e: { object: THREE.Object3D; stopPropagation: () => void }) => {
    if (!parts.length) return;
    if (didDrag.current) return; // a spin-drag, not a tap
    if (scroll.current.breakdown < 0.5) return; // only once it's x-rayed
    const name = meshToPart.get(e.object);
    if (!name) return;
    e.stopPropagation();
    const next = selection.current.name === name ? null : name;
    selection.current.name = next;
    onSelect(next);
  };

  useFrame((state) => {
    const g = group.current;
    if (!g) return;

    // Plateau fade: a model holds full opacity across most of its range, then
    // crosses over in a narrow band near the midpoint. Neighbours never overlap
    // (no ghosting), and any resting scroll position shows a clean model.
    const pos = scroll.current.pos;
    const d = Math.abs(pos - index);
    const t = THREE.MathUtils.clamp((d - 0.35) / 0.15, 0, 1);
    const opacity = 1 - t * t * (3 - 2 * t);

    const visible = opacity > 0.001;
    g.visible = visible;
    if (!visible) return;

    // Rotatable joint (concept_13): turn the targeted part around its axis.
    if (joint) joint.rotation[JOINT_AXIS] = state.clock.elapsedTime * JOINT_SPEED;

    const [rx, ry, rz] = poseFor(url);
    // Global (not per-index) scroll spin: every model reads the same angle, so
    // each one picks up exactly where the previous left off — one continuous
    // turntable across the whole scroll. Horizontal drag adds on top.
    const scrollSpin = SPIN_PHASE + pos * SCROLL_SPIN;
    g.rotation.set(rx, drag.current.angle + ry + scrollSpin, rz);
    g.position.y = liftFor(url); // per-model vertical nudge (shadow stays put)
    // slight scale pop so the swap reads as motion, not a blink
    const s = 0.94 + 0.06 * opacity;
    g.scale.setScalar(s);

    // X-ray reveal + tap-to-highlight (split-parts original only). NOTHING moves.
    if (parts.length) {
      const bd = scroll.current.breakdown; // 0 solid → 1 x-rayed
      const selName = selection.current.name;
      // Ease the highlight amount toward 1 when a part is held, else back to 0.
      focus.current += ((selName ? 1 : 0) - focus.current) * 0.12;
      const fc = focus.current;

      for (const p of parts) {
        const isShell = SHELL.has(p.name);
        const isInternal = INTERNALS.has(p.name);
        const isSel = p.name === selName;

        // Base (no part held): the outer shells fade to translucent as you scroll
        // so the guts read through them; the internals stay hidden until the
        // x-ray has begun (they poke past the shell, so the solid hero must not
        // show them); all other parts stay solid.
        let base = 1;
        if (isShell) base = THREE.MathUtils.lerp(1, SHELL_XRAY, bd);
        else if (isInternal) base = THREE.MathUtils.smoothstep(bd, 0.05, 0.5);

        // Highlight: the held part goes full, everything else dims to a ghost.
        let o = base;
        if (fc > 0.001)
          o = isSel
            ? THREE.MathUtils.lerp(base, 1, fc)
            : THREE.MathUtils.lerp(base, SEL_DIM, fc);
        o *= opacity; // model crossfade

        for (const mesh of p.meshes) {
          // Solid parts draw first and write depth; translucent ones draw after
          // (so they don't z-cull what's behind) — keeps the x-ray clean.
          const solid = o > 0.9;
          mesh.renderOrder = solid ? renderOrder : renderOrder + 10;
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;
            mat.opacity = o;
            mat.depthWrite = solid;
          });
        }
      }
    } else {
      object.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.renderOrder = renderOrder;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m) => ((m as THREE.MeshStandardMaterial).opacity = opacity));
      });
    }
  });

  return (
    <group ref={group} onClick={onClick}>
      <primitive object={object} />
    </group>
  );
}

// How many models on each side of the active one are kept mounted. Only these
// have their (heavy, ~1M-vert) geometry decoded + uploaded to the GPU; the rest
// are unmounted so mobile doesn't run out of memory. ±1 keeps the neighbours
// ready so transitions never pop, while never holding more than three at once.
const MOUNT_RADIUS = 1;

export default function Experience({
  models,
  active,
  drag,
  scroll,
  selection,
  didDrag,
  onSelect,
  dark,
  light,
}: {
  models: string[];
  active: number;
  drag: React.MutableRefObject<DragState>;
  scroll: React.MutableRefObject<ScrollState>;
  selection: React.MutableRefObject<SelectionState>;
  didDrag: React.MutableRefObject<boolean>;
  onSelect: (name: string | null) => void;
  dark: boolean;
  light: React.MutableRefObject<LightState>;
}) {
  const bottoms = useRef<number[]>([]);
  const shadow = useRef<THREE.Group>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    scene.background = bgAt(scroll.current.pos, dark).clone();
  }, [scene, dark, scroll]);

  // Preload only the next model (not the previous) so the upcoming transition is
  // smooth without filling the cache with all models simultaneously. On mobile
  // every MB in the useGLTF cache stays resident, so we limit warming to +1.
  useEffect(() => {
    if (models[active + 1]) useGLTF.preload(models[active + 1], true);
  }, [models, active]);

  // Scroll smoothing + the DOM crossfade live in Gallery's rAF loop; here we
  // only read scroll.current.pos (already smoothed) to drive the 3D scene.
  useFrame(() => {
    const pos = scroll.current.pos;

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(bgAt(pos, dark));
    }

    // Steer the key light from the (three-finger-pan-driven) azimuth/elevation.
    if (keyLight.current) {
      const { az, el } = light.current;
      const cosEl = Math.cos(el);
      keyLight.current.position.set(
        LIGHT_RADIUS * cosEl * Math.sin(az),
        LIGHT_RADIUS * Math.sin(el),
        LIGHT_RADIUS * cosEl * Math.cos(az),
      );
    }

    // ground plane sits a touch below the active model's base, so the model
    // reads as hovering just above it
    if (shadow.current) {
      const active = Math.round(pos);
      const base = bottoms.current[active] ?? -1;
      shadow.current.position.y = THREE.MathUtils.lerp(
        shadow.current.position.y,
        base - shadowGapFor(models[active] ?? ""),
        0.15,
      );
    }
  });

  return (
    <>
      <Rig />
      {/* Dark mode dims the ambient image-based fill and leans on the steerable
          key light, so the matte-black product keeps form and the three-finger
          relight reads clearly. */}
      <Environment preset="studio" environmentIntensity={dark ? 0.45 : 0.9} />
      <directionalLight
        ref={keyLight}
        position={[3, 5, 4]}
        intensity={dark ? 1.4 : 1.1}
      />
      <ambientLight intensity={dark ? 0.12 : 0.25} />

      {models.map((url, i) =>
        Math.abs(i - active) <= MOUNT_RADIUS ? (
          <Model
            key={url}
            url={url}
            index={i}
            drag={drag}
            scroll={scroll}
            renderOrder={i}
            bottoms={bottoms}
            selection={selection}
            didDrag={didDrag}
            onSelect={onSelect}
          />
        ) : null,
      )}

      <group ref={shadow} position={[0, -1.05, 0]}>
        <ContactShadows
          opacity={dark ? 0.5 : 0.22}
          blur={2}
          far={3}
          scale={5}
          resolution={256}
          color="#000000"
        />
      </group>
    </>
  );
}
