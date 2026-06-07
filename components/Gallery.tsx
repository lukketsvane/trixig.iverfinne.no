"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, {
  DragState,
  ScrollState,
  MODEL_LEN,
} from "@/components/Experience";
import ModelTitle, { titleFor } from "@/components/ModelTitle";

const DWELL = 0.6; // extra screens on the last model before the document

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
  const progressRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inHero, setInHero] = useState(true);

  const showcaseScreens = (count - 1) * MODEL_LEN + DWELL; // document begins here

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight;
      const S = window.scrollY / vh;
      scroll.current.target = S;

      const idx = Math.round(Math.min(count - 1, Math.max(0, S / MODEL_LEN)));
      setActive((p) => (p === idx ? p : idx));

      // title shows over the showcase; hide it as the document slides up
      const hero = S < showcaseScreens - 0.5;
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
  }, [count, showcaseScreens]);

  // iOS Safari's bottom toolbar overlaps fixed bottom content; measure it so the
  // title can sit just above it.
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

  // Smooth scroll + drag in a rAF loop so coarse iOS scroll becomes continuous.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = scroll.current;
      s.current += (s.target - s.current) * 0.1;
      s.pos = Math.min(count - 1, Math.max(0, s.current / MODEL_LEN));
      drag.current.angle += drag.current.vel;
      drag.current.vel *= 0.9;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  // Horizontal drag spins the model; `touch-action: pan-y` lets vertical
  // swipes scroll the page natively.
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

  // ---- document page scrubber (iOS-native feel) ----
  const pageEls = useRef<(HTMLImageElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLElement>(null);
  const scrubbing = useRef(false);
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);
  const [scrub, setScrub] = useState(false);
  const [thumb, setThumb] = useState(0); // 0..1 finger position while scrubbing

  useEffect(() => {
    if (!pages.length) return;
    const ratios: number[] = new Array(pages.length).fill(0);
    const obs = new IntersectionObserver(
      (entries) => {
        if (scrubbing.current) return;
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.i);
          ratios[i] = e.isIntersecting ? e.intersectionRatio : 0;
        }
        let best = 0;
        for (let i = 1; i < ratios.length; i++)
          if (ratios[i] > ratios[best]) best = i;
        pageRef.current = best;
        setPage((p) => (p === best ? p : best));
      },
      { threshold: [0, 0.5, 1] },
    );
    pageEls.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [pages.length]);

  // Continuous, proportional scrub: the finger position maps across the whole
  // document so scrolling follows the finger smoothly (no page-snapping jumps).
  const scrubTo = (clientY: number) => {
    const r = stripRef.current?.getBoundingClientRect();
    const doc = docRef.current;
    if (!r || !doc) return;
    const f = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    const docTop = doc.offsetTop;
    const docEnd = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, docTop + f * (docEnd - docTop));
    const i = Math.round(f * (pages.length - 1));
    pageRef.current = i;
    setPage(i);
    setThumb(f);
  };
  const scrubDown = (e: React.PointerEvent) => {
    scrubbing.current = true;
    setScrub(true);
    stripRef.current?.setPointerCapture(e.pointerId);
    scrubTo(e.clientY);
  };
  const scrubMove = (e: React.PointerEvent) => {
    if (scrubbing.current) scrubTo(e.clientY);
  };
  // on release, settle smoothly onto the nearest page
  const scrubUp = () => {
    scrubbing.current = false;
    setScrub(false);
    const el = pageEls.current[pageRef.current];
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY,
        behavior: "smooth",
      });
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
        <ModelTitle title={titleFor(models[active])} index={active} visible={inHero} />
      )}

      {/* fixed canvas; the document scrolls up over it (no fade) */}
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
          frameloop="always"
          shadows
        >
          <Experience models={models} drag={drag} scroll={scroll} />
        </Canvas>
      </div>

      <div className="spacer" style={{ height: `${showcaseScreens * 100}dvh` }} />

      {pages.length > 0 && (
        <>
          <section className="doc" ref={docRef}>
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

          <div
            className={`scrub ${inHero ? "hidden" : ""} ${scrub ? "active" : ""}`}
            ref={stripRef}
            onPointerDown={scrubDown}
            onPointerMove={scrubMove}
            onPointerUp={scrubUp}
            onPointerCancel={scrubUp}
            role="slider"
            aria-label="Bla i sider"
            aria-valuenow={page + 1}
            aria-valuemin={1}
            aria-valuemax={pages.length}
          >
            {pages.map((_, i) => (
              <span key={i} className={`tk ${i === page ? "on" : ""}`} />
            ))}
            <span
              className="bubble"
              style={{
                top: `${(scrub ? thumb : page / (pages.length - 1)) * 100}%`,
              }}
            >
              {page + 1}
            </span>
          </div>
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
        .doc {
          position: relative;
          z-index: 2;
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

        /* ---- iOS-style page scrubber ---- */
        .scrub {
          position: fixed;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: min(62vh, 560px);
          width: 44px;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          padding-right: calc(env(safe-area-inset-right, 0px) + var(--s-2));
          touch-action: none;
          transition: opacity var(--dur-base) var(--ease-standard);
        }
        .scrub.hidden {
          opacity: 0;
          pointer-events: none;
        }
        .tk {
          width: 8px;
          height: 1.5px;
          background: var(--rule-strong);
          border-radius: 1px;
          transition:
            width var(--dur-fast) var(--ease-standard),
            background var(--dur-fast) var(--ease-standard);
        }
        .tk.on {
          width: 16px;
          background: var(--ink);
        }
        .scrub.active .tk {
          width: 12px;
        }
        .scrub.active .tk.on {
          width: 22px;
        }
        .bubble {
          position: absolute;
          right: calc(env(safe-area-inset-right, 0px) + var(--s-5));
          transform: translateY(-50%);
          min-width: 40px;
          height: 40px;
          padding: 0 var(--s-2);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ink);
          color: var(--paper);
          border-radius: var(--r-md);
          font: var(--type-h3);
          opacity: 0;
          transition: opacity var(--dur-fast) var(--ease-standard);
          pointer-events: none;
        }
        .scrub.active .bubble {
          opacity: 1;
        }
      `}</style>
    </main>
  );
}
