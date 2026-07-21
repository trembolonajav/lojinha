/* Aba de Profissões — testes de comportamento e contrato.

   O professions-ui.js roda de verdade dentro de um DOM (linkedom), então os
   testes leem o markup realmente produzido. Contratos que dependem de layout
   (overflow horizontal a 390px, header coberto no scroll, coerência entre a
   media query da tabela e o transbordo real) foram validados no navegador —
   ver a entrega; não há teste falso baseado em busca de string para eles. */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";

const LAB = path.join(process.cwd(), "apps", "vpertz-lab", "public");
const SOURCE = fs.readFileSync(path.join(LAB, "professions-ui.js"), "utf8");
const CSS = fs.readFileSync(path.join(LAB, "professions.css"), "utf8");

/* Asserções falam sobre declarações, não sobre texto de comentário. */
const semComentarios = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const CSS_DECL = semComentarios(CSS);
const JS_DECL = semComentarios(SOURCE);

function mountProfessions() {
  const { window, document } = parseHTML(`<!doctype html><html><body>
    <header></header>
    <main><section class="panel card professions-lab" id="tab-profissoes"></section></main>
  </body></html>`);
  const proto = window.Element.prototype;
  if (!proto.getBoundingClientRect) proto.getBoundingClientRect = () => ({ width: 800, height: 40, top: 0, bottom: 40, left: 0, right: 800 });
  const scope = { document, window, ResizeObserver: undefined, console };
  new Function(...Object.keys(scope), SOURCE)(...Object.values(scope));
  return { document, root: document.querySelector("#tab-profissoes") };
}

const { root } = mountProfessions();
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];

/* ---------------------------------------------- hierarquia */

test("1. o Treinador de Prestígio vem antes das profissões indisponíveis", () => {
  const secoes = [...root.children].map((el) => el.className.split(" ")[0]);
  const ativa = secoes.indexOf("profession-active");
  const outras = secoes.indexOf("profession-others");
  assert.ok(ativa >= 0, "a seção da profissão ativa precisa existir");
  assert.ok(outras >= 0, "a seção das outras profissões precisa existir");
  assert.ok(ativa < outras, `a ativa (${ativa}) precisa vir antes das outras (${outras})`);
  assert.equal($(".profession-active h3").textContent.trim(), "Treinador de Prestígio");

  /* e o conteúdo principal (ranks e requisitos) pertence à ativa, não às outras */
  const ranks = secoes.indexOf("profession-section");
  assert.ok(ranks > ativa && ranks < outras, "as seções de progressão ficam entre a ativa e as outras");
});

test("2. existe exatamente uma profissão marcada como ativa", () => {
  assert.equal($$(".profession-active").length, 1);
  assert.equal($$(".profession-badge").length, 1);
  assert.match($(".profession-badge").textContent, /dispon[ií]vel/i);
  /* as outras três continuam visíveis, sem badge de ativa */
  const outras = $$(".profession-upcoming li");
  assert.equal(outras.length, 3);
  for (const item of outras) assert.equal(item.querySelector(".profession-badge"), null);
  const nomes = outras.map((li) => li.querySelector("h4").textContent.trim());
  assert.deepEqual(nomes, ["Botânico", "Cientista", "Pesquisador Pokémon"]);
});

test("3. profissões indisponíveis não são interativas", () => {
  const upcoming = $(".profession-upcoming");
  assert.equal(upcoming.querySelector("button, a, [role='button'], [tabindex]"), null,
    "cards indisponíveis não podem ser botões nem entrar no tab order");
  assert.equal(upcoming.querySelector("[aria-disabled]"), null,
    "aria-disabled em elemento não interativo é semântica errada");
  /* o estado é comunicado por texto visível, não só por opacidade */
  for (const item of $$(".profession-upcoming li")) {
    assert.match(item.textContent, /em desenvolvimento/i);
  }
  assert.equal(/\.profession-upcoming[^{]*\{[^}]*opacity/.test(CSS_DECL.replace(/\s/g, "")), false,
    "o estado indisponível não pode depender de opacity");
});

/* ---------------------------------------------- ícones */

test("4. nenhum emoji sobrou como ícone no markup da aba", () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2728}\u{2699}]/u;
  const html = root.innerHTML;
  assert.equal(emoji.test(html), false, `emoji encontrado: ${html.match(emoji)?.[0]}`);
  /* e nenhum emoji ficou escondido no código-fonte como conteúdo */
  assert.equal(emoji.test(JS_DECL), false, "emoji ainda presente no professions-ui.js");
});

