"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience, {
  DragState,
  ScrollState,
  SelectionState,
  MODEL_LEN,
  partLabel,
} from "@/components/Experience";
import ModelTitle, { titleFor, numberFor } from "@/components/ModelTitle";

const DWELL = 0.6; // extra screens of rest on the last model of a 3D zone
// Scroll devoted to the original's x-ray reveal, BEFORE the model index starts
// advancing: the model holds still (pos 0) while `breakdown` ramps 0→1 over
// BREAKDOWN_SCREENS (shells fade to translucent), then stays x-rayed for
// EXPLODE_HOLD more screens — a calm, full-frame window to tap parts before the
// document rises. (HOLD must exceed 1 so at least a full screen is doc-free.)
const BREAKDOWN_SCREENS = 1.8;
const EXPLODE_HOLD = 2.2;

export default function Gallery({
  pre,
  post,
  pages,
}: {
  pre: string[];
  post: string[];
  pages: string[];
}) {
  // The scene renders one continuous list; the document sits as a scroll "gap"
  // between the pre-doc models (original + components) and the post-doc models
  // (redesigns). countA / countC bound the two 3D zones.
  const models = useMemo(() => [...pre, ...post], [pre, post]);
  const countA = pre.length;
  const countC = post.length;

  const drag = useRef<DragState>({ angle: 0, vel: 0 });
  const scroll = useRef<ScrollState>({
    target: 0,
    pos: 0,
    targetBreakdown: 0,
    breakdown: 0,
  });
  const progressRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inHero, setInHero] = useState(true);
  // Clamp the active index to the current model list — the list can shrink (a
  // model removed) while `active` state lingers at a now-out-of-range value, and
  // models[active] === undefined would otherwise crash titleFor/numberFor.
  const activeIdx = models.length
    ? Math.min(Math.max(active, 0), models.length - 1)
    : 0;

  // Tap-to-isolate selection. The ref drives the 3D loop; `picked` mirrors it to
  // React just for the on-screen label.
  const selection = useRef<SelectionState>({ name: null });
  const selectAtSy = useRef(0);
  const [picked, setPicked] = useState<string | null>(null);
  const selectPart = (name: string | null) => {
    selection.current.name = name;
    if (name) selectAtSy.current = window.scrollY;
    setPicked(name);
  };

  // Scroll room (in screens) for each 3D zone: one MODEL_LEN per gap between
  // models, plus a dwell so the last one rests before/after the document.
  const aScreens =
    BREAKDOWN_SCREENS + Math.max(0, countA - 1) * MODEL_LEN + EXPLODE_HOLD;
  const cScreens = Math.max(0, countC - 1) * MODEL_LEN + DWELL;

  const docRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const clamp = (v: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, v));

    const onScroll = () => {
      const vh = window.innerHeight;
      const sY = window.scrollY;
      const doc = docRef.current;
      const docTop = doc ? doc.offsetTop : aScreens * vh;
      const docH = doc ? doc.offsetHeight : 0;
      const cStart = docTop + docH; // redesigns take over once the doc clears

      let pos: number;
      let hero: boolean;
      let bd = 1; // teardown progress (only meaningful while the original shows)
      if (sY <= docTop) {
        // Zone A: the original's teardown, then original → components.
        const bScroll = BREAKDOWN_SCREENS * vh;
        if (sY < bScroll) {
          // Hold on the original (pos 0) and run the multi-step breakdown.
          pos = 0;
          bd = sY / bScroll;
        } else {
          pos = clamp((sY - bScroll) / vh / MODEL_LEN, 0, countA - 1);
          bd = 1;
        }
        hero = sY < docTop - 0.5 * vh;
      } else if (sY >= cStart) {
        // Zone C: redesigns.
        pos = countA + clamp((sY - cStart) / vh / MODEL_LEN, 0, countC - 1);
        hero = true;
      } else {
        // Document zone. Ramp from the last component to the first redesign over
        // the first half-screen — entirely hidden behind the opaque pages — then
        // hold on the redesign. That way the redesign (not the battery
        // component) is what's revealed as the last page scrolls clear.
        const ramp = clamp((sY - docTop) / (0.5 * vh), 0, 1);
        pos = countA - 1 + ramp;
        hero = false;
      }
      scroll.current.target = pos;
      scroll.current.targetBreakdown = bd;
      // Scrolling away (or collapsing the teardown) releases any isolated part.
      if (
        selection.current.name &&
        (bd < 0.5 || Math.abs(sY - selectAtSy.current) > 60)
      )
        selectPart(null);

      const idx = Math.round(pos);
      setActive((p) => (p === idx ? p : idx));
      setInHero((p) => (p === hero ? p : hero));

      const max = document.documentElement.scrollHeight - vh;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? sY / max : 0})`;
      }

      // Hide the 3D canvas while the document is the active content so no model
      // peeks out from under the PDF pages. It fades out right after the doc
      // takes over and fades the first redesign back in just before zone C.
      let stageOp = 1;
      if (doc && sY > docTop && sY < cStart) {
        const fadeOut = docTop + 0.35 * vh; // gone shortly after entering the doc
        const fadeIn = cStart - 0.85 * vh; // reappear just before the redesigns
        if (sY < fadeOut) stageOp = 1 - (sY - docTop) / (0.35 * vh);
        else if (sY < fadeIn) stageOp = 0;
        else stageOp = (sY - fadeIn) / (cStart - fadeIn);
      }
      if (stageRef.current) {
        stageRef.current.style.opacity = String(clamp(stageOp, 0, 1));
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [countA, countC, aScreens]);

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

  // Smooth the model position + drag in a rAF loop so coarse iOS scroll becomes
  // continuous.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = scroll.current;
      s.pos += (s.target - s.pos) * 0.1;
      s.breakdown += (s.targetBreakdown - s.breakdown) * 0.1;
      drag.current.angle += drag.current.vel;
      drag.current.vel *= 0.9;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Horizontal drag spins the model; `touch-action: pan-y` lets vertical
  // swipes scroll the page natively. We also track whether the pointer moved
  // past a small threshold, so Experience can tell a part-tap from a spin-drag.
  const dragging = useRef(false);
  const lastX = useRef(0);
  const downX = useRef(0);
  const downY = useRef(0);
  const didDrag = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    downX.current = e.clientX;
    downY.current = e.clientY;
    didDrag.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    drag.current.vel = (e.clientX - lastX.current) * 0.006;
    lastX.current = e.clientX;
    if (
      Math.hypot(e.clientX - downX.current, e.clientY - downY.current) > 6
    )
      didDrag.current = true;
  };
  const endDrag = () => {
    dragging.current = false;
  };

  // ---- document page scrubber (iOS-native feel) ----
  const pageEls = useRef<(HTMLImageElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);
  const [scrub, setScrub] = useState(false);

  // The PDF runs many pages; show only a short preview so the document doesn't
  // eat a huge stretch of scroll (no expander — the rest is intentionally cut).
  const PREVIEW_PAGES = 2;
  const shownPages = pages.slice(0, PREVIEW_PAGES);
  // During a scrub the bubble + tick highlight are driven straight through the
  // DOM (no React state per move) and the scroll is coalesced into one write per
  // frame — otherwise iOS re-renders the whole gallery ~60×/s and flickers.
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rafScrub = useRef(0);
  const pendingY = useRef(0);

  useEffect(() => {
    if (!shownPages.length) return;
    const ratios: number[] = new Array(shownPages.length).fill(0);
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
  }, [shownPages.length]);

  // Continuous, proportional scrub: the finger maps across the document only
  // (docTop → its last page), so the redesigns that follow are never scrubbed.
  // Everything here is ref/DOM-driven so a drag triggers no React re-render —
  // the scroll write is coalesced into a single rAF per frame to stop iOS from
  // fighting the gesture (the cause of the flicker).
  const scrubTo = (clientY: number) => {
    const r = stripRef.current?.getBoundingClientRect();
    const doc = docRef.current;
    if (!r || !doc) return;
    const f = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    const docTop = doc.offsetTop;
    const docEnd = docTop + doc.offsetHeight - window.innerHeight;
    pendingY.current = docTop + f * Math.max(0, docEnd - docTop);
    if (!rafScrub.current) {
      rafScrub.current = requestAnimationFrame(() => {
        rafScrub.current = 0;
        window.scrollTo(0, pendingY.current);
      });
    }
    const i = Math.round(f * (pages.length - 1));
    pageRef.current = i;
    // Move the bubble + repaint the active tick directly — no setState.
    const b = bubbleRef.current;
    if (b) {
      b.style.top = `${f * 100}%`;
      b.textContent = String(i + 1);
    }
    const ticks = tickRefs.current;
    for (let t = 0; t < ticks.length; t++)
      ticks[t]?.classList.toggle("on", t === i);
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
  // on release, settle smoothly onto the nearest page and re-sync React state
  const scrubUp = () => {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    if (rafScrub.current) {
      cancelAnimationFrame(rafScrub.current);
      rafScrub.current = 0;
    }
    setScrub(false);
    setPage(pageRef.current);
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

      {models.length > 0 && (
        <ModelTitle
          title={titleFor(models[activeIdx])}
          number={numberFor(models[activeIdx])}
          visible={inHero && !picked}
        />
      )}

      {/* Isolated-part caption (replaces the model title while a part is held) */}
      <div
        className={`partlabel ${picked ? "" : "hidden"}`}
        aria-live="polite"
      >
        <p className="pl-eyebrow">Del</p>
        <h2 className="pl-name">{picked ? partLabel(picked) : ""}</h2>
        <p className="pl-hint">Trykk for å lukke</p>
      </div>

      {/* fixed canvas; the document scrolls up over it, and the canvas fades
          out while the PDF is the active content (see onScroll) */}
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
          onPointerMissed={() => {
            // Tap on empty space (not a drag) releases the isolated part.
            if (!didDrag.current) selectPart(null);
          }}
        >
          <Experience
            models={models}
            active={activeIdx}
            drag={drag}
            scroll={scroll}
            selection={selection}
            didDrag={didDrag}
            onSelect={selectPart}
          />
        </Canvas>
      </div>

      {/* Zone A scroll room (original + components) */}
      <div className="spacer" style={{ height: `${aScreens * 100}dvh` }} />

      {pages.length > 0 && (
        <>
          <section className={`doc ${picked ? "dimmed" : ""}`} ref={docRef}>
            {shownPages.map((src, i) => (
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
            className={`scrub hidden`}
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
              <span
                key={i}
                ref={(el) => {
                  tickRefs.current[i] = el;
                }}
                className={`tk ${i === page ? "on" : ""}`}
              />
            ))}
            <span
              ref={bubbleRef}
              className="bubble"
              style={{ top: `${(page / (pages.length - 1)) * 100}%` }}
            >
              {page + 1}
            </span>
          </div>
        </>
      )}

      {/* Zone C scroll room (redesigns), after the document */}
      <div className="spacer" style={{ height: `${cScreens * 100}dvh` }} />

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
        .partlabel {
          position: fixed;
          bottom: calc(
            env(safe-area-inset-bottom, 0px) + var(--vv-bottom, 0px) + var(--s-5)
          );
          left: calc(env(safe-area-inset-left, 0px) + var(--s-4));
          right: var(--s-4);
          z-index: 3;
          pointer-events: none;
          transition: opacity var(--dur-base) var(--ease-standard);
        }
        .partlabel.hidden {
          opacity: 0;
        }
        .pl-eyebrow {
          font: var(--type-label);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--fg3);
          margin: 0 0 var(--s-2);
        }
        .pl-name {
          font: var(--type-h1);
          letter-spacing: -0.01em;
          color: var(--ink);
          margin: 0;
        }
        .pl-hint {
          font: var(--type-label);
          color: var(--fg3);
          margin: var(--s-2) 0 0;
        }
        .stage {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          z-index: 1;
          touch-action: pan-y;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
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
          transition: opacity var(--dur-base) var(--ease-standard);
        }
        /* While a part is isolated the teardown is a focused mode — clear the
           document out from behind the canvas so nothing intrudes. */
        .doc.dimmed {
          opacity: 0;
          pointer-events: none;
        }
        .page {
          width: 100%;
          max-width: 680px;
          height: auto;
          display: block;
          border: 1px solid var(--rule);
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-user-drag: none;
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
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
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
          /* top is written straight from the finger position during a scrub, so
             it must not transition — only the fade in/out animates */
          transition: opacity var(--dur-fast) var(--ease-standard);
          will-change: top;
          pointer-events: none;
        }
        .scrub.active .bubble {
          opacity: 1;
        }
      `}</style>
    </main>
  );
}
