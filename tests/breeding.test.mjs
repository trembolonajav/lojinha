/* Aba de Breeding — testes de comportamento.

   O breeding-ui.js é executado de verdade dentro de um DOM (linkedom), então os
   testes exercitam os handlers reais: alternância de rota, sincronia do FAQ e
   fiação de aria. Contratos que dependem de layout real (sobreposição do header,
   overflow horizontal, sticky) não são testáveis fora de um motor de renderização
   e foram validados no navegador — ver a entrega. */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";

const LAB = path.join(process.cwd(), "apps", "vpertz-lab", "public");
const SOURCE = fs.readFileSync(path.join(LAB, "breeding-ui.js"), "utf8");
const CSS = fs.readFileSync(path.join(LAB, "breeding.css"), "utf8");

/* As asserções abaixo falam sobre declarações reais, não sobre texto de
   comentário — os comentários deste projeto citam de propósito as regras que
   foram substituídas (overflow:hidden, --site-header-offset). */
const semComentarios = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const CSS_DECL = semComentarios(CSS);

/* Monta um documento com o contêiner da aba e executa o script como ele roda no
   navegador. Só o que o linkedom não implementa é preenchido com um stub mínimo. */
function mountBreeding() {
  const { window, document } = parseHTML(`<!doctype html><html><body>
    <header></header>
    <main><section class="panel card breeding-lab" id="tab-breeding"></section></main>
  </body></html>`);

  const proto = window.Element.prototype;
  if (!proto.getBoundingClientRect) proto.getBoundingClientRect = () => ({ height: 61, width: 800, top: 0, bottom: 61, left: 0, right: 800 });
  if (!proto.focus) {
    proto.focus = function focus() { document.activeElement = this; };
  }

  const scope = {
    document, window,
    ResizeObserver: undefined,
    console
  };
  const run = new Function(...Object.keys(scope), SOURCE);
  run(...Object.values(scope));

  return { document, root: document.querySelector("#tab-breeding") };
}

const { document, root } = mountBreeding();
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];

/* ---------------------------------------------- navegação */

test("1. todos os atalhos da barra apontam para seções existentes", () => {
  const links = $$(".breeding-jumps a");
  assert.ok(links.length >= 5, "a barra precisa listar as seções do guia");
  for (const link of links) {
    const id = link.getAttribute("href").replace("#", "");
    const target = root.querySelector(`#${id}`);
    assert.ok(target, `atalho "${link.textContent.trim()}" aponta para #${id}, que não existe`);
    assert.ok(target.classList.contains("breeding-block"), `#${id} precisa ser uma seção do guia`);
  }
  /* e o inverso: nenhuma seção do guia fica sem atalho */
  const linked = new Set(links.map((l) => l.getAttribute("href").replace("#", "")));
  for (const block of $$(".breeding-block")) {
    assert.ok(linked.has(block.id), `a seção #${block.id} não tem atalho na barra`);
  }
});

test("2. todo aria-controls e aria-labelledby resolve para um ID existente", () => {
  const refs = $$("[aria-controls], [aria-labelledby]");
  assert.ok(refs.length > 0);
  for (const el of refs) {
    for (const attr of ["aria-controls", "aria-labelledby"]) {
      const id = el.getAttribute(attr);
      if (!id) continue;
      assert.ok(root.querySelector(`#${id}`), `${attr}="${id}" não resolve`);
    }
  }
  /* IDs únicos dentro da aba */
  const ids = $$("[id]").map((el) => el.id);
  assert.equal(new Set(ids).size, ids.length, "há IDs duplicados na aba");
});

/* ---------------------------------------------- alternância de rota */

test("3. o seletor de feromônio alterna imagem, texto e alvo do lightbox", () => {
  const buttons = $$("[data-route]");
  assert.equal(buttons.length, 2);
  const imageButton = $("[data-route-image]");
  const image = imageButton.querySelector("img");
  const title = $("[data-route-title]");

  /* estado inicial: caminho gratuito */
  assert.equal(image.getAttribute("src"), "assets/breeding/rota-gratis.webp");
  assert.equal(imageButton.dataset.openImage, "rota-gratis.webp");
  const initialTitle = title.textContent;

  buttons[1].dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));

  assert.equal(image.getAttribute("src"), "assets/breeding/rota-feromonio.webp", "a imagem precisa trocar");
  assert.equal(imageButton.dataset.openImage, "rota-feromonio.webp", "o lightbox precisa abrir a imagem certa");
  assert.notEqual(title.textContent, initialTitle, "o título precisa acompanhar a rota");
  assert.match(image.getAttribute("alt"), /feromônio|Pheromone/i, "o alt precisa descrever a rota ativa");

  buttons[0].dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
  assert.equal(image.getAttribute("src"), "assets/breeding/rota-gratis.webp", "precisa voltar ao caminho gratuito");
  assert.equal(title.textContent, initialTitle);
});

