const { calculateFipe, DIAMOND_BRL, LEVEL_BRL, POKEMON } = window.PokeFipe;

const form = document.querySelector("#fipe-form");
const pokemon = document.querySelector("#fipe-pokemon");
const result = document.querySelector("#fipe-result");
const empty = document.querySelector("#fipe-empty");
const warning = document.querySelector("#fipe-warning");

const brl = (value) => value.toLocaleString("pt-BR", {
  style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2
});
const number = (value, digits = 2) => value.toLocaleString("pt-BR", {
  minimumFractionDigits: 0, maximumFractionDigits: digits
});

POKEMON.forEach(({ id, slug, name }) => {
  const option = document.createElement("option");
  option.value = slug;
  option.textContent = `${name} — #${String(id).padStart(3, "0")}`;
  pokemon.append(option);
});

document.querySelector("#diamond-rate").textContent = brl(DIAMOND_BRL);
document.querySelector("#level-rate").textContent = brl(LEVEL_BRL);

function render() {
  const values = Object.fromEntries(new FormData(form));
  const calculated = calculateFipe(values);
  const selected = POKEMON.find(({ slug }) => slug === values.pokemon);
  const pokemonName = selected?.name || "Pokémon";

  empty.hidden = true;
  result.hidden = true;
  warning.hidden = true;

  if (!calculated.valid || !calculated.inRange) {
    warning.hidden = false;
    warning.querySelector("strong").textContent = calculated.valid
      ? `Pontuação ${number(calculated.score)} sem cotação`
      : "Dados incompletos";
    warning.querySelector("span").textContent = calculated.reason;
    if (calculated.valid) {
      warning.querySelector("small").textContent = `Custo do nível informado: ${brl(calculated.levelValue)}.`;
    } else {
      warning.querySelector("small").textContent = "Use números positivos para calcular a referência.";
    }
    return;
  }

  result.hidden = false;
  document.querySelector("#result-name").textContent = pokemonName;
  document.querySelector("#result-score").textContent = number(calculated.score);
  document.querySelector("#result-diamonds").textContent = `${calculated.diamondsMin} a ${calculated.diamondsMax}`;
  document.querySelector("#result-pokemon").textContent = `${brl(calculated.pokemonMin)} a ${brl(calculated.pokemonMax)}`;
  document.querySelector("#result-level").textContent = brl(calculated.levelValue);
  document.querySelector("#result-total").textContent = `${brl(calculated.totalMin)} a ${brl(calculated.totalMax)}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});

form.addEventListener("reset", () => {
  requestAnimationFrame(() => {
    result.hidden = true;
    warning.hidden = true;
    empty.hidden = false;
  });
});

form.addEventListener("input", () => {
  if (!result.hidden || !warning.hidden) render();
});
