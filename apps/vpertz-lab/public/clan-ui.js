/* Aba de Clãs do VPLab.

   Fonte única: data/clan-ranking.json, gerado da planilha canônica por
   scripts/generate-clan-ranking.mjs. Esta interface apenas apresenta —
   nunca recalcula score, nunca reordena o ranking importado.
   A ordenação dos substitutos é opcional e escolhida pelo usuário. */

import { CLANS, CLAN_ORDER, TYPE_COLOR, TYPE_LABEL } from "./clan-config.js";
import { formatScore } from "./clan-engine.js";

const root = document.querySelector("#clan-app");

const SPRITE = (dexNo) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNo}.png`;

/* Rótulo do atributo ofensivo principal, conforme o perfil da planilha. */
const MAIN_OFFENSE = { "Físico": "ATK R5", "Especial": "Sp. ATK R5", "Misto": "Ofensivo R5" };

const PREVIEW_COUNT = 3;

let model = null;
let selectedId = null;
const substituteState = new Map();

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function typeBadge(type) {
  return `<span class="clan-type" style="--type:${TYPE_COLOR[type] || "#777"}">${esc(TYPE_LABEL[type] || type)}</span>`;
}

function stateFor(clanId) {
  if (!substituteState.has(clanId)) {
    substituteState.set(clanId, { open: false, query: "", type: "", sort: "position" });
  }
  return substituteState.get(clanId);
}

/* Golpe de referência vindo do catálogo do jogo. Não participa do score desta versão —
   é exibido apenas como contexto, sempre rotulado como tal. */
function referenceMove(dexNo) {
  const species = (window.VPLAB_DEX || []).find((item) => item.dexNo === dexNo);
  if (!species) return null;
  const moves = (species.golpes || [])
    .filter((move) => (move.categoria === "fisico" || move.categoria === "especial") && Number(move.poder) > 0)
    .sort((a, b) => Number(b.poder) - Number(a.poder));
  return moves[0] || null;
}

function statsTable(entry) {
  const rows = [
    ["HP", entry.stats.hp], ["ATK", entry.stats.atk], ["DEF", entry.stats.def],
    ["Sp. ATK", entry.stats.spAtk], ["Sp. DEF", entry.stats.spDef], ["Speed", entry.stats.speed]
  ];
  return `<dl class="clan-statline">${rows
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("")}<div><dt>BST</dt><dd>${entry.bst}</dd></div></dl>`;
}

function cardDetails(entry) {
  const move = referenceMove(entry.dexNo);
  /* A planilha já escreve textos terminais próprios para o primeiro colocado
     ("É o líder do clã no modelo.") e para o último ("É o último utilizável deste clã."),
     então não há comparação com um Pokémon inexistente para suprimir aqui. */
  const comparisons = [
    entry.whyBelowPrevious ? `<p><b>Posição anterior:</b> ${esc(entry.whyBelowPrevious)}</p>` : "",
    entry.whyAbovePrevious ? `<p><b>Posição seguinte:</b> ${esc(entry.whyAbovePrevious)}</p>` : ""
  ].join("");

  return `<details class="clan-card-more">
    <summary>Leitura técnica</summary>
    <div class="clan-card-more-body">
      <p>${esc(entry.reading)}</p>
      ${comparisons}
      ${statsTable(entry)}
      <p class="clan-card-meta">
        <span>Hunt própria em Kanto: <b>${entry.huntKanto ? "sim" : "não"}</b></span>
        ${move ? `<span>Golpe de referência: <b>${esc(move.nome)}</b> (poder ${esc(move.poder)}) — não entra no score</span>` : ""}
      </p>
      ${entry.source ? `<a class="clan-card-source" href="${esc(entry.source)}" target="_blank" rel="noreferrer">Ver ${esc(entry.name)} na Poképedia</a>` : ""}
    </div>
  </details>`;
}

function topCard(entry) {
  /* O teto ofensivo R5 já é, por definição, o maior atributo ofensivo após o bônus —
     usamos a coluna da planilha em vez de recalcular. */
  return `<article class="clan-pokemon-card is-top">
    <span class="clan-place">#${entry.position}</span>
    <span class="clan-dex">#${String(entry.dexNo).padStart(3, "0")}</span>
    <img src="${SPRITE(entry.dexNo)}" alt="" loading="lazy" width="88" height="88">
    <h4>${esc(entry.name)}</h4>
    <div class="clan-pokemon-types">${entry.types.map(typeBadge).join("")}</div>
    <p class="clan-verdict">
      <span class="clan-tier" data-tier="${esc(entry.tier)}">Tier ${esc(entry.tier)}</span>
      <span class="clan-score">Score ${formatScore(entry.score)}</span>
    </p>
    <p class="clan-profile">Perfil ${esc(entry.profile.toLowerCase())}</p>
    <dl class="clan-keystats">
      <div><dt>${MAIN_OFFENSE[entry.profile] || "Ofensivo R5"}</dt><dd>${Math.round(entry.offensiveCeilingR5)}</dd></div>
      <div><dt>Speed</dt><dd>${entry.stats.speed}</dd></div>
      <div><dt>Robustez R5</dt><dd>${Math.round(entry.robustnessR5)}</dd></div>
    </dl>
    ${cardDetails(entry)}
  </article>`;
}

