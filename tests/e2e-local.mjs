import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const port = 18741;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["dev-server.mjs"], {
  cwd: process.cwd(),
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    PORT: String(port),
    ADMIN_USER: "admin",
    ADMIN_PASS: "senha-forte",
    SESSION_SECRET: "segredo-e2e-local-com-mais-de-trinta-caracteres",
    BLOB_READ_WRITE_TOKEN: ""
  }
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`${base}/api/config`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor local não iniciou.\n${output}`);
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  return { response, data };
}

let uploadedFile = null;

try {
  await waitForServer();

  const home = await fetch(base);
  assert.equal(home.status, 200);

  const lab = await fetch(`${base}/vplab/`);
  assert.equal(lab.status, 200);
  assert.match(await lab.text(), /VPLab/);

  const pokeFipe = await fetch(`${base}/pokefipe.html`);
  assert.equal(pokeFipe.status, 200);
  assert.match(await pokeFipe.text(), /PokeFipe/);

  const login = await json(`${base}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base
    },
    body: JSON.stringify({ user: "admin", pass: "senha-forte" })
  });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get("set-cookie").split(";")[0];

  const authHeaders = { Cookie: cookie, Origin: base };
  const current = await json(`${base}/api/admin/config`, {
    headers: { Cookie: cookie }
  });
  assert.equal(current.response.status, 200);
  const original = current.data;

  const image = await fs.readFile(path.join(process.cwd(), "apps", "vpertz-store", "public", "assets", "diamante-pokeidle.webp"));
  const upload = await json(`${base}/api/admin/upload`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "image/webp" },
    body: image
  });
  assert.equal(upload.response.status, 200);
  assert.match(upload.data.url, /^\/uploads\/img-[\w.-]+\.webp$/);
  uploadedFile = path.join(process.cwd(), ".data", "uploads", path.basename(upload.data.url));

  const changed = structuredClone(original);
  changed.banners[0].alt = "TESTE-E2E-BANNER";
  changed.banners[0].img = upload.data.url;

  const saved = await json(`${base}/api/admin/config`, {
    method: "PUT",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(changed)
  });
  assert.equal(saved.response.status, 200);

  const published = await json(`${base}/api/config`);
  assert.equal(published.data.banners[0].alt, "TESTE-E2E-BANNER");
  assert.equal(published.data.banners[0].img, upload.data.url);

  const restored = await json(`${base}/api/admin/config`, {
    method: "PUT",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(original)
  });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.data.banners[0].alt, original.banners[0].alt);

  const logout = await json(`${base}/api/logout`, {
    method: "POST",
    headers: authHeaders
  });
  assert.equal(logout.response.status, 200);

  const afterLogout = await fetch(`${base}/api/admin/config`, {
    headers: { Cookie: logout.response.headers.get("set-cookie").split(";")[0] }
  });
  assert.equal(afterLogout.status, 401);

  console.log("E2E local: Store, PokeFipe, VPLab, login, upload, publicação, restauração e logout OK.");
} finally {
  child.kill();
  if (uploadedFile) await fs.rm(uploadedFile, { force: true });
}
