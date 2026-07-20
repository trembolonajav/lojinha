import { CLANS } from "./clan-config.js";

const root = document.querySelector("#clan-app");
const catalog = window.VPLAB_DEX || [];
const currentIds = new Set(window.VPLAB_CLAN_CONTENT?.availableIds || []);
const typeChart = window.VPLAB_TYPE_CHART || {};

const TYPE_LABEL = {
  normal:"Normal", fire:"Fogo", water:"Água", electric:"Elétrico", grass:"Planta",
  ice:"Gelo", fighting:"Lutador", poison:"Veneno", ground:"Terra", flying:"Voador",
  psychic:"Psíquico", bug:"Inseto", rock:"Pedra", ghost:"Fantasma", dragon:"Dragão",
  dark:"Sombrio", steel:"Aço", fairy:"Fada"
};
const TYPE_COLOR = {
  normal:"#9a9a7c", fire:"#e0742f", water:"#5680d8", electric:"#d8b220", grass:"#6da33e",
  ice:"#7fc4c4", fighting:"#a5342a", poison:"#8f3f8f", ground:"#c9a952", flying:"#8d7fd8",
  psychic:"#dd4f7f", bug:"#93a021", rock:"#a89232", ghost:"#5f5390", dragon:"#5f3cc9",
  dark:"#584538", steel:"#8a8aa0", fairy:"#c96f9e"
};
const ORDER = ["volcanic","raibolt","orebound","naturia","gardestrike","ironhard","wingeon","psycraft","seavell","malefic"];
const EFFECT_TEXT = {
  volcanic:"Fogo pressiona Planta, Gelo, Inseto e Aço.",
  raibolt:"Elétrico é especialmente útil contra Água e Voador.",
  orebound:"Terra e Pedra entregam força física, resistência e boa cobertura.",
  naturia:"Planta e Inseto oferecem variedade física, especial e boas respostas de tipo.",
  gardestrike:"Normal e Lutador concentram atacantes físicos fortes e consistentes.",
  ironhard:"Aço combina muitas resistências com Pokémon de defesa elevada.",
  wingeon:"Voador e Dragão reúnem atacantes versáteis e boa cobertura.",
  psycraft:"Psíquico e Fada favorecem poder especial e respostas contra Lutador e Dragão.",
  seavell:"Água e Gelo formam o maior catálogo elegível e cobrem muitas hunts.",
  malefic:"Fantasma, Sombrio e Veneno oferecem imunidades e matchups variados."
};

const clans = ORDER.map(id => CLANS[id]);
const requestedClan = new URL(location.href).searchParams.get("clan");
let selectedId = CLANS[requestedClan] ? requestedClan : null;

