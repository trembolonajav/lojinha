import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("CSP da Vercel permite somente a compilação WebAssembly exigida pelo OCR", () => {
  const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"));
  const globalRule = config.headers.find((entry) => entry.source === "/(.*)");
  const csp = globalRule.headers.find((header) => header.key === "Content-Security-Policy").value;
  const tokens = csp.split(/\s+/);

  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval'/);
  assert.match(csp, /worker-src 'self' blob:/);
  assert.equal(tokens.includes("'unsafe-eval'"), false);
  assert.equal(csp.includes("cdn.jsdelivr.net"), false);
});
