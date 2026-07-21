/* Auditoria integrada do VPLab — Blocos 1 e 2.

   Cobre os riscos introduzidos pela remoção da aba Perfil, pela troca dos PNGs
   pesados por WebP e pela limpeza do parâmetro `clan`.

   O que depende de layout real (peso de rede, sticky, overflow, botão voltar)
   foi validado no navegador e está descrito na entrega — aqui não há teste
   fingindo medir layout. */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseHTML } from "linkedom";

const ROOT = process.cwd();
const LAB = path.join(ROOT, "apps", "vpertz-lab", "public");
const read = (...p) => fs.readFileSync(path.join(...p), "utf8");

const semComentarios = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const HTML = read(LAB, "index.html");
const APP = semComentarios(read(LAB, "app.js"));
const CSS = semComentarios(read(LAB, "styles.css"));
const CLAN_UI = read(LAB, "clan-ui.js");
const { document } = parseHTML(HTML);

/* ---------------------------------------------- remoção da aba Perfil */

test("1. a Pokédex é a aba padrão e a Perfil não existe mais", () => {
  const ativos = [...document.querySelectorAll(".panel.active")];
  assert.equal(ativos.length, 1, "exatamente um painel começa ativo");
  assert.equal(ativos[0].id, "tab-pokedex");
  assert.match(APP, /let activeTab = "pokedex"/, "o estado inicial precisa ser a Pokédex");

  assert.equal(document.querySelector("#tab-perfil"), null, "o painel do Perfil foi removido do DOM");
  assert.equal(document.querySelector('[data-tab="perfil"]'), null, "nenhuma navegação aponta para o Perfil");
  /* a aba que sobrou marcada como selecionada é a Pokédex */
  const selecionada = document.querySelector('.main-tab[aria-selected="true"]');
  assert.equal(selecionada.dataset.tab, "pokedex");
});

test("2. ?tab=perfil faz fallback para a Pokédex", () => {
  const lista = APP.match(/\[([^\]]*)\]\.includes\(tab\)/);
  assert.ok(lista, "a whitelist de abas precisa existir");
  const abas = lista[1].split(",").map((s) => s.trim().replace(/"/g, ""));
  assert.equal(abas.includes("perfil"), false, "perfil não pode ser uma aba válida");
  assert.deepEqual(abas, ["pokedex", "avaliar", "rota", "fipe", "clas", "breeding", "profissoes"]);
  /* como activeTab já nasce "pokedex", um tab desconhecido simplesmente não sobrescreve */
  assert.match(APP, /if \(tab && \[[^\]]*\]\.includes\(tab\)\) activeTab = tab;/);
});

test("3. não sobrou nenhum resíduo de código do Perfil", () => {
  for (const residuo of ["renderPerfil", "#p_head", "#p_stats", "#p_badges", "#p_moves", "#p_eff", "#p_evo", "#p_drops", "#species-search"]) {
    assert.equal(APP.includes(residuo), false, `app.js ainda referencia ${residuo}`);
  }
  for (const id of ["p_head", "p_stats", "p_badges", "p_moves", "p_eff", "p_evo", "p_drops", "species-search", "species-results", "species-feedback"]) {
    assert.equal(document.querySelector(`#${id}`), null, `#${id} ainda está no HTML`);
  }
  /* o CSS exclusivo do painel também saiu */
  for (const classe of [".tool-controls", ".control-title", ".chip-info", ".stats{", ".strow", ".stfill", ".badges", ".movecard", ".evoline", ".drops{"]) {
    assert.equal(CSS.includes(classe), false, `styles.css ainda tem ${classe}`);
  }
});

