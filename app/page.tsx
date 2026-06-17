import fs from "fs";
import path from "path";
import Gallery from "@/components/Gallery";

// Read whatever .glb files currently live in public/models, so renaming or
// dropping in new redesigns just works — no code change needed.
function listDir(sub: string, ext: string) {
  try {
    return fs
      .readdirSync(path.join(process.cwd(), "public", sub))
      .filter((f) => f.toLowerCase().endsWith(ext))
      .sort()
      .map((f) => `/${sub}/${f}`);
  } catch {
    return [];
  }
}

export default function Home() {
  const all = listDir("models", ".glb");
  const redesigns = all.filter((m) => /trixig_redesign/i.test(m));

  // Section A (before the document): just the original Trixig, split into named
  // parts. It breaks apart on scroll and each internal (motor, pcb, battery) is
  // isolated by tapping it — so the old standalone component models are gone.
  const pre = ["/trixig_parts.glb"];
  // Section C (after the document): the redesigns.
  //
  // Prefer the lightweight v2 series (1.4–1.5 MB each, half the size of the
  // concept files) to stay within iOS WebGL memory limits. If v2 models are
  // present they are shown in filename order; otherwise fall back to a curated
  // selection of the concept series.
  const v2 = redesigns.filter((m) => /v2_/i.test(m)).sort();
  const FALLBACK = ["concept_05", "concept_02", "concept_07", "concept_14"];
  const post =
    v2.length >= 2
      ? v2
      : FALLBACK.map((k) => redesigns.find((m) => m.includes(k))).filter(
          (m): m is string => Boolean(m),
        );

  return <Gallery pre={pre} post={post} pages={listDir("pages", ".jpg")} />;
}
