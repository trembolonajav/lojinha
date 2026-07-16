/* POST /api/login — autentica e grava o cookie de sessão. */

import { send, readJson, sameOrigin, clientIp } from "./_lib/http.mjs";
import { authConfigured, credentialsOk, makeSession, sessionCookie, SESSION_MAX_AGE } from "./_lib/auth.mjs";

/* Rate-limit best-effort por IP (vive enquanto a instância estiver quente).
   8 erros em 15 minutos => bloqueia por 15 minutos. */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

function tooMany(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) { attempts.delete(ip); return false; }
  return a.count >= MAX_FAILS;
}

function registerFail(ip) {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.first > WINDOW_MS) {
    attempts.set(ip, { first: Date.now(), count: 1 });
  } else {
    a.count++;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Método não permitido." });
  if (!sameOrigin(req)) return send(res, 403, { error: "Origem inválida." });

  const ip = clientIp(req);
  if (tooMany(ip)) {
    return send(res, 429, { error: "Muitas tentativas. Aguarde 15 minutos e tente de novo." });
  }

  let body;
  try { body = await readJson(req, 10 * 1024); }
  catch { return send(res, 400, { error: "Corpo inválido." }); }

  if (!authConfigured()) {
    return send(res, 503, {
      error: "Login não configurado: defina ADMIN_USER, ADMIN_PASS e SESSION_SECRET."
    });
  }
  const ok = credentialsOk(body.user, body.pass);

  if (!ok) {
    registerFail(ip);
    await sleep(400); // desacelera força bruta
    return send(res, 401, { error: "Usuário ou senha incorretos." });
  }

  attempts.delete(ip);
  const token = makeSession(String(body.user).slice(0, 40));
  send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE) });
}