function substituteCard(entry) {
  return `<article class="clan-pokemon-card is-substitute">
    <div class="clan-sub-head">
      <span class="clan-sub-place">#${entry.position}</span>
      <img src="${SPRITE(entry.dexNo)}" alt="" loading="lazy" width="52" height="52">
      <div class="clan-sub-id">
        <h4>${esc(entry.name)}</h4>
        <div class="clan-pokemon-types">${entry.types.map(typeBadge).join("")}</div>
      </div>
      <div class="clan-sub-verdict">
        <span class="clan-tier" data-tier="${esc(entry.tier)}">${esc(entry.tier)}</span>
        <span class="clan-score">${formatScore(entry.score)}</span>
      </div>
    </div>
    ${cardDetails(entry)}
  </article>`;
}

function excludedCard(entry) {
  return `<article class="clan-excluded-card">
    <img src="${SPRITE(entry.dexNo)}" alt="" loading="lazy" width="44" height="44">
    <div>
      <h4>${esc(entry.name)} <span>#${String(entry.dexNo).padStart(3, "0")}</span></h4>
      <div class="clan-pokemon-types">${entry.types.map(typeBadge).join("")}</div>
    </div>
    <div class="clan-excluded-score">
      <b>${formatScore(entry.score)}</b><span>score teórico</span>
    </div>
    <p>${esc(entry.exclusionReason)}</p>
  </article>`;
}

/* Filtra e ordena apenas a lista de substitutos, por escolha explícita do usuário.
   O ranking base nunca é reordenado. */
function visibleSubstitutes(substitutes, state) {
  const query = state.query.trim().toLowerCase();
  let list = substitutes.filter((entry) => {
    const matchesName = !query || entry.name.toLowerCase().includes(query);
    const matchesType = !state.type || entry.types.includes(state.type);
    return matchesName && matchesType;
  });
  const order = {
    position: (a, b) => a.position - b.position,
    score: (a, b) => b.score - a.score || a.position - b.position,
    dex: (a, b) => a.dexNo - b.dexNo,
    name: (a, b) => a.name.localeCompare(b.name, "pt-BR")
  };
  list = [...list].sort(order[state.sort] || order.position);
  return list;
}

function substitutesSection(clan, data) {
  const substitutes = data.ranking.slice(6);
  /* Quando não há substitutos (Ironhard), a seção inteira é omitida. */
  if (!substitutes.length) return "";

  const state = stateFor(clan.id);
  const typesPresent = [...new Set(substitutes.flatMap((entry) => entry.types))]
    .sort((a, b) => TYPE_LABEL[a].localeCompare(TYPE_LABEL[b], "pt-BR"));
  const showFilters = substitutes.length >= 8;

  if (!state.open) {
    return `<section class="clan-roster-section clan-substitutes">
      <div class="clan-roster-title">
        <span>Substitutos</span>
        <h3>Fora do time recomendado</h3>
        <p>Prévia dos ${PREVIEW_COUNT} primeiros. A ordem segue a posição da planilha.</p>
      </div>
      <div class="clan-sub-preview">${substitutes.slice(0, PREVIEW_COUNT)
        .map(substituteCard).join("")}</div>
      <button class="clan-expand" type="button" data-subs-toggle aria-expanded="false">
        Ver todos os ${substitutes.length} substitutos
      </button>
    </section>`;
  }

  const list = visibleSubstitutes(substitutes, state);
  const filters = showFilters ? `<div class="clan-sub-filters">
      <label><span>Buscar</span><input type="search" data-subs-query value="${esc(state.query)}" placeholder="Nome do Pokémon" autocomplete="off"></label>
      <label><span>Tipo</span><select data-subs-type>
        <option value="">Todos os tipos</option>
        ${typesPresent.map((type) => `<option value="${type}"${state.type === type ? " selected" : ""}>${esc(TYPE_LABEL[type])}</option>`).join("")}
      </select></label>
      <label><span>Ordenar por</span><select data-subs-sort>
        <option value="position"${state.sort === "position" ? " selected" : ""}>Posição no clã</option>
        <option value="score"${state.sort === "score" ? " selected" : ""}>Score</option>
        <option value="dex"${state.sort === "dex" ? " selected" : ""}>Número da Pokédex</option>
        <option value="name"${state.sort === "name" ? " selected" : ""}>Nome</option>
      </select></label>
    </div>` : "";

  return `<section class="clan-roster-section clan-substitutes is-open">
    <div class="clan-roster-title">
      <span>Substitutos</span>
      <h3>Fora do time recomendado</h3>
      <p>${substitutes.length} ${substitutes.length === 1 ? "opção" : "opções"} além do Top 6.</p>
    </div>
    ${filters}
    ${list.length
      ? `<div class="clan-sub-grid">${list.map(substituteCard).join("")}</div>`
      : `<p class="clan-empty">Nenhum substituto corresponde ao filtro.</p>`}
    <button class="clan-expand" type="button" data-subs-toggle aria-expanded="true">Recolher lista</button>
  </section>`;
}

