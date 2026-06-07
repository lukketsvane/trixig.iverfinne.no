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
  onNext,
}: {
  title: Title;
  index: number;
  visible?: boolean;
  onNext?: () => void;
}) {
  return (
    <div className={`wrap ${visible ? "" : "faded"}`} aria-live="polite">
      {/* keyed by index so the block fades/slides in on each model change */}
      <div className="block" key={index}>
        <p className="eyebrow">{title.eyebrow}</p>
        <h1 className="title">{title.title}</h1>
        {title.claim && <p className="claim">{title.claim}</p>}
      </div>

      {onNext && (
        <button
          className="next"
          onClick={onNext}
          aria-label="Neste"
          type="button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <style jsx>{`
        .wrap {
          position: fixed;
          bottom: calc(env(safe-area-inset-bottom, 0px) + var(--s-5));
          left: calc(env(safe-area-inset-left, 0px) + var(--s-4));
          right: var(--s-4);
          z-index: 3;
          pointer-events: none;
          transition: opacity var(--dur-slow) var(--ease-standard);
        }
        .wrap.faded {
          opacity: 0;
        }
        .block {
          animation: enter var(--dur-slow) var(--ease-standard) both;
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
        .next {
          margin-top: var(--s-3);
          margin-left: calc(-1 * var(--s-2));
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          border-radius: var(--r-pill);
          background: none;
          color: var(--ink);
          cursor: pointer;
          pointer-events: auto;
          -webkit-tap-highlight-color: transparent;
          animation: hint 2.4s var(--ease-standard) infinite;
        }
        .next:active {
          color: var(--ink-3);
        }
        @keyframes hint {
          0%,
          70%,
          100% {
            transform: translateY(0);
          }
          85% {
            transform: translateY(3px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .next {
            animation: none;
          }
        }
        @keyframes enter {
          from {
            opacity: 0;
            transform: translateY(var(--s-2));
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
