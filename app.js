/* ============================================================
   VP STORE — interações e renderização
   A configuração vem do servidor (/api/config); dados.js é
   apenas fallback offline. Tudo que vem da config passa por
   vpEsc() antes de entrar no HTML.
   ============================================================ */

(async () => {

const CFG = await vpFetchConfig();
const esc = vpEsc;

const isExternal = (url) => /^https?:\/\//i.test(url);
const contactHref = (c) => (c.url && c.url.trim()) ? c.url : vpWaLink(CFG, CFG.msgNegociar);
const targetAttr = (url) => isExternal(url) ? ' target="_blank" rel="noreferrer"' : "";

/* ---------------------------------------------- botão "Negociar" do topo */
document.querySelectorAll("[data-wa]").forEach((a) => {
  a.href = vpWaLink(CFG, CFG.msgNegociar);
  a.target = "_blank";
  a.rel = "noreferrer";
});

/* ---------------------------------------------- carrossel (home) */
const carousel = document.querySelector(".carousel");
if (carousel) {
  const slidesEl = carousel.querySelector(".slides");
  const dotsEl = carousel.querySelector(".dots");

  slidesEl.innerHTML = CFG.banners.map((b) => `
    <a class="slide" href="${esc(b.link || "#")}"${targetAttr(b.link)}>
      <img src="${esc(b.img)}" alt="${esc(b.alt || "Banner VP Store")}">
    </a>`).join("");

  dotsEl.innerHTML = CFG.banners.map((_, i) =>
    `<button class="dot${i === 0 ? " active" : ""}" aria-label="Banner ${i + 1}"></button>`).join("");

  const dots = [...dotsEl.children];
  let current = 0;
  let timer = null;

  if (CFG.banners.length < 2) {
    carousel.querySelectorAll(".carousel-btn").forEach((b) => (b.style.display = "none"));
    dotsEl.style.display = "none";
  } else {
    const show = (i) => {
      current = (i + dots.length) % dots.length;
      slidesEl.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, n) => d.classList.toggle("active", n === current));
      restart();
    };
    const restart = () => {
      clearInterval(timer);
      timer = setInterval(() => show(current + 1), 6000);
    };

    carousel.querySelector(".prev").addEventListener("click", () => show(current - 1));
    carousel.querySelector(".next").addEventListener("click", () => show(current + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => show(i)));
    carousel.addEventListener("mouseenter", () => clearInterval(timer));
    carousel.addEventListener("mouseleave", restart);

    // swipe no celular
    let startX = null;
    carousel.addEventListener("pointerdown", (e) => { startX = e.clientX; }, { passive: true });
    carousel.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 45) show(current + (delta < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });

    show(0);
  }
}

/* ---------------------------------------------- grade de jogos */
document.querySelectorAll("[data-games-grid]").forEach((grid) => {
  const cards = CFG.games.filter((g) => g.ativo).map((g) => `
    <a class="game-card" href="negociar.html?g=${encodeURIComponent(g.id)}">
      <div class="game-art"><img src="${esc(g.img)}" alt="${esc(g.nome)}"></div>
      <div class="game-cta"><span>${esc(g.botao)}</span></div>
    </a>`).join("");

  grid.innerHTML = cards + `
    <div class="game-card soon" aria-hidden="true">
      <div class="soon-body">
        <img src="assets/logo-vp-store-quadrada.webp" alt="">
        <strong>Em breve</strong>
        <span>Novos jogos chegando à VP Store</span>
      </div>
    </div>`;
});

/* ---------------------------------------------- chips do streamer (home) */
document.querySelectorAll("[data-handles]").forEach((box) => {
  box.innerHTML = CFG.contatos.map((c) => `
    <a class="handle" href="${esc(contactHref(c))}"${targetAttr(contactHref(c))}>
      ${vpIcon(c.icone)}${esc(c.info || c.nome)}
    </a>`).join("");
});

/* ---------------------------------------------- página de contato */
document.querySelectorAll("[data-contact-grid]").forEach((grid) => {
  grid.innerHTML = CFG.contatos.map((c) => `
    <a class="contact-card" href="${esc(contactHref(c))}"${targetAttr(contactHref(c))}>
      <div class="icon">${vpIcon(c.icone)}</div>
      <div><strong>${esc(c.nome)}</strong><span>${esc(c.info || "")}</span></div>
      <span class="go" aria-hidden="true">→</span>
    </a>`).join("");
});

