"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, { DragState, ScrollState } from "@/components/Experience";
import ModelTitle, { titleFor } from "@/components/ModelTitle";

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
  const heroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inHero, setInHero] = useState(true); // overlays (logo/title) visible
  const [rendering, setRendering] = useState(true); // canvas at all on screen

  // The hero is `count` screens tall with a sticky canvas; map scroll within it
  // to a 0..(count-1) position the scene crossfades over. Past the hero, the
  // canvas scrolls away and the document pages take over.
  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight;
      const t = Math.min(count - 1, Math.max(0, window.scrollY / vh));
      scroll.current.target = t;
      const idx = Math.round(t);
      setActive((p) => (p === idx ? p : idx));

      const bottom =
        heroRef.current?.getBoundingClientRect().bottom ?? vh * count;
      setInHero((p) => {
        const v = bottom > vh * 0.9;
        return p === v ? p : v;
      });
      setRendering((p) => {
        const v = bottom > 0;
        return p === v ? p : v;
      });

      const max = document.documentElement.scrollHeight - vh;
      const prog = max > 0 ? window.scrollY / max : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${prog})`;
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

      <div className="hero" ref={heroRef} style={{ height: `${count * 100}dvh` }}>
        <div
          className="stage"
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
      </div>

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
          top: calc(env(safe-area-inset-top, 0px) + var(--s-5));
          left: calc(env(safe-area-inset-left, 0px) + var(--s-5));
          z-index: 3;
          width: 60px;
          height: auto;
          user-select: none;
          pointer-events: none;
          transition: opacity var(--dur-slow) var(--ease-standard);
        }
        .logo.faded {
          opacity: 0;
        }
        .hero {
          position: relative;
          width: 100%;
        }
        .stage {
          position: sticky;
          top: 0;
          width: 100%;
          height: 100dvh;
          z-index: 1;
          touch-action: pan-y;
          cursor: grab;
        }
        .stage:active {
          cursor: grabbing;
        }
        .doc {
          position: relative;
          z-index: 2;
          background: var(--grey-100);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--s-3);
          padding: var(--s-3) var(--s-3) calc(env(safe-area-inset-bottom, 0px) + var(--s-7));
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
