/* ============================================================
   VPLAB — lógica
   Fórmulas conferidas na Pokepedia oficial (systems/power,
   systems/quality, systems/combat, systems/clans):
     stat  = round((base + 2×growth) × nível/100 × Qualidade^exp)
     Power = round(soma dos 6 stats × Qualidade)
     Hunt: ×2→×2.5, ×4→×5.5, resistências ÷1.5
     Clã:  +6% por rank em Atk/SpA/Def/SpD (Rank 5 = +30%)
   ============================================================ */

/* Troque quando a loja estiver publicada na Vercel: */
const STORE_URL = "/";

/* Espécies confirmadas pelo mapa atual. Johto ainda não é uma região jogável. */
const AVAILABLE_DEX = new Set([
  1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,96,97,98,99,100,101,102,103,104,105,108,109,110,111,112,114,115,120,121,122,123,124,125,126,127,128,130,131,138,139,140,141,142,143,147,148,149,152,153,154,155,156,157,158,159,160,164,170,171,172,174,179,180,181,182,186,192,195,200,203,205,208,212,216,217,218,219,220,221,226,227,228,229,230,238,239,240,241,248
]);
const DEX = window.VPLAB_DEX.filter((p) => AVAILABLE_DEX.has(p.dexNo));
const CHART = window.VPLAB_TYPE_CHART;
const EXP = [0.95, 0.80, 0.80, 0.80, 0.80, 0.95];
const STAT_NAMES = ["HP", "Ataque", "Defesa", "Atq. Esp.", "Def. Esp.", "Velocid."];

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
const ALL_TYPES = Object.keys(TYPE_LABEL);

const QUALITY_TIERS = [
  { min:0.8,  max:1.0,   nome:"Fraca",    cor:"#8d8d9c" },
  { min:1.0,  max:1.1,   nome:"Comum",    cor:"#b5a196" },
  { min:1.1,  max:1.3,   nome:"Incomum",  cor:"#4fc47a" },
  { min:1.3,  max:1.5,   nome:"Rara",     cor:"#5b9bd8" },
  { min:1.5,  max:1.7,   nome:"Épica",    cor:"#a86fd8" },
  { min:1.7,  max:1.81,  nome:"Lendária", cor:"#e5b34f" }
];
const QUALITY_BANDS = [
  ["0.8 – 0.9", "5%"], ["0.9 – 1.0", "5%"], ["1.0 – 1.1", "34,04%"],
  ["1.1 – 1.2", "20%"], ["1.2 – 1.3", "10%"], ["1.3 – 1.4", "10%"],
  ["1.4 – 1.5", "10%"], ["1.5 – 1.6", "5%"], ["1.7 – 1.799", "0,67%"],
  ["1.800 (perfeita)", "0,29%"]
];
const RARITY_COLOR = {
  "Comum":"#9a8d84", "Incomum":"#4fc47a", "Raro":"#5b9bd8",
  "Épico":"#a86fd8", "Lendário":"#e5b34f", "Mítico":"#ff6b8d"
};

/* ---------------------------------------------- helpers */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const pad3 = (n) => String(n).padStart(3, "0");
const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");

const tb = (t) => `<span class="tb" style="background:${TYPE_COLOR[t]||"#777"}">${TYPE_LABEL[t]||t}</span>`;
const tbs = (arr) => arr.map(tb).join(" ");

function rarTag(r){
  const c = RARITY_COLOR[r] || "#999";
  return `<span class="rar" style="color:${c};border-color:${c}55;background:${c}18">${esc(r)}</span>`;
}

/* fórmulas do jogo */
const statAt = (base, iv, lvl, q, i) => Math.round((base + 2*iv) * (lvl/100) * Math.pow(q, EXP[i]));
const powerOf = (p, lvl, q, iv=32) => {
  let s = 0;
  for (let i = 0; i < 6; i++) s += statAt(p.baseStats[i], iv, lvl, q, i);
  return Math.round(s * q);
};
function inferIvData(p, stats, lvl, q){
  const raw = stats.map((value, i) => {
    const scale = (lvl/100) * Math.pow(q, EXP[i]);
    return clamp((value/scale-p.baseStats[i])/2, 0, 32);
  });
  return {
    raw,
    rounded:raw.map(Math.round),
    total:{
      min:raw.reduce((sum,iv) => sum+Math.floor(iv), 0),
      likely:Math.floor(raw.reduce((sum,iv) => sum+iv, 0)),
      max:raw.reduce((sum,iv) => sum+Math.ceil(iv), 0)
    }
  };
}
function potentialOf(p, rawIvs, q){
  const physical = Math.max(0,p.baseStats[1]) ** 4;
  const special = Math.max(0,p.baseStats[3]) ** 4;
  const offensiveTotal = Math.max(1,physical+special);
  const weights = [.11,.695*(physical/offensiveTotal),.09,.695*(special/offensiveTotal),.09,.015];
  const ivScore = weights.reduce((sum,w,i) => sum+w*clamp(rawIvs[i]/32,0,1),0);
  return clamp(ivScore*Math.pow(clamp(q/1.8,0,1),1.15)*100,0,100);
}
function effVs(atkType, defTypes){
  const row = CHART[atkType.toUpperCase()] || {};
  let m = 1;
  defTypes.forEach((d) => { const v = row[d.toUpperCase()]; if (v !== undefined) m *= v; });
  return m;
}
const huntAmp = (m) => m === 0 ? 0 : m > 1 ? 1 + (m-1)*1.5 : m < 1 ? m/1.5 : 1;
const fmtX = (m) => "×" + (Math.round(m*100)/100).toString().replace(".", ",");
function multColor(m){
  if (m === 0) return "var(--imm)";
  if (m >= 2.5) return "var(--good)";
  if (m > 1) return "#7fb069";
  if (m === 1) return "var(--faint)";
  if (m >= 0.5) return "var(--mid)";
  return "var(--bad)";
}
function qualityTier(q){
  return QUALITY_TIERS.find((t) => q >= t.min && q < t.max) || QUALITY_TIERS[QUALITY_TIERS.length-1];
}
function bestMove(p, cat){
  const list = p.golpes.filter((g) => g.categoria === cat);
  return list.length ? list.reduce((a,b) => b.poder > a.poder ? b : a) : null;
}
/* melhor arma: compara físico×Atk vs especial×SpA */
function attacker(p){
  const bp = bestMove(p, "fisico"), bs = bestMove(p, "especial");
  const ps = bp ? bp.poder * p.baseStats[1] : 0;
  const ss = bs ? bs.poder * p.baseStats[3] : 0;
  return { bp, bs, rec: ss >= ps ? "especial" : "fisico" };
}
const regionOf = () => "kanto";
const HUNTABLE = DEX.filter((p) => !p.boss);

