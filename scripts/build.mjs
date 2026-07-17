import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const STORE = path.join(ROOT, "apps", "vpertz-store", "public");
const LAB = path.join(ROOT, "apps", "vpertz-lab", "public");

const insideRoot = (target) => target.startsWith(ROOT + path.sep);
if (!insideRoot(DIST) || path.basename(DIST) !== "dist") {
  throw new Error("Diretório de saída inválido.");
}

await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });
await fs.cp(STORE, DIST, { recursive: true });
await fs.cp(LAB, path.join(DIST, "vplab"), { recursive: true });

console.log("Build concluído:");
console.log("  Store    -> dist/");
console.log("  PokeFipe -> dist/pokefipe.html");
console.log("  VPLab    -> dist/vplab/");
