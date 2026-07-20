import {
  ANALYSIS_PRESETS, CLAN_BONUS, CLANS, DIVERSITY_RULES, NORMALIZATION,
  PROGRESSION_RULES, ROSTER_RULES, SCORE_WEIGHTS, STANDARD_SPECIMEN, STAT_EXPONENTS, USEFUL_MOVE_RULES
} from "./clan-config.js";

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const normalizeMetric=(value,min,max)=>Number.isFinite(value)&&max>min?clamp((value-min)/(max-min)*100,0,100):null;
const weighted=(values,weights)=>{
  let sum=0,total=0;
  for(const [key,weight] of Object.entries(weights)){const value=values[key];if(weight>0&&Number.isFinite(value)){sum+=value*weight;total+=weight;}}
  return total?sum/total:null;
};
const stableUnique=(items,keyFn)=>[...new Map(items.map(item=>[keyFn(item),item])).values()];
const normalizeType=value=>String(value||"").toLowerCase();

export function getClanDefinition(clan){return typeof clan==="string"?CLANS[clan]||null:clan||null;}
export function createAnalysisContext(input="current"){
  const supplied=typeof input==="string"?{preset:input}:input||{};
  const preset=ANALYSIS_PRESETS[supplied.preset]||ANALYSIS_PRESETS.current;
  return {...preset,...supplied,level:Math.max(80,Number(supplied.level??preset.level)),clanRank:clamp(Number(supplied.clanRank??preset.clanRank),0,5)};
}

export function calculateStandardStats(pokemon,context,specimen=STANDARD_SPECIMEN){
  const ctx=createAnalysisContext(context),quality=Number(specimen.quality),iv=Number(specimen.iv);
  return pokemon.baseStats.map((base,index)=>Math.round((base+2*iv)*(ctx.level/100)*Math.pow(quality,STAT_EXPONENTS[index])));
}
export function isClanEligible(pokemon,clan){const definition=getClanDefinition(clan);return !!definition&&pokemon.tipos.some(type=>definition.types.includes(normalizeType(type)));}
export function applyClanBonus(stats,pokemon,clan,rank){
  const result=[...stats],eligible=isClanEligible(pokemon,clan),safeRank=clamp(Number(rank)||0,0,CLAN_BONUS.maxRank);
  if(!eligible||!safeRank)return result;
  const multiplier=1+CLAN_BONUS.perRank*safeRank;
  CLAN_BONUS.eligibleStatIndexes.forEach(index=>{result[index]=Math.round(result[index]*multiplier);});
  return result;
}
export function getStandardizedStats(pokemon,clan,context,specimen=STANDARD_SPECIMEN){
  const base=calculateStandardStats(pokemon,context,specimen);
  return {beforeClanBonus:base,afterClanBonus:applyClanBonus(base,pokemon,clan,createAnalysisContext(context).clanRank),quality:specimen.quality,iv:specimen.iv};
}
export function deriveStatLimits(catalog,clan,context,specimen=STANDARD_SPECIMEN){
  const maxima=Array(6).fill(0);
  catalog.forEach(pokemon=>getStandardizedStats(pokemon,clan,context,specimen).afterClanBonus.forEach((value,index)=>{maxima[index]=Math.max(maxima[index],value);}));
  return maxima.map(max=>({min:0,max:Math.max(1,max)}));
}

export function isUsefulOffensiveMove(move,pokemon,context){
  const ctx=createAnalysisContext(context);
  return !!move&&typeof move.nome==="string"&&typeof move.tipo==="string"&&USEFUL_MOVE_RULES.categories.includes(move.categoria)&&Number.isFinite(move.poder)&&move.poder>=USEFUL_MOVE_RULES.minimumPower&&Number.isFinite(move.nivel)&&move.nivel<=ctx.level;
}
export function getMovesAtLevel(pokemon,context){
  return stableUnique((pokemon.golpes||[]).filter(move=>isUsefulOffensiveMove(move,pokemon,context)),move=>[move.nome.trim().toLowerCase(),normalizeType(move.tipo),move.categoria,move.poder,move.nivel].join("|"));
}

