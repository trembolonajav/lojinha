/* POST /api/admin/upload — recebe uma imagem (corpo cru) e devolve { url }.
   Autenticado. Valida tipo real pelos bytes iniciais e limita a 2,5MB. */

import crypto from "node:crypto";
import { send, readRaw, sameOrigin } from "../_lib/http.mjs";
import { requireAuth } from "../_lib/auth.mjs";
import { putImage } from "../_lib/store.mjs";

const MAX_BYTES = 2.5 * 1024 * 1024;

/* Detecta o formato real pelos magic bytes — o Content-Type não é confiável. */
function sniff(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  if (buf.length > 6 && buf.toString("ascii", 0, 4) === "GIF8") {
    return { ext: "gif", mime: "image/gif" };
  }
  return null;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return send(res, 405, { error: "Método não permitido." });
  if (!sameOrigin(req)) return send(res, 403, { error: "Origem inválida." });

  let buf;
  try { buf = await readRaw(req, MAX_BYTES); }
  catch { return send(res, 413, { error: "Imagem grande demais (máx. 2,5MB)." }); }

  if (!buf || buf.length < 32) return send(res, 400, { error: "Arquivo vazio." });

  const kind = sniff(buf);
  if (!kind) {
    return send(res, 415, { error: "Formato não aceito — envie PNG, JPG, WebP ou GIF." });
  }

  const name = `img-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${kind.ext}`;
  const url = await putImage(name, buf, kind.mime);
  send(res, 200, { url });
}
