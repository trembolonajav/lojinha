/* Importa a planilha canônica de ranking de clãs e gera o JSON consumido pelo VPLab.
   A planilha é a fonte da verdade: este script normaliza, valida e serializa — nunca
   recalcula posições nem inventa dados ausentes.

   Uso: npm run build:clan-ranking */

import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data", "clan-ranking", "ranking_pokeidle_por_cla.xlsx");
const OUTPUT = path.join(ROOT, "apps", "vpertz-lab", "public", "data", "clan-ranking.json");

/* Ordem de exibição dos clãs no seletor — a mesma já usada pela interface. */
const CLAN_ORDER = [
  "Volcanic", "Raibolt", "Orebound", "Naturia", "Gardestrike",
  "Ironhard", "Wingeon", "Psycraft", "Seavell", "Malefic"
];

/* Rótulos de tipo da planilha (pt-BR) para as chaves internas usadas nas cores das badges. */
const TYPE_KEYS = {
  "Normal": "normal", "Fogo": "fire", "Água": "water", "Elétrico": "electric",
  "Planta": "grass", "Gelo": "ice", "Lutador": "fighting", "Veneno": "poison",
  "Terra": "ground", "Voador": "flying", "Psíquico": "psychic", "Inseto": "bug",
  "Pedra": "rock", "Fantasma": "ghost", "Dragão": "dragon", "Sombrio": "dark",
  "Aço": "steel", "Fada": "fairy"
};

const STATUS_RANKED = "Rankeado";

const fail = (message) => { throw new Error(`[clan-ranking] ${message}`); };

const text = (value) => (value === null || value === undefined ? "" : String(value).trim());
const number = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const yesNo = (value) => text(value) === "Sim";

/* "Elétrico / Aço" -> ["electric","steel"] */
function parseTypes(label, context) {
  const parts = text(label).split("/").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) fail(`tipos ausentes em ${context}`);
  return parts.map((part) => TYPE_KEYS[part] || fail(`tipo desconhecido "${part}" em ${context}`));
}

function sheetRows(workbook, name) {
  const sheet = workbook.Sheets[name] || fail(`aba "${name}" não encontrada na planilha`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: null });
}

/* Lê blocos rotulados da aba Metodologia a partir do título da seção, sem índices fixos. */
function readSection(rows, title, arity) {
  const start = rows.findIndex((row) => text(row?.[0]) === title);
  if (start < 0) fail(`seção "${title}" não encontrada na aba Metodologia`);
  const block = [];
  for (let i = start + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const label = text(row[0]);
    if (!label) {
      if (block.length) break;
      continue;
    }
    if (text(row[1]) === "") break; /* próximo título de seção */
    block.push(row.slice(0, arity));
  }
  if (!block.length) fail(`seção "${title}" está vazia`);
  return block;
}

function parseMethodology(rows) {
  const subtitle = text(rows[1]?.[0]);
  const consolidatedAt = subtitle.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1]
    || fail("não foi possível ler a data de consolidação na aba Metodologia");
  const model = subtitle.split("·")[0].trim();

  const premises = readSection(rows, "Premissas do ranking", 2)
    .map(([label, body]) => ({ label: text(label), text: text(body) }));

  const parameters = readSection(rows, "Parâmetros editáveis do score", 4)
    .map(([label, value, note, origin]) => ({
      label: text(label), value: number(value), note: text(note), origin: text(origin)
    }));

  const sources = readSection(rows, "Fontes utilizadas", 3)
    .map(([label, url, note]) => ({ label: text(label), url: text(url), note: text(note) }));

  const param = (label) => {
    const found = parameters.find((item) => item.label === label);
    if (!found || found.value === null) fail(`parâmetro "${label}" ausente na aba Metodologia`);
    return found.value;
  };

  const limitation = premises.find((item) => item.label === "Limitação principal");

  return {
    model,
    consolidatedAt,
    rank5Multiplier: param("Multiplicador Rank 5"),
    bonusStats: ["ATK", "Sp. ATK", "DEF", "Sp. DEF"],
    weights: {
      offensiveCeiling: param("Peso · teto ofensivo"),
      secondaryOffense: param("Peso · ofensiva secundária"),
      robustness: param("Peso · robustez"),
      speed: param("Peso · Speed"),
      bst: param("Peso · BST")
    },
    normalization: {
      offensiveCeiling: param("Máximo · teto ofensivo"),
      secondaryOffense: param("Máximo · ofensiva secundária"),
      robustness: param("Máximo · robustez"),
      speed: param("Máximo · Speed"),
      bst: param("Máximo · BST")
    },
    premises,
    parameters,
    limitations: limitation ? limitation.text : "",
    sources
  };
}

