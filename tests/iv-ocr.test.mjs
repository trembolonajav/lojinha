import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { window:{}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync("apps/vpertz-lab/public/iv-scan.js", "utf8"), context);
const { parseIv, parseWholeCard } = context.window.IvScan;

test("IV usa somente o numerador associado ao total fixo 192", () => {
  for (const raw of ["IV 129/192", "IV 129 192", "IV129192", "!V 129/192", "1V 129/192", "129/192"]) {
    assert.deepEqual({ ...parseIv(raw) }, { current:"129", maximum:"192" });
  }
});

test("IV não aceita um número solto encontrado no cabeçalho", () => {
  assert.deepEqual({ ...parseIv("Nv 1 Qualidade x1.72 142") }, { current:"", maximum:"" });
});

test("parser recupera todos os campos do card compacto do Gyarados", () => {
  const parsed = parseWholeCard(`Gyarados
Nv1 Qualidade Lendaria x1.72 IV 129/192
HP2 Atk3 Def2
SpA2 SpD2 Vel2
Poder 22`);
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), {
    level:"1", quality:"1.72", ivTotal:"129", ivMaximum:"192", power:"22",
    stats:["2", "3", "2", "2", "2", "2"]
  });
});

test("parser aceita qualidade sem x e a variante 1V do card", () => {
  const parsed = parseWholeCard("Gyarados\nNv1 Qualidade Lendaria 1.70 1V 140/192\nHP3 Atk3 Def2\nSpA2 SpD2 Vel2\nPoder 24");
  assert.equal(parsed.quality, "1.7");
  assert.equal(parsed.ivTotal, "140");
  assert.equal(parsed.power, "24");
  assert.deepEqual([...parsed.stats], ["3", "3", "2", "2", "2", "2"]);
});
