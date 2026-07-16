/* GET /api/config — configuração pública do site (leitura para todos). */

import { send } from "./_lib/http.mjs";
import { getConfig } from "./_lib/store.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Método não permitido." });
  try {
    send(res, 200, await getConfig());
  } catch (error) {
    console.error("config_read_failed", error);
    send(res, 503, { error: "Configuração temporariamente indisponível." });
  }
}
