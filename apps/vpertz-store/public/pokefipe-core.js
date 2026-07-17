(function (root) {
  "use strict";

  const DIAMOND_BRL = 0.44;
  const LEVEL_BRL = 0.075;
  const POKEMON_SLUGS = "bulbasaur,ivysaur,venusaur,charmander,charmeleon,charizard,squirtle,wartortle,blastoise,caterpie,metapod,butterfree,weedle,kakuna,beedrill,pidgey,pidgeotto,pidgeot,rattata,raticate,spearow,fearow,ekans,arbok,pikachu,raichu,sandshrew,sandslash,nidoran-f,nidorina,nidoqueen,nidoran-m,nidorino,nidoking,clefairy,clefable,vulpix,ninetales,jigglypuff,wigglytuff,zubat,golbat,oddish,gloom,vileplume,paras,parasect,venonat,venomoth,diglett,dugtrio,meowth,persian,psyduck,golduck,mankey,primeape,growlithe,arcanine,poliwag,poliwhirl,poliwrath,abra,kadabra,alakazam,machop,machoke,machamp,bellsprout,weepinbell,victreebel,tentacool,tentacruel,geodude,graveler,golem,ponyta,rapidash,slowpoke,slowbro,magnemite,magneton,farfetchd,doduo,dodrio,seel,dewgong,grimer,muk,shellder,cloyster,gastly,haunter,gengar,onix,drowzee,hypno,krabby,kingler,voltorb,electrode,exeggcute,exeggutor,cubone,marowak,hitmonlee,hitmonchan,lickitung,koffing,weezing,rhyhorn,rhydon,chansey,tangela,kangaskhan,horsea,seadra,goldeen,seaking,staryu,starmie,mr-mime,scyther,jynx,electabuzz,magmar,pinsir,tauros,magikarp,gyarados,lapras,ditto,eevee,vaporeon,jolteon,flareon,porygon,omanyte,omastar,kabuto,kabutops,aerodactyl,snorlax,articuno,zapdos,moltres,dratini,dragonair,dragonite,mewtwo,mew,chikorita,bayleef,meganium,cyndaquil,quilava,typhlosion,totodile,croconaw,feraligatr,sentret,furret,hoothoot,noctowl,ledyba,ledian,spinarak,ariados,crobat,chinchou,lanturn,pichu,cleffa,igglybuff,togepi,togetic,natu,xatu,mareep,flaaffy,ampharos,bellossom,marill,azumarill,sudowoodo,politoed,hoppip,skiploom,jumpluff,aipom,sunkern,sunflora,yanma,wooper,quagsire,espeon,umbreon,murkrow,slowking,misdreavus,unown,wobbuffet,girafarig,pineco,forretress,dunsparce,gligar,steelix,snubbull,granbull,qwilfish,scizor,shuckle,heracross,sneasel,teddiursa,ursaring,slugma,magcargo,swinub,piloswine,corsola,remoraid,octillery,delibird,mantine,skarmory,houndour,houndoom,kingdra,phanpy,donphan,porygon2,stantler,smeargle,tyrogue,hitmontop,smoochum,elekid,magby,miltank,blissey,raikou,entei,suicune,larvitar,pupitar,tyranitar,lugia,ho-oh,celebi".split(",");

  const SPECIAL_NAMES = {
    "nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂", farfetchd: "Farfetch'd",
    "mr-mime": "Mr. Mime", porygon2: "Porygon2", "ho-oh": "Ho-Oh"
  };
  const displayName = (slug) => SPECIAL_NAMES[slug] || slug
    .split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  const POKEMON = POKEMON_SLUGS.map((slug, index) => ({ id: index + 1, slug, name: displayName(slug) }));

  const VALUE_RANGES = [
    [198, 207, 1, 2], [208, 216, 2, 4], [217, 225, 4, 6],
    [225, 234, 6, 12], [235, 243, 12, 20], [244, 252, 20, 30],
    [253, 261, 30, 40], [262, 270, 40, 50], [271, 279, 50, 60],
    [280, 288, 60, 70], [289, 297, 70, 80], [298, 306, 80, 90],
    [307, 315, 90, 100], [316, 324, 100, 110], [325, 333, 110, 120],
    [334, 342, 120, 130], [343, 346, 130, 140]
  ];
  const finitePositive = (value) => Number.isFinite(value) && value > 0;

  function calculateFipe({ iv, multiplier, level }) {
    const parsedIv = Number(iv);
    const parsedMultiplier = Number(multiplier);
    const parsedLevel = Number(level);
    if (!finitePositive(parsedIv) || !finitePositive(parsedMultiplier) || !finitePositive(parsedLevel)) {
      return { valid: false, reason: "Preencha IV, multiplicador e nível com valores maiores que zero." };
    }

    const rawScore = parsedIv * parsedMultiplier;
    const score = Math.round(rawScore);
    // A tabela repete o limite 225; prevalece a primeira faixa na ordem da planilha.
    const range = VALUE_RANGES.find(([min, max]) => score >= min && score <= max);
    const levelValue = parsedLevel * LEVEL_BRL;
    if (!range) return {
      valid: true, inRange: false, rawScore, score, levelValue,
      reason: "A pontuação ficou fora da faixa de referência da tabela (198 a 346)."
    };

    const [, , diamondsMin, diamondsMax] = range;
    const pokemonMin = diamondsMin * DIAMOND_BRL;
    const pokemonMax = diamondsMax * DIAMOND_BRL;
    return {
      valid: true, inRange: true, rawScore, score, diamondsMin, diamondsMax,
      pokemonMin, pokemonMax, levelValue,
      totalMin: pokemonMin + levelValue, totalMax: pokemonMax + levelValue
    };
  }

  root.PokeFipe = { DIAMOND_BRL, LEVEL_BRL, POKEMON, VALUE_RANGES, calculateFipe };
})(globalThis);
