/* Servidor de desenvolvimento local que emula a Vercel:
   - serve os arquivos estáticos da pasta
   - roteia /api/* para as funções em api/ (mesmos handlers do deploy)
   - serve /uploads/* a partir de .data/uploads (imagens enviadas localmente)
   Uso:  ADMIN_USER=x ADMIN_PASS=y node dev-server.mjs  (porta 8736) */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PORT = process.env.PORT || 8736;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

function sendFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", ...SECURITY_HEADERS });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);

  try {
    /* ---- API: importa o handler correspondente em api/ ---- */
    if (p.startsWith("/api/")) {
      const route = p.slice(5).replace(/\/+$/, "");
      const file = path.join(ROOT, "api", route + ".js");
      if (!file.startsWith(path.join(ROOT, "api")) || !fs.existsSync(file)) {
        res.writeHead(404, SECURITY_HEADERS);
        return res.end("api não encontrada");
      }
      const mod = await import(pathToFileURL(file).href + "?v=" + fs.statSync(file).mtimeMs);
      return await mod.default(req, res);
    }

    /* ---- uploads locais (.data/uploads) ---- */
    if (p.startsWith("/uploads/")) {
      const file = path.join(ROOT, ".data", "uploads", path.basename(p));
      if (fs.existsSync(file)) return sendFile(res, file);
      res.writeHead(404, SECURITY_HEADERS);
      return res.end("não encontrado");
    }

    /* ---- estáticos ---- */
    let rel = p === "/" ? "/index.html" : p;
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) { res.writeHead(403, SECURITY_HEADERS); return res.end("negado"); }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file);

    res.writeHead(404, SECURITY_HEADERS);
    res.end("não encontrado");
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, SECURITY_HEADERS);
    res.end("erro interno: " + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`VP Store dev: http://127.0.0.1:${PORT}`);
  console.log(`Admin:        http://127.0.0.1:${PORT}/admin.html`);
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    console.log("AVISO: defina ADMIN_USER e ADMIN_PASS para conseguir logar no painel.");
  }
});
