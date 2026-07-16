/* Autenticação do painel: credenciais em variáveis de ambiente,
   sessão em cookie HttpOnly assinado com HMAC-SHA256. */

import crypto from "node:crypto";
import { cookies, send } from "./http.mjs";

const SESSION_HOURS = 12;

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // fallback: deriva do ADMIN_PASS para não quebrar se esquecerem a env
  if (process.env.ADMIN_PASS) {
    return crypto.createHash("sha256").update("vp-fallback:" + process.env.ADMIN_PASS).digest("hex");
  }
  return "dev-secret-local";
}

/* Comparação em tempo constante (hash primeiro para igualar tamanhos). */
function safeEq(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/* true/false, ou null se as envs não foram configuradas. */
export function credentialsOk(user, pass) {
  const U = process.env.ADMIN_USER;
  const P = process.env.ADMIN_PASS;
  if (!U || !P) return null;
  const okUser = safeEq(user || "", U);
  const okPass = safeEq(pass || "", P);
  return okUser && okPass;
}

const hmac = (data) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function makeSession(user) {
  const payload = Buffer.from(JSON.stringify({
    u: user,
    exp: Date.now() + SESSION_HOURS * 3600 * 1000
  })).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function sessionUser(token) {
  if (!token || !token.includes(".")) return null;
  const dot = token.lastIndexOf(".");
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEq(sig, hmac(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data.u || null;
  } catch { return null; }
}

export function sessionCookie(token, maxAgeSeconds) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `vp_sess=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

/* Responde 401 e devolve null se não autenticado. */
export function requireAuth(req, res) {
  const user = sessionUser(cookies(req).vp_sess);
  if (!user) {
    send(res, 401, { error: "Não autenticado." });
    return null;
  }
  return user;
}

export const SESSION_MAX_AGE = SESSION_HOURS * 3600;