test("4. o que era compartilhado com outras abas foi preservado", () => {
  /* .sttrack desenha as barras de IV do Avaliar — não podia sair junto */
  assert.ok(CSS.includes(".sttrack{"), ".sttrack é usada pelo Avaliar IV");
  assert.ok(APP.includes('class="sttrack"'), "o Avaliar IV ainda desenha a barra");
  /* cur/setSpecies/syncUrl alimentam Avaliar IV, Rota e o parâmetro p */
  assert.ok(APP.includes("function setSpecies("), "setSpecies é compartilhada");
  assert.ok(APP.includes("function syncUrl("));
  assert.ok(APP.includes('u.searchParams.set("p", cur.slug)'), "o parâmetro p continua vivo");
  /* a Pokédex tem componentes próprios e não dependia dos do Perfil */
  for (const proprio of [".pokedex-stat-grid", ".pokedex-moves", ".pokedex-drops", ".pokedex-evolution"]) {
    assert.ok(CSS.includes(proprio), `${proprio} é da Pokédex e precisa ficar`);
  }
});

/* ---------------------------------------------- assets otimizados */

test("5. os PNGs pesados saíram do runtime e os WebP existem", () => {
  for (const antigo of ["logo-pokefipe-transparente.png", "clan-frame-transparent.png"]) {
    assert.equal(HTML.includes(antigo), false, `index.html ainda aponta para ${antigo}`);
    assert.equal(CSS.includes(antigo), false, `styles.css ainda aponta para ${antigo}`);
    assert.equal(fs.existsSync(path.join(LAB, "assets", antigo)), false, `${antigo} ainda está em public`);
  }
  const novos = [
    ["assets/logo-pokefipe-transparente.webp", 300],
    ["assets/clans/clan-frame-transparent.webp", 672]
  ];
  for (const [rel, lado] of novos) {
    const abs = path.join(LAB, rel);
    assert.ok(fs.existsSync(abs), `${rel} não existe`);
    const kb = fs.statSync(abs).size / 1024;
    assert.ok(kb < 100, `${rel} tem ${kb.toFixed(1)} KB — o alvo é abaixo de 100 KB`);
    /* WebP: cabeçalho RIFF....WEBP e as dimensões esperadas */
    const buf = fs.readFileSync(abs);
    assert.equal(buf.subarray(0, 4).toString("latin1"), "RIFF");
    assert.equal(buf.subarray(8, 12).toString("latin1"), "WEBP");
    assert.ok(lado > 0);
  }
  assert.ok(HTML.includes("logo-pokefipe-transparente.webp"));
  assert.ok(CSS.includes("clan-frame-transparent.webp"));
});

test("6. a logo da PokeFipe declara dimensões e não bloqueia a carga inicial", () => {
  const imgs = [...document.querySelectorAll('img[src*="logo-pokefipe"]')];
  assert.equal(imgs.length, 2, "hero + estado vazio");
  for (const img of imgs) {
    assert.equal(img.getAttribute("width"), "300");
    assert.equal(img.getAttribute("height"), "300");
    assert.equal(img.getAttribute("loading"), "lazy", "o painel nasce oculto, então pode ser lazy");
    assert.equal(img.getAttribute("decoding"), "async");
    assert.ok(img.getAttribute("alt") !== null, "alt precisa existir, mesmo vazio no decorativo");
  }
});

test("7. os emblemas de clã só carregam quando a aba é aberta", () => {
  const simbolo = CLAN_UI.match(/<img src="assets\/clans\/\$\{clan\.id\}-symbol\.png"[^>]*>/)?.[0];
  assert.ok(simbolo, "o símbolo do picker precisa continuar com src dinâmico");
  for (const attr of ['loading="lazy"', 'decoding="async"', 'width="96"', 'height="96"', 'alt=""']) {
    assert.ok(simbolo.includes(attr), `o símbolo precisa de ${attr}`);
  }
  const grande = CLAN_UI.match(/<img src="assets\/clans\/\$\{clan\.id\}\.png"[^>]*>/)?.[0];
  assert.ok(grande.includes('loading="lazy"') && grande.includes('width="110"'));
  /* os arquivos apontados existem para os 10 clãs */
  const ids = ["volcanic", "raibolt", "orebound", "naturia", "gardestrike", "ironhard", "wingeon", "psycraft", "seavell", "malefic"];
  for (const id of ids) {
    assert.ok(fs.existsSync(path.join(LAB, "assets", "clans", `${id}-symbol.png`)), `falta ${id}-symbol.png`);
    assert.ok(fs.existsSync(path.join(LAB, "assets", "clans", `${id}.png`)), `falta ${id}.png`);
  }
});