export function getAcquisition(pokemon,{availableIds=new Set(),wildEncounters=[],catalog=[]}={},seen=new Set()){
  if(!pokemon||!availableIds.has(pokemon.dexNo))return{obtainable:false,acquisitionType:"unknown",sourcePokemon:null,sourceHunt:null,requiredLevel:null,availableAtLevel:null,evolutionSteps:0,directWild:false,confidence:"confirmed",limitations:["not-in-current-content"]};
  const wild=wildEncounters.find(entry=>entry.pokemonId===pokemon.dexNo);
  if(wild)return{obtainable:true,acquisitionType:"wild",sourcePokemon:null,sourceHunt:wild.huntId??null,requiredLevel:wild.requiredLevel??null,availableAtLevel:wild.requiredLevel??null,evolutionSteps:0,directWild:true,confidence:"confirmed",limitations:[]};
  if(seen.has(pokemon.dexNo))return{obtainable:true,acquisitionType:"unknown",sourcePokemon:null,sourceHunt:null,requiredLevel:null,availableAtLevel:null,evolutionSteps:0,directWild:false,confidence:"partial",limitations:["acquisition-cycle"]};
  const previous=catalog.filter(item=>item.evolvesToId===pokemon.dexNo).sort((a,b)=>a.dexNo-b.dexNo)[0];
  if(previous&&availableIds.has(previous.dexNo)){
    const source=getAcquisition(previous,{availableIds,wildEncounters,catalog},new Set([...seen,pokemon.dexNo]));
    const evolutionLevel=previous.evolveLevel??null,availableAtLevel=Number.isFinite(source.availableAtLevel)&&Number.isFinite(evolutionLevel)?Math.max(source.availableAtLevel,evolutionLevel):null;
    return{obtainable:true,acquisitionType:"evolution",sourcePokemon:previous.dexNo,sourceHunt:source.sourceHunt,requiredLevel:evolutionLevel,availableAtLevel,evolutionSteps:(source.evolutionSteps||0)+1,directWild:false,confidence:source.confidence,limitations:[...source.limitations,...(Number.isFinite(evolutionLevel)?[]:["evolution-level-not-documented"])]};
  }
  return{obtainable:true,acquisitionType:"unknown",sourcePokemon:null,sourceHunt:null,requiredLevel:null,availableAtLevel:null,evolutionSteps:0,directWild:false,confidence:"partial",limitations:["acquisition-not-documented"]};
}
export const isCurrentlyObtainable=(pokemon,data)=>getAcquisition(pokemon,data);

export function effectMultiplier(attackType,defenderTypes,typeChart){
  const row=typeChart?.[String(attackType).toUpperCase()]||{};
  return defenderTypes.reduce((mult,type)=>mult*(row[String(type).toUpperCase()]??1),1);
}
export const amplifyHuntMultiplier=mult=>mult===0?0:mult>1?1+(mult-1)*1.5:mult<1?mult/1.5:1;

export function getEligibleHunts(hunts,context){
  const ctx=createAnalysisContext(context);
  return hunts.filter(hunt=>(hunt.requiredLevel??0)<=ctx.level)
    .filter(hunt=>ctx.scope!=="outland"||hunt.region==="outland")
    .filter(hunt=>ctx.scope!=="specific-hunt"||hunt.id===ctx.huntId)
    .filter(hunt=>ctx.scope!=="target-type"||(hunt.enemies||[]).some(enemy=>enemy.tipos.includes(ctx.targetType)))
    .sort((a,b)=>String(a.id).localeCompare(String(b.id)));
}