const OUTLAND_SPECS = [
  ["Taekwondo Hitmonlee","hitmonlee"],["Taekwondo Hitmontop","hitmontop"],["Taekwondo Hitmonchan","hitmonchan"],
  ["Brave Steelix","steelix"],["Ancient Pupitar","pupitar"],["Brute Rhydon","rhydon"],
  ["Brave Nidoqueen","nidoqueen"],["Brave Nidoking","nidoking"],["Banshee Misdreavus","misdreavus"],["Trickmaster Gengar","gengar"],
  ["Dark Crobat","crobat"],["Furious Skarmory","skarmory"],["Furious Pidgeot","pidgeot"],["Brave Noctowl","noctowl"],
  ["Furious Wigglytuff","wigglytuff"],["Ancient Granbull","granbull"],["Hard Golem","golem"],["Brave Clefable","clefable"],
  ["War Heracross","heracross"],["Furious Scyther","scyther"],["Brave Arcanine","arcanine"],["Furious Magmar","magmar"],
  ["Brave Charizard","charizard"],["Enraged Typhlosion","typhlosion"],["Ancient Marowak","marowak"],["Roll Donphan","donphan"],
  ["Furious Sandslash","sandslash"],["Milch-Miltank","miltank"],["Charged Raichu","raichu"],["Magnetic Electabuzz","electabuzz"],
  ["Furious Ampharos","ampharos"],["Enigmatic Girafarig","girafarig"],["Ancient Hypno","hypno"],["Ancient Xatu","xatu"],
  ["Brave Alakazam","alakazam"],["Ancient Pinsir","pinsir"],["Ancient Meganium","meganium"],["Tribal Feraligatr","feraligatr"],
  ["Furious Gyarados","gyarados"],["Brave Blastoise","blastoise"],["Brave Mantine","mantine"],["Brave Venusaur","venusaur"],
  ["Heavy Piloswine","piloswine"],["Freezing Dewgong","dewgong"],["Ancient Dragonair","dragonair"],["Psy Jynx","jynx"],["Evil Cloyster","cloyster"]
];
const OUTLAND = OUTLAND_SPECS.map(([nome, slug], i) => {
  const base = window.VPLAB_DEX.find((p) => p.slug === slug);
  return base ? { ...base, nome, baseSlug:slug, slug:`outland-${slug}-${i}`, huntLevel:150, region:"outland" } : null;
}).filter(Boolean);

/* ---------------------------------------------- estado */
let cur = null;
let activeTab = "perfil";
let rotaRegion = "kanto", rotaManual = false, rotaTypeManual = false;
let clanRank = 5;

function syncUrl(){
  const u = new URL(location.href);
  u.searchParams.set("p", cur.slug);
  u.searchParams.set("tab", activeTab);
  history.replaceState(null, "", u);
}

/* ---------------------------------------------- montagem inicial */
(function initSelects(){
  const speciesOptions = DEX.map((p) =>
    `<option value="${p.slug}">#${pad3(p.dexNo)} ${esc(p.nome)}${p.boss ? " (boss)" : ""}</option>`).join("");
  $("#species").innerHTML = speciesOptions;
  $("#x-species").innerHTML = speciesOptions;
  $("#rota-type").innerHTML = ALL_TYPES.map((t) => `<option value="${t}">${TYPE_LABEL[t]}</option>`).join("");
  $("#x-obs").innerHTML = STAT_NAMES.map((n, i) =>
    `<label class="field"><span class="lbl" style="text-align:center">${n}</span><input class="mono" id="o${i}" type="number" min="1" placeholder="—" style="text-align:center"></label>`).join("");
  $("#x-qtable").innerHTML = QUALITY_TIERS.map((t) => {
    const bands = t.nome === "Fraca" ? "10%" :
      t.nome === "Comum" ? "34%" : t.nome === "Incomum" ? "30%" :
      t.nome === "Rara" ? "20%" : t.nome === "Épica" ? "5%" : "< 1%";
    const faixa = t.nome === "Lendária" ? "1.7+ (1.800 = perfeita)" :
      `${t.min.toFixed(1)} – ${t.max.toFixed(1)}`;
    return `<tr><td><span class="qtag" style="color:${t.cor};border-color:${t.cor}66;background:${t.cor}14">${t.nome}</span></td><td class="mono">${faixa}</td><td>${bands}</td></tr>`;
  }).join("");
})();

