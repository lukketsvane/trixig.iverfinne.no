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
  const post = redesigns;

  return <Gallery pre={pre} post={post} pages={listDir("pages", ".jpg")} />;
}