test("4. o botão ativo carrega estado acessível correto e a semântica é honesta", () => {
  const buttons = $$("[data-route]");
  const pressed = () => buttons.map((b) => b.getAttribute("aria-pressed"));

  assert.deepEqual(pressed(), ["true", "false"]);
  buttons[1].dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
  assert.deepEqual(pressed(), ["false", "true"], "exatamente um botão fica pressionado");
  buttons[0].dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
  assert.deepEqual(pressed(), ["true", "false"]);

  /* Os dois botões trocam a mesma imagem no lugar; não há painéis separados,
     então role="tab"/"tablist" seria semântica falsa. */
  assert.equal(root.querySelector('[role="tablist"]'), null);
  assert.equal(root.querySelector('[role="tab"]'), null);
  assert.equal(root.querySelector('[role="tabpanel"]'), null);
  assert.ok($(".breeding-switch").getAttribute("aria-label"), "o grupo precisa ser rotulado");
});

/* ---------------------------------------------- FAQ */

test("5. o FAQ sincroniza aria-expanded com a visibilidade da resposta", () => {
  const buttons = $$(".breeding-faq article > button");
  assert.ok(buttons.length >= 6);

  for (const button of buttons) {
    const answer = root.querySelector(`#${button.getAttribute("aria-controls")}`);
    assert.ok(answer, "cada pergunta precisa apontar para sua resposta");

    /* fechado por padrão */
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.equal(answer.hasAttribute("hidden"), true);

    button.dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
    assert.equal(button.getAttribute("aria-expanded"), "true", "abrir precisa refletir em aria-expanded");
    assert.equal(answer.hasAttribute("hidden"), false, "abrir precisa revelar a resposta");

    button.dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.equal(answer.hasAttribute("hidden"), true);
  }

  /* itens são independentes: abrir um não abre os outros */
  buttons[0].dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
  assert.equal(buttons[0].getAttribute("aria-expanded"), "true");
  assert.equal(buttons[1].getAttribute("aria-expanded"), "false");
  buttons[0].dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
});

/* ---------------------------------------------- imagens */

test("6. a análise dos pais é renderizada na etapa da projeção, com legenda e lightbox", () => {
  const figure = $(".breeding-figure");
  assert.ok(figure, "a projeção precisa estar em uma figure com legenda");

  const image = figure.querySelector('img[src$="analise-dos-pais.webp"]');
  assert.ok(image, "analise-dos-pais.webp precisa estar renderizada");
  assert.ok(image.getAttribute("alt").length > 30, "o alt precisa descrever a tela");
  assert.ok(image.getAttribute("width") && image.getAttribute("height"), "dimensões evitam layout shift");

  /* usa o mesmo lightbox das outras capturas, não um segundo sistema */
  const trigger = figure.querySelector("[data-open-image]");
  assert.equal(trigger.dataset.openImage, "analise-dos-pais.webp");
  assert.equal(root.querySelectorAll("[data-lightbox]").length, 1, "existe um único lightbox");

  const caption = figure.querySelector("figcaption");
  assert.ok(/projeção/i.test(caption.textContent), "a legenda precisa ligar a imagem à etapa 3");

  /* a etapa 3 do fluxo continua descrita na lista */
  assert.ok(/Confira a projeção/.test($(".breeding-steps").textContent));
});

test("7. toda imagem referenciada existe em disco e declara dimensões", () => {
  const images = $$("img[src]").filter((img) => img.getAttribute("src"));
  assert.ok(images.length >= 5);
  for (const img of images) {
    const src = img.getAttribute("src");
    assert.ok(fs.existsSync(path.join(LAB, src)), `arquivo ausente: ${src}`);
    assert.ok(Number(img.getAttribute("width")) > 0, `${src} sem width`);
    assert.ok(Number(img.getAttribute("height")) > 0, `${src} sem height`);
    assert.ok(img.getAttribute("alt") !== null, `${src} sem alt`);
  }
  /* capturas abaixo da dobra não competem com o carregamento inicial */
  const lazy = images.filter((img) => img.getAttribute("loading") === "lazy");
  assert.ok(lazy.length >= 3, "capturas abaixo da dobra precisam de loading=lazy");
  /* a primeira captura carrega junto com a página */
  assert.equal(images[0].getAttribute("loading"), null);
});

test("8. o asset duplicado foi removido e ninguém aponta para ele", () => {
  assert.equal(fs.existsSync(path.join(LAB, "assets/breeding/qualidade-gratis.webp")), false);
  assert.equal(/qualidade-gratis/.test(SOURCE + CSS), false);
  /* o arquivo que permaneceu continua no lugar */
  assert.ok(fs.existsSync(path.join(LAB, "assets/breeding/rota-gratis.webp")));
});

/* ---------------------------------------------- CSS x markup */