test("5. todo ícone aponta para um asset local que existe em disco", () => {
  const icones = $$(".prof-icon");
  assert.equal(icones.length, 2, "as duas mecânicas mantêm ícones vetoriais do VPLab");
  const vistos = new Set();
  for (const el of icones) {
    const url = (el.getAttribute("style") || "").match(/url\('([^']+)'\)/)?.[1];
    assert.ok(url, "o ícone precisa declarar --prof-icon");
    assert.match(url, /^assets\/professions\/[a-z-]+\.svg$/);
    const abs = path.join(LAB, url);
    assert.ok(fs.existsSync(abs), `arquivo ausente: ${url}`);
    const svg = fs.readFileSync(abs, "utf8");
    assert.match(svg, /^<svg[^>]*viewBox="0 0 24 24"/, `${url} precisa usar o mesmo viewBox`);
    assert.match(svg, /stroke="currentColor"/, `${url} precisa herdar a cor`);
    vistos.add(url);
  }
  assert.equal(vistos.size, 2, "cada ícone vetorial é um arquivo distinto");
  const oficiais = $$(".prof-official-icon");
  assert.equal(oficiais.length, 14, "1 profissão ativa + 3 futuras + 10 talentos oficiais");
  const pngs = new Set();
  for (const image of oficiais) {
    const url = image.getAttribute("src");
    assert.match(url, /^assets\/professions\/official\/[a-z_]+\.png$/);
    assert.ok(fs.existsSync(path.join(LAB, url)), `arquivo oficial ausente: ${url}`);
    pngs.add(url);
  }
  assert.equal(pngs.size, 14, "cada sprite oficial é um arquivo distinto");
  /* a cor vem do CSS via máscara, o que permite estado ativo x indisponível */
  const compact = CSS_DECL.replace(/\s/g, "");
  assert.ok(compact.includes("background-color:currentColor"));
  assert.ok(/mask:var\(--prof-icon\)/.test(compact));
});

/* ---------------------------------------------- talentos */

test("6 e 7. não sobrou botão nem modal redundante de talentos", () => {
  assert.equal($("[data-talents]"), null, "o botão que só abria um aviso foi removido");
  assert.equal($("[data-talents-modal]"), null, "o modal redundante foi removido");
  assert.equal($(".talents-modal"), null);
  assert.equal(root.querySelector("[role='dialog']"), null, "a aba não tem mais diálogo");
  /* e o CSS do modal não ficou órfão */
  assert.equal(/\.talents-modal/.test(CSS_DECL), false, "CSS do modal removido ainda presente");
  /* nem handlers órfãos apontando para os seletores removidos */
  assert.equal(/data-talents(-close|-modal)?\b/.test(JS_DECL), false, "handler órfão de talentos");
});

test("8. a mensagem de transparência sobre a árvore de talentos permanece", () => {
  const secao = $(".talents-preview");
  assert.ok(secao, "a seção de transparência precisa existir");
  assert.equal($$(".talents-preview").length, 1, "a mensagem aparece uma única vez");
  const texto = secao.textContent;
  assert.match(texto, /ainda não (está ativo|disponível)/i);
  assert.match(texto, /pontos, caminhos e efeitos ainda estão em desenvolvimento/i, "precisa indicar o estado atual dos talentos");
  assert.match(texto, /será atualizada/i, "precisa informar que a seção acompanhará o lançamento");
  /* continua sendo um bloco de conteúdo futuro, com a borda tracejada */
  assert.ok(/\.talents-preview\{[^}]*border:1pxdashed/.test(CSS_DECL.replace(/\s/g, "")));
});