/* ---------------------------------------------- render: perfil */
function renderPerfil(){
  const p = cur;
  const lvl = num($("#level").value) || 100;
  const q = num($("#quality").value) || 1;

  $("#p_head").innerHTML = `
    <span class="kicker">#${pad3(p.dexNo)} · Kanto</span>
    <h2 class="sec" style="font-size:26px">${esc(p.nome)}</h2>
    <div class="chips" style="margin-top:10px">
      ${tbs(p.tipos)} ${rarTag(p.raridade)}
      ${p.boss
        ? `<span class="chip-info" style="color:var(--bad)"><b>Boss</b> — não aparece na hunt</span>`
        : `<span class="chip-info">Hunt <b>Nv ${p.huntLevel}</b></span>`}
    </div>`;

  const total = p.baseStats.reduce((a,b) => a+b, 0);
  $("#p_stats").innerHTML = p.baseStats.map((v, i) => `
    <div class="strow">
      <span class="nm">${STAT_NAMES[i]}</span>
      <div class="sttrack"><div class="stfill" style="width:${clamp(v/255*100, 2, 100)}%"></div></div>
      <span class="num mono">${v}</span>
    </div>`).join("") + `
    <div class="strow"><span class="nm">Total</span><div></div><span class="num mono" style="color:var(--gold)">${total}</span></div>`;

  $("#p_badges").innerHTML = `
    <div class="badge gold"><div class="k">Power máx (Nv ${lvl}, Q ${q})</div><div class="v mono">${fmt(powerOf(p, lvl, q))}</div></div>
    <div class="badge"><div class="k">XP por abate</div><div class="v mono">${fmt(p.xp)}</div></div>
    <div class="badge"><div class="k">Loot médio / abate</div><div class="v mono">$${fmt(p.lootAvg)}</div></div>
    <div class="badge"><div class="k">Preço NPC</div><div class="v mono">$${fmt(p.priceNpc)}</div></div>
    <div class="badge"><div class="k">Venda (Heather)</div><div class="v mono">$${fmt(p.sellValue)}</div></div>`;

  const atk = attacker(p);
  const best = atk.rec === "fisico" ? atk.bp : atk.bs;
  $("#p_moves").innerHTML = p.golpes.map((g) => {
    const rec = best && g.nome === best.nome && g.categoria === best.categoria;
    const statIdx = g.categoria === "fisico" ? 1 : 3;
    const idx = g.poder * p.baseStats[statIdx];
    return `<div class="movecard${rec ? " rec" : ""}">
      ${rec ? '<span class="star">★ mais dano</span>' : ""}
      <div class="cat">${g.categoria === "fisico" ? "Físico · usa Ataque" : "Especial · usa Atq. Esp."}</div>
      <div class="nm">${esc(g.nome)}</div>
      <div class="meta">${tb(g.tipo)} · Poder ${g.poder} · Nv ${g.nivel} · índice <b class="mono">${fmt(idx)}</b></div>
    </div>`;
  }).join("");

  const rows = ALL_TYPES.map((t) => ({ t, m: huntAmp(effVs(t, p.tipos)) }));
  const grp = (lab, arr) => !arr.length ? "" : `
    <div class="efgroup"><div class="lab">${lab}</div><div class="eflist">
      ${arr.map((r) => `<span class="efpill">${tb(r.t)}<span class="x" style="background:${multColor(r.m)}">${fmtX(r.m)}</span></span>`).join("")}
    </div></div>`;
  $("#p_eff").innerHTML =
    grp("Fraco contra (dano amplificado)", rows.filter((r) => r.m > 1).sort((a,b) => b.m - a.m)) +
    grp("Resiste a", rows.filter((r) => r.m > 0 && r.m < 1).sort((a,b) => a.m - b.m)) +
    grp("Imune a", rows.filter((r) => r.m === 0));

  /* linha evolutiva: acha a raiz e percorre */
  let root = p;
  for (;;) {
    const prev = DEX.find((x) => x.evolvesToId === root.dexNo);
    if (!prev) break;
    root = prev;
  }
  const chain = [];
  let node = root;
  while (node) {
    chain.push(node);
    node = node.evolvesToId ? DEX.find((x) => x.dexNo === node.evolvesToId) : null;
  }
  $("#p_evo").innerHTML = chain.length < 2
    ? '<span class="note" style="margin:0">Esta espécie não evolui.</span>'
    : chain.map((n, i) => {
        const arrow = i < chain.length - 1
          ? `<span class="evo-arrow">— Nv ${n.evolveLevel || "?"} →</span>` : "";
        return `<button class="evo-node${n.slug === p.slug ? " me" : ""}" data-slug="${n.slug}">${esc(n.nome)}</button>${arrow}`;
      }).join("");
  $$("#p_evo .evo-node").forEach((b) => b.addEventListener("click", () => setSpecies(b.dataset.slug)));

  $("#p_drops").innerHTML = p.loot.map((l) => {
    const pct = l.c / 1000;
    const pctTxt = pct === 0 ? "0%" : pct < 1 ? pct.toFixed(2).replace(".", ",") + "%" : Math.round(pct) + "%";
    const qty = l.mn === l.mx ? `×${l.mn}` : `×${l.mn}–${l.mx}`;
    return `<span class="drop"><b>${esc(l.n)}</b> ${qty} · <span class="pct">${pctTxt}</span></span>`;
  }).join("");
}