test("9. o CSS e o markup do Breeding não têm sobras de um lado nem de outro", () => {
  const markupClasses = new Set([
    ...root.classList,
    ...$$("[class]").flatMap((el) => [...el.classList])
  ]);
  /* classes que o CSS ainda estiliza mas que ninguém mais renderiza */
  const cssClasses = new Set(
    [...CSS_DECL.matchAll(/\.(breed[a-z-]*|incubation[a-z-]*|route-[a-z-]*|screen-grid|quality-grid|iv-grid|progress[a-z-]*)/g)]
      .map((m) => m[1])
  );
  const orfas = [...cssClasses].filter((c) => !markupClasses.has(c));
  assert.deepEqual(orfas, [], `CSS sem markup correspondente: ${orfas.join(", ")}`);

  /* o simulador de incubação removido não pode voltar pelo CSS */
  for (const morto of ["breeding-egg", "progress-card", "progress-track", "progress-actions", "progress-head"]) {
    assert.equal(CSS_DECL.includes(`.${morto}`), false, `.${morto} é resquício do simulador removido`);
  }
  assert.equal(/@keyframes\s+breed-wiggle/.test(CSS_DECL), false);
  /* o FAQ virou button+div; regras de details/summary seriam inertes */
  assert.equal(/\.breeding-faq\s+(details|summary)/.test(CSS_DECL), false);
});

test("10. a escala tipográfica usa apenas passos inteiros do design system", () => {
  const sizes = [...CSS_DECL.matchAll(/font-size:\s*([0-9.]+)px/g)].map((m) => Number(m[1]));
  const permitidos = new Set([10, 11, 12, 13, 14, 16, 20, 26, 32]);
  const fora = [...new Set(sizes)].filter((s) => !permitidos.has(s));
  assert.deepEqual(fora, [], `tamanhos fora da escala: ${fora.join(", ")}px`);
  /* nada de texto informativo abaixo de 11px */
  assert.equal(sizes.some((s) => s < 11), false, "há texto abaixo de 11px");
  /* display continua em clamp, não em px fixo gigante */
  assert.ok(/font-size:clamp\(28px,4vw,52px\)/.test(CSS_DECL.replace(/\s/g, "")), "o hero precisa continuar fluido");
});

test("11. o sticky depende do offset do header, não de um valor mágico", () => {
  const compact = CSS_DECL.replace(/\s/g, "");
  assert.ok(compact.includes("top:var(--site-header-offset)"), "a barra precisa usar a variável do header");
  assert.equal(/top:8[01]px/.test(compact), false, "não pode haver top:80/81px cravado");

  /* overflow:clip recorta como o antigo hidden sem criar contêiner de rolagem */
  assert.ok(/\.breeding-lab\{[^}]*overflow:clip/.test(compact), ".breeding-lab precisa usar overflow:clip");
  assert.equal(/\.breeding-lab\{[^}]*overflow:hidden/.test(compact), false, "overflow:hidden voltaria a quebrar o sticky");

  /* a barra fica abaixo do header (z-index 40) e acima do conteúdo */
  const z = Number(compact.match(/\.breeding-jumps\{[^}]*z-index:(\d+)/)?.[1]);
  assert.ok(z > 0 && z < 40, `z-index da barra precisa ficar entre 1 e 39, veio ${z}`);

  /* as seções reservam espaço para header + barra ao receberem a âncora */
  assert.ok(/scroll-margin-top:calc\(var\(--site-header-offset\)/.test(compact));
});

test("12. o offset do header é medido, não cravado, e zera quando ele vira static", () => {
  const appJs = semComentarios(fs.readFileSync(path.join(LAB, "app.js"), "utf8"));
  const styles = semComentarios(fs.readFileSync(path.join(LAB, "styles.css"), "utf8")).replace(/\s/g, "");

  /* o JS só mede */
  assert.ok(/--site-header-height/.test(appJs), "app.js precisa publicar a altura medida");
  assert.ok(/getBoundingClientRect\(\)\.height/.test(appJs));
  assert.equal(/--site-header-offset/.test(appJs), false, "a política de offset é do CSS, não do JS");

  /* o CSS deriva o offset e o zera no breakpoint em que o header deixa de ser sticky */
  assert.ok(styles.includes("--site-header-offset:var(--site-header-height,0px)"));
  assert.ok(/@media\(max-width:1180px\)\{[^@]*:root\{--site-header-offset:0px\}/.test(styles),
    "no breakpoint sem header sticky o offset precisa zerar");
});

/* ---------------------------------------------- sem regressão nas outras abas */

test("13. Clãs e Profissões não foram tocados por esta etapa", () => {
  /* a aba de Clãs continua consumindo o JSON canônico */
  const clanUi = fs.readFileSync(path.join(LAB, "clan-ui.js"), "utf8");
  assert.ok(clanUi.includes("clan-ranking.json"));
  assert.ok(fs.existsSync(path.join(LAB, "data", "clan-ranking.json")));

  /* Profissões continua com seus assets e markup intactos */
  const profUi = fs.readFileSync(path.join(LAB, "professions-ui.js"), "utf8");
  assert.ok(profUi.includes("Treinador de Prestígio"));
  assert.ok(fs.existsSync(path.join(LAB, "professions.css")));

  /* o header global segue escopado ao filho direto do body */
  const styles = semComentarios(fs.readFileSync(path.join(LAB, "styles.css"), "utf8")).replace(/\s/g, "");
  assert.ok(/body>header\{/.test(styles), "o header precisa continuar escopado");
  assert.equal(/(?:^|[};])header\{/.test(styles), false,
    "um seletor header{} sem escopo voltaria a grudar headers internos sobre a navegação");
});
