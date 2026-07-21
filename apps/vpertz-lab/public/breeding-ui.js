(() => {
  const root = document.querySelector("#tab-breeding");
  if (!root) return;

  /* Dimensões intrínsecas das capturas — declaradas no HTML para reservar
     espaço e evitar layout shift enquanto a imagem carrega. */
  const SHOTS = {
    "centro-breeding.webp": { w: 1500, h: 987 },
    "analise-dos-pais.webp": { w: 1500, h: 916 },
    "melhoria-iv.webp": { w: 675, h: 590 },
    "incubadora.webp": { w: 435, h: 310 },
    "rota-gratis.webp": { w: 665, h: 820 },
    "rota-feromonio.webp": { w: 665, h: 820 }
  };

  const ROUTES = {
    free: {
      file: "rota-gratis.webp",
      alt: "Projeção de Quality do filhote sem usar Strange Pheromone",
      title: "Caminho gratuito",
      copy: "O ganho por ovo é menor. A linhagem avança aos poucos, repetindo breeds e incubações."
    },
    pheromone: {
      file: "rota-feromonio.webp",
      alt: "Projeção de Quality do filhote usando Strange Pheromone",
      title: "Caminho com feromônio",
      copy: "O Strange Pheromone amplia as faixas de ganho e reduz o número de gerações para buscar uma Quality alta."
    }
  };

  const FAQ = [
    ["Os pais precisam ser da mesma espécie?", "Sim. O sistema aceita dois Pokémon da mesma espécie selecionados no box."],
    ["Qual é a diferença máxima de Quality?", "No breed normal, a diferença entre a Quality maior e a menor pode ser de no máximo 0,15. Se passar desse valor, o jogo rejeita o par."],
    ["De qual pai o filhote herda os IVs?", "Os IVs são herdados do pai que possui a maior Quality entre os dois."],
    ["Os pais voltam depois que o ovo nasce?", "Não. Eles são consumidos quando o breed é confirmado."],
    ["É possível subir Quality sem feromônio?", "Sim. O avanço é menor por geração, mas permite evoluir gradualmente."],
    ["Como o ovo choca?", "Abates válidos nas hunts alimentam o contador até completar 3.000."]
  ];

  /* `lazy` só a partir da segunda dobra; a primeira captura entra com a página. */
  const shot = (file, alt, label, { eager = false, compact = false } = {}) => {
    const size = SHOTS[file];
    return `<button class="breeding-shot${compact ? " compact" : ""}" type="button" data-open-image="${file}">
      <img src="assets/breeding/${file}" alt="${alt}" width="${size.w}" height="${size.h}"
           ${eager ? "" : 'loading="lazy" '}decoding="async">
      <span>${label}</span>
    </button>`;
  };

  root.innerHTML = `
    <div class="breeding-hero">
      <div class="breeding-hero-copy">
        <span class="kicker">Centro de Breeding</span>
        <h2 class="sec">Construa uma linhagem melhor</h2>
        <p class="sec-sub">Combine dois Pokémon da mesma espécie, projete Quality e IV antes de confirmar e choque o ovo enquanto caça.</p>
        <div class="breeding-actions">
          <a href="#breeding-flow">Ver passo a passo</a>
          <button type="button" data-open-image="centro-breeding.webp">Ver tela do jogo</button>
        </div>
      </div>
      <aside class="breeding-summary">
        <div><b>Nível 60</b><span>Desbloqueio</span></div>
        <div><b>Mesma espécie</b><span>Par obrigatório</span></div>
        <div><b>Até 0,15</b><span>Diferença de Quality</span></div>
        <div><b>3.000</b><span>Abates para chocar</span></div>
        <p><strong>Atenção:</strong> os dois pais são consumidos quando o ovo é criado.</p>
      </aside>
    </div>

    <nav class="breeding-jumps" aria-label="Seções do guia de breeding">
      <a href="#breeding-flow">Como funciona</a>
      <a href="#breeding-quality">Quality</a>
      <a href="#breeding-iv">IV</a>
      <a href="#breeding-incubation">Incubação</a>
      <a href="#breeding-faq">Dúvidas</a>
    </nav>

    <section class="breeding-block" id="breeding-flow" aria-labelledby="breeding-flow-title">
      <header class="breeding-heading">
        <div><span class="kicker">Fluxo completo</span><h3 id="breeding-flow-title">Do box ao nascimento</h3></div>
        <span class="breeding-tag">5 etapas</span>
      </header>
      <div class="breeding-grid screen-grid">
        ${shot("centro-breeding.webp", "Tela do Centro de Breeding no jogo, com os slots do par reprodutor, a análise e a incubadora", "Ampliar imagem", { eager: true })}
        <ol class="breeding-steps">
          <li><b>Desbloqueie no nível 60</b><span>O Centro de Breeding passa a ficar disponível.</span></li>
          <li><b>Escolha dois pais compatíveis</b><span>O par deve ser da mesma espécie. No breed normal, a diferença entre as Qualities pode ser de no máximo 0,15.</span></li>
          <li><b>Confira a projeção</b><span>A análise valida a compatibilidade e mostra herança, Quality e custos antes da confirmação.</span></li>
          <li><b>Escolha os adicionais</b><span>Feromônio acelera Quality; Stones dobradas tratam da chance de IV.</span></li>
          <li><b>Crie e incube o ovo</b><span>Os pais são consumidos e os abates nas hunts avançam a eclosão.</span></li>
        </ol>
      </div>
      <figure class="breeding-figure">
        ${shot("analise-dos-pais.webp", "Tela de análise do par reprodutor mostrando compatibilidade, herança de IV, faixa de Quality projetada e o custo do breed", "Ampliar análise")}
        <figcaption><b>Etapa 3 — Confira a projeção:</b> antes de confirmar, a análise do par mostra a compatibilidade, de qual pai vem a herança, a faixa de Quality projetada e o custo total.</figcaption>
      </figure>
    </section>

    <section class="breeding-block" id="breeding-quality" aria-labelledby="breeding-quality-title">
      <header class="breeding-heading">
        <div>
          <span class="kicker">Evolução da linhagem</span>
          <h3 id="breeding-quality-title">Quality: melhor pai + bônus</h3>
          <p>A base do filhote é a Quality do melhor pai. Para o breed normal, os pais precisam estar próximos: a diferença máxima aceita é 0,15. O caminho escolhido define o tamanho do salto, sempre respeitando o teto da espécie.</p>
        </div>
      </header>
      <div class="breeding-grid quality-grid">
        <article class="breeding-route">
          <div class="breeding-switch" role="group" aria-label="Caminho de evolução da Quality">
            <button type="button" data-route="free" aria-pressed="true">Sem feromônio</button>
            <button type="button" data-route="pheromone" aria-pressed="false">Com feromônio</button>
          </div>
          <button class="route-image" type="button" data-route-image data-open-image="rota-gratis.webp">
            <img src="assets/breeding/rota-gratis.webp" alt="${ROUTES.free.alt}" width="665" height="820" loading="lazy" decoding="async">
          </button>
          <div class="route-copy" aria-live="polite">
            <b data-route-title>${ROUTES.free.title}</b>
            <p data-route-copy>${ROUTES.free.copy}</p>
          </div>
        </article>
        <div class="breeding-compare">
          <article><span>Sem feromônio</span><b>Progressão gradual</b><p>Não usa Strange Pheromone e normalmente exige mais gerações.</p></article>
          <article><span>Com feromônio</span><b>Salto maior de Quality</b><p>Usa o catalisador para acelerar a evolução da linhagem.</p></article>
          <p class="breeding-note"><b>Como conferir:</b> subtraia a menor Quality da maior. Exemplo: 1,13 e 1,28 têm diferença 0,15 e são compatíveis; 1,13 e 1,78 têm diferença 0,65 e não são aceitos no breed normal.</p>
        </div>
      </div>
    </section>

    <section class="breeding-block" id="breeding-iv" aria-labelledby="breeding-iv-title">
      <header class="breeding-heading">
        <div><span class="kicker">Herança e lapidação</span><h3 id="breeding-iv-title">IV é tratado separadamente</h3></div>
      </header>
      <div class="breeding-grid iv-grid">
        <div class="breeding-rules">
          <article><i>1</i><div><b>Herança do pai de maior Quality</b><p>O filhote copia os IVs completos do Pokémon que possui a maior Quality entre os dois pais.</p></div></article>
          <article><i>2</i><div><b>Dobrar Stones é opcional</b><p>A opção dobra as pedras exigidas naquele breed.</p></div></article>
          <article><i>3</i><div><b>Chance de +1 por atributo</b><p>Cada slot recebe a chance indicada pelo jogo de ganhar +1 IV.</p></div></article>
          <article><i>4</i><div><b>Feromônio não melhora IV</b><p>Ele atua na Quality; a melhoria de IV usa a opção das Stones.</p></div></article>
        </div>
        ${shot("melhoria-iv.webp", "Opção de dobrar as Stones exibindo a chance de ganho de IV por atributo", "Ampliar exemplo", { compact: true })}
      </div>
    </section>

    <section class="breeding-block" id="breeding-incubation" aria-labelledby="breeding-incubation-title">
      <header class="breeding-heading">
        <div>
          <span class="kicker">Depois do breed</span>
          <h3 id="breeding-incubation-title">3.000 abates até a eclosão</h3>
          <p>O ovo aparece na incubadora e cada abate válido nas hunts soma ao contador.</p>
        </div>
      </header>
      <div class="breeding-grid incubation-grid">
        ${shot("incubadora.webp", "Incubadora com os slots de ovo e o contador de progresso", "Ver incubadora", { compact: true })}
        <article class="incubation-info">
          <span class="incubation-number">3.000</span><b>abates válidos nas hunts</b>
          <p>Depois da criação, o ovo ocupa um slot da incubadora. O contador avança enquanto você derrota Pokémon nas hunts e, ao chegar a 3.000, fica pronto para eclodir.</p>
          <small>O VPLab apresenta a regra do sistema, mas não lê o progresso da sua conta.</small>
        </article>
      </div>
      <div class="breeding-costs">
        <article><b>Os dois pais</b><span>São consumidos ao criar o ovo.</span></article>
        <article><b>Stones do elemento</b><span>Dois tipos exigem pedras dos dois elementos.</span></article>
        <article><b>Strange Pheromone</b><span>Opcional; aumenta o salto de Quality.</span></article>
        <article><b>Chance de Shiny</b><span>Todo ovo possui uma chance rara de nascer Shiny.</span></article>
      </div>
    </section>

    <section class="breeding-block" id="breeding-faq" aria-labelledby="breeding-faq-title">
      <header class="breeding-heading">
        <div><span class="kicker">Dúvidas rápidas</span><h3 id="breeding-faq-title">Regras essenciais</h3></div>
      </header>
      <div class="breeding-faq">
        ${FAQ.map(([question, answer], index) => `
        <article>
          <button type="button" id="breeding-faq-q${index}" aria-expanded="false" aria-controls="breeding-faq-a${index}">
            ${question}<i aria-hidden="true">+</i>
          </button>
          <div id="breeding-faq-a${index}" role="region" aria-labelledby="breeding-faq-q${index}" hidden>${answer}</div>
        </article>`).join("")}
      </div>
    </section>

    <div class="breeding-lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-label="Captura ampliada">
      <button type="button" data-close aria-label="Fechar imagem ampliada">×</button>
      <img data-lightbox-image alt="">
    </div>`;

  /* ---------------------------------------------- barra de atalhos */
  /* Publica a altura real da barra para o scroll-margin-top das seções. */
  const jumps = root.querySelector(".breeding-jumps");
  const trackJumps = () => {
    root.style.setProperty("--breed-jumps-height", `${Math.round(jumps.getBoundingClientRect().height)}px`);
  };
  trackJumps();
  if (typeof ResizeObserver === "function") new ResizeObserver(trackJumps).observe(jumps);

  /* ---------------------------------------------- alternância de rota */
  /* Não são abas: os dois botões trocam a mesma imagem no lugar, sem painéis
     separados. Por isso a semântica correta é aria-pressed, não role="tab". */
  const routeButtons = [...root.querySelectorAll("[data-route]")];
  const routeImageButton = root.querySelector("[data-route-image]");
  const routeImage = routeImageButton.querySelector("img");

  routeButtons.forEach((button) => button.addEventListener("click", () => {
    const route = ROUTES[button.dataset.route];
    routeButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    routeImageButton.dataset.openImage = route.file;
    routeImage.src = `assets/breeding/${route.file}`;
    routeImage.alt = route.alt;
    root.querySelector("[data-route-title]").textContent = route.title;
    root.querySelector("[data-route-copy]").textContent = route.copy;
  }));

  /* ---------------------------------------------- lightbox */
  const lightbox = root.querySelector("[data-lightbox]");
  const lightboxImage = root.querySelector("[data-lightbox-image]");
  const lightboxClose = lightbox.querySelector("[data-close]");
  let lastTrigger = null;

  const openLightbox = (trigger) => {
    const file = trigger.dataset.openImage;
    lightboxImage.src = `assets/breeding/${file}`;
    lightboxImage.alt = trigger.querySelector("img")?.alt || "Captura do sistema de Breeding";
    const size = SHOTS[file];
    if (size) { lightboxImage.width = size.w; lightboxImage.height = size.h; }
    lastTrigger = trigger;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  };

  const closeLightbox = () => {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImage.removeAttribute("src");
    document.body.style.overflow = "";
    lastTrigger?.focus();
    lastTrigger = null;
  };

  root.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-image]");
    if (trigger) openLightbox(trigger);
  });
  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });

  /* Enquanto aberto, o foco não escapa para trás do modal. */
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { closeLightbox(); return; }
    if (event.key === "Tab") { event.preventDefault(); lightboxClose.focus(); }
  });

  /* ---------------------------------------------- FAQ */
  root.querySelectorAll(".breeding-faq article > button").forEach((button) => {
    button.addEventListener("click", () => {
      const answer = root.querySelector(`#${button.getAttribute("aria-controls")}`);
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      button.querySelector("i").textContent = open ? "×" : "+";
      answer.hidden = !open;
    });
  });
})();
