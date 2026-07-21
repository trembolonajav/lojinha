/* Implementação de referência da metodologia da planilha canônica de clãs.

   Escopo deliberadamente estreito: este módulo NÃO decide o ranking exibido.
   A ordem, o score, o tier e o Top 6 vêm prontos de data/clan-ranking.json.
   Ele existe para (a) provar em teste que os números da planilha são
   reproduzíveis e (b) formatar valores na interface.

   Modelo v1 — orientado a dano em hunts. Nesta versão o score não considera
   poder, cooldown, precisão, efeitos nem cobertura real do moveset. */

/* Rank 5 aplica +30% em ATK, Sp. ATK, DEF e Sp. DEF. HP e Speed não recebem bônus. */
export function applyRank5Bonus(stats, multiplier) {
  return {
    hp: stats.hp,
    atk: stats.atk * multiplier,
    def: stats.def * multiplier,
    spAtk: stats.spAtk * multiplier,
    spDef: stats.spDef * multiplier,
    speed: stats.speed
  };
}

/* Maior atributo ofensivo após o bônus de clã. */
export function offensiveCeiling(boosted) {
  return Math.max(boosted.atk, boosted.spAtk);
}

/* Menor atributo ofensivo após o bônus de clã. */
export function secondaryOffense(boosted) {
  return Math.min(boosted.atk, boosted.spAtk);
}

/* Raiz de HP × média das defesas com bônus. */
export function robustness(boosted) {
  return Math.sqrt(boosted.hp * ((boosted.def + boosted.spDef) / 2));
}

/* O perfil (físico / especial / misto) é dado importado da planilha, não derivado aqui:
   a aba Metodologia não documenta o limiar usado para classificar "misto". */

/* Score 0–100 normalizado pelos máximos globais das 251 espécies. */
export function speciesScore(stats, bst, methodology) {
  const { weights, normalization, rank5Multiplier } = methodology;
  const boosted = applyRank5Bonus(stats, rank5Multiplier);
  const parts =
    weights.offensiveCeiling * (offensiveCeiling(boosted) / normalization.offensiveCeiling) +
    weights.secondaryOffense * (secondaryOffense(boosted) / normalization.secondaryOffense) +
    weights.robustness * (robustness(boosted) / normalization.robustness) +
    weights.speed * (stats.speed / normalization.speed) +
    weights.bst * (bst / normalization.bst);
  return 100 * parts;
}

/* Um Pokémon entra em todo clã que contemple pelo menos um de seus tipos. */
export function isEligibleForClan(types, clanTypes) {
  return types.some((type) => clanTypes.includes(type));
}

/* Scores são apresentados sempre com duas casas decimais, no padrão pt-BR. */
export function formatScore(score) {
  return Number(score).toFixed(2).replace(".", ",");
}