/* ---------------------------------------------- tabela */

test("9. a tabela tem semântica de cabeçalhos correta", () => {
  const table = $(".profession-table-wrap table");
  assert.ok(table);
  assert.ok(table.querySelector("caption"), "a tabela precisa de caption");
  const colHeaders = [...table.querySelectorAll("thead th")];
  assert.equal(colHeaders.length, 4);
  for (const th of colHeaders) assert.equal(th.getAttribute("scope"), "col");
  const rowHeaders = [...table.querySelectorAll("tbody th")];
  assert.equal(rowHeaders.length, 5, "cinco transições de rank (E→D até A→S)");
  for (const th of rowHeaders) assert.equal(th.getAttribute("scope"), "row");
  /* nenhuma célula de dado virou cabeçalho por engano */
  assert.equal(table.querySelectorAll("tbody tr").length, 5);
  assert.equal(table.querySelectorAll("tbody td").length, 15);
});

test("10. o container da tabela é rolável, focável e rotulado", () => {
  const wrap = $(".profession-table-wrap");
  assert.equal(wrap.getAttribute("tabindex"), "0", "precisa ser alcançável pelo teclado");
  assert.equal(wrap.getAttribute("role"), "region");
  const rotulo = wrap.getAttribute("aria-labelledby");
  assert.ok(rotulo && root.querySelector(`#${rotulo}`), "o rótulo precisa resolver");

  const compact = CSS_DECL.replace(/\s/g, "");
  assert.ok(compact.includes(".profession-table-wrap{position:relative;overflow-x:auto}"));
  /* o aviso de rolagem existe e é escondido por padrão, aparecendo só na media query */
  assert.ok($(".profession-table-hint"), "o aviso de rolagem precisa existir");
  assert.ok(compact.includes(".profession-table-hint{display:none}"), "escondido por padrão");
  assert.ok(/@media\(max-width:789px\)\{[^@]*\.profession-table-hint\{display:block/.test(compact),
    "o aviso só aparece na faixa em que a tabela realmente transborda");
  /* o foco do container tem indicação visível */
  assert.ok(compact.includes(".profession-table-wrap:focus-visible{outline:2pxsolidvar(--gold)"));
});

/* ---------------------------------------------- tipografia e CSS */

test("11. nenhum texto informativo usa fonte abaixo de 11px", () => {
  const sizes = [...CSS_DECL.matchAll(/font-size:\s*([0-9.]+)px/g)].map((m) => Number(m[1]));
  const abaixo = [...new Set(sizes.filter((s) => s < 11))];
  /* 10px é permitido apenas na badge */
  assert.deepEqual(abaixo, [10], `tamanhos abaixo de 11px: ${abaixo.join(", ")}`);
  const badgeRule = CSS_DECL.match(/\.profession-badge\{[^}]*\}/)[0];
  assert.match(badgeRule, /font-size:10px/, "o único 10px precisa ser o da badge");

  /* e a escala não voltou a ter valores fracionados */
  const permitidos = new Set([10, 11, 12, 13, 14, 16, 20, 26, 32]);
  const fora = [...new Set(sizes)].filter((s) => !permitidos.has(s));
  assert.deepEqual(fora, [], `fora da escala: ${fora.join(", ")}px`);
});

test("12. nenhum seletor removido continua referenciado, e vice-versa", () => {
  const markupClasses = new Set([...root.classList, ...$$("[class]").flatMap((el) => [...el.classList])]);
  const cssClasses = new Set(
    [...CSS_DECL.matchAll(/\.(prof-[a-z-]*|profession-[a-z-]*|rank-[a-z-]*|talents?-[a-z-]*|requirement-[a-z-]*)/g)].map((m) => m[1])
  );
  const orfas = [...cssClasses].filter((c) => !markupClasses.has(c) && c !== "sr-only");
  assert.deepEqual(orfas, [], `CSS sem markup: ${orfas.join(", ")}`);

  /* classes do layout antigo não podem ressuscitar */
  for (const morto of ["profession-picker", "prestige-overview", "prestige-title", "prestige-mark", "talents-modal", "talent-lock", "prof-release-dot"]) {
    assert.equal(CSS_DECL.includes(`.${morto}`), false, `.${morto} é resquício do layout anterior`);
    assert.equal(root.querySelector(`.${morto}`), null, `.${morto} ainda no markup`);
  }
});

/* ---------------------------------------------- conteúdo e acessibilidade */

test("13. os dados de progressão continuam completos e sem invenção", () => {
  const texto = root.textContent;
  /* seis ranks, com o bônus documentado de +3% a +18% */
  const track = $$(".rank-track li");
  assert.equal(track.length, 6);
  assert.deepEqual(track.map((li) => li.querySelector(".rank-letter").textContent), ["E", "D", "C", "B", "A", "S"]);
  assert.deepEqual(track.map((li) => li.querySelector("strong").textContent), ["+3%", "+6%", "+9%", "+12%", "+15%", "+18%"]);
  /* o rank S encerra a trilha: não pode existir linha de requisitos para ele */
  const linhas = $$(".profession-table-wrap tbody th").map((th) => th.textContent.replace(/\s/g, ""));
  assert.deepEqual(linhas, ["E→D", "D→C", "C→B", "B→A", "A→S"]);
  /* E → D não pede derrotas: a planilha do jogo traz vazio, exibido como travessão */
  assert.equal($$(".profession-table-wrap tbody tr")[0].querySelectorAll("td")[2].textContent, "—");
  /* mecânicas documentadas preservadas */
  assert.match(texto, /Rare Pokémon Picture/);
  assert.match(texto, /não é necessário capturá-lo/i);
  /* as fontes permanecem internas e não ocupam a interface pública */
  assert.equal($(".profession-source"), null);
});

test("14. a hierarquia de títulos não pula níveis", () => {
  const niveis = $$("h1,h2,h3,h4,h5,h6").map((h) => Number(h.tagName[1]));
  assert.equal(niveis[0], 2, "a aba começa em h2");
  for (let i = 1; i < niveis.length; i++) {
    assert.ok(niveis[i] <= niveis[i - 1] + 1, `pulo de h${niveis[i - 1]} para h${niveis[i]}`);
  }
  /* toda seção é rotulada por seu próprio título */
  for (const secao of $$("section[aria-labelledby]")) {
    const id = secao.getAttribute("aria-labelledby");
    assert.ok(root.querySelector(`#${id}`), `aria-labelledby="${id}" não resolve`);
  }
  const ids = $$("[id]").map((el) => el.id);
  assert.equal(new Set(ids).size, ids.length, "IDs duplicados na aba");
});

/* ---------------------------------------------- sem regressão nas outras abas */

test("15. Clãs e Breeding continuam intactos", () => {
  const clanUi = fs.readFileSync(path.join(LAB, "clan-ui.js"), "utf8");
  assert.ok(clanUi.includes("clan-ranking.json"));
  assert.ok(fs.existsSync(path.join(LAB, "data", "clan-ranking.json")));

  /* o sticky do Breeding continua ancorado na variável do header */
  const breedingCss = semComentarios(fs.readFileSync(path.join(LAB, "breeding.css"), "utf8")).replace(/\s/g, "");
  assert.ok(breedingCss.includes("top:var(--site-header-offset)"));
  assert.ok(/\.breeding-lab\{[^}]*overflow:clip/.test(breedingCss));

  /* nenhum asset do Breeding foi removido ou renomeado */
  for (const asset of ["centro-breeding", "analise-dos-pais", "melhoria-iv", "incubadora", "rota-gratis", "rota-feromonio"]) {
    assert.ok(fs.existsSync(path.join(LAB, "assets", "breeding", `${asset}.webp`)), `asset perdido: ${asset}.webp`);
  }
  /* e o header global segue escopado */
  const styles = semComentarios(fs.readFileSync(path.join(LAB, "styles.css"), "utf8")).replace(/\s/g, "");
  assert.ok(styles.includes("body>header{"));
  assert.equal(/(?:^|[};])header\{/.test(styles), false);
});
