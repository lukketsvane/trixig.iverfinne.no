"use client";

export type Title = { eyebrow: string; title: string; claim?: string | null };

// Derive a Trixig+ design-system title from a model filename. Edit the mapping
// here to rename what shows for each model.
export function titleFor(path: string): Title {
  const name = (path.split("/").pop() ?? "").replace(/\.glb$/i, "");
  const pad = (n: string) => n.padStart(2, "0");
  let m: RegExpMatchArray | null;
  if ((m = name.match(/trixig_redesign_0*(\d+)/i))) {
    return {
      eyebrow: `Redesign ${pad(m[1])}`,
      title: "Trixig+",
      claim: "Synleg. Stille. Truverdig.",
    };
  }
  if ((m = name.match(/gearbox_motor_0*(\d+)/i))) {
    return { eyebrow: `Komponent ${pad(m[1])}`, title: "Girmotor", claim: null };
  }
  if (/pcb_batteri/i.test(name)) {
    return { eyebrow: "Komponent", title: "Krinskort + batteri", claim: null };
  }
  return { eyebrow: "Komponent", title: name.replace(/[_-]+/g, " "), claim: null };
}

export default function ModelTitle({
  title,
  index,
  visible = true,
}: {
  title: Title;
  index: number;
  visible?: boolean;
}) {
  return (
    <div className={`wrap ${visible ? "" : "faded"}`} aria-live="polite">
      {/* keyed by index so only the text content cross-fades in place — the
          block never moves, so it reads as a fixed, sturdy caption */}
      <div className="block" key={index}>
        <p className="eyebrow">{title.eyebrow}</p>
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
