/* POST /api/logout — encerra a sessão. */

import { send, sameOrigin } from "./_lib/http.mjs";
import { sessionCookie } from "./_lib/auth.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Método não permitido." });
  if (!sameOrigin(req)) return send(res, 403, { error: "Origem inválida." });
  send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
}
