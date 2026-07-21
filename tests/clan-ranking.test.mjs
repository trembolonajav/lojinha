/* Validação da fonte canônica do ranking de clãs.

   A planilha (data/clan-ranking/ranking_pokeidle_por_cla.xlsx) é a fonte da verdade.
   Estes testes garantem que o JSON gerado a partir dela mantém os totais, a ordem e
   o Top 6 da planilha, e que a interface não reordena nada por conta própria. */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { CLANS, CLAN_ORDER, TYPE_LABEL } from "../apps/vpertz-lab/public/clan-config.js";
import {
  applyRank5Bonus, formatScore, isEligibleForClan, offensiveCeiling,
  robustness, secondaryOffense, speciesScore
} from "../apps/vpertz-lab/public/clan-engine.js";

const LAB = path.join(process.cwd(), "apps", "vpertz-lab", "public");
const data = JSON.parse(fs.readFileSync(path.join(LAB, "data", "clan-ranking.json"), "utf8"));
const clanEntries = Object.entries(data.clans);
const everyEntry = clanEntries.flatMap(([, clan]) => [...clan.ranking, ...clan.excluded]);

/* Espécies distintas, já que uma mesma espécie participa de vários clãs. */
const distinct = (entries) => new Set(entries.map((entry) => entry.dexNo));
const rankedSpecies = distinct(clanEntries.flatMap(([, clan]) => clan.ranking));
const excludedSpecies = distinct(clanEntries.flatMap(([, clan]) => clan.excluded));

/* ---------------------------------------------- totais da planilha */

test("1. existem exatamente 10 clãs", () => {
  assert.equal(clanEntries.length, 10);
  assert.equal(CLAN_ORDER.length, 10);
  assert.deepEqual([...CLAN_ORDER].sort(), Object.keys(CLANS).sort());
  assert.deepEqual([...CLAN_ORDER].sort(), Object.keys(data.clans).sort());
});

test("2. a auditoria cobre 251 espécies", () => {
  assert.equal(data.meta.speciesAudited, 251);
  assert.equal(data.meta.auditRows, 251);
  assert.equal(distinct(everyEntry).size, 251);
});

test("3. existem 240 espécies utilizáveis", () => {
  assert.equal(data.meta.usableSpecies, 240);
  assert.equal(rankedSpecies.size, 240);
});

test("4. existem 11 lendários/míticos excluídos", () => {
  assert.equal(data.meta.excludedSpecies, 11);
  assert.equal(excludedSpecies.size, 11);
  /* nenhuma espécie pode ser utilizável em um clã e excluída em outro */
  for (const dexNo of excludedSpecies) assert.equal(rankedSpecies.has(dexNo), false);
});

test("5. existem 349 participações em clãs", () => {
  assert.equal(data.meta.clanParticipations, 349);
  assert.equal(everyEntry.length, 349);
});

/* ---------------------------------------------- Top 6, líder e resumo */

test("6. o Top 6 de todos os clãs corresponde ao resumo da planilha", () => {
  for (const [id, clan] of clanEntries) {
    const marked = clan.ranking.filter((entry) => entry.inRecommendedTeam).map((entry) => entry.name);
    assert.deepEqual(marked, clan.recommendedTeam, `Top 6 de ${id}`);
    assert.deepEqual(clan.ranking.slice(0, 6).map((entry) => entry.name), clan.recommendedTeam, `Top 6 de ${id} é o topo do ranking`);
  }
});

test("7. o líder de cada clã corresponde à planilha", () => {
  for (const [id, clan] of clanEntries) {
    assert.equal(clan.ranking[0].name, clan.leader, `líder de ${id}`);
    assert.equal(clan.ranking[0].score, clan.leaderScore, `score do líder de ${id}`);
    const overview = data.summary.find((item) => item.clan === clan.name);
    assert.equal(overview.leader, clan.leader);
  }
});

test("8. o Raibolt começa com Jolteon, Ampharos, Magneton, Electabuzz, Raichu e Electrode", () => {
  assert.deepEqual(
    data.clans.raibolt.ranking.slice(0, 6).map((entry) => entry.name),
    ["Jolteon", "Ampharos", "Magneton", "Electabuzz", "Raichu", "Electrode"]
  );
  assert.deepEqual(
    data.clans.raibolt.ranking.slice(0, 6).map((entry) => entry.score),
    [69.12, 68.83, 67.38, 62.66, 61.17, 56.72]
  );
});

test("9. Magnemite é o oitavo colocado do Raibolt", () => {
  const magnemite = data.clans.raibolt.ranking.find((entry) => entry.name === "Magnemite");
  assert.equal(magnemite.position, 8);
  assert.equal(magnemite.score, 49.95);
  assert.equal(magnemite.inRecommendedTeam, false);
});

