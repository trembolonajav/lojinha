import test from "node:test";
import assert from "node:assert/strict";
import {
  applyClanBonus, buildRecommendedRoster, buildSafeProgressionRoster, buildSubstitutes, calculateStandardStats,
  createAnalysisContext, deriveStatLimits, evaluatePokemon, getAcquisition,
  getEligibleHunts, getMovesAtLevel, getProgressionAnalysis, getStandardizedStats, getUnmeasurableProgressionOptions, isClanEligible,
  isUsefulOffensiveMove
} from "../apps/vpertz-lab/public/clan-engine.js";
import {CLANS, ROSTER_RULES, SCORE_WEIGHTS, STANDARD_SPECIMEN} from "../apps/vpertz-lab/public/clan-config.js";

const chart={
  NORMAL:{ROCK:.5,GHOST:0}, FIRE:{GRASS:2,WATER:.5,BUG:2,STEEL:2},
  WATER:{FIRE:2,GRASS:.5,ROCK:2}, GRASS:{WATER:2,FIRE:.5,ROCK:2},
  ELECTRIC:{WATER:2,GROUND:0,FLYING:2}, GROUND:{ELECTRIC:2,FIRE:2,FLYING:0},
  BUG:{GRASS:2,PSYCHIC:2,FIRE:.5}, STEEL:{ICE:2,ROCK:2,FIRE:.5},
  FLYING:{BUG:2,GRASS:2,ELECTRIC:.5}, ROCK:{FIRE:2,FLYING:2},
  GHOST:{PSYCHIC:2,NORMAL:0}, PSYCHIC:{FIGHTING:2}, FIGHTING:{NORMAL:2},
  ICE:{FLYING:2,GRASS:2}, POISON:{GRASS:2}, DARK:{PSYCHIC:2}, DRAGON:{DRAGON:2}, FAIRY:{DRAGON:2}
};
const move=(nome,tipo,categoria,poder,nivel)=>({nome,tipo,categoria,poder,nivel});
const pokemon=(dexNo,nome,tipos,baseStats=[70,90,80,70,80,60],golpes=[])=>({dexNo,nome,slug:nome.toLowerCase(),tipos,baseStats,golpes,evolvesToId:null,evolveLevel:null});
const scizor=pokemon(212,"Scizor",["bug","steel"],[70,130,100,55,80,65],[
  move("Metal Claw","steel","fisico",56,5),move("Iron Head","steel","fisico",80,22),
  move("X-Scissor","bug","fisico",120,38),move("Double-Edge","normal","fisico",120,45),
  move("Swords Dance","normal","status",0,30),move("Future Move","steel","fisico",200,200)
]);
const charizard=pokemon(6,"Charizard",["fire","flying"],[78,84,78,109,85,100],[move("Flamethrower","fire","especial",80,6)]);
const enemies=[pokemon(1,"Bulbasaur",["grass"]),pokemon(7,"Squirtle",["water"]),pokemon(74,"Geodude",["rock","ground"])];
const hunts=[
  {id:"early",name:"Early",region:"kanto",requiredLevel:80,enemies:[enemies[0],enemies[1]]},
  {id:"outland",name:"Outland",region:"outland",requiredLevel:150,enemies:[enemies[2],enemies[0]]}
];
const baseData={catalog:[scizor,charizard,...enemies],availableIds:new Set([212,6,1,7,74]),wildEncounters:[{pokemonId:212,huntId:"outland",requiredLevel:150}],hunts,typeChart:chart};

