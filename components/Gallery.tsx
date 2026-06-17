"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, {
  DragState,
  ScrollState,
  SelectionState,
  LightState,
  LIGHT_DEFAULT,
  MODEL_LEN,
} from "@/components/Experience";

// Extra screens of rest on the last model so it settles before the page ends.
const DWELL = 0.6;

// Detect mobile once at module load so Canvas quality is tuned before first render.
const isMobile =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// A clean vertical scroll-through of finished 3D models — one model per screen,
// crossfading from one to the next. Drag horizontally to spin. The model list
// is whatever sits in public/assets (see app/page.tsx).
export default function Gallery({ models }: { models: string[] }) {
  const count = models.length;

  const drag = useRef<DragState>({ angle: 0, vel: 0 });
  const scroll = useRef<ScrollState>({
    target: 0,
    pos: 0,
    targetBreakdown: 0,
    breakdown: 0,
  });
  // Experience expects these (used only by the old teardown model); inert here.
  const selection = useRef<SelectionState>({ name: null });
  const didDrag = useRef(false);

  // Key-light direction, steered by a three-finger pan (or Shift+drag on
  // desktop). A ref so the rAF/render loop reads it without re-rendering.
  const light = useRef<LightState>({ ...LIGHT_DEFAULT });
  // True while a relight gesture owns the pointer, so the spin/scroll camera
  // controls stay blocked ("hvile" — at rest) until the gesture ends.
  const relighting = useRef(false);

  const progressRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeIdx = count ? Math.min(Math.max(active, 0), count - 1) : 0;

  // One MODEL_LEN of scroll per gap between models, plus a dwell on the last.
  const screens = Math.max(0, count - 1) * MODEL_LEN + DWELL;

  // Map scroll position to a (smoothed) model index.
  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight;
      const sY = window.scrollY;
      const pos =
        count > 1 ? Math.min(count - 1, Math.max(0, sY / vh / MODEL_LEN)) : 0;
      scroll.current.target = pos;
      const idx = Math.round(pos);
      setActive((p) => (p === idx ? p : idx));
      const max = document.documentElement.scrollHeight - vh;
      if (progressRef.current)
        progressRef.current.style.transform = `scaleX(${
          max > 0 ? sY / max : 0
        })`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  // iOS Safari's bottom toolbar overlaps fixed content; measure its inset.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(
        0,
        document.documentElement.clientHeight - vv.height - vv.offsetTop,
      );
      document.documentElement.style.setProperty("--vv-bottom", `${inset}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Smooth the model position + drag spin in a rAF loop (coarse iOS scroll →
  // continuous motion).
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = scroll.current;
      s.pos += (s.target - s.pos) * 0.1;
      drag.current.angle += drag.current.vel;
      drag.current.vel *= 0.9;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Steer the key light: clamp elevation so it never dips under the floor or
  // straight overhead, and wrap azimuth freely. Shared by the touch + desktop
  // gestures (k is the per-pixel sensitivity).
  const relight = (dx: number, dy: number, k = 0.005) => {
    const l = light.current;
    l.az -= dx * k;
    l.el = Math.min(1.45, Math.max(0.1, l.el - dy * k));
  };

  // Three-finger pan steers the light. Registered natively (non-passive) so the
  // gesture can preventDefault — that blocks both page scroll and the spin/
  // scroll "camera" controls while relighting. `relighting` stays latched until
  // the finger count drops below three, so the camera rests for the whole pan.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cx = 0;
    let cy = 0;
    const centroid = (touches: TouchList) => {
      let x = 0;
      let y = 0;
      for (let i = 0; i < touches.length; i++) {
        x += touches[i].clientX;
        y += touches[i].clientY;
      }
      return { x: x / touches.length, y: y / touches.length };
    };
    const start = (e: TouchEvent) => {
      if (e.touches.length < 3) return;
      relighting.current = true;
      const c = centroid(e.touches);
      cx = c.x;
      cy = c.y;
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length < 3) return;
      e.preventDefault(); // block scroll + camera spin during the relight
      relighting.current = true;
      const c = centroid(e.touches);
      relight(c.x - cx, c.y - cy);
      cx = c.x;
      cy = c.y;
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length < 3) relighting.current = false;
    };
    el.addEventListener("touchstart", start, { passive: false });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, []);

  // Horizontal drag spins the model; `touch-action: pan-y` keeps vertical
  // swipes scrolling the page. Shift+drag (desktop) steers the light instead.
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const downX = useRef(0);
  const downY = useRef(0);
  const onPointerDown = (e: React.PointerEvent) => {
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    downX.current = e.clientX;
    downY.current = e.clientY;
    didDrag.current = false;
    if (e.shiftKey && e.pointerType !== "touch") {
      relighting.current = true; // desktop relight; suppress spin
      dragging.current = false;
      return;
    }
    dragging.current = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    // Relight owns the gesture (three-finger touch, handled natively, or
    // Shift+drag here) — keep the camera at rest.
    if (relighting.current) {
      if (e.pointerType !== "touch") {
        relight(e.clientX - lastX.current, e.clientY - lastY.current);
        lastX.current = e.clientX;
        lastY.current = e.clientY;
      }
      return;
    }
    if (!dragging.current) return;
    drag.current.vel = (e.clientX - lastX.current) * 0.006;
    lastX.current = e.clientX;
    if (Math.hypot(e.clientX - downX.current, e.clientY - downY.current) > 6)
      didDrag.current = true;
  };
  const endDrag = (e?: React.PointerEvent) => {
    dragging.current = false;
    // The touch relight clears itself when the finger count drops; only release
    // the desktop (Shift) relight here.
    if (!e || e.pointerType !== "touch") relighting.current = false;
  };

  return (
    <main>
      <div className="progress" ref={progressRef} aria-hidden />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/ikea-logo.webp" alt="IKEA" draggable={false} />

      {count > 0 && (
        <div className="counter" aria-live="polite">
          {String(activeIdx + 1).padStart(2, "0")}
          <span className="sep"> / </span>
          {String(count).padStart(2, "0")}
        </div>
      )}

      {count === 0 && (
        <div className="empty">
          <p>
            Slepp 3D-modellar (.glb) i <code>/public/assets</code>
          </p>
        </div>
      )}

      <div
        className="stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <Canvas
          camera={{ position: [0, 0, 8], fov: 35 }}
          dpr={isMobile ? [1, 1] : [1, 1.5]}
          gl={{
            antialias: !isMobile,
            powerPreference: isMobile ? "default" : "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          performance={{ min: 0.5 }}
          frameloop="always"
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              (e) => e.preventDefault(),
              false,
            );
          }}
        >
          {count > 0 && (
            <Experience
              models={models}
              active={activeIdx}
              drag={drag}
              scroll={scroll}
              selection={selection}
              didDrag={didDrag}
              onSelect={() => {}}
              light={light}
            />
          )}
        </Canvas>
      </div>

      <div className="spacer" style={{ height: `${screens * 100}dvh` }} />

      <style jsx>{`
        .progress {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          z-index: 5;
          background: var(--trixig-blue);
          transform: scaleX(0);
          transform-origin: left center;
          will-change: transform;
          pointer-events: none;
        }
        .logo {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + var(--s-3));
          left: calc(env(safe-area-inset-left, 0px) + var(--s-3));
          z-index: 4;
          width: 96px;
          height: auto;
          user-select: none;
          pointer-events: none;
        }
        .counter {
          position: fixed;
          bottom: calc(
            env(safe-area-inset-bottom, 0px) + var(--vv-bottom, 0px) + var(--s-4)
          );
          left: calc(env(safe-area-inset-left, 0px) + var(--s-4));
          z-index: 3;
          font: var(--type-label);
          letter-spacing: 0.08em;
          color: var(--fg3);
          pointer-events: none;
        }
        .counter .sep {
          opacity: 0.5;
        }
        .empty {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          color: var(--fg3);
          font: var(--type-body);
          text-align: center;
          pointer-events: none;
        }
        .empty code {
          background: var(--grey-100);
          padding: 2px 6px;
          border-radius: var(--r-sm);
        }
        .stage {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          z-index: 1;
          touch-action: pan-y;
          cursor: grab;
        }
        .stage:active {
          cursor: grabbing;
        }
        .spacer {
          width: 100%;
        }
      `}</style>
    </main>
  );
}