test("10. Zapdos e Raikou não são utilizáveis no Raibolt", () => {
  const { ranking, excluded } = data.clans.raibolt;
  for (const name of ["Zapdos", "Raikou"]) {
    assert.equal(ranking.some((entry) => entry.name === name), false, `${name} não pode estar no ranking`);
    const found = excluded.find((entry) => entry.name === name);
    assert.ok(found, `${name} precisa estar entre os excluídos`);
    assert.match(found.exclusionReason, /lendário|mítico/i);
    assert.equal(found.position, null);
  }
  assert.equal(excluded.length, 2);
});

test("11. o Ironhard possui seis utilizáveis e zero substitutos", () => {
  const ironhard = data.clans.ironhard;
  assert.equal(ironhard.ranking.length, 6);
  assert.equal(ironhard.usableCount, 6);
  assert.equal(ironhard.excluded.length, 0);
  assert.equal(ironhard.ranking.filter((entry) => !entry.inRecommendedTeam).length, 0);
});

test("12. Pokémon de dois tipos aparecem em todos os clãs elegíveis", () => {
  const species = new Map(everyEntry.map((entry) => [entry.dexNo, entry]));
  for (const [dexNo, entry] of species) {
    for (const id of CLAN_ORDER) {
      const eligible = isEligibleForClan(entry.types, CLANS[id].types);
      const present = [...data.clans[id].ranking, ...data.clans[id].excluded]
        .some((item) => item.dexNo === dexNo);
      assert.equal(present, eligible, `${entry.name} (${entry.types.join("/")}) em ${id}`);
    }
  }
  /* casos concretos de tipo duplo cobrindo dois clãs */
  const inClan = (id, name) => data.clans[id].ranking.some((entry) => entry.name === name);
  assert.ok(inClan("naturia", "Scizor") && inClan("ironhard", "Scizor"));
  assert.ok(inClan("seavell", "Gyarados") && inClan("wingeon", "Gyarados"));
  assert.ok(inClan("orebound", "Tyranitar") && inClan("malefic", "Tyranitar"));
});

test("13. nenhum lendário/mítico aparece no Top 6", () => {
  for (const [id, clan] of clanEntries) {
    for (const entry of clan.ranking.slice(0, 6)) {
      assert.equal(excludedSpecies.has(entry.dexNo), false, `${entry.name} no Top 6 de ${id}`);
      assert.equal(entry.status, "Rankeado");
    }
  }
});

/* ---------------------------------------------- integridade dos dados */

test("14. scores são importados e formatados com duas casas decimais", () => {
  for (const entry of everyEntry) {
    assert.equal(typeof entry.score, "number");
    assert.ok(Number.isFinite(entry.score));
    /* a planilha já entrega com 2 casas; nada é arredondado na importação */
    assert.equal(Math.round(entry.score * 100) / 100, entry.score, `${entry.name}`);
    assert.match(formatScore(entry.score), /^\d+,\d{2}$/);
  }
  assert.equal(formatScore(69.12), "69,12");
  assert.equal(formatScore(52), "52,00");
});

test("15. a ordem do ranking é estável e não depende da ordem no arquivo", () => {
  for (const [id, clan] of clanEntries) {
    /* posições contíguas de 1..N, na mesma ordem do array */
    clan.ranking.forEach((entry, index) => assert.equal(entry.position, index + 1, `${id} posição ${index + 1}`));
    /* embaralhar e reordenar por posição devolve exatamente o mesmo array */
    const shuffled = [...clan.ranking].sort(() => Math.random() - 0.5);
    const restored = shuffled.sort((a, b) => a.position - b.position).map((entry) => entry.name);
    assert.deepEqual(restored, clan.ranking.map((entry) => entry.name), `${id} reordenado`);
  }
});

test("16. empates seguem o desempate consolidado na planilha", () => {
  let ties = 0;
  for (const [id, clan] of clanEntries) {
    for (let i = 1; i < clan.ranking.length; i++) {
      const previous = clan.ranking[i - 1];
      const current = clan.ranking[i];
      assert.ok(current.score <= previous.score + 1e-9, `${id}: score fora de ordem em ${current.name}`);
      /* o rank teórico global é o critério de desempate e cresce junto com a posição */
      assert.ok(current.globalRank > previous.globalRank, `${id}: rank teórico fora de ordem em ${current.name}`);
      if (current.score === previous.score) ties++;
    }
  }
  assert.ok(ties > 0, "a planilha precisa conter empates para este teste ter valor");
});