function movePotential(move,pokemon,stats,limits){
  const index=move.categoria==="fisico"?1:3;
  return weighted({offensiveStat:normalizeMetric(stats[index],limits[index].min,limits[index].max),power:normalizeMetric(move.poder,NORMALIZATION.movePowerMin,NORMALIZATION.movePowerMax),stab:pokemon.tipos.includes(normalizeType(move.tipo))?100:0},SCORE_WEIGHTS.movePotential);
}
function offenseScore(moves,pokemon,stats,limits){
  const scored=moves.map(move=>({...move,potential:movePotential(move,pokemon,stats,limits)})).sort((a,b)=>b.potential-a.potential||a.nivel-b.nivel||a.nome.localeCompare(b.nome));
  const top=scored.slice(0,3),weights=SCORE_WEIGHTS.offense.topThree;
  const score=top.reduce((sum,move,index)=>sum+move.potential*weights[index],0)/weights.slice(0,top.length).reduce((a,b)=>a+b,0);
  return{score:Number.isFinite(score)?score:0,moves:scored};
}
function resistanceScore(stats,limits){return weighted({hp:normalizeMetric(stats[0],0,limits[0].max),defense:normalizeMetric(stats[2],0,limits[2].max),specialDefense:normalizeMetric(stats[4],0,limits[4].max)},SCORE_WEIGHTS.resistance);}
function movesetScore(scoredMoves,pokemon){
  if(!scoredMoves.length)return 0;
  const types=new Set(scoredMoves.map(move=>normalizeType(move.tipo))),nonStab=new Set([...types].filter(type=>!pokemon.tipos.includes(type)));
  const bestStab=Math.max(0,...scoredMoves.filter(move=>pokemon.tipos.includes(normalizeType(move.tipo))).map(move=>move.potential));
  return weighted({goodStab:bestStab,typeVariety:normalizeMetric(types.size,0,NORMALIZATION.maxMoveTypes),complementaryCoverage:normalizeMetric(nonStab.size,0,NORMALIZATION.maxComplementaryTypes)},SCORE_WEIGHTS.moveset);
}
function enemyResult(scoredMoves,pokemon,enemy,typeChart){
  const offense=Math.max(0,...scoredMoves.map(move=>weighted({movePotential:move.potential,effectiveness:normalizeMetric(amplifyHuntMultiplier(effectMultiplier(move.tipo,enemy.tipos,typeChart)),0,NORMALIZATION.huntMultiplierMax)},SCORE_WEIGHTS.enemyMatchup)));
  const danger=Math.max(...enemy.tipos.map(type=>amplifyHuntMultiplier(effectMultiplier(type,pokemon.tipos,typeChart))));
  return{enemyId:enemy.dexNo,offense,safety:100-normalizeMetric(danger,0,NORMALIZATION.huntMultiplierMax),danger};
}
function aggregateHunt(hunt,scoredMoves,pokemon,typeChart){
  const enemies=(hunt.enemies||[]).map(enemy=>enemyResult(scoredMoves,pokemon,enemy,typeChart)).sort((a,b)=>a.enemyId-b.enemyId);
  if(!enemies.length)return{id:hunt.id,score:null,offense:null,safety:null,enemies:[]};
  const average=key=>enemies.reduce((sum,row)=>sum+row[key],0)/enemies.length,worst=key=>Math.min(...enemies.map(row=>row[key]));
  const offense=weighted({average:average("offense"),worst:worst("offense")},SCORE_WEIGHTS.huntAggregate);
  const safety=weighted({average:average("safety"),worst:worst("safety")},SCORE_WEIGHTS.huntAggregate);
  return{id:hunt.id,score:weighted({offense,safety},SCORE_WEIGHTS.huntMatchup),offense,safety,enemies};
}
export function getProgressionAnalysis(acquisition,context){
  if(acquisition.confidence!=="confirmed"||!Number.isFinite(acquisition.availableAtLevel))return{progressionScore:null,progressionFactors:null,progressionLimitations:["insufficient-progression-data"]};
  const factors={acquisitionConfirmed:true,availableAtLevel:acquisition.availableAtLevel,evolutionSteps:acquisition.evolutionSteps||0,directWild:!!acquisition.directWild};
  if(acquisition.availableAtLevel>context.level)return{progressionScore:null,progressionFactors:factors,progressionLimitations:["content-inaccessible-at-analyzed-level"]};
  const span=Math.max(1,context.level-PROGRESSION_RULES.baselineLevel),levelEase=context.level===PROGRESSION_RULES.baselineLevel?100:clamp((context.level-acquisition.availableAtLevel)/span*100,0,100),evolutionPenalty=Math.min(PROGRESSION_RULES.maxEvolutionPenalty,factors.evolutionSteps*PROGRESSION_RULES.evolutionStepPenalty);
  return{progressionScore:clamp(levelEase-evolutionPenalty,0,100),progressionFactors:factors,progressionLimitations:[]};
}