function parseSummary(rows) {
  const totals = text(rows[1]?.[0]);
  const pick = (pattern) => {
    const found = totals.match(pattern);
    if (!found) fail(`não foi possível ler "${pattern}" na linha de totais do Resumo`);
    return Number(found[1]);
  };
  const headerIndex = rows.findIndex((row) => text(row?.[0]) === "Clã");
  if (headerIndex < 0) fail("cabeçalho da tabela do Resumo não encontrado");

  const clans = rows.slice(headerIndex + 1)
    .filter((row) => text(row?.[0]))
    .map((row) => ({
      clan: text(row[0]),
      elements: text(row[1]),
      eligibleCount: number(row[2]),
      usableCount: number(row[3]),
      excludedCount: number(row[4]),
      leader: text(row[5]),
      recommendedTeam: text(row[6]).split("·").map((name) => name.trim()).filter(Boolean),
      leaderScore: number(row[7])
    }));

  return {
    speciesAudited: pick(/(\d+)\s+espécies auditadas/),
    usableSpecies: pick(/(\d+)\s+utilizáveis/),
    excludedSpecies: pick(/(\d+)\s+lendários\/míticos excluídos/),
    clanParticipations: pick(/(\d+)\s+participações em clãs/),
    clans
  };
}

/* Índices das colunas das abas de clã, validados contra o cabeçalho real. */
const CLAN_COLUMNS = [
  "Posição", "Rank teórico", "Tier", "Time 6", "#", "Pokémon", "Tipos", "Perfil", "Score",
  "BST", "HP", "ATK", "DEF", "Sp. ATK", "Sp. DEF", "Speed",
  "Teto ofensivo R5", "Ofensiva secundária R5", "Robustez R5",
  "Hunt Kanto", "Status", "Leitura técnica",
  "Por que abaixo do anterior", "Por que acima do seguinte", "Fonte"
];

function parseClanSheet(rows, sheetName) {
  const headerIndex = rows.findIndex((row) => text(row?.[0]) === "Posição");
  if (headerIndex < 0) fail(`cabeçalho não encontrado na aba ${sheetName}`);
  const header = rows[headerIndex].map(text);
  CLAN_COLUMNS.forEach((expected, index) => {
    if (header[index] !== expected) {
      fail(`aba ${sheetName}: coluna ${index} era esperada como "${expected}" e veio "${header[index]}"`);
    }
  });

  const ranking = [];
  const excluded = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const name = text(row?.[5]);
    if (!name) continue;
    const context = `${sheetName}/${name}`;
    const status = text(row[20]);

    const entry = {
      position: number(row[0]),
      globalRank: number(row[1]),
      tier: text(row[2]),
      inRecommendedTeam: yesNo(row[3]),
      dexNo: number(row[4]) ?? fail(`número da Pokédex ausente em ${context}`),
      name,
      types: parseTypes(row[6], context),
      typesLabel: text(row[6]),
      profile: text(row[7]),
      score: number(row[8]) ?? fail(`score ausente em ${context}`),
      bst: number(row[9]),
      stats: {
        hp: number(row[10]), atk: number(row[11]), def: number(row[12]),
        spAtk: number(row[13]), spDef: number(row[14]), speed: number(row[15])
      },
      offensiveCeilingR5: number(row[16]),
      secondaryOffenseR5: number(row[17]),
      robustnessR5: number(row[18]),
      huntKanto: yesNo(row[19]),
      status,
      reading: text(row[21]),
      whyBelowPrevious: text(row[22]) || null,
      whyAbovePrevious: text(row[23]) || null,
      source: text(row[24]) || null
    };

    if (status === STATUS_RANKED) {
      if (entry.position === null) fail(`posição ausente para ${context}`);
      ranking.push(entry);
    } else {
      entry.exclusionReason = status;
      excluded.push(entry);
    }
  }

  /* Ordena pela posição da planilha para que o JSON não dependa da ordem das linhas. */
  ranking.sort((a, b) => a.position - b.position);
  excluded.sort((a, b) => (a.globalRank ?? 0) - (b.globalRank ?? 0));

  ranking.forEach((entry, index) => {
    if (entry.position !== index + 1) {
      fail(`aba ${sheetName}: posições não são contíguas (esperado ${index + 1}, veio ${entry.position})`);
    }
  });

  return { ranking, excluded };
}

