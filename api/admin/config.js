/* /api/admin/config — leitura e gravação da configuração (autenticado).
   GET             -> config atual (?defaults=1 devolve a config-semente)
   PUT             -> valida, sanitiza e salva; entra no ar na hora. */

import { send, readJson, sameOrigin, query } from "../_lib/http.mjs";
import { requireAuth } from "../_lib/auth.mjs";
import { getConfig, setConfig } from "../_lib/store.mjs";
import { sanitizeConfig } from "../_lib/validate.mjs";
import { DEFAULT_CONFIG } from "../_lib/defaults.mjs";

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === "GET") {
    if (query(req).get("defaults") === "1") {
      return send(res, 200, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    }
    try {
      return send(res, 200, await getConfig());
    } catch (error) {
      console.error("admin_config_read_failed", error);
      return send(res, 503, { error: "Armazenamento temporariamente indisponível." });
    }
  }

  if (req.method === "PUT") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Origem inválida." });

    let body;
    try { body = await readJson(req, 600 * 1024); }
    catch { return send(res, 400, { error: "Corpo inválido ou grande demais." }); }

    let clean;
    try { clean = sanitizeConfig(body); }
    catch (e) { return send(res, 422, { error: e.message }); }

    try {
      await setConfig(clean);
      return send(res, 200, clean);
    } catch (error) {
      console.error("admin_config_write_failed", error);
      return send(res, 503, { error: "Não foi possível gravar no armazenamento." });
    }
  }

  send(res, 405, { error: "Método não permitido." });
}
