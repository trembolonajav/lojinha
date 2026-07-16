/* Helpers HTTP compartilhados pelas funções da API.
   Escritos sobre a API crua do Node para funcionar igual
   na Vercel e no dev-server local. */

export function send(res, status, data, headers = {}) {
  const isText = typeof data === "string";
  res.writeHead(status, {
    "Content-Type": isText ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(isText ? data : JSON.stringify(data));
}

/* Lê o corpo cru. Se a Vercel já tiver parseado (req.body), reaproveita. */
export async function readRaw(req, limit = 3 * 1024 * 1024) {
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === "string") return Buffer.from(req.body);
    return Buffer.from(JSON.stringify(req.body));
  }
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("payload-too-large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function readJson(req, limit = 3 * 1024 * 1024) {
  if (req.body !== undefined && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const raw = await readRaw(req, limit);
  return JSON.parse(raw.toString("utf-8") || "{}");
}

export function cookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export function query(req) {
  return new URL(req.url, "http://local").searchParams;
}

/* Anti-CSRF: em requisições que mudam estado, o Origin (quando enviado)
   precisa bater com o host que atendeu a requisição. */
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return !process.env.VERCEL;
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  try {
    const parsed = new URL(origin);
    return parsed.host === host && (parsed.protocol === "https:" || !process.env.VERCEL);
  } catch { return false; }
}

export function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || req.socket?.remoteAddress
    || "unknown";
}