function validate(payload) {
  const { meta, summary, clans } = payload;
  const problems = [];

  if (Object.keys(clans).length !== 10) problems.push(`esperados 10 clãs, encontrados ${Object.keys(clans).length}`);

  let participations = 0;
  const auditedNames = new Set();

  for (const [id, clan] of Object.entries(clans)) {
    const usable = clan.ranking.length;
    const excluded = clan.excluded.length;
    participations += usable + excluded;

    if (usable !== clan.usableCount) problems.push(`${id}: ${usable} rankeados x ${clan.usableCount} no Resumo`);
    if (excluded !== clan.excludedCount) problems.push(`${id}: ${excluded} excluídos x ${clan.excludedCount} no Resumo`);
    if (usable + excluded !== clan.eligibleCount) {
      problems.push(`${id}: utilizáveis + excluídos (${usable + excluded}) ≠ elegíveis (${clan.eligibleCount})`);
    }

    const team = clan.ranking.filter((entry) => entry.inRecommendedTeam).map((entry) => entry.name);
    if (team.join(" · ") !== clan.recommendedTeam.join(" · ")) {
      problems.push(`${id}: time marcado (${team.join(", ")}) diverge do Resumo (${clan.recommendedTeam.join(", ")})`);
    }
    if (clan.ranking[0] && clan.ranking[0].name !== clan.leader) {
      problems.push(`${id}: primeiro colocado (${clan.ranking[0].name}) ≠ líder do Resumo (${clan.leader})`);
    }

    const seen = new Set();
    for (const entry of [...clan.ranking, ...clan.excluded]) {
      if (seen.has(entry.dexNo)) problems.push(`${id}: Pokémon duplicado #${entry.dexNo} (${entry.name})`);
      seen.add(entry.dexNo);
      auditedNames.add(entry.dexNo);
    }

    for (let i = 1; i < clan.ranking.length; i++) {
      if (clan.ranking[i].score > clan.ranking[i - 1].score + 1e-9) {
        problems.push(`${id}: score fora de ordem entre ${clan.ranking[i - 1].name} e ${clan.ranking[i].name}`);
      }
    }
  }

  if (participations !== meta.clanParticipations) {
    problems.push(`participações: ${participations} x ${meta.clanParticipations} no Resumo`);
  }
  if (auditedNames.size !== meta.speciesAudited) {
    problems.push(`espécies distintas nos clãs: ${auditedNames.size} x ${meta.speciesAudited} auditadas`);
  }
  if (summary.length !== 10) problems.push(`Resumo lista ${summary.length} clãs`);

  if (problems.length) fail(`validação falhou:\n  - ${problems.join("\n  - ")}`);
}

async function main() {
  const buffer = await fs.readFile(SOURCE);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const methodology = parseMethodology(sheetRows(workbook, "Metodologia"));
  const summary = parseSummary(sheetRows(workbook, "Resumo"));
  const auditRows = sheetRows(workbook, "Auditoria 251");
  const auditHeader = auditRows.findIndex((row) => text(row?.[0]) === "#");
  const audit = auditRows.slice(auditHeader + 1).filter((row) => text(row?.[1]));

  const clans = {};
  for (const sheetName of CLAN_ORDER) {
    const id = sheetName.toLowerCase();
    const overview = summary.clans.find((item) => item.clan === sheetName)
      || fail(`clã ${sheetName} ausente na aba Resumo`);
    const { ranking, excluded } = parseClanSheet(sheetRows(workbook, sheetName), sheetName);
    clans[id] = {
      id,
      name: sheetName,
      elements: overview.elements,
      eligibleCount: overview.eligibleCount,
      usableCount: overview.usableCount,
      excludedCount: overview.excludedCount,
      leader: overview.leader,
      leaderScore: overview.leaderScore,
      recommendedTeam: overview.recommendedTeam,
      ranking,
      excluded
    };
  }

  const payload = {
    meta: {
      version: 1,
      model: methodology.model,
      generatedAt: new Date().toISOString(),
      consolidatedAt: methodology.consolidatedAt,
      sourceFile: path.basename(SOURCE),
      speciesAudited: summary.speciesAudited,
      usableSpecies: summary.usableSpecies,
      excludedSpecies: summary.excludedSpecies,
      clanParticipations: summary.clanParticipations,
      auditRows: audit.length
    },
    methodology,
    summary: summary.clans,
    clans
  };

  validate(payload);

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const bytes = (await fs.stat(OUTPUT)).size;
  console.log(`clan-ranking.json gerado (${(bytes / 1024).toFixed(1)} KB)`);
  console.log(`  ${payload.meta.speciesAudited} auditadas · ${payload.meta.usableSpecies} utilizáveis · ${payload.meta.excludedSpecies} excluídas · ${payload.meta.clanParticipations} participações`);
  console.log(`  modelo: ${payload.meta.model} · consolidado em ${payload.meta.consolidatedAt}`);
}

await main();