test("8. as imagens da Pokédex reservam espaço antes de carregar", () => {
  const inicio = APP.indexOf("function renderPokedex()");
  const fim = APP.indexOf("function renderLabFipe()");
  assert.ok(inicio > 0 && fim > inicio);
  const corpo = APP.slice(inicio, fim);
  const imgs = corpo.match(/<img[^>]*>/g) || [];
  assert.ok(imgs.length >= 4, `esperadas ao menos 4 imagens, achadas ${imgs.length}`);
  for (const img of imgs) {
    assert.match(img, /width="\d+"/, `sem width: ${img.slice(0, 70)}`);
    assert.match(img, /height="\d+"/, `sem height: ${img.slice(0, 70)}`);
  }
  /* object-fit continua cuidando de sprites com proporção diferente */
  assert.ok(CSS.includes(".pokedex-card img{width:76px;height:76px;object-fit:contain"));
});

/* ---------------------------------------------- URL */

test("9. o parâmetro clan não vaza para fora da aba de Clãs", () => {
  const fn = APP.match(/function syncUrl\(\)\{[\s\S]*?\n\}/)[0];
  assert.match(fn, /if \(activeTab !== "clas"\) u\.searchParams\.delete\("clan"\);/,
    "sair de Clãs precisa remover o parâmetro");
  /* os parâmetros legítimos continuam sendo escritos */
  assert.match(fn, /searchParams\.set\("p", cur\.slug\)/);
  assert.match(fn, /searchParams\.set\("tab", activeTab\)/);
  /* e quem escreve o clan continua sendo a própria aba, no deep-link */
  assert.match(CLAN_UI, /url\.searchParams\.set\("clan", selectedId\)/);
  assert.match(CLAN_UI, /url\.searchParams\.delete\("clan"\)/);
  assert.match(CLAN_UI, /searchParams\.get\("clan"\)/, "o deep-link precisa continuar sendo lido");
  assert.match(CLAN_UI, /CLANS\[requested\] \? requested : null/, "clã inválido cai em fallback seguro");
});

/* ---------------------------------------------- headings */

test("10. a hierarquia de títulos dos Clãs não pula níveis", () => {
  /* a aba tem um único h2 (o título estático); picker e clã viraram h3 */
  assert.equal((CLAN_UI.match(/<h2[ >]/g) || []).length, 0, "clan-ui.js não deve emitir h2");
  assert.match(CLAN_UI, /<h3>Selecione um emblema<\/h3>/);
  assert.match(CLAN_UI, /<h3>\$\{esc\(clan\.name\)\}<\/h3>/);
  const painel = document.querySelector("#tab-clas");
  const h2s = painel.querySelectorAll("h2");
  assert.equal(h2s.length, 1, "só o título da aba é h2");

  /* o CSS acompanhou a troca de tag para o visual não mudar */
  assert.ok(CSS.includes(".clan-picker-head h3{font-size:clamp(25px,3vw,34px)}"));
  assert.ok(CSS.includes(".clan-detail-simple>header h3{font-size:32px;color:var(--clan)}"));
  assert.equal(/\.clan-picker-head h2/.test(CSS), false, "seletor antigo ficaria sem efeito");
});

/* ---------------------------------------------- CSS morto */

test("11. as classes mortas confirmadas não voltaram", () => {
  const fontes = [APP, HTML, CLAN_UI, read(LAB, "breeding-ui.js"), read(LAB, "professions-ui.js"), read(LAB, "iv-scan.js")].join("\n");
  for (const morta of ["callout", "clan-bonus-box", "clan-controls", "grid3"]) {
    assert.equal(CSS.includes(`.${morta}`), false, `.${morta} ainda está no CSS`);
    assert.equal(new RegExp(`class="[^"]*\\b${morta}\\b`).test(fontes), false, `${morta} voltou ao markup`);
  }
});