test("presets mantêm nível e escopo separados",()=>{assert.deepEqual(createAnalysisContext({preset:"start",scope:"outland"}),{preset:"start",level:80,clanRank:1,scope:"outland",huntId:null,targetType:null});});
test("stats padronizados são determinísticos e usam Quality e IV fixos",()=>{
  const a=calculateStandardStats(scizor,{preset:"current"}),b=calculateStandardStats(scizor,{preset:"current"});
  assert.deepEqual(a,b); assert.equal(STANDARD_SPECIMEN.quality,1); assert.equal(STANDARD_SPECIMEN.iv,16);
});
test("mesmas condições geram os mesmos stats",()=>assert.deepEqual(getStandardizedStats(scizor,CLANS.ironhard,{preset:"current"}),getStandardizedStats(scizor,CLANS.ironhard,{preset:"current"})));
test("tipo duplo é elegível pelo primeiro ou segundo tipo",()=>{assert.equal(isClanEligible(scizor,CLANS.naturia),true);assert.equal(isClanEligible(scizor,CLANS.ironhard),true);});
test("Pokémon fora dos elementos não recebe bônus",()=>assert.deepEqual(applyClanBonus([10,20,30,40,50,60],charizard,CLANS.ironhard,5),[10,20,30,40,50,60]));
test("HP e Speed nunca recebem bônus",()=>{const result=applyClanBonus([10,20,30,40,50,60],scizor,CLANS.ironhard,5);assert.equal(result[0],10);assert.equal(result[5],60);assert.deepEqual(result.slice(1,5),[26,39,52,65]);});
test("bônus é aplicado uma vez nos stats padronizados",()=>{const result=getStandardizedStats(scizor,CLANS.ironhard,{preset:"current"});assert.deepEqual(result.afterClanBonus,applyClanBonus(result.beforeClanBonus,scizor,CLANS.ironhard,5));});
test("limites de normalização comportam stats após bônus",()=>{const limits=deriveStatLimits(baseData.catalog,CLANS.ironhard,{preset:"current"});const stats=getStandardizedStats(scizor,CLANS.ironhard,{preset:"current"}).afterClanBonus;stats.forEach((value,index)=>assert.ok(value<=limits[index].max));});
test("movimento útil exige categoria, poder, nível e dados completos",()=>{
  assert.equal(isUsefulOffensiveMove(move("Hit","steel","fisico",10,1),scizor,{preset:"start"}),true);
  assert.equal(isUsefulOffensiveMove(move("Status","steel","status",100,1),scizor,{preset:"start"}),false);
  assert.equal(isUsefulOffensiveMove(move("Zero","steel","fisico",0,1),scizor,{preset:"start"}),false);
});
test("movimentos acima do nível e Status são ignorados",()=>assert.deepEqual(getMovesAtLevel(scizor,{preset:"current"}).map(item=>item.nome),["Metal Claw","Iron Head","X-Scissor","Double-Edge"]));
test("movimentos exatamente duplicados aparecem uma vez",()=>{const p={...scizor,golpes:[scizor.golpes[0],scizor.golpes[0]]};assert.equal(getMovesAtLevel(p,{preset:"current"}).length,1);});
test("hunts acima do nível são excluídas em todos os scopes",()=>assert.deepEqual(getEligibleHunts(hunts,{preset:"start",scope:"all-structured"}).map(h=>h.id),["early"]));
test("scope específico nunca cria hunt inexistente",()=>assert.deepEqual(getEligibleHunts(hunts,{preset:"current",scope:"specific-hunt",huntId:"missing"}),[]));
test("aquisição desconhecida não inventa rota ou nível",()=>{const result=getAcquisition(charizard,{...baseData,wildEncounters:[]});assert.equal(result.acquisitionType,"unknown");assert.equal(result.sourceHunt,null);assert.equal(result.requiredLevel,null);assert.equal(result.confidence,"partial");});
test("combatScore existe com aquisição desconhecida e recommendationScore fica ausente",()=>{const result=evaluatePokemon(charizard,CLANS.volcanic,{preset:"current",scope:"outland"},{...baseData,wildEncounters:[]});assert.ok(Number.isFinite(result.combatScore));assert.equal(result.recommendationScore,null);});
test("aquisição confirmada permite recommendationScore",()=>{const result=evaluatePokemon(scizor,CLANS.ironhard,{preset:"current",scope:"outland"},baseData);assert.ok(Number.isFinite(result.combatScore));assert.ok(Number.isFinite(result.recommendationScore));});
test("dados ausentes de progressão retornam null, nunca zero",()=>{const result=getProgressionAnalysis({confidence:"confirmed",availableAtLevel:null},{level:150});assert.equal(result.progressionScore,null);assert.ok(result.progressionLimitations.includes("insufficient-progression-data"));});
test("progressão confirmada realmente difícil pode retornar zero",()=>{const result=getProgressionAnalysis({confidence:"confirmed",availableAtLevel:150,evolutionSteps:0,directWild:true},{level:150});assert.equal(result.progressionScore,0);});
test("aquisição confirmada não significa automaticamente progressão 100",()=>{const result=getProgressionAnalysis({confidence:"confirmed",availableAtLevel:100,evolutionSteps:1,directWild:false},{level:150});assert.ok(result.progressionScore>0&&result.progressionScore<100);});
test("conteúdo inacessível no nível analisado não recebe nota",()=>{const result=getProgressionAnalysis({confidence:"confirmed",availableAtLevel:150,evolutionSteps:0,directWild:true},{level:120});assert.equal(result.progressionScore,null);assert.ok(result.progressionLimitations.includes("content-inaccessible-at-analyzed-level"));});
test("ordem dos inimigos não altera cálculo interno da hunt",()=>{
  const a=evaluatePokemon(scizor,CLANS.ironhard,{preset:"current",scope:"outland"},baseData);
  const reversed={...baseData,hunts:hunts.map(h=>({...h,enemies:[...h.enemies].reverse()}))};
  const b=evaluatePokemon(scizor,CLANS.ironhard,{preset:"current",scope:"outland"},reversed);
  assert.equal(a.matchupScore,b.matchupScore);
});
test("pior inimigo influencia a nota da hunt",()=>{
  const mixed=evaluatePokemon(charizard,CLANS.volcanic,{preset:"current",scope:"all-structured"},{...baseData,wildEncounters:[]});
  const easy={...baseData,wildEncounters:[],hunts:[{...hunts[0],enemies:[enemies[0]]}]};
  const onlyEasy=evaluatePokemon(charizard,CLANS.volcanic,{preset:"current",scope:"all-structured"},easy);
  assert.ok(mixed.matchupScore<onlyEasy.matchupScore);
});
test("pesos de combate e recomendação somam 1 dentro da precisão numérica",()=>{assert.ok(Math.abs(Object.values(SCORE_WEIGHTS.combat).reduce((a,b)=>a+b,0)-1)<Number.EPSILON*2);assert.ok(Math.abs(Object.values(SCORE_WEIGHTS.recommendation).reduce((a,b)=>a+b,0)-1)<Number.EPSILON*2);});

