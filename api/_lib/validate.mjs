/* Validação/sanitização server-side de tudo que o painel salva.
   Mesmo autenticado, nada entra no armazenamento sem passar por aqui:
   tipos certos, limites de tamanho, URLs com esquema seguro e
   strings sem < > (defesa extra contra XSS além do escape no frontend). */

import { ICON_KEYS } from "./defaults.mjs";

const str = (v, max) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);

const num = (v, min, max, decimals = 2) => {
  let n = Number(v);
  if (!Number.isFinite(n)) n = min;
  n = Math.min(max, Math.max(min, n));
  return Number(n.toFixed(decimals));
};

const int = (v, min, max) => Math.round(num(v, min, max, 0));

/* Imagens: só caminhos do próprio site, uploads locais ou https. */
function imgUrl(v) {
  const s = String(v ?? "").trim().slice(0, 800);
  if (/^assets\/[\w\-./]+$/i.test(s)) return s;
  if (/^\/uploads\/[\w\-.]+$/i.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  return "";
}

/* Links de navegação: https, http, página interna ou âncora. */
function linkUrl(v) {
  const s = String(v ?? "").trim().slice(0, 500);
  if (s === "") return "";
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^[\w\-./]+\.html([?#][^\s"'<>]*)?$/i.test(s)) return s;
  if (/^#[\w-]*$/.test(s)) return s;
  return "";
}

export function sanitizeConfig(input) {
  if (!input || typeof input !== "object") throw new Error("config inválida");

  const out = {};

  out.whatsapp = String(input.whatsapp ?? "").replace(/\D/g, "").slice(0, 15);
  if (out.whatsapp.length < 10) throw new Error("Número de WhatsApp inválido (use 55 + DDD + número).");

  out.msgNegociar = str(input.msgNegociar, 300) || "Olá! Quero negociar.";

  /* ---- banners ---- */
  if (!Array.isArray(input.banners)) throw new Error("banners inválidos");
  out.banners = input.banners.slice(0, 10).map((b, i) => {
    const img = imgUrl(b?.img);
    if (!img) throw new Error(`Banner ${i + 1}: imagem inválida.`);
    return { img, alt: str(b?.alt, 200), link: linkUrl(b?.link) };
  });

  /* ---- jogos ---- */
  if (!Array.isArray(input.games)) throw new Error("jogos inválidos");
  const ids = new Set();
  out.games = input.games.slice(0, 20).map((g, i) => {
    let id = String(g?.id ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    if (!id) id = `jogo-${i + 1}`;
    while (ids.has(id)) id += "x";
    ids.add(id);

    const img = imgUrl(g?.img);
    if (!img) throw new Error(`Jogo "${g?.nome || i + 1}": arte do card inválida.`);

    const min = int(g?.min, 1, 1000000);
    const max = int(g?.max, 1, 1000000);

    return {
      id,
      nome: str(g?.nome, 80),
      item: str(g?.item, 80) || "Itens",
      unidade: str(g?.unidade, 40) || "item",
      botao: str(g?.botao, 80) || str(g?.nome, 80),
      img,
      icone: imgUrl(g?.icone),
      precoCompra: num(g?.precoCompra, 0, 100000),
      precoVenda: num(g?.precoVenda, 0, 100000),
      min: Math.min(min, max),
      max: Math.max(min, max),
      ativo: Boolean(g?.ativo)
    };
  });

  /* ---- contatos ---- */
  if (!Array.isArray(input.contatos)) throw new Error("contatos inválidos");
  out.contatos = input.contatos.slice(0, 20).map((c) => ({
    icone: ICON_KEYS.includes(c?.icone) ? c.icone : "site",
    nome: str(c?.nome, 40),
    info: str(c?.info, 120),
    url: linkUrl(c?.url)
  }));

  /* trava de tamanho total (config vai para o Blob como JSON) */
  if (JSON.stringify(out).length > 400 * 1024) {
    throw new Error("Configuração grande demais — use imagens enviadas pelo botão de upload, não coladas.");
  }

  return out;
}