/* ---------------------------------------------- render: avaliar IV */
function renderAvaliar(){
  const p = cur;
  const lvl = num($("#x-level").value);
  const q = num($("#x-qual").value);
  const ivTotalGiven = num($("#x-ivtotal").value);
  const powerGiven = num($("#x-power").value);
  const obs = STAT_NAMES.map((_, i) => num($("#o" + i).value));
  const filled = obs.filter((v) => v > 0).length;
  const box = $("#x-result");

  if (!lvl || q < 0.8 || filled < 6) {
    box.innerHTML = `<p class="note">Preencha o <b>nível</b>, a <b>qualidade</b> e os <b>6 stats</b> do card do ${esc(p.nome)} para o raio-X. O IV Total é opcional — serve para conferir a estimativa.</p>`;
    return;
  }

  const inferred = inferIvData(p,obs,lvl,q);
  const ivs = inferred.rounded;
  const soma = inferred.total.likely;
  const media = inferred.raw.reduce((a,b) => a+b,0)/6;
  const tier = qualityTier(q);
  const calculatedPower = Math.round(obs.reduce((a,b) => a+b,0)*q);
  const potential = potentialOf(p,inferred.raw,q);
  const maxPower = powerOf(p,lvl,1.8,32);

  const ivColor = (iv) => iv >= 27 ? "var(--good)" : iv >= 18 ? "var(--gold)" : iv >= 12 ? "var(--mid)" : "var(--bad)";
  const rowsHtml = ivs.map((iv, i) => `
    <div class="ivrow">
      <span class="nm">${STAT_NAMES[i]}</span>
      <div class="sttrack"><div class="ivfill" style="width:${iv/32*100}%;background:${ivColor(iv)}"></div></div>
      <span class="num mono" style="color:${ivColor(iv)}">${iv} / 32</span>
    </div>`).join("");

  let check = "";
  if (ivTotalGiven > 0) {
    const diff = Math.abs(soma - ivTotalGiven);
    check = diff <= 2
      ? `<p class="note" style="color:var(--good)">✔ A soma estimada (<b class="mono">${soma}</b>) bate com o IV Total do jogo (<b class="mono">${ivTotalGiven}</b>).</p>`
      : `<p class="note" style="color:var(--bad)">✖ Soma estimada <b class="mono">${soma}</b> ≠ IV Total <b class="mono">${ivTotalGiven}</b> — confira se nível, qualidade e stats foram copiados certinho (equips e bônus de clã distorcem os números).</p>`;
  }
  const powerCheck = powerGiven > 0
    ? Math.abs(calculatedPower-powerGiven) <= 2
      ? `<p class="note" style="color:var(--good)">✔ Power conferido: <b class="mono">${fmt(calculatedPower)}</b>, igual ao card.</p>`
      : `<p class="note" style="color:var(--bad)">✖ Power calculado <b class="mono">${fmt(calculatedPower)}</b> ≠ card <b class="mono">${fmt(powerGiven)}</b>. Revise nível, qualidade ou stats.</p>`
    : `<p class="note">Power calculado pelos stats: <b class="mono">${fmt(calculatedPower)}</b>.</p>`;

  /* veredito combina média de IV e etiqueta de qualidade */
  const ivNota = media >= 29 ? ["Excepcional", "var(--good)"] :
    media >= 24 ? ["Ótimo", "var(--good)"] :
    media >= 18 ? ["Bom", "var(--gold)"] :
    media >= 12 ? ["Mediano", "var(--mid)"] : ["Fraco", "var(--bad)"];

  const atk = attacker(p);
  const atkIdx = atk.rec === "fisico" ? 1 : 3;
  const atkNome = atk.rec === "fisico" ? "Ataque" : "Atq. Especial";
  const atkIv = ivs[atkIdx];
  const dica = atkIv >= 27
    ? `O IV de <b>${atkNome}</b> (${atkIv}/32) — o stat que importa pro dano do ${esc(p.nome)} — está excelente.`
    : atkIv >= 20
      ? `O IV de <b>${atkNome}</b> (${atkIv}/32) está bom; é o stat que mais importa pro dano do ${esc(p.nome)}.`
      : `O IV de <b>${atkNome}</b> (${atkIv}/32) é o que mais pesa no dano do ${esc(p.nome)} — abaixo de 20, vale caçar outro.`;

  box.innerHTML = rowsHtml + powerCheck + check + `
    <div class="verdict">
      <span class="qtag" style="color:${tier.cor};border-color:${tier.cor}66;background:${tier.cor}14">Qualidade ${tier.nome} (${q})</span>
      <div class="big" style="color:${ivNota[1]}">IV ${ivNota[0]} — potencial ${potential.toFixed(1).replace(".", ",")}%</div>
      <div class="analysis-metrics">
        <span><b>${inferred.total.min}–${inferred.total.max}</b> intervalo de IV</span>
        <span><b>${inferred.total.likely}</b> total mais provável</span>
        <span><b>${media.toFixed(1).replace(".", ",")}/32</b> média bruta</span>
        <span><b>${fmt(maxPower)}</b> Power máximo (Q 1,8)</span>
      </div>
      <p class="sub">${dica}<br>Lembre: entre dois ${esc(p.nome)}, a <b>Qualidade</b> pesa quase o dobro do IV.</p>
    </div>`;
}

