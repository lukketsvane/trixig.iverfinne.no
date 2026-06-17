import fs from "fs";
import path from "path";
import Gallery from "@/components/Gallery";

// The site is just a vertical scroll-through of finished 3D models. Drop a
// ready `.glb` (with its material baked in) into public/assets and it shows up,
// in filename order — no code change needed. Prefix files 01_, 02_, … to order.
function listAssets() {
  try {
    return fs
      .readdirSync(path.join(process.cwd(), "public", "assets"))
      .filter((f) => f.toLowerCase().endsWith(".glb"))
      .sort()
      .map((f) => `/assets/${f}`);
  } catch {
    return [];
  }
}

export default function Home() {
  return <Gallery models={listAssets()} />;
}
