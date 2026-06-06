"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, { DragState, ScrollState } from "@/components/Experience";
import ModelTitle, { titleFor } from "@/components/ModelTitle";

const HOLD = 0.35; // screens the last model dwells before handing off
const FADE = 0.9; // screens over which the canvas cross-fades into the document

function smoothstep(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

export default function Gallery({
  models,
  pages,
}: {
  models: string[];
  pages: string[];
}) {
  const count = models.length;
  const drag = useRef<DragState>({ angle: 0, vel: 0 });
  const scroll = useRef<ScrollState>({ target: 0, current: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inHero, setInHero] = useState(true); // overlays (logo/title) visible
  const [rendering, setRendering] = useState(true); // canvas drawing

  // Scroll length: models, then a dwell + cross-fade, then the document.
  const heroScreens = count - 1 + HOLD + FADE;

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight;
      const sy = window.scrollY;

      // model crossfade position
      scroll.current.target = Math.min(count - 1, Math.max(0, sy / vh));
      const idx = Math.round(scroll.current.target);
      setActive((p) => (p === idx ? p : idx));

      // hero -> document cross-fade (the canvas dissolves into page 1)
      const fade = smoothstep((sy - (count - 1 + HOLD) * vh) / (FADE * vh));
      const stage = stageRef.current;
      if (stage) {
        stage.style.opacity = String(1 - fade);
        stage.style.pointerEvents = fade > 0.001 ? "none" : "auto";
      }
      setInHero((p) => {
        const v = fade < 0.04;
        return p === v ? p : v;
      });
      setRendering((p) => {
        const v = fade < 0.999;
        return p === v ? p : v;
      });

      const max = document.documentElement.scrollHeight - vh;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? sy / max : 0})`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  // Horizontal drag spins the model; `touch-action: pan-y` lets vertical
  // swipes scroll the page natively, so the two gestures never fight.
  const dragging = useRef(false);
  const lastX = useRef(0);
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    drag.current.vel = (e.clientX - lastX.current) * 0.006;
    lastX.current = e.clientX;
  };
  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <main>
      <div className="progress" ref={progressRef} aria-hidden />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`logo ${inHero ? "" : "faded"}`}
        src="/ikea-logo.webp"
        alt="IKEA"
        draggable={false}
      />

      {count > 0 && (
        <ModelTitle
          title={titleFor(models[active])}
          index={active}
          visible={inHero}
        />
      )}

      {/* fixed canvas layer; cross-fades out to reveal the document beneath */}
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
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          performance={{ min: 0.5 }}
          frameloop={rendering ? "always" : "never"}
          shadows
        >
          <Experience models={models} drag={drag} scroll={scroll} />
        </Canvas>
      </div>

      {/* spacer creates the scroll length for the model showcase + handoff */}
      <div className="spacer" style={{ height: `${heroScreens * 100}dvh` }} />

      {pages.length > 0 && (
        <section className="doc">
          {pages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              className="page"
              src={src}
              alt={`Side ${i + 1}`}
              loading="lazy"
              decoding="async"
            />
          ))}
        </section>
      )}

      <style jsx>{`
        .progress {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          z-index: 4;
          background: var(--trixig-blue);
          transform: scaleX(0);
          transform-origin: left center;
          will-change: transform;
          pointer-events: none;
        }
        .logo {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + var(--s-4));
          left: calc(env(safe-area-inset-left, 0px) + var(--s-4));
          z-index: 3;
          width: 84px;
          height: auto;
          user-select: none;
          pointer-events: none;
          transition: opacity var(--dur-slow) var(--ease-standard);
        }
        .logo.faded {
          opacity: 0;
        }
        .stage {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          z-index: 2;
          touch-action: pan-y;
          cursor: grab;
          will-change: opacity;
        }
        .stage:active {
          cursor: grabbing;
        }
        .spacer {
          width: 100%;
        }
        .doc {
          position: relative;
          z-index: 1;
          background: var(--grey-100);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--s-2);
          padding: var(--s-2) var(--s-2) calc(env(safe-area-inset-bottom, 0px) + var(--s-6));
        }
        .page {
          width: 100%;
          max-width: 680px;
          height: auto;
          display: block;
          /* IKEA is flat: separate planes with a hairline, never a shadow */
          border: 1px solid var(--rule);
        }
      `}</style>
    </main>
  );
}
