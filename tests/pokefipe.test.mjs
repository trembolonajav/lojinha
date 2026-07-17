import test from "node:test";
import assert from "node:assert/strict";
await import("../apps/vpertz-store/public/pokefipe-core.js");
const { calculateFipe, POKEMON } = globalThis.PokeFipe;

test("PokeFipe oferece as 251 espécies da Poképedia", () => {
  assert.equal(POKEMON.length, 251);
  assert.equal(POKEMON[0].name, "Bulbasaur");
  assert.equal(POKEMON.at(-1).name, "Celebi");
});

test("PokeFipe reproduz o exemplo principal da planilha", () => {
  const value = calculateFipe({ iv: 110, multiplier: 1.8, level: 1 });
  assert.equal(value.valid, true);
  assert.equal(value.inRange, true);
  assert.equal(value.score, 198);
  assert.equal(value.diamondsMin, 1);
  assert.equal(value.diamondsMax, 2);
  assert.equal(value.pokemonMin, 0.44);
  assert.equal(value.pokemonMax, 0.88);
  assert.equal(value.levelValue, 0.075);
  assert.equal(value.totalMin, 0.515);
  assert.equal(value.totalMax, 0.955);
});

test("PokeFipe mantém a primeira faixa para o limite 225 repetido na planilha", () => {
  const value = calculateFipe({ iv: 125, multiplier: 1.8, level: 100 });
  assert.equal(value.score, 225);
  assert.deepEqual([value.diamondsMin, value.diamondsMax], [4, 6]);
});

test("PokeFipe informa quando a pontuação está fora da tabela", () => {
  const value = calculateFipe({ iv: 100, multiplier: 1, level: 1 });
  assert.equal(value.valid, true);
  assert.equal(value.inRange, false);
});

test("PokeFipe arredonda o resultante como a célula formatada do Excel", () => {
  const value = calculateFipe({ iv: 115, multiplier: 1.805, level: 1 });
  assert.equal(value.rawScore, 207.575);
  assert.equal(value.score, 208);
  assert.deepEqual([value.diamondsMin, value.diamondsMax], [2, 4]);
});

test("PokeFipe rejeita entradas inválidas", () => {
  assert.equal(calculateFipe({ iv: 0, multiplier: 1.8, level: 1 }).valid, false);
  assert.equal(calculateFipe({ iv: 110, multiplier: "", level: 1 }).valid, false);
});
