export const CLANS = Object.freeze({
  ironhard:{id:"ironhard",name:"Ironhard",types:["steel"],icon:"◈",color:"#91a6b3",style:"Resistência física e pressão com Aço",advantage:"Defesas elevadas e muitas resistências",limitation:"Pouquíssimas espécies disponíveis"},
  naturia:{id:"naturia",name:"Naturia",types:["grass","bug"],icon:"❧",color:"#55c96d",style:"Variedade, cobertura e progressão flexível",advantage:"Grande catálogo e opções físicas e especiais",limitation:"Fraquezas recorrentes a Fogo e Voador"},
  seavell:{id:"seavell",name:"Seavell",types:["water","ice"],icon:"◒",color:"#58a9ff",style:"Cobertura ampla com Água e Gelo",advantage:"Maior quantidade de opções atuais",limitation:"Algumas opções de Gelo são frágeis"},
  malefic:{id:"malefic",name:"Malefic",types:["ghost","poison","dark"],icon:"☾",color:"#9665dc",style:"Cobertura contra Psíquico e controle de matchups",advantage:"Três elementos e várias imunidades",limitation:"Movesets e aquisição variam bastante"},
  orebound:{id:"orebound",name:"Orebound",types:["ground","rock"],icon:"◉",color:"#bc9b78",style:"Força física e resistência",advantage:"Pressão forte contra Fogo e Elétrico",limitation:"Água e Planta ameaçam muitos membros"},
  psycraft:{id:"psycraft",name:"Psycraft",types:["psychic","fairy"],icon:"◉",color:"#f15b96",style:"Potencial especial e cobertura mental",advantage:"Boas opções especiais e contra Lutador",limitation:"Fada possui poucas opções confirmadas"},
  raibolt:{id:"raibolt",name:"Raibolt",types:["electric"],icon:"ϟ",color:"#f0c531",style:"Pressão ofensiva contra Água e Voador",advantage:"Movesets ofensivos fortes e diretos",limitation:"Elemento único e ameaça de Terra"},
  volcanic:{id:"volcanic",name:"Volcanic",types:["fire"],icon:"♨",color:"#ff6938",style:"Potencial ofensivo concentrado",advantage:"Excelente contra Planta, Gelo e Inseto",limitation:"Água, Terra e Pedra exigem cobertura"},
  gardestrike:{id:"gardestrike",name:"Gardestrike",types:["fighting","normal"],icon:"✊",color:"#d0623d",style:"Ataque físico e opções acessíveis",advantage:"Muitos atacantes físicos disponíveis",limitation:"Poucas alternativas realmente especiais"},
  wingeon:{id:"wingeon",name:"Wingeon",types:["flying","dragon"],icon:"✦",color:"#7fc9f6",style:"Cobertura aérea e resistências úteis",advantage:"Boa variedade de líderes para alternar",limitation:"Gelo é uma ameaça compartilhada importante"}
});

export const ANALYSIS_PRESETS = Object.freeze({
  start:{preset:"start",level:80,clanRank:1,scope:"all-structured",huntId:null,targetType:null},
  mid:{preset:"mid",level:120,clanRank:5,scope:"all-structured",huntId:null,targetType:null},
  current:{preset:"current",level:150,clanRank:5,scope:"all-structured",huntId:null,targetType:null}
});

export const STANDARD_SPECIMEN = Object.freeze({quality:1,iv:16});
export const STAT_EXPONENTS = Object.freeze([.95,.8,.8,.8,.8,.95]);
export const CLAN_BONUS = Object.freeze({perRank:.06,maxRank:5,eligibleStatIndexes:[1,2,3,4]});

export const SCORE_WEIGHTS = Object.freeze({
  combat:Object.freeze({offense:.35,resistance:.30,matchup:.25,moveset:.10,utility:0,speed:0}),
  recommendation:Object.freeze({combat:.90,progression:.10}),
  movePotential:Object.freeze({offensiveStat:.45,power:.35,stab:.20}),
  offense:Object.freeze({topThree:[.50,.30,.20]}),
  resistance:Object.freeze({hp:.30,defense:.35,specialDefense:.35}),
  moveset:Object.freeze({goodStab:.40,typeVariety:.30,complementaryCoverage:.30}),
  enemyMatchup:Object.freeze({movePotential:.55,effectiveness:.45}),
  huntAggregate:Object.freeze({average:.70,worst:.30}),
  huntMatchup:Object.freeze({offense:.65,safety:.35})
});

export const NORMALIZATION = Object.freeze({
  scoreMin:0,scoreMax:100,movePowerMin:0,movePowerMax:200,
  huntMultiplierMin:0,huntMultiplierMax:5.5,maxMoveTypes:6,maxComplementaryTypes:4
});

export const USEFUL_MOVE_RULES = Object.freeze({minimumPower:1,categories:["fisico","especial"]});
export const ROSTER_RULES = Object.freeze({maxMembers:6,minimumCombatScore:50,maxDiversityAdjustment:3});
export const PROGRESSION_RULES = Object.freeze({baselineLevel:80,evolutionStepPenalty:8,maxEvolutionPenalty:24});
export const DIVERSITY_RULES = Object.freeze({
  newOffensiveCategory:.75,newCoveragePerType:.25,maxNewCoverage:1,
  sharedThreatResistance:.75,repeatedWeaknessPerType:-.5,maxRepeatedWeaknessPenalty:1,
  redundantCoverage:-.5
});
