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
  return (
    <Gallery models={listDir("models", ".glb")} pages={listDir("pages", ".jpg")} />
  );
}