function esc(value) {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
function sprite(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}
function typeBadge(type) {
  return `<span class="clan-type" style="--type:${TYPE_COLOR[type] || "#777"}">${TYPE_LABEL[type] || type}</span>`;
}
function normalizedRarity(pokemon) {
  return String(pokemon.raridade || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
function allowedPokemon(pokemon) {
  const rarity = normalizedRarity(pokemon);
  return currentIds.has(pokemon.dexNo) && !pokemon.boss && rarity !== "lendario" && rarity !== "mitico";
}
function isEligible(pokemon, clan) {
  return allowedPokemon(pokemon) && pokemon.tipos.some(type => clan.types.includes(type));
}
function usefulOffensiveMoves(pokemon) {
  return (pokemon.golpes || []).filter(move =>
    (move.categoria === "fisico" || move.categoria === "especial") &&
    Number(move.poder) > 0
  );
}
function offensiveProfile(pokemon, clan) {
  const moves = usefulOffensiveMoves(pokemon);
  let best = null;
  for (const move of moves) {
    const statIndex = move.categoria === "fisico" ? 1 : 3;
    const candidate = {
      move,
      statIndex,
      baseStat:pokemon.baseStats[statIndex],
      impact:pokemon.baseStats[statIndex] * Number(move.poder)
    };
    if (!best || candidate.impact > best.impact || (candidate.impact === best.impact && candidate.baseStat > best.baseStat)) best = candidate;
  }
  if (best) return best;
  const physical = pokemon.baseStats[1] >= pokemon.baseStats[3];
  return { move:null, statIndex:physical ? 1 : 3, baseStat:pokemon.baseStats[physical ? 1 : 3], impact:0 };
}
function clanPokemon(clan) {
  return catalog.filter(p => isEligible(p, clan)).map(pokemon => ({ pokemon, ...offensiveProfile(pokemon, clan) }))
    .sort((a,b) => Number(Boolean(b.move))-Number(Boolean(a.move)) || b.baseStat-a.baseStat || b.impact-a.impact || totalStats(b.pokemon)-totalStats(a.pokemon) || a.pokemon.dexNo-b.pokemon.dexNo);
}
function totalStats(pokemon) {
  return pokemon.baseStats.reduce((sum, value) => sum + value, 0);
}
function effectiveness(clan) {
  const strong = new Set();
  for (const attack of clan.types) {
    const row = typeChart[attack.toUpperCase()] || {};
    Object.entries(row).forEach(([type,multiplier]) => { if (multiplier > 1) strong.add(type.toLowerCase()); });
  }
  return [...strong];
}
function selectorCard(clan) {
  return `<button class="clan-emblem-card${selectedId === clan.id ? " is-selected" : ""}" data-clan="${clan.id}" style="--clan:${clan.color}" type="button" aria-pressed="${selectedId === clan.id}">
    <span class="clan-frame">
      <span class="clan-emblem"><img src="assets/clans/${clan.id}-symbol.png" alt="Símbolo ${clan.name}"></span>
      <strong>${clan.name}</strong>
    </span>
    <span class="clan-card-types">${clan.types.map(typeBadge).join("")}</span>
  </button>`;
}
function pokemonCard(entry, index, recommended) {
  const { pokemon, move, baseStat, statIndex } = entry;
  const statName = statIndex === 1 ? "Ataque" : "Atq. Esp.";
  return `<article class="clan-pokemon-card">
    ${recommended ? `<span class="clan-place">#${index + 1}</span>` : ""}
    <span class="clan-dex">#${String(pokemon.dexNo).padStart(3,"0")}</span>
    <img src="${sprite(pokemon.dexNo)}" alt="${esc(pokemon.nome)}" loading="lazy">
    <h4>${esc(pokemon.nome)}</h4>
    <div class="clan-pokemon-types">${pokemon.tipos.map(typeBadge).join("")}</div>
    <p><b>${statName} base ${baseStat}</b>${move ? `<span>${esc(move.nome)} · poder ${move.poder}</span>` : `<span>Sem golpe ofensivo documentado</span>`}</p>
  </article>`;
}
function detail(clan) {
  const entries = clanPokemon(clan);
  const recommended = entries.slice(0,6);
  const substitutes = entries.slice(6);
  const strong = effectiveness(clan);
  return `<section class="clan-detail-simple" style="--clan:${clan.color}">
    <header>
      <img src="assets/clans/${clan.id}.png" alt="">
      <div><span class="kicker">Clã selecionado</span><h2>${clan.name}</h2><div>${clan.types.map(typeBadge).join("")}</div><p>${EFFECT_TEXT[clan.id]}</p></div>
    </header>
    <div class="clan-bonus-box">
      <p><b>Bônus do clã:</b> +6% por rank, chegando a +30% no Rank 5, em Ataque, Atq. Esp., Defesa e Def. Esp. dos Pokémon dos tipos cobertos. HP e Velocidade não recebem bônus.</p>
      ${strong.length ? `<p><b>Tipos pressionados:</b> ${strong.map(typeBadge).join("")}</p>` : ""}
    </div>
    <div class="clan-ranking-note"><b>Como o Top 6 foi definido</b><span>Maior stat ofensivo base realmente usado pelos golpes documentados do Pokémon. Assim, um atacante físico como Flareon é avaliado pelo Ataque base 130, não pelo Atq. Esp. Em empate, entram força do golpe, total de stats e número da Pokédex. Lendários, míticos, bosses e variantes de Outland não participam.</span></div>
    <section class="clan-roster-section"><div class="clan-roster-title"><span>Time recomendado</span><h3>Os 6 melhores atacantes do clã</h3></div><div class="clan-pokemon-grid recommended">${recommended.map((entry,index) => pokemonCard(entry,index,true)).join("")}</div></section>
    <section class="clan-roster-section"><div class="clan-roster-title"><span>Substitutos</span><h3>Todos os outros Pokémon disponíveis do clã</h3><p>${substitutes.length} opções restantes, sem repetir o Top 6.</p></div>${substitutes.length ? `<div class="clan-pokemon-grid">${substitutes.map((entry,index) => pokemonCard(entry,index,false)).join("")}</div>` : `<p class="clan-empty">Não há outros Pokémon elegíveis na lista atual.</p>`}</section>
  </section>`;
}
function render() {
  root.innerHTML = `<section class="clan-picker">
    <div class="clan-picker-head"><span class="kicker">Os dez clãs</span><h2>Selecione um emblema</h2><p>Clique em um clã para abrir suas informações, o time recomendado e todos os substitutos disponíveis.</p></div>
    <div class="clan-emblems-grid">${clans.map(selectorCard).join("")}</div>
  </section>${selectedId ? detail(CLANS[selectedId]) : ""}`;
}

root.addEventListener("click", event => {
  const button = event.target.closest("[data-clan]");
  if (!button) return;
  selectedId = selectedId === button.dataset.clan ? null : button.dataset.clan;
  const url = new URL(location.href);
  if (selectedId) url.searchParams.set("clan", selectedId);
  else url.searchParams.delete("clan");
  history.replaceState(null, "", url);
  render();
  if (selectedId) root.querySelector(".clan-detail-simple")?.scrollIntoView({behavior:"smooth",block:"start"});
});

render();