/* ---------------------------------------------- redes do rodapé */
document.querySelectorAll("[data-socials]").forEach((box) => {
  box.innerHTML = CFG.contatos.map((c) => `
    <a class="social" href="${esc(contactHref(c))}"${targetAttr(contactHref(c))} aria-label="${esc(c.nome)}${esc(c.info ? " " + c.info : "")}">
      ${vpIcon(c.icone)}
    </a>`).join("");
});

/* ---------------------------------------------- página negociar */
const quantity = document.querySelector("#quantity");
if (quantity) {
  const params = new URLSearchParams(location.search);
  const game =
    CFG.games.find((g) => g.id === params.get("g") && g.ativo) ||
    CFG.games.find((g) => g.ativo);

  if (game) {
    const MIN = Math.max(1, game.min || 1);
    const MAX = game.max || 1000;

    /* painel lateral */
    document.title = `VP Store — Comprar e vender ${game.item} do ${game.nome}`;
    const gIcon = document.querySelector("#g-icon");
    if (game.icone) gIcon.src = game.icone; else gIcon.style.display = "none";
    document.querySelector("#g-nome").textContent = game.nome;
    document.querySelector("#g-item").textContent = game.item;
    document.querySelector("#g-rates").innerHTML =
      `Cotação de compra: <strong>${vpBRL(game.precoCompra)}</strong> por ${esc(game.unidade)}<br>` +
      `Cotação de venda: <strong>${vpBRL(game.precoVenda)}</strong> por ${esc(game.unidade)}`;

    const range = document.querySelector("#range");
    const label = document.querySelector("#quantity-label");
    const total = document.querySelector("#total");
    const prefix = document.querySelector("#total-prefix");
    const quoteLabel = document.querySelector("#quote-label");
    const quoteValue = document.querySelector("#quote-value");
    const cta = document.querySelector("#cta");
    const ctaLabel = document.querySelector("#cta-label");
    const chips = [...document.querySelectorAll(".chip")];
    let mode = "buy";

    quantity.min = range.min = MIN;
    quantity.max = range.max = MAX;

    const render = () => {
      const n = +quantity.value;
      label.textContent = `${n} ${game.item.toLowerCase()}`;
      chips.forEach((c) => c.classList.toggle("active", +c.dataset.value === n));
      if (mode === "buy") {
        quoteLabel.textContent = "Cotação de compra";
        quoteValue.textContent = `1 ${game.unidade} = ${vpBRL(game.precoCompra)}`;
        prefix.textContent = "Você pagará";
        total.textContent = vpBRL(n * game.precoCompra);
        ctaLabel.textContent = "Comprar via WhatsApp";
      } else {
        quoteLabel.textContent = "Cotação de venda";
        quoteValue.textContent = `1 ${game.unidade} = ${vpBRL(game.precoVenda)}`;
        prefix.textContent = "Você receberá";
        total.textContent = vpBRL(n * game.precoVenda);
        ctaLabel.textContent = "Vender via WhatsApp";
      }
    };

    const setQuantity = (value) => {
      const n = Math.max(MIN, Math.min(MAX, Math.round(Number(value) || MIN)));
      quantity.value = n;
      range.value = n;
      render();
    };

    document.querySelector("#minus").addEventListener("click", () => setQuantity(+quantity.value - 1));
    document.querySelector("#plus").addEventListener("click", () => setQuantity(+quantity.value + 1));
    quantity.addEventListener("input", () => setQuantity(quantity.value));
    range.addEventListener("input", () => setQuantity(range.value));
    chips.forEach((c) => c.addEventListener("click", () => setQuantity(c.dataset.value)));

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        mode = tab.dataset.mode;
        document.querySelectorAll(".tab").forEach((t) => {
          const active = t === tab;
          t.classList.toggle("active", active);
          t.setAttribute("aria-selected", active);
        });
        render();
      });
    });

    cta.addEventListener("click", () => {
      const n = +quantity.value;
      const preco = mode === "buy" ? game.precoCompra : game.precoVenda;
      const acao = mode === "buy" ? "COMPRAR" : "VENDER";
      const msg =
        `Olá, VP Store! 💎 Quero ${acao} ${n} ${game.item.toLowerCase()} do ${game.nome} ` +
        `(${vpBRL(preco)}/${game.unidade} — total ${vpBRL(n * preco)}).`;
      window.open(vpWaLink(CFG, msg), "_blank", "noopener");
    });

    setQuantity(quantity.value);
  }
}

})();
