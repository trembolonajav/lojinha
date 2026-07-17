import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const STORE = path.join(ROOT, "apps", "vpertz-store", "public");
const LAB = path.join(ROOT, "apps", "vpertz-lab", "public");
const MODULES = path.join(ROOT, "node_modules");

const insideRoot = (target) => target.startsWith(ROOT + path.sep);
if (!insideRoot(DIST) || path.basename(DIST) !== "dist") {
  throw new Error("Diretório de saída inválido.");
}

await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });
await fs.cp(STORE, DIST, { recursive: true });
await fs.cp(LAB, path.join(DIST, "vplab"), { recursive: true });

const OCR_VENDOR = path.join(DIST, "vplab", "vendor");
await fs.mkdir(path.join(OCR_VENDOR, "tesseract-core"), { recursive: true });
await fs.mkdir(path.join(OCR_VENDOR, "lang-data"), { recursive: true });
await fs.copyFile(
  path.join(MODULES, "tesseract.js", "dist", "tesseract.min.js"),
  path.join(OCR_VENDOR, "tesseract.min.js")
);
await fs.copyFile(
  path.join(MODULES, "tesseract.js", "dist", "worker.min.js"),
  path.join(OCR_VENDOR, "worker.min.js")
);

for (const coreFile of [
  "tesseract-core.wasm.js",
  "tesseract-core-simd.wasm.js",
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js"
]) {
  await fs.copyFile(
    path.join(MODULES, "tesseract.js-core", coreFile),
    path.join(OCR_VENDOR, "tesseract-core", coreFile)
  );
}

for (const language of ["por", "eng"]) {
  await fs.copyFile(
    path.join(MODULES, "@tesseract.js-data", language, "4.0.0_best_int", `${language}.traineddata.gz`),
    path.join(OCR_VENDOR, "lang-data", `${language}.traineddata.gz`)
  );
}

console.log("Build concluído:");
console.log("  Store    -> dist/");
console.log("  PokeFipe -> dist/pokefipe.html");
console.log("  VPLab    -> dist/vplab/");
console.log("  OCR local -> dist/vplab/vendor/");
