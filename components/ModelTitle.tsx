"use client";

export type Title = { title: string; claim?: string | null };

// The eyebrow number is taken from the model's filename (e.g.
// trixig_redesign_concept_10 → "10") so the on-screen number always matches the
// GLB it belongs to, regardless of how many models are in the sequence.
export function numberFor(path: string): string {
  const name = (path.split("/").pop() ?? "").replace(/\.glb$/i, "");
  const m = name.match(/(\d+)(?!.*\d)/); // last run of digits in the name
  return m ? m[1].padStart(2, "0") : "01"; // unnumbered (the original) → 01
}

// Derive a Trixig+ design-system title from a model filename. The eyebrow is
// just the running number (01, 02, …) — set in the component from the index.
export function titleFor(path: string): Title {
  const name = (path.split("/").pop() ?? "").replace(/\.glb$/i, "");
  if (/trixig_redesign/i.test(name)) {
    return { title: "Trixig+", claim: "Synleg. Stille. Truverdig." };
  }
  if (/orginal|original|trixig_parts/i.test(name)) {
    return { title: "Trixig", claim: "Originalen" };
  }
  if (/gearbox_motor/i.test(name)) {
    return { title: "Girmotor", claim: null };
  }
  if (/pcb_batteri/i.test(name)) {
    return { title: "Krinskort + batteri", claim: null };
  }
  return { title: name.replace(/[_-]+/g, " "), claim: null };
}

export default function ModelTitle({
  title,
  number,
  visible = true,
}: {
  title: Title;
  number: string;
  visible?: boolean;
}) {
  return (
    <div className={`wrap ${visible ? "" : "faded"}`} aria-live="polite">
      {/* keyed by number so only the text content cross-fades in place — the
          block never moves, so it reads as a fixed, sturdy caption */}
      <div className="block" key={number}>
        <p className="eyebrow">{number}</p>
        <h1 className="title">{title.title}</h1>
        {title.claim && <p className="claim">{title.claim}</p>}
      </div>

      <style jsx>{`
        .wrap {
          position: fixed;
          /* lift above the iOS Safari bottom toolbar (measured via --vv-bottom) */
          bottom: calc(
            env(safe-area-inset-bottom, 0px) + var(--vv-bottom, 0px) + var(--s-5)
          );
          left: calc(env(safe-area-inset-left, 0px) + var(--s-4));
          right: var(--s-4);
          z-index: 3;
          pointer-events: none;
          transition: opacity var(--dur-base) var(--ease-standard);
        }
        .wrap.faded {
          opacity: 0;
        }
        .block {
          animation: fadein var(--dur-base) var(--ease-standard) both;
        }
        .eyebrow {
          font: var(--type-label);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--fg3);
          margin: 0 0 var(--s-2);
        }
        .title {
          font: var(--type-h1);
          letter-spacing: -0.01em;
          color: var(--ink);
          margin: 0;
        }
        .claim {
          font: var(--type-body-bold);
          color: var(--ink);
          margin: var(--s-2) 0 0;
        }
        /* opacity only — no transform — so the caption stays put */
        @keyframes fadein {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .block {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
