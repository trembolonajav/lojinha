(() => {
  const root = document.querySelector("#tab-breeding");
  if (!root) return;

  root.innerHTML = `
    <div class="breeding-hero">
      <div class="breeding-hero-copy">
        <span class="kicker">Centro de Breeding</span>
        <h2 class="sec">Construa uma linhagem melhor</h2>
        <p class="sec-sub">Combine dois Pokémon da mesma espécie, projete Quality e IV antes de confirmar e choque o ovo enquanto caça.</p>
        <div class="breeding-actions"><a href="#breeding-flow">Ver passo a passo</a><button type="button" data-open-image="centro-breeding.webp">Ver tela do jogo</button></div>
      </div>
      <aside class="breeding-summary">
        <div><b>Nível 60</b><span>Desbloqueio</span></div><div><b>Mesma espécie</b><span>Par obrigatório</span></div><div><b>Até 0,15</b><span>Diferença de Quality</span></div><div><b>3.000</b><span>Abates para chocar</span></div>
        <p><strong>Atenção:</strong> os dois pais são consumidos quando o ovo é criado.</p>
      </aside>
    </div>

    <nav class="breeding-jumps" aria-label="Atalhos do guia"><a href="#breeding-flow">Como funciona</a><a href="#breeding-quality">Quality</a><a href="#breeding-iv">IV</a><a href="#breeding-incubation">Incubação</a><a href="#breeding-faq">Dúvidas</a></nav>

    <section class="breeding-block" id="breeding-flow">
      <header class="breeding-heading"><div><span class="kicker">Fluxo completo</span><h3>Do box ao nascimento</h3></div><span class="breeding-tag">5 etapas</span></header>
      <div class="breeding-grid screen-grid">
        <button class="breeding-shot" type="button" data-open-image="centro-breeding.webp"><img src="assets/breeding/centro-breeding.webp" alt="Tela do Centro de Breeding no jogo"><span>Ampliar imagem</span></button>
        <ol class="breeding-steps">
          <li><b>Desbloqueie no nível 60</b><span>O Centro de Breeding passa a ficar disponível.</span></li>
          <li><b>Escolha dois pais compatíveis</b><span>O par deve ser da mesma espécie. No breed normal, a diferença entre as Qualities pode ser de no máximo 0,15.</span></li>
          <li><b>Confira a projeção</b><span>A análise valida a compatibilidade e mostra herança, Quality e custos antes da confirmação.</span></li>
          <li><b>Escolha os adicionais</b><span>Feromônio acelera Quality; Stones dobradas tratam da chance de IV.</span></li>
          <li><b>Crie e incube o ovo</b><span>Os pais são consumidos e os abates nas hunts avançam a eclosão.</span></li>
        </ol>
      </div>
    </section>

    <section class="breeding-block" id="breeding-quality">
      <header class="breeding-heading"><div><span class="kicker">Evolução da linhagem</span><h3>Quality: melhor pai + bônus</h3><p>A base do filhote é a Quality do melhor pai. Para o breed normal, os pais precisam estar próximos: a diferença máxima aceita é 0,15. O caminho escolhido define o tamanho do salto, sempre respeitando o teto da espécie.</p></div></header>
      <div class="breeding-grid quality-grid">
        <article class="breeding-route">
          <div class="breeding-switch" role="tablist"><button class="active" type="button" role="tab" aria-selected="true" data-route="free">Sem feromônio</button><button type="button" role="tab" aria-selected="false" data-route="pheromone">Com feromônio</button></div>
          <button class="route-image" type="button" data-route-image data-open-image="rota-gratis.webp"><img src="assets/breeding/rota-gratis.webp" alt="Projeção de Quality sem feromônio"></button>
          <div class="route-copy"><b data-route-title>Caminho gratuito</b><p data-route-copy>O ganho por ovo é menor. A linhagem avança aos poucos, repetindo breeds e incubações.</p></div>
        </article>
        <div class="breeding-compare">
          <article><span>Sem feromônio</span><b>Progressão gradual</b><p>Não usa Strange Pheromone e normalmente exige mais gerações.</p></article>
          <article><span>Com feromônio</span><b>Salto maior de Quality</b><p>Usa o catalisador para acelerar a evolução da linhagem.</p></article>
          <p class="breeding-note"><b>Como conferir:</b> subtraia a menor Quality da maior. Exemplo: 1,13 e 1,28 têm diferença 0,15 e são compatíveis; 1,13 e 1,78 têm diferença 0,65 e não são aceitos no breed normal.</p>
        </div>
      </div>
    </section>

    <section class="breeding-block" id="breeding-iv">
      <header class="breeding-heading"><div><span class="kicker">Herança e lapidação</span><h3>IV é tratado separadamente</h3></div></header>
      <div class="breeding-grid iv-grid">
        <div class="breeding-rules">
          <article><i>1</i><div><b>Herança do pai de maior Quality</b><p>O filhote copia os IVs completos do Pokémon que possui a maior Quality entre os dois pais.</p></div></article>
          <article><i>2</i><div><b>Dobrar Stones é opcional</b><p>A opção dobra as pedras exigidas naquele breed.</p></div></article>
          <article><i>3</i><div><b>Chance de +1 por atributo</b><p>Cada slot recebe a chance indicada pelo jogo de ganhar +1 IV.</p></div></article>
          <article><i>4</i><div><b>Feromônio não melhora IV</b><p>Ele atua na Quality; a melhoria de IV usa a opção das Stones.</p></div></article>
        </div>
        <button class="breeding-shot compact" type="button" data-open-image="melhoria-iv.webp"><img src="assets/breeding/melhoria-iv.webp" alt="Stones dobradas e melhoria de IV"><span>Ampliar exemplo</span></button>
      </div>
    </section>

    <section class="breeding-block" id="breeding-incubation">
      <header class="breeding-heading"><div><span class="kicker">Depois do breed</span><h3>3.000 abates até a eclosão</h3><p>O ovo aparece na incubadora e cada abate válido nas hunts soma ao contador.</p></div></header>
      <div class="breeding-grid incubation-grid">
        <button class="breeding-shot compact" type="button" data-open-image="incubadora.webp"><img src="assets/breeding/incubadora.webp" alt="Incubadora de ovos"><span>Ver incubadora</span></button>
        <article class="incubation-info">
          <span class="incubation-number">3.000</span><b>abates válidos nas hunts</b>
          <p>Depois da criação, o ovo ocupa um slot da incubadora. O contador avança enquanto você derrota Pokémon nas hunts e, ao chegar a 3.000, fica pronto para eclodir.</p>
          <small>O VPLab apresenta a regra do sistema, mas não lê o progresso da sua conta.</small>
        </article>
      </div>
      <div class="breeding-costs"><article><b>Os dois pais</b><span>São consumidos ao criar o ovo.</span></article><article><b>Stones do elemento</b><span>Dois tipos exigem pedras dos dois elementos.</span></article><article><b>Strange Pheromone</b><span>Opcional; aumenta o salto de Quality.</span></article><article><b>Chance de Shiny</b><span>Todo ovo possui uma chance rara de nascer Shiny.</span></article></div>
    </section>

    <section class="breeding-block" id="breeding-faq">
      <header class="breeding-heading"><div><span class="kicker">Dúvidas rápidas</span><h3>Regras essenciais</h3></div></header>
      <div class="breeding-faq">
        <article><button type="button" aria-expanded="false">Os pais precisam ser da mesma espécie?<i>+</i></button><p hidden>Sim. O sistema aceita dois Pokémon da mesma espécie selecionados no box.</p></article>
        <article><button type="button" aria-expanded="false">Qual é a diferença máxima de Quality?<i>+</i></button><p hidden>No breed normal, a diferença entre a Quality maior e a menor pode ser de no máximo 0,15. Se passar desse valor, o jogo rejeita o par.</p></article>
        <article><button type="button" aria-expanded="false">De qual pai o filhote herda os IVs?<i>+</i></button><p hidden>Os IVs são herdados do pai que possui a maior Quality entre os dois.</p></article>
        <article><button type="button" aria-expanded="false">Os pais voltam depois que o ovo nasce?<i>+</i></button><p hidden>Não. Eles são consumidos quando o breed é confirmado.</p></article>
        <article><button type="button" aria-expanded="false">É possível subir Quality sem feromônio?<i>+</i></button><p hidden>Sim. O avanço é menor por geração, mas permite evoluir gradualmente.</p></article>
        <article><button type="button" aria-expanded="false">Como o ovo choca?<i>+</i></button><p hidden>Abates válidos nas hunts alimentam o contador até completar 3.000.</p></article>
      </div>
    </section>
    <div class="breeding-lightbox" data-lightbox hidden role="dialog" aria-modal="true"><button type="button" data-close aria-label="Fechar">×</button><img data-lightbox-image alt=""></div>`;

  const routes = {
    free: { file: "rota-gratis.webp", alt: "Projeção de Quality sem feromônio", title: "Caminho gratuito", copy: "O ganho por ovo é menor. A linhagem avança aos poucos, repetindo breeds e incubações." },
    pheromone: { file: "rota-feromonio.webp", alt: "Projeção de Quality com Strange Pheromone", title: "Caminho com feromônio", copy: "O Strange Pheromone amplia as faixas de ganho e reduz o número de gerações para buscar uma Quality alta." }
  };
  root.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    const route = routes[button.dataset.route];
    root.querySelectorAll("[data-route]").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-selected", String(active)); });
    const imageButton = root.querySelector("[data-route-image]");
    imageButton.dataset.openImage = route.file;
    imageButton.querySelector("img").src = `assets/breeding/${route.file}`;
    imageButton.querySelector("img").alt = route.alt;
    root.querySelector("[data-route-title]").textContent = route.title;
    root.querySelector("[data-route-copy]").textContent = route.copy;
  }));

  const lightbox = root.querySelector("[data-lightbox]");
  const lightboxImage = root.querySelector("[data-lightbox-image]");
  const closeLightbox = () => { lightbox.hidden = true; lightboxImage.removeAttribute("src"); document.body.style.overflow = ""; };
  root.addEventListener("click", (event) => { const trigger = event.target.closest("[data-open-image]"); if (!trigger) return; lightboxImage.src = `assets/breeding/${trigger.dataset.openImage}`; lightboxImage.alt = trigger.querySelector("img")?.alt || "Captura do sistema de Breeding"; lightbox.hidden = false; document.body.style.overflow = "hidden"; });
  root.querySelector("[data-close]").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !lightbox.hidden) closeLightbox(); });

  root.querySelectorAll(".breeding-faq article > button").forEach((button) => button.addEventListener("click", () => {
    const answer = button.nextElementSibling;
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    button.querySelector("i").textContent = open ? "×" : "+";
    answer.hidden = !open;
  }));
})();