/* ---------------------------------------------- leitura do print do card */
const cleanOcr = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function ocrNumber(text, labels, decimal=false){
  for (const label of labels) {
    /* Não atravessa linhas: evita que um rótulo capture o número do campo seguinte. */
    const re = new RegExp(`(?:^|\\n)\\s*${label}[^\\n0-9]{0,120}([0-9]+(?:[.,][0-9]+)?)`, "im");
    const hit = text.match(re);
    if (hit) return decimal ? hit[1].replace(",", ".") : hit[1].replace(/[^0-9]/g, "");
  }
  return "";
}
function qualityFromCard(text){
  /* O card real mostra a raridade seguida de ×1.78, sem a palavra “Qualidade”. */
  const rarityLine = text.match(/(?:fraca|comum|incomum|rara|lendaria|epica)[^\n]{0,40}[x×]\s*([01](?:[.,]\d{1,3})?)/i);
  const anyMultiplier = text.match(/[x×]\s*([01][.,]\d{1,3})\b/i);
  return (rarityLine || anyMultiplier)?.[1]?.replace(",", ".") || "";
}
async function makeHeaderCrop(file){
  const bitmap = await createImageBitmap(file);
  const cropHeight = Math.round(bitmap.height * .47);
  const scale = Math.max(3, Math.ceil(1500 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = cropHeight * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently:true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, bitmap.width, cropHeight, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i=0; i<pixels.data.length; i+=4) {
    const gray = pixels.data[i]*.299 + pixels.data[i+1]*.587 + pixels.data[i+2]*.114;
    /* Clareia texto e apaga boa parte do fundo escuro, preservando formas das letras. */
    const value = gray > 75 ? 255 : gray < 28 ? 0 : Math.round((gray-28)*5.4);
    pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = value;
  }
  ctx.putImageData(pixels, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
function headerValues(rawHeader){
  const text = cleanOcr(rawHeader).replace(/[|]/g, "1");
  const explicitLevel = text.match(/n[i1l]vel\s*[:.]?\s*(\d{1,3})/i) || text.match(/(?:lvl|lv|nv)\s*[:.]?\s*(\d{1,3})/i);
  const allNumbers = [...text.matchAll(/\b(\d{1,3}(?:[.,]\d{1,3})?)\b/g)].map((m) => m[1].replace(",", "."));
  const levelFallback = allNumbers.find((v) => /^\d+$/.test(v) && +v >= 5 && +v <= 999);
  const quality = qualityFromCard(text) || allNumbers.find((v) => v.includes(".") && +v >= .8 && +v <= 1.8) || "";
  const powerHit = text.match(/([\d.,]{3,})\s*(?:power|poder)/i);
  const power = powerHit ? powerHit[1].replace(/\D/g, "") : "";
  const explicit = explicitLevel && +explicitLevel[1] >= 1 ? explicitLevel[1] : "";
  return { level:explicit || levelFallback || "", quality, power };
}
function reconcileCardFields(p, stats, read){
  if (stats.some((v) => !Number.isFinite(+v) || +v <= 0)) return read;
  const sumStats = stats.reduce((sum,v) => sum+(+v),0);
  let power = +read.power || 0;
  let quality = +read.quality || 0;
  let level = +read.level || 0;

  /* Power e soma dos stats revelam a qualidade mesmo quando ×1.78 falha no OCR. */
  if (power > 0) {
    const derivedQ = power/sumStats;
    if (derivedQ >= .8 && derivedQ <= 1.8 && (!quality || Math.abs(derivedQ-quality) <= .04)) {
      quality = Math.round(derivedQ*1000)/1000;
    }
  } else if (quality >= .8 && quality <= 1.8) {
    power = Math.round(sumStats*quality);
  }

  /* Procura o level cujos seis IVs não arredondados ficam em 0..32 e perto de inteiros. */
  if (quality >= .8 && quality <= 1.8) {
    let best = null;
    for (let candidate=1; candidate<=999; candidate++) {
      const raw = stats.map((value,i) => ((+value)/((candidate/100)*Math.pow(quality,EXP[i]))-p.baseStats[i])/2);
      const outside = raw.reduce((s,iv) => s+(iv<0 ? -iv : iv>32 ? iv-32 : 0),0);
      const integerFit = raw.reduce((s,iv) => s+Math.abs(iv-Math.round(iv)),0);
      const readDistance = level ? Math.min(Math.abs(candidate-level),100)*.002 : 0;
      const score = outside*100 + integerFit + readDistance;
      if (!best || score < best.score) best = { level:candidate,score,outside };
    }
    if (best && best.outside < .05) level = best.level;
  }
  return {
    ...read,
    level:level || "",
    quality:quality || "",
    power:power || ""
  };
}
function geometryNumber(data, labelPatterns, decimal=false){
  const words = (data.words || []).map((w) => ({
    text:cleanOcr(w.text || ""), raw:w.text || "", box:w.bbox,
    cx:(w.bbox.x0+w.bbox.x1)/2, cy:(w.bbox.y0+w.bbox.y1)/2
  })).filter((w) => w.text);
  const labels = words.filter((w) => labelPatterns.some((p) => p.test(w.text)));
  const numbers = words.filter((w) => /^\d+(?:[.,]\d+)?$/.test(w.raw.trim()));
  let best = null;
  labels.forEach((label) => numbers.forEach((candidate) => {
    const dx = candidate.cx-label.cx, dy = candidate.cy-label.cy;
    if (dy < -12 || dy > 260 || Math.abs(dx) > 150) return;
    /* Cards normalmente põem o valor logo abaixo; aceita também à direita. */
    const score = Math.abs(dx) + Math.abs(dy)*1.35 + (dy < 8 && dx < 0 ? 180 : 0);
    if (!best || score < best.score) best = { score, value:candidate.raw };
  }));
  if (!best) return "";
  return decimal ? best.value.replace(",", ".") : best.value.replace(/\D/g, "");
}
function findSpeciesInOcr(text){
  const normalized = cleanOcr(text).replace(/[^a-z0-9♀♂]+/g, " ");
  return DEX.slice().sort((a,b) => b.nome.length-a.nome.length).find((p) =>
    normalized.includes(cleanOcr(p.nome).replace(/[^a-z0-9♀♂]+/g, " "))
  );
}
function withOcrTimeout(promise, milliseconds = 90000){
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("OCR_TIMEOUT")), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
async function scanIvImage(file){
  const status = $("#iv-scan-status");
  const picker = $("#iv-image");
  const pickerButton = $("#iv-image-button");
  if (!file) return;
  if (!window.Tesseract) {
    status.innerHTML = '<span class="scan-error">Não foi possível carregar o leitor. Verifique sua conexão e tente novamente.</span>';
    return;
  }
  pickerButton.textContent = "Lendo imagem…";
  pickerButton.classList.add("is-reading");
  status.innerHTML = '<span class="scan-loading">Lendo a imagem… <b>0%</b></span>';
  try {
    const ocrPaths = {
      workerPath: "/vplab/vendor/worker.min.js",
      corePath: "/vplab/vendor/tesseract-core",
      langPath: "/vplab/vendor/lang-data"
    };
    const result = await withOcrTimeout(Tesseract.recognize(file, "por+eng", {
      ...ocrPaths,
      logger: (m) => {
        if (m.status === "recognizing text") status.innerHTML = `<span class="scan-loading">Lendo a imagem… <b>${Math.round(m.progress*100)}%</b></span>`;
      }
    }));
    status.innerHTML = '<span class="scan-loading">Conferindo nível e qualidade…</span>';
    const headerImage = await makeHeaderCrop(file);
    const headerResult = await withOcrTimeout(Tesseract.recognize(headerImage, "por+eng", {
      ...ocrPaths,
      logger: (m) => {
        if (m.status === "recognizing text") status.innerHTML = `<span class="scan-loading">Conferindo cabeçalho… <b>${Math.round(m.progress*100)}%</b></span>`;
      }
    }));
    const header = headerValues(headerResult.data.text);
    const raw = result.data.text;
    const text = cleanOcr(raw);
    const found = findSpeciesInOcr(raw);
    if (found) setSpecies(found.slug);

    const geo = (patterns, decimal=false) => geometryNumber(result.data, patterns, decimal);
    let values = {
      level: header.level || ocrNumber(text, ["nivel", "level", "nv\\.?", "lvl"]) || geo([/^nivel/,/^level$/,/^nv$/,/^lvl$/]),
      quality: header.quality || ocrNumber(text, ["qualidade", "quality"], true) || qualityFromCard(text) || geo([/^qual/,/^quality$/], true),
      power: header.power || ocrNumber(text, ["power", "poder"]),
      total: ocrNumber(text, ["iv total", "total iv", "growth total"]) || geo([/^iv$/, /^growth$/]),
      stats: [
        ocrNumber(text,["hp", "vida"]) || geo([/^hp$/, /^vida$/]),
        ocrNumber(text,["atk\\b", "ataque(?! especial)", "attack(?! special)"]) || geo([/^ataque$/, /^attack$/, /^atk$/]),
        ocrNumber(text,["def\\b", "defesa(?! especial)", "defense(?! special)"]) || geo([/^defesa$/, /^defense$/, /^def$/]),
        ocrNumber(text,["spa\\b", "ataque especial", "atq\\.? esp", "special attack", "sp\\.? atk"]) || geo([/^spa$/, /^atq/, /^spatk$/]),
        ocrNumber(text,["spd\\b", "defesa especial", "def\\.? esp", "special defense", "sp\\.? def"]) || geo([/^spd$/, /^def\.?esp/, /^def\.$/, /^spdef$/]),
        ocrNumber(text,["vel\\b", "velocidade", "speed"]) || geo([/^vel$/, /^veloc/, /^speed$/])
      ]
    };
    values = reconcileCardFields(found || cur, values.stats, values);
    const level = +values.level, quality = +values.quality, total = +values.total;
    if (level >= 1 && level <= 999) $("#x-level").value = level;
    else values.level = "";
    if (quality >= .8 && quality <= 1.8) $("#x-qual").value = quality;
    else values.quality = "";
    if (+values.power > 0) $("#x-power").value = Math.round(+values.power);
    else values.power = "";
    if (total >= 6 && total <= 192) $("#x-ivtotal").value = total;
    else values.total = "";
    values.stats.forEach((v,i) => { if (v) $("#o"+i).value = v; });
    renderAvaliar();
    const count = [values.level,values.quality,values.power,values.total,...values.stats].filter(Boolean).length;
    status.innerHTML = `<span class="scan-ok">✓ Leitura concluída: ${found ? esc(found.nome) : "espécie não identificada"} · ${count} campos preenchidos.</span>`;
  } catch (err) {
    status.innerHTML = '<span class="scan-error">Não consegui ler este print. Tente uma imagem nítida, sem corte e com o card inteiro visível.</span>';
  } finally {
    /* Limpar permite escolher imediatamente o mesmo arquivo outra vez. */
    picker.value = "";
    pickerButton.textContent = "Selecionar outra imagem";
    pickerButton.classList.remove("is-reading");
  }
}

/* ---------------------------------------------- render: rota */
function renderRota(){
  const p = cur;
  if (!rotaManual) {
    rotaRegion = "kanto";
    $$("#rota-region button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.r === rotaRegion ? "true" : "false"));
  }
  if (!rotaTypeManual) $("#rota-type").value = p.tipos[0];
  const myType = $("#rota-type").value;

  const myVs = (alvo) => huntAmp(effVs(myType, alvo.tipos));
  const theirVs = (alvo) => Math.max(...alvo.tipos.map((t) => effVs(t, [myType])));

  const list = rotaRegion === "outland" ? OUTLAND : rotaRegion === "all" ? [...HUNTABLE, ...OUTLAND] : HUNTABLE;
  const byLvl = {};
  list.forEach((x) => (byLvl[x.huntLevel] = byLvl[x.huntLevel] || []).push(x));
  const lvls = Object.keys(byLvl).map(Number).sort((a,b) => a-b);

  const scored = lvls
    .map((lv) => ({ lv, se: byLvl[lv].filter((x) => myVs(x) >= 2.5).length }))
    .filter((x) => x.se > 0)
    .sort((a,b) => b.se - a.se)
    .slice(0, 3);

  $("#rota-best").innerHTML = `<div class="callout" style="margin-bottom:4px">
    Golpe <b>${TYPE_LABEL[myType]}</b> em <b>${rotaRegion === "all" ? "Kanto + Outland" : rotaRegion === "kanto" ? "Kanto" : "Outland"}</b>:
    ${scored.length
      ? "os níveis com mais alvos fracos são " + scored.map((x) => `<b>Nv ${x.lv}</b> (${x.se})`).join(" · ")
      : "nenhum alvo super eficaz nessa região — troque o tipo ou a região."}
  </div>`;

  $("#rota-list").innerHTML = lvls.map((lv) => {
    const mons = byLvl[lv].slice().sort((a,b) => {
      const ma = myVs(a), mb = myVs(b);
      if (ma !== mb) return mb - ma;
      return (b.lootAvg||0) - (a.lootAvg||0) || a.dexNo - b.dexNo;
    });
    return `<div class="rotalvl">
      <div class="rotalvl-h"><span class="rotalvl-n">Hunt Nv ${lv}</span><span class="rotalvl-c">${mons.length} Pokémon</span></div>
      <div class="rotachips">${mons.map((m) => {
        const mv = myVs(m), tv = theirVs(m);
        const cls = mv >= 5 ? "mt-4" : mv >= 2.5 ? "mt-2" : mv === 1 ? "mt-neu" : mv === 0 ? "mt-0" : mv <= 0.25 ? "mt-025" : "mt-05";
        const meter = clamp((mv / 5.5) * 100, 2, 100);
        return `<button class="rotachip ${cls}${(m.baseSlug || m.slug) === p.slug ? " me" : ""}" data-slug="${m.baseSlug || m.slug}">
          <span class="rc-top"><span>${esc(m.nome)}</span><span class="rc-x" style="background:${multColor(mv)}">${fmtX(mv)}</span>${tv >= 2 ? '<span class="rc-d" title="Ele bate super em você">⚠️</span>' : ""}</span>
          <span class="route-meter" aria-label="Efetividade ${fmtX(mv)}"><span style="width:${meter}%;background:${multColor(mv)}"></span></span>
          <span class="rc-eco mono">${fmt(m.xp)} XP · $${fmt(m.lootAvg)} loot</span>
        </button>`;
      }).join("")}</div>
    </div>`;
  }).join("");

  $$("#rota-list .rotachip").forEach((b) => b.addEventListener("click", () => {
    if (!DEX.some((p) => p.slug === b.dataset.slug)) return;
    rotaTypeManual = false; rotaManual = false;
    setSpecies(b.dataset.slug);
    selectTab("perfil");
  }));
}

/* ---------------------------------------------- render: clãs */
function renderClan(){
  const p = cur;
  const lvl = num($("#level").value) || 100;
  const q = num($("#quality").value) || 1;
  const covers = $("#clan-covers").checked;
  $("#clan-covers-lbl").textContent = `Meu clã cobre o tipo deste Pokémon (${p.tipos.map((t) => TYPE_LABEL[t]).join("/")})`;

  const effRank = covers ? clanRank : 0;
  const mult = 1 + 0.06 * effRank;
  const pct = Math.round(6 * effRank);
  const alvo = [ {i:1, nm:"Ataque"}, {i:3, nm:"Atq. Especial"}, {i:2, nm:"Defesa"}, {i:4, nm:"Def. Especial"} ];

  const badges = alvo.map((o) => {
    const base = statAt(p.baseStats[o.i], 32, lvl, q, o.i);
    const boosted = Math.round(base * mult);
    return `<div class="badge"><div class="k">${o.nm}</div><div class="v mono">${boosted}${effRank ? `<small> · era ${base}</small>` : ""}</div></div>`;
  }).join("");

  $("#clan-out").innerHTML = `
    <div class="callout" style="margin-bottom:14px">${
      effRank
        ? `No <b>Rank ${clanRank}</b>, o ${esc(p.nome)} luta com <b>+${pct}%</b> de Ataque, Atq. Esp., Defesa e Def. Esp.`
        : covers
          ? "Fora de clã — stats de combate sem bônus."
          : `Seu clã não cobre ${p.tipos.map((t) => TYPE_LABEL[t]).join("/")} — sem bônus para este Pokémon.`
    }</div>
    <div class="badges">${badges}</div>`;
}

/* ---------------------------------------------- navegação */
function renderActive(){
  if (activeTab === "perfil") renderPerfil();
  else if (activeTab === "avaliar") renderAvaliar();
  else if (activeTab === "rota") renderRota();
  else renderClan();
}

function setSpecies(slug){
  cur = DEX.find((p) => p.slug === slug) || DEX[0];
  $("#species").value = cur.slug;
  $("#x-species").value = cur.slug;
  syncUrl();
  renderActive();
  if (activeTab !== "perfil") renderPerfil(); /* mantém o perfil pronto ao voltar */
}

function selectTab(name){
  activeTab = name;
  $$(".main-tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === name ? "true" : "false"));
  $$(".panel").forEach((s) => s.classList.toggle("active", s.id === "tab-" + name));
  $("#profile-context").hidden = !["perfil","clas"].includes(name);
  syncUrl();
  renderActive();
}

$$(".main-tab").forEach((b) => b.addEventListener("click", () => selectTab(b.dataset.tab)));
$("#home-link").addEventListener("click", (e) => { e.preventDefault(); selectTab("perfil"); });
$("#species").addEventListener("change", () => setSpecies($("#species").value));
$("#x-species").addEventListener("change", () => setSpecies($("#x-species").value));
["level", "quality"].forEach((id) => $("#" + id).addEventListener("input", renderActive));
["x-level", "x-qual", "x-power", "x-ivtotal"].forEach((id) => $("#" + id).addEventListener("input", renderAvaliar));
STAT_NAMES.forEach((_, i) => $("#o" + i).addEventListener("input", renderAvaliar));
$("#iv-image").addEventListener("change", (e) => scanIvImage(e.target.files[0]));

$("#rota-type").addEventListener("change", () => { rotaTypeManual = true; renderRota(); });
$$("#rota-region button").forEach((b) => b.addEventListener("click", () => {
  rotaManual = true; rotaRegion = b.dataset.r;
  $$("#rota-region button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  renderRota();
}));

$$("#clan-rank button").forEach((b) => b.addEventListener("click", () => {
  clanRank = +b.dataset.r;
  $$("#clan-rank button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  renderClan();
}));
$("#clan-covers").addEventListener("change", renderClan);

/* loja: só linka quando tiver endereço publicado */
(function initStore(){
  const a = $("#store-link");
  if (STORE_URL) a.href = STORE_URL;
  else { a.removeAttribute("target"); a.href = "https://wa.me/5547988930280?text=" + encodeURIComponent("Olá, VP Store! 💎 Vim pelo VPLab e quero negociar diamantes."); }
})();

/* ---------------------------------------------- boot (deep-link) */
(function boot(){
  const u = new URL(location.href);
  const tab = u.searchParams.get("tab");
  const slug = u.searchParams.get("p");
  cur = DEX.find((p) => p.slug === slug) || DEX.find((p) => p.slug === "scizor") || DEX[0];
  $("#species").value = cur.slug;
  $("#x-species").value = cur.slug;
  if (tab && ["perfil","avaliar","rota","clas"].includes(tab)) activeTab = tab;
  $$(".main-tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === activeTab ? "true" : "false"));
  $$(".panel").forEach((s) => s.classList.toggle("active", s.id === "tab-" + activeTab));
  $("#profile-context").hidden = !["perfil","clas"].includes(activeTab);
  renderPerfil();
  renderActive();
})();
