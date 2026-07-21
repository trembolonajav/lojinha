/* Identidade visual e editorial dos clãs.
   Ranking, score, tier, Top 6, substitutos e exclusões NÃO ficam aqui:
   vêm de data/clan-ranking.json, gerado a partir da planilha canônica
   (scripts/generate-clan-ranking.mjs). */

export const CLANS = Object.freeze({
  volcanic: {
    id: "volcanic", name: "Volcanic", types: ["fire"], color: "#ff6938",
    effect: "Fogo pressiona Planta, Gelo, Inseto e Aço."
  },
  raibolt: {
    id: "raibolt", name: "Raibolt", types: ["electric"], color: "#f0c531",
    effect: "Elétrico é especialmente útil contra Água e Voador."
  },
  orebound: {
    id: "orebound", name: "Orebound", types: ["ground", "rock"], color: "#bc9b78",
    effect: "Terra e Pedra entregam força física, resistência e boa cobertura."
  },
  naturia: {
    id: "naturia", name: "Naturia", types: ["grass", "bug"], color: "#55c96d",
    effect: "Planta e Inseto oferecem variedade física, especial e boas respostas de tipo."
  },
  gardestrike: {
    id: "gardestrike", name: "Gardestrike", types: ["fighting", "normal"], color: "#d0623d",
    effect: "Normal e Lutador concentram atacantes físicos fortes e consistentes."
  },
  ironhard: {
    id: "ironhard", name: "Ironhard", types: ["steel"], color: "#91a6b3",
    effect: "Aço combina muitas resistências com Pokémon de defesa elevada."
  },
  wingeon: {
    id: "wingeon", name: "Wingeon", types: ["flying", "dragon"], color: "#7fc9f6",
    effect: "Voador e Dragão reúnem atacantes versáteis e boa cobertura."
  },
  psycraft: {
    id: "psycraft", name: "Psycraft", types: ["psychic", "fairy"], color: "#f15b96",
    effect: "Psíquico e Fada favorecem poder especial e respostas contra Lutador e Dragão."
  },
  seavell: {
    id: "seavell", name: "Seavell", types: ["water", "ice"], color: "#58a9ff",
    effect: "Água e Gelo formam o maior catálogo elegível e cobrem muitas hunts."
  },
  malefic: {
    id: "malefic", name: "Malefic", types: ["ghost", "poison", "dark"], color: "#9665dc",
    effect: "Fantasma, Sombrio e Veneno oferecem imunidades e matchups variados."
  }
});

/* Ordem de exibição no seletor de emblemas. */
export const CLAN_ORDER = Object.freeze([
  "volcanic", "raibolt", "orebound", "naturia", "gardestrike",
  "ironhard", "wingeon", "psycraft", "seavell", "malefic"
]);

export const TYPE_LABEL = Object.freeze({
  normal: "Normal", fire: "Fogo", water: "Água", electric: "Elétrico", grass: "Planta",
  ice: "Gelo", fighting: "Lutador", poison: "Veneno", ground: "Terra", flying: "Voador",
  psychic: "Psíquico", bug: "Inseto", rock: "Pedra", ghost: "Fantasma", dragon: "Dragão",
  dark: "Sombrio", steel: "Aço", fairy: "Fada"
});

export const TYPE_COLOR = Object.freeze({
  normal: "#9a9a7c", fire: "#e0742f", water: "#5680d8", electric: "#d8b220", grass: "#6da33e",
  ice: "#7fc4c4", fighting: "#a5342a", poison: "#8f3f8f", ground: "#c9a952", flying: "#8d7fd8",
  psychic: "#dd4f7f", bug: "#93a021", rock: "#a89232", ghost: "#5f5390", dragon: "#5f3cc9",
  dark: "#584538", steel: "#8a8aa0", fairy: "#c96f9e"
});