function excludedSection(data) {
  if (!data.excluded.length) return "";
  return `<details class="clan-excluded">
    <summary>Lendários e míticos excluídos <b>${data.excluded.length}</b></summary>
    <div class="clan-excluded-body">
      <p>Mantidos na auditoria das ${model.meta.speciesAudited} espécies, mas fora do ranking utilizável pela metodologia. Não entram no Top 6 nem na lista de substitutos.</p>
      <div class="clan-excluded-grid">${data.excluded.map(excludedCard).join("")}</div>
    </div>
  </details>`;
}

function methodologyDetails() {
  const { methodology, meta } = model;
  const weightRows = [
    ["Teto ofensivo", methodology.weights.offensiveCeiling, "Maior entre ATK e Sp. ATK após o bônus."],
    ["Ofensiva secundária", methodology.weights.secondaryOffense, "Menor entre ATK e Sp. ATK após o bônus."],
    ["Robustez", methodology.weights.robustness, "Raiz de HP × média das defesas com bônus."],
    ["Speed", methodology.weights.speed, "Peso moderado: o efeito exato no ritmo não está documentado."],
    ["BST", methodology.weights.bst, "Soma dos seis stats base, como controle de consistência."]
  ];

  return `<details class="clan-methodology">
    <summary>Ver metodologia completa</summary>
    <div class="clan-methodology-body">
      <section>
        <h4>Pesos do score</h4>
        <table class="clan-weights">
          <thead><tr><th>Componente</th><th>Peso</th><th>O que mede</th></tr></thead>
          <tbody>${weightRows.map(([label, weight, note]) =>
            `<tr><td>${label}</td><td>${Math.round(weight * 100)}%</td><td>${note}</td></tr>`).join("")}</tbody>
        </table>
      </section>
      <section>
        <h4>Fórmula simplificada</h4>
        <p class="clan-formula">score = 100 × ( ${weightRows.map(([label, weight]) =>
          `${weight} × ${label.toLowerCase()} ÷ máximo`).join(" + ")} )</p>
        <p>Cada componente é normalizado pelo maior valor entre as ${meta.speciesAudited} espécies auditadas, de modo que o score fique em uma escala de 0 a 100.</p>
      </section>
      <section>
        <h4>Bônus de Rank 5</h4>
        <p>Multiplicador <b>×${methodology.rank5Multiplier}</b> aplicado em ${methodology.bonusStats.join(", ")}. HP e Speed não recebem bônus.</p>
      </section>
      <section>
        <h4>Regras de elegibilidade e exclusões</h4>
        <ul>${methodology.premises
          .filter((item) => ["Elegibilidade", "Lendários/míticos", "Comparação justa", "Interpretação"].includes(item.label))
          .map((item) => `<li><b>${esc(item.label)}:</b> ${esc(item.text)}</li>`).join("")}</ul>
      </section>
      <section>
        <h4>Limitações</h4>
        <p>${esc(methodology.limitations)}</p>
      </section>
      <section>
        <h4>Fontes utilizadas</h4>
        <ul class="clan-sources">${methodology.sources.map((source) =>
          `<li><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)}</a> — ${esc(source.note)}</li>`).join("")}</ul>
      </section>
    </div>
  </details>`;
}

function selectorCard(clan) {
  const isSelected = selectedId === clan.id;
  return `<button class="clan-emblem-card${isSelected ? " is-selected" : ""}" data-clan="${clan.id}" style="--clan:${clan.color}" type="button" aria-pressed="${isSelected}">
    <span class="clan-frame">
      <span class="clan-emblem"><img src="assets/clans/${clan.id}-symbol.png" alt="" width="96" height="96"></span>
      <strong>${esc(clan.name)}</strong>
    </span>
    <span class="clan-card-types">${clan.types.map(typeBadge).join("")}</span>
  </button>`;
}

