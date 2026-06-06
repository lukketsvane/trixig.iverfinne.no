"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, { DragState, ScrollState } from "@/components/Experience";

export default function Gallery({ models }: { models: string[] }) {
  const count = models.length;
  const drag = useRef<DragState>({ angle: 0, vel: 0 });
  const scroll = useRef<ScrollState>({ target: 0, current: 0 });

  // Map vertical page scroll -> a 0..(count-1) position the scene crossfades over.
  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      scroll.current.target = p * Math.max(count - 1, 0.0001);
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
          <color attach="background" args={["#ededed"]} />
          <Experience models={models} drag={drag} scroll={scroll} />
        </Canvas>
      </div>

      {/* Empty full-height sections create the vertical scroll + snap points. */}
      {Array.from({ length: count }).map((_, i) => (
        <section key={i} className="panel" />
      ))}

      <style jsx>{`
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