test("17. a interface não recalcula nem reordena os resultados", () => {
  const ui = fs.readFileSync(path.join(LAB, "clan-ui.js"), "utf8");
  /* a UI pode ordenar substitutos por escolha explícita do usuário, mas nunca o ranking base */
  assert.equal(/\bspeciesScore\s*\(/.test(ui), false, "a UI não deve calcular score");
  assert.equal(/ranking\s*\.\s*sort\s*\(/.test(ui), false, "a UI não deve reordenar o ranking importado");
  assert.ok(ui.includes("clan-ranking.json"), "a UI deve consumir o JSON canônico");
});

test("18. o JSON contém todas as colunas necessárias", () => {
  const required = [
    "position", "globalRank", "tier", "inRecommendedTeam", "dexNo", "name", "types",
    "profile", "score", "bst", "stats", "offensiveCeilingR5", "secondaryOffenseR5",
    "robustnessR5", "huntKanto", "status", "reading", "source"
  ];
  for (const entry of everyEntry) {
    for (const key of required) assert.ok(key in entry, `${entry.name} sem "${key}"`);
    for (const stat of ["hp", "atk", "def", "spAtk", "spDef", "speed"]) {
      assert.equal(typeof entry.stats[stat], "number", `${entry.name}.stats.${stat}`);
    }
    for (const type of entry.types) assert.ok(TYPE_LABEL[type], `tipo desconhecido "${type}" em ${entry.name}`);
  }
  assert.ok(data.meta.model.length > 0);
  assert.equal(data.meta.consolidatedAt, "20/07/2026");
  assert.equal(data.methodology.rank5Multiplier, 1.3);
  assert.deepEqual(data.methodology.weights, {
    offensiveCeiling: 0.6, secondaryOffense: 0.1, robustness: 0.15, speed: 0.1, bst: 0.05
  });
  assert.ok(data.methodology.sources.length >= 5);
  assert.ok(data.methodology.premises.length >= 5);
  assert.ok(data.methodology.limitations.length > 0);
});

test("19. não há Pokémon duplicado dentro de um mesmo clã", () => {
  for (const [id, clan] of clanEntries) {
    const all = [...clan.ranking, ...clan.excluded];
    assert.equal(new Set(all.map((entry) => entry.dexNo)).size, all.length, `${id} tem duplicados`);
    assert.equal(new Set(all.map((entry) => entry.name)).size, all.length, `${id} tem nomes repetidos`);
  }
});

test("20. utilizáveis + excluídos de cada clã batem com o resumo", () => {
  for (const [id, clan] of clanEntries) {
    const overview = data.summary.find((item) => item.clan === clan.name);
    assert.ok(overview, `${id} ausente no resumo`);
    assert.equal(clan.ranking.length, overview.usableCount, `${id} utilizáveis`);
    assert.equal(clan.excluded.length, overview.excludedCount, `${id} excluídos`);
    assert.equal(clan.ranking.length + clan.excluded.length, overview.eligibleCount, `${id} elegíveis`);
  }
  const totals = data.summary.reduce((sum, item) => sum + item.eligibleCount, 0);
  assert.equal(totals, data.meta.clanParticipations);
});

/* ---------------------------------------------- paridade com a planilha */

test("paridade: o motor reproduz o score da planilha com tolerância de 0,01", () => {
  let worst = 0;
  let worstEntry = null;
  for (const entry of everyEntry) {
    const recalculated = speciesScore(entry.stats, entry.bst, data.methodology);
    const delta = Math.abs(recalculated - entry.score);
    if (delta > worst) { worst = delta; worstEntry = entry; }
  }
  assert.ok(worst <= 0.01, `maior divergência ${worst.toFixed(4)} em ${worstEntry?.name}`);
});

test("paridade: colunas derivadas R5 conferem com o motor", () => {
  for (const entry of everyEntry) {
    const boosted = applyRank5Bonus(entry.stats, data.methodology.rank5Multiplier);
    assert.ok(Math.abs(offensiveCeiling(boosted) - entry.offensiveCeilingR5) < 1e-6, `teto de ${entry.name}`);
    assert.ok(Math.abs(secondaryOffense(boosted) - entry.secondaryOffenseR5) < 1e-6, `secundária de ${entry.name}`);
    assert.ok(Math.abs(robustness(boosted) - entry.robustnessR5) < 1e-6, `robustez de ${entry.name}`);
    /* O perfil vem da planilha; aqui só conferimos que é coerente com os stats
       importados, o que detecta troca de colunas na importação. */
    const gap = entry.stats.atk - entry.stats.spAtk;
    if (entry.profile === "Físico") assert.ok(gap >= 12, `perfil físico de ${entry.name}`);
    else if (entry.profile === "Especial") assert.ok(gap <= -12, `perfil especial de ${entry.name}`);
    else assert.ok(Math.abs(gap) <= 11, `perfil misto de ${entry.name}`);
    /* HP e Speed nunca recebem bônus */
    assert.equal(boosted.hp, entry.stats.hp);
    assert.equal(boosted.speed, entry.stats.speed);
  }
});

test("paridade: nenhuma posição muda ao reordenar pelo score recalculado", () => {
  for (const [id, clan] of clanEntries) {
    const recalculated = clan.ranking.map((entry) => ({
      name: entry.name,
      globalRank: entry.globalRank,
      score: speciesScore(entry.stats, entry.bst, data.methodology)
    }));
    const sorted = [...recalculated].sort((a, b) => b.score - a.score || a.globalRank - b.globalRank);
    assert.deepEqual(
      sorted.map((entry) => entry.name),
      clan.ranking.map((entry) => entry.name),
      `ordem recalculada de ${id}`
    );
  }
});
