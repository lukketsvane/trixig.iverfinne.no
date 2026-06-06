"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, { DragState, ScrollState } from "@/components/Experience";
import ModelTitle, { titleFor } from "@/components/ModelTitle";

export default function Gallery({ models }: { models: string[] }) {
  const count = models.length;
  const drag = useRef<DragState>({ angle: 0, vel: 0 });
  const scroll = useRef<ScrollState>({ target: 0, current: 0 });
  const [active, setActive] = useState(0);

  // Map vertical page scroll -> a 0..(count-1) position the scene crossfades over.
  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      scroll.current.target = p * Math.max(count - 1, 0.0001);
      // the title swaps at the midpoint between models, in step with the fade
      const idx = Math.min(count - 1, Math.max(0, Math.round(scroll.current.target)));
      setActive((prev) => (prev === idx ? prev : idx));
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
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    drag.current.vel = dx * 0.006;
  };
  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <main>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/ikea-logo.webp" alt="IKEA" draggable={false} />

      {count > 0 && <ModelTitle title={titleFor(models[active])} index={active} />}

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
          gl={{ antialias: true }}
          shadows
        >
          <Experience models={models} drag={drag} scroll={scroll} />
        </Canvas>
      </div>

      {/* Empty full-height sections create the vertical scroll + snap points. */}
      {Array.from({ length: count }).map((_, i) => (
        <section key={i} className="panel" />
      ))}

      <style jsx>{`
        .logo {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 24px);
          left: calc(env(safe-area-inset-left, 0px) + 24px);
          z-index: 3;
          width: 76px;
          height: auto;
          border-radius: 8px;
          user-select: none;
          pointer-events: none;
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
        .panel {
          position: relative;
          height: 100dvh;
          width: 100%;
          scroll-snap-align: start;
        }
      `}</style>
      <style jsx global>{`
        html {
          scroll-snap-type: y mandatory;
        }
      `}</style>
    </main>
  );
}