function detail(clan) {
  const data = model.clans[clan.id];
  const top = data.ranking.slice(0, 6);

  return `<section class="clan-detail-simple" style="--clan:${clan.color}">
    <header>
      <img src="assets/clans/${clan.id}.png" alt="" width="110" height="110">
      <div>
        <span class="kicker">Clã selecionado</span>
        <h2>${esc(clan.name)}</h2>
        <div class="clan-pokemon-types">${clan.types.map(typeBadge).join("")}</div>
        <p>${esc(clan.effect)}</p>
        <p class="clan-counts">
          <b>${data.usableCount}</b> utilizáveis${data.excludedCount ? ` · <b>${data.excludedCount}</b> excluídos` : ""} · <b>${data.eligibleCount}</b> elegíveis
        </p>
      </div>
    </header>

    <div class="clan-ranking-note">
      <b>Como este ranking foi montado</b>
      <span>Este ranking compara as espécies em condições iguais de nível, Quality e IV. O bônus máximo do clã aplica 30% em Ataque, Ataque Especial, Defesa e Defesa Especial. O score prioriza o teto ofensivo, mas também considera ofensiva secundária, robustez, Speed e BST. Lendários e míticos ficam fora do time utilizável. A versão atual ainda não considera poder, cooldown, precisão ou efeitos específicos dos golpes.</span>
      ${methodologyDetails()}
    </div>

    <section class="clan-roster-section">
      <div class="clan-roster-title">
        <span>Time recomendado</span>
        <h3>Top 6 do ${esc(clan.name)}</h3>
        <p>Liderado por ${esc(data.leader)}, com score ${formatScore(data.leaderScore)}.</p>
      </div>
      <div class="clan-pokemon-grid recommended">${top.map(topCard).join("")}</div>
    </section>

    ${substitutesSection(clan, data)}
    ${excludedSection(data)}

    <footer class="clan-version">
      <span>${esc(model.meta.model)}</span>
      <span>Última consolidação: ${esc(model.meta.consolidatedAt)}</span>
    </footer>
  </section>`;
}

function render() {
  if (!model) return;
  const clans = CLAN_ORDER.map((id) => CLANS[id]);
  root.innerHTML = `<section class="clan-picker">
    <div class="clan-picker-head">
      <span class="kicker">Os dez clãs</span>
      <h2>Selecione um emblema</h2>
      <p>Escolha um clã para ver o time recomendado, os substitutos e a metodologia por trás do ranking.</p>
    </div>
    <div class="clan-emblems-grid">${clans.map(selectorCard).join("")}</div>
  </section>${selectedId ? detail(CLANS[selectedId]) : ""}`;
}

/* ---------------------------------------------- eventos */

function syncClanParam() {
  const url = new URL(location.href);
  if (selectedId) url.searchParams.set("clan", selectedId);
  else url.searchParams.delete("clan");
  history.replaceState(null, "", url);
}

root.addEventListener("click", (event) => {
  const emblem = event.target.closest("[data-clan]");
  if (emblem) {
    selectedId = selectedId === emblem.dataset.clan ? null : emblem.dataset.clan;
    syncClanParam();
    render();
    if (selectedId) root.querySelector(".clan-detail-simple")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const toggle = event.target.closest("[data-subs-toggle]");
  if (toggle && selectedId) {
    const state = stateFor(selectedId);
    state.open = !state.open;
    if (!state.open) { state.query = ""; state.type = ""; state.sort = "position"; }
    render();
    root.querySelector(".clan-substitutes")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
});

root.addEventListener("input", (event) => {
  if (!selectedId) return;
  const field = event.target.closest("[data-subs-query]");
  if (!field) return;
  const state = stateFor(selectedId);
  state.query = field.value;
  const caret = field.selectionStart;
  render();
  const restored = root.querySelector("[data-subs-query]");
  if (restored) { restored.focus(); restored.setSelectionRange(caret, caret); }
});

root.addEventListener("change", (event) => {
  if (!selectedId) return;
  const state = stateFor(selectedId);
  const type = event.target.closest("[data-subs-type]");
  const sort = event.target.closest("[data-subs-sort]");
  if (type) state.type = type.value;
  else if (sort) state.sort = sort.value;
  else return;
  render();
});

/* ---------------------------------------------- carga */

async function boot() {
  try {
    const response = await fetch("data/clan-ranking.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    model = await response.json();
  } catch (error) {
    root.innerHTML = `<div class="clan-loading clan-error">
      Não foi possível carregar o ranking dos clãs. Recarregue a página para tentar de novo.
    </div>`;
    console.error("[clãs] falha ao carregar clan-ranking.json:", error);
    return;
  }

  const requested = new URL(location.href).searchParams.get("clan");
  selectedId = requested && CLANS[requested] ? requested : null;
  render();
}

boot();