export function evaluatePokemon(pokemon,clan,context,data){
  const ctx=createAnalysisContext(context),definition=getClanDefinition(clan),acquisition=getAcquisition(pokemon,data),standard=getStandardizedStats(pokemon,definition,ctx),currentCatalog=data.catalog.filter(item=>data.availableIds.has(item.dexNo)),limits=deriveStatLimits(currentCatalog,definition,ctx),moves=getMovesAtLevel(pokemon,ctx);
  const offense=offenseScore(moves,pokemon,standard.afterClanBonus,limits),resistance=resistanceScore(standard.afterClanBonus,limits),moveset=movesetScore(offense.moves,pokemon),hunts=getEligibleHunts(data.hunts||[],ctx),huntResults=hunts.map(hunt=>aggregateHunt(hunt,offense.moves,pokemon,data.typeChart)),validHunts=huntResults.filter(row=>Number.isFinite(row.score));
  const matchup=validHunts.length?validHunts.reduce((sum,row)=>sum+row.score,0)/validHunts.length:null;
  const combat=weighted({offense:offense.score,resistance,matchup,moveset,utility:null,speed:0},SCORE_WEIGHTS.combat),progression=getProgressionAnalysis(acquisition,ctx),recommendation=progression.progressionScore===null?null:weighted({combat,progression:progression.progressionScore},SCORE_WEIGHTS.recommendation);
  const favorable=validHunts.filter(row=>row.score>=65).map(row=>row.id),dangerous=validHunts.filter(row=>row.score<40).map(row=>row.id);
  const limitations=[...acquisition.limitations,"status-effects-not-scored","speed-mechanic-not-documented","move-inheritance-not-documented",...(ctx.scope!=="outland"?["kanto-hunts-not-structured"]:[]),...(hunts.length?["enemy-safety-estimated-from-types"]:["no-eligible-structured-hunts"])];
  const coverage=[...new Set(offense.moves.flatMap(move=>Object.keys(data.typeChart?.[move.tipo.toUpperCase()]||{}).filter(type=>(data.typeChart[move.tipo.toUpperCase()][type]??1)>1).map(normalizeType)))].sort();
  const weaknesses=[...new Set(Object.keys(data.typeChart||{}).filter(type=>effectMultiplier(type,pokemon.tipos,data.typeChart)>1).map(normalizeType))].sort();
  return{pokemonId:pokemon.dexNo,combatScore:combat,recommendationScore:recommendation,progressionScore:progression.progressionScore,progressionFactors:progression.progressionFactors,progressionLimitations:progression.progressionLimitations,diversityAdjustment:0,rosterSelectionScore:combat,offenseScore:offense.score,resistanceScore:resistance,matchupScore:matchup,movesetScore:moveset,utilityScore:null,speedScore:0,analyzedLevel:ctx.level,analyzedClanRank:ctx.clanRank,analyzedScope:ctx.scope,standardizedStats:standard,normalizationLimits:limits,consideredMoves:offense.moves,consideredHunts:huntResults,favorableMatchups:favorable,dangerousMatchups:dangerous,strengths:coverage,weaknesses,offensiveCategory:standard.afterClanBonus[1]>standard.afterClanBonus[3]*1.12?"physical":standard.afterClanBonus[3]>standard.afterClanBonus[1]*1.12?"special":"mixed",confidence:acquisition.confidence,acquisition,limitations:[...new Set([...limitations,...progression.progressionLimitations])]};
}