const evaluation=(id,score,extra={})=>({pokemonId:id,combatScore:score,recommendationScore:null,progressionScore:null,progressionLimitations:[],analyzedLevel:150,strengths:[],weaknesses:[],offensiveCategory:"physical",...extra});
test("corte do elenco inclui exatamente a nota mínima e rejeita abaixo",()=>{const roster=buildRecommendedRoster([evaluation(1,49.999),evaluation(2,50)]);assert.deepEqual(roster.map(x=>x.pokemonId),[2]);});
test("Top 6 pode ter menos de seis e não contém duplicados",()=>{const roster=buildRecommendedRoster([evaluation(1,70),evaluation(1,70),evaluation(2,60)]);assert.deepEqual(roster.map(x=>x.pokemonId).sort(),[1,2]);});
test("elenco nunca inclui Pokémon marcado como indisponível",()=>{const roster=buildRecommendedRoster([evaluation(1,90,{acquisition:{obtainable:false}}),evaluation(2,60,{acquisition:{obtainable:true}})]);assert.deepEqual(roster.map(x=>x.pokemonId),[2]);});
test("resultado do elenco independe da ordem dos candidatos",()=>{const rows=[evaluation(3,60),evaluation(1,60),evaluation(2,60)];assert.deepEqual(buildRecommendedRoster(rows).map(x=>x.pokemonId),buildRecommendedRoster([...rows].reverse()).map(x=>x.pokemonId));});
test("desempate final usa menor número da Pokédex",()=>assert.deepEqual(buildRecommendedRoster([evaluation(9,60),evaluation(2,60)]).map(x=>x.pokemonId),[2,9]));
test("ajuste de diversidade nunca ultrapassa três pontos",()=>{const rows=[evaluation(1,70,{strengths:["fire"],weaknesses:["water"]}),evaluation(2,69,{strengths:["water","grass","rock","ice","bug"],weaknesses:[],offensiveCategory:"special"})];buildRecommendedRoster(rows).forEach(row=>assert.ok(Math.abs(row.diversityAdjustment)<=ROSTER_RULES.maxDiversityAdjustment));});
test("rosterSelectionScore soma exatamente combate e ajuste",()=>buildRecommendedRoster([evaluation(1,70),evaluation(2,69,{offensiveCategory:"special",strengths:["fire"]})]).forEach(row=>assert.equal(row.rosterSelectionScore,row.combatScore+row.diversityAdjustment)));
test("ajuste não modifica avaliação original",()=>{const original=evaluation(2,69,{offensiveCategory:"special",strengths:["fire"]}),snapshot=structuredClone(original);buildRecommendedRoster([evaluation(1,70),original]);assert.deepEqual(original,snapshot);});
test("mesmo Pokémon pode receber ajustes diferentes em elencos diferentes",()=>{const target=evaluation(2,69,{offensiveCategory:"special",strengths:["grass"]}),alone=buildRecommendedRoster([target])[0],withPartner=buildRecommendedRoster([evaluation(1,70),target]).find(row=>row.pokemonId===2);assert.notEqual(alone.diversityAdjustment,withPartner.diversityAdjustment);});
test("existem ajustes positivo, negativo e zero conforme o elenco",()=>{const rows=[evaluation(1,72,{strengths:["fire"],weaknesses:["water"]}),evaluation(2,71,{strengths:["fire"],weaknesses:["water"]}),evaluation(3,70,{strengths:["fire"],weaknesses:["water"]}),evaluation(4,69,{strengths:["grass"],weaknesses:[],offensiveCategory:"special"})],roster=buildRecommendedRoster(rows),adjustments=roster.map(row=>row.diversityAdjustment);assert.ok(adjustments.includes(0));assert.ok(adjustments.some(value=>value>0));assert.ok(adjustments.some(value=>value<0));});
test("ordenação do elenco usa rosterSelectionScore",()=>{const roster=buildRecommendedRoster([evaluation(1,70,{strengths:["fire"]}),evaluation(2,69.8,{strengths:["grass"],offensiveCategory:"special"}),evaluation(3,69.9,{strengths:["fire"]})]);for(let i=1;i<roster.length;i++)assert.ok(roster[i-1].rosterSelectionScore>=roster[i].rosterSelectionScore||roster[i-1].pokemonId===1);});
test("lista segura exige aquisição e progressão mensuráveis",()=>{const safe=evaluation(1,70,{recommendationScore:75,progressionScore:90,acquisition:{obtainable:true,confidence:"confirmed",availableAtLevel:80}}),unknown=evaluation(2,80,{recommendationScore:null,acquisition:{obtainable:true,confidence:"partial",availableAtLevel:null}}),insufficient=evaluation(3,75,{recommendationScore:null,acquisition:{obtainable:true,confidence:"confirmed",availableAtLevel:null}});assert.deepEqual(buildSafeProgressionRoster([unknown,insufficient,safe]).map(row=>row.pokemonId),[1]);assert.deepEqual(getUnmeasurableProgressionOptions([unknown,insufficient,safe]).map(row=>row.pokemonId),[2,3]);});
test("substituto não repete integrante principal",()=>{const rows=[evaluation(1,70),evaluation(2,60),evaluation(3,55)],roster=buildRecommendedRoster(rows,{rules:{...ROSTER_RULES,maxMembers:2}});assert.deepEqual(buildSubstitutes(roster,rows).map(x=>x.pokemonId),[3]);});
test("avaliação é determinística",()=>{const a=evaluatePokemon(scizor,CLANS.ironhard,{preset:"current",scope:"outland"},baseData),b=evaluatePokemon(scizor,CLANS.ironhard,{preset:"current",scope:"outland"},baseData);assert.deepEqual(a,b);});
test("dados ausentes produzem limitações sem quebrar o motor",()=>{const p=pokemon(99,"Empty",["normal"],[1,1,1,1,1,1],[]),data={catalog:[p],availableIds:new Set([99]),wildEncounters:[],hunts:[],typeChart:{}};const result=evaluatePokemon(p,CLANS.gardestrike,{preset:"start"},data);assert.equal(result.offenseScore,0);assert.equal(result.matchupScore,null);assert.ok(result.limitations.includes("no-eligible-structured-hunts"));});