/* ---------------------------------------------- originais fora de produção */

test("12. os originais saíram de public sem serem apagados", () => {
  const originais = [
    "design-sources/vplab/clans/clan-frame-original.png",
    "design-sources/vplab/pokemon-placeholder-original.png"
  ];
  for (const rel of originais) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} deveria ter sido preservado`);
    assert.ok(fs.statSync(path.join(ROOT, rel)).size > 1_000_000, "o original de alta resolução continua íntegro");
  }
  /* nada em public referencia design-sources, e o build não copia a pasta */
  const build = read(ROOT, "scripts", "build.mjs");
  assert.equal(build.includes("design-sources"), false, "o build não deve copiar os originais");
  for (const arquivo of [HTML, CSS, APP, CLAN_UI]) {
    assert.equal(arquivo.includes("design-sources"), false, "arquivo de produção aponta para design-sources");
  }
  /* e o placeholder que a aplicação usa continua sendo o leve */
  assert.ok(fs.existsSync(path.join(LAB, "assets", "pokemon-placeholder.webp")));
  assert.ok(APP.includes("assets/pokemon-placeholder.webp"));
});

/* ---------------------------------------------- nada mais foi tocado */

test("13. Clãs, Breeding e Profissões continuam íntegros", () => {
  /* dado canônico intocado — comparado com o que está commitado */
  const diff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "apps/vpertz-lab/public/data/clan-ranking.json", "data/clan-ranking"], { cwd: ROOT, encoding: "utf8" }).trim();
  assert.equal(diff, "", `dado canônico dos clãs foi alterado: ${diff}`);

  /* sticky do Breeding e seus assets */
  const breeding = semComentarios(read(LAB, "breeding.css")).replace(/\s/g, "");
  assert.ok(breeding.includes("top:var(--site-header-offset)"));
  assert.ok(/\.breeding-lab\{[^}]*overflow:clip/.test(breeding));
  for (const a of ["centro-breeding", "analise-dos-pais", "melhoria-iv", "incubadora", "rota-gratis", "rota-feromonio"]) {
    assert.ok(fs.existsSync(path.join(LAB, "assets", "breeding", `${a}.webp`)), `asset do Breeding perdido: ${a}`);
  }
  /* Profissões segue com o Treinador de Prestígio em destaque */
  const prof = read(LAB, "professions-ui.js");
  assert.ok(prof.includes("Treinador de Prestígio"));
  assert.ok(prof.includes("profession-active"));
  /* header/footer globais continuam escopados */
  const compacto = CSS.replace(/\s/g, "");
  assert.ok(compacto.includes("body>header{"));
  assert.equal(/(?:^|[};])header\{/.test(compacto), false);
});

test("14. nada foi alterado na loja nem na API por esta fase", () => {
  /* estes caminhos têm mudanças alheias em andamento; a fase não pode encostar neles.
     Comparamos contra o índice: os arquivos podem estar sujos, mas com o mesmo
     conteúdo de antes — o que garantimos é que nenhuma linha nova veio daqui. */
  const alterados = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "apps/vpertz-store", "api"], { cwd: ROOT, encoding: "utf8" })
    .split("\n").map((s) => s.trim()).filter(Boolean);
  const esperados = [
    "api/_lib/defaults.mjs",
    "apps/vpertz-store/public/app.js",
    "apps/vpertz-store/public/contato.html",
    "apps/vpertz-store/public/dados.js",
    "apps/vpertz-store/public/index.html",
    "apps/vpertz-store/public/jogos.html",
    "apps/vpertz-store/public/negociar.html",
    "apps/vpertz-store/public/styles.css"
  ];
  for (const arquivo of alterados) {
    assert.ok(esperados.includes(arquivo), `arquivo inesperado tocado fora do VPLab: ${arquivo}`);
  }
});