function diversityAdjustment(candidate,selected){
  if(!selected.length)return 0;
  let adjustment=selected.some(item=>item.offensiveCategory===candidate.offensiveCategory)?0:DIVERSITY_RULES.newOffensiveCategory;
  const existingCoverage=new Set(selected.flatMap(item=>item.strengths)),newCoverage=candidate.strengths.filter(type=>!existingCoverage.has(type)).length;
  adjustment+=Math.min(DIVERSITY_RULES.maxNewCoverage,newCoverage*DIVERSITY_RULES.newCoveragePerType);
  const sharedThreats=new Set(selected.flatMap(item=>item.weaknesses)),resistsShared=[...sharedThreats].some(type=>!candidate.weaknesses.includes(type));
  if(resistsShared)adjustment+=DIVERSITY_RULES.sharedThreatResistance;
  const repeated=candidate.weaknesses.filter(type=>selected.filter(item=>item.weaknesses.includes(type)).length>=2).length;
  adjustment-=Math.min(DIVERSITY_RULES.maxRepeatedWeaknessPenalty,repeated*Math.abs(DIVERSITY_RULES.repeatedWeaknessPerType));
  if(candidate.strengths.length&&candidate.strengths.every(type=>existingCoverage.has(type)))adjustment+=DIVERSITY_RULES.redundantCoverage;
  return clamp(adjustment,-ROSTER_RULES.maxDiversityAdjustment,ROSTER_RULES.maxDiversityAdjustment);
}
export function buildRecommendedRoster(evaluations,{scoreField="combatScore",rules=ROSTER_RULES}={}){
  const remaining=stableUnique(evaluations.filter(item=>item.acquisition?.obtainable!==false&&!(Number.isFinite(item.acquisition?.availableAtLevel)&&Number.isFinite(item.analyzedLevel)&&item.acquisition.availableAtLevel>item.analyzedLevel)&&Number.isFinite(item[scoreField])&&item.combatScore>=rules.minimumCombatScore),item=>item.pokemonId),selected=[];
  while(selected.length<rules.maxMembers&&remaining.length){
    const ranked=remaining.map(item=>{const adjustment=diversityAdjustment(item,selected);return{...item,diversityAdjustment:adjustment,rosterSelectionScore:item.combatScore+adjustment};}).sort((a,b)=>b.rosterSelectionScore-a.rosterSelectionScore||b.combatScore-a.combatScore||b.strengths.length-a.strengths.length||a.pokemonId-b.pokemonId);
    const winner=ranked[0];selected.push(winner);remaining.splice(remaining.findIndex(item=>item.pokemonId===winner.pokemonId),1);
  }
  return selected;
}
export function buildSafeProgressionRoster(evaluations,{maxMembers=ROSTER_RULES.maxMembers}={}){return evaluations.filter(item=>item.acquisition?.confidence==="confirmed"&&item.progressionScore!==null&&item.recommendationScore!==null&&item.acquisition.availableAtLevel<=item.analyzedLevel).sort((a,b)=>b.recommendationScore-a.recommendationScore||b.combatScore-a.combatScore||a.pokemonId-b.pokemonId).slice(0,maxMembers);}
export function getUnmeasurableProgressionOptions(evaluations){return evaluations.filter(item=>item.acquisition?.obtainable&&item.progressionScore===null&&!item.progressionLimitations.includes("content-inaccessible-at-analyzed-level")).sort((a,b)=>b.combatScore-a.combatScore||a.pokemonId-b.pokemonId);}
export function buildSubstitutes(roster,evaluations){const used=new Set(roster.map(item=>item.pokemonId));return evaluations.filter(item=>!used.has(item.pokemonId)&&item.combatScore>=ROSTER_RULES.minimumCombatScore).sort((a,b)=>b.combatScore-a.combatScore||a.pokemonId-b.pokemonId);}
