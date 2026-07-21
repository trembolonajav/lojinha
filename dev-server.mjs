import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const STORE_ROOT = path.join(ROOT, "apps", "vpertz-store", "public");
const LAB_ROOT = path.join(ROOT, "apps", "vpertz-lab", "public");
const DIST_LAB_VENDOR = path.join(ROOT, "dist", "vplab", "vendor");
const PORT = process.env.PORT || 8736;

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8"
};
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  /* connect-src data: — o núcleo WASM do Tesseract carrega um recurso data:. */
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

function sendFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": fs.statSync(file).size,
    ...SECURITY_HEADERS
  });
  fs.createReadStream(file).pipe(res);
}

function safeStatic(root, pathname, fallbackIndex = false) {
  let rel = pathname;
  if (fallbackIndex && (rel === "" || rel === "/")) rel = "/index.html";
  const file = path.normalize(path.join(root, rel));
  return file.startsWith(root + path.sep) ? file : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  try {
    if (pathname.startsWith("/api/")) {
      const route = pathname.slice(5).replace(/\/+$/, "");
      const file = path.join(ROOT, "api", route + ".js");
      if (!file.startsWith(path.join(ROOT, "api") + path.sep) || !fs.existsSync(file)) {
        res.writeHead(404, SECURITY_HEADERS); return res.end("API não encontrada");
      }
      const mod = await import(pathToFileURL(file).href + "?v=" + fs.statSync(file).mtimeMs);
      return await mod.default(req, res);
    }

    if (pathname.startsWith("/uploads/")) {
      const file = path.join(ROOT, ".data", "uploads", path.basename(pathname));
      if (fs.existsSync(file)) return sendFile(res, file);
      res.writeHead(404, SECURITY_HEADERS); return res.end("Não encontrado");
    }

    /* Fixtures de teste do OCR — somente no servidor local de desenvolvimento. */
    if (pathname.startsWith("/fixtures/")) {
      const fixtureFile = safeStatic(path.join(ROOT, "tests", "fixtures"), pathname.slice("/fixtures".length));
      if (fixtureFile && fs.existsSync(fixtureFile) && fs.statSync(fixtureFile).isFile()) {
        return sendFile(res, fixtureFile);
      }
      res.writeHead(404, SECURITY_HEADERS); return res.end("Não encontrado");
    }

    if (pathname === "/vplab") {
      res.writeHead(308, { Location: "/vplab/", ...SECURITY_HEADERS }); return res.end();
    }
    if (pathname.startsWith("/vplab/vendor/")) {
      const vendorPath = pathname.slice("/vplab/vendor".length);
      const vendorFile = safeStatic(DIST_LAB_VENDOR, vendorPath);
      if (vendorFile && fs.existsSync(vendorFile) && fs.statSync(vendorFile).isFile()) {
        return sendFile(res, vendorFile);
      }
    }
    const isLab = pathname.startsWith("/vplab/");
    const staticPath = isLab ? pathname.slice("/vplab".length) : pathname;
    const file = safeStatic(isLab ? LAB_ROOT : STORE_ROOT, staticPath, true);
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file);

    res.writeHead(404, SECURITY_HEADERS); res.end("Não encontrado");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500, SECURITY_HEADERS);
    res.end("Erro interno");
  }
});

server.listen(PORT, () => {
  console.log(`Vpertz Store: http://127.0.0.1:${PORT}`);
  console.log(`VPLab:       http://127.0.0.1:${PORT}/vplab/`);
  console.log(`Admin:       http://127.0.0.1:${PORT}/admin.html`);
});
