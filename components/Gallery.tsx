"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, {
  DragState,
  ScrollState,
  MODEL_LEN,
} from "@/components/Experience";
import ModelTitle, { titleFor } from "@/components/ModelTitle";

const HOLD = 0.4; // screens the last model dwells before the handoff
const FADE = 1.0; // screens over which the canvas cross-fades into the document

export default function Gallery({
  models,
  pages,
}: {
  models: string[];
  pages: string[];
}) {
  const count = models.length;
  const drag = useRef<DragState>({ angle: 0, vel: 0 });
  const scroll = useRef<ScrollState>({ target: 0, current: 0, pos: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inHero, setInHero] = useState(true);

  const fadeStart = (count - 1) * MODEL_LEN + HOLD;
  const heroScreens = fadeStart + FADE; // document begins here

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight;
      const S = window.scrollY / vh;
      scroll.current.target = S;

      const idx = Math.round(Math.min(count - 1, Math.max(0, S / MODEL_LEN)));
      setActive((p) => (p === idx ? p : idx));

      const fade = Math.min(1, Math.max(0, (S - fadeStart) / FADE));
      const hero = fade < 0.04;
      setInHero((p) => (p === hero ? p : hero));

      const max = document.documentElement.scrollHeight - vh;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count, fadeStart]);

  // Smooth everything in a rAF loop so coarse iOS scroll events become
  // continuous motion (no jaggedy crossfade), and drive the canvas opacity
  // here in the DOM tree where the ref is reliable.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = scroll.current;
      s.current += (s.target - s.current) * 0.1;
      s.pos = Math.min(count - 1, Math.max(0, s.current / MODEL_LEN));
      drag.current.angle += drag.current.vel;
      drag.current.vel *= 0.9;
      if (stageRef.current) {
        const f = Math.min(1, Math.max(0, (s.current - fadeStart) / FADE));
        stageRef.current.style.opacity = String(1 - f * f * (3 - 2 * f));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [count, fadeStart]);

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

  // tap bottom-left to advance to the next model (or into the document)
  const goNext = () => {
    const vh = window.innerHeight;
    const cm = Math.round(
      Math.min(count - 1, Math.max(0, window.scrollY / vh / MODEL_LEN)),
    );
    const top =
      cm < count - 1 ? (cm + 1) * MODEL_LEN * vh : heroScreens * vh + 1;
    window.scrollTo({ top, behavior: "smooth" });
  };

  // right-side document index: track the page nearest the viewport centre
  const pageEls = useRef<(HTMLImageElement | null)[]>([]);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (!pages.length) return;
    const ratios: number[] = new Array(pages.length).fill(0);
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.i);
          ratios[i] = e.isIntersecting ? e.intersectionRatio : 0;
        }
        let best = 0;
        for (let i = 1; i < ratios.length; i++)
          if (ratios[i] > ratios[best]) best = i;
        setPage((p) => (p === best ? p : best));
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    pageEls.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [pages.length]);

  const jump = (i: number) =>
    pageEls.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });

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
          onNext={goNext}
        />
      )}

      {/* fixed canvas layer; cross-fades out (in the render loop) to reveal the document */}
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
          frameloop="always"
          shadows
        >
          <Experience models={models} drag={drag} scroll={scroll} />
        </Canvas>
      </div>

      <div className="spacer" style={{ height: `${heroScreens * 100}dvh` }} />

      {pages.length > 0 && (
        <>
          <section className="doc">
            {pages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                ref={(el) => {
                  pageEls.current[i] = el;
                }}
                data-i={i}
                className="page"
                src={src}
                alt={`Side ${i + 1}`}
                loading="lazy"
                decoding="async"
              />
            ))}
          </section>

          <nav className={`index ${inHero ? "faded" : ""}`} aria-label="Sider">
            {pages.map((_, i) => (
              <button
                key={i}
                className={`tick ${i === page ? "on" : ""}`}
                onClick={() => jump(i)}
                aria-label={`Side ${i + 1}`}
              >
                <span className="n">{i + 1}</span>
              </button>
            ))}
          </nav>
        </>
      )}

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
          border: 1px solid var(--rule);
        }
        .index {
          position: fixed;
          right: calc(env(safe-area-inset-right, 0px) + var(--s-1));
          top: 50%;
          transform: translateY(-50%);
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          transition: opacity var(--dur-base) var(--ease-standard);
        }
        .index.faded {
          opacity: 0;
          pointer-events: none;
        }
        .tick {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 22px;
          height: 14px;
          padding: 0;
          border: 0;
          background: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .tick::after {
          content: "";
          width: 9px;
          height: 2px;
          background: var(--rule-strong);
          transition:
            width var(--dur-fast) var(--ease-standard),
            background var(--dur-fast) var(--ease-standard);
        }
        .tick.on::after {
          width: 18px;
          background: var(--ink);
        }
        .n {
          position: absolute;
          right: 24px;
          font: var(--type-label);
          color: var(--ink);
          opacity: 0;
          transition: opacity var(--dur-fast) var(--ease-standard);
        }
        .tick.on .n {
          opacity: 1;
        }
      `}</style>
    </main>
  );
}
