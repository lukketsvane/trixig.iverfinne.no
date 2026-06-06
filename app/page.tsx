import fs from "fs";
import path from "path";
import Gallery from "@/components/Gallery";

// Read whatever .glb files currently live in public/models, so renaming or
// dropping in new redesigns just works — no code change needed.
function listModels() {
  const dir = path.join(process.cwd(), "public", "models");
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".glb"))
    .sort()
    .map((f) => `/models/${f}`);
}

export default function Home() {
  return <Gallery models={listModels()} />;
}
