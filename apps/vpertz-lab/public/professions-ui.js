(() => {
  const root = document.querySelector("#tab-profissoes");
  if (!root) return;

  /* Progressão do Treinador de Prestígio, conferida na página pública do
     Poke Idle Atlas. Nada aqui é deduzido: o rank S encerra a trilha e por isso
     não possui linha de requisitos. */
  const RANKS = [
    { rank: "E", title: "Aprendiz", bonus: "+3%", multiplier: "×1,03", next: "D", species: 50, photos: 20, defeats: null },
    { rank: "D", title: "Aventureiro", bonus: "+6%", multiplier: "×1,06", next: "C", species: 100, photos: 50, defeats: "200" },
    { rank: "C", title: "Especialista", bonus: "+9%", multiplier: "×1,09", next: "B", species: 200, photos: 150, defeats: "500" },
    { rank: "B", title: "Elite", bonus: "+12%", multiplier: "×1,12", next: "A", species: 300, photos: 300, defeats: "1.000" },
    { rank: "A", title: "Campeão", bonus: "+15%", multiplier: "×1,15", next: "S", species: 450, photos: 600, defeats: "2.000" },
    { rank: "S", title: "Mestre Pokémon", bonus: "+18%", multiplier: "×1,18", next: null }
  ];

  /* Profissões anunciadas no jogo mas ainda sem conteúdo público. Ficam
     visíveis por transparência, sem competir com a única jogável. */
  const UPCOMING = [
    { id: "botanist", file: "icon_botanist.png", name: "Botânico" },
    { id: "scientist", file: "icon_scientist.png", name: "Cientista" },
    { id: "pokemon-researcher", file: "icon_researcher.png", name: "Pesquisador Pokémon" }
  ];

  const TALENT_ASSETS = [
    ["water", "Água"], ["fire", "Fogo"], ["grass", "Planta"], ["electric", "Elétrico"],
    ["fighting", "Lutador"], ["flying", "Voador"], ["ghost", "Fantasma"],
    ["psychic", "Psíquico"], ["ground", "Terra"], ["steel", "Aço"]
  ];

  /* Ícone monocromático local. O SVG entra como máscara para que a cor venha do
     CSS (currentColor), permitindo estados ativo/indisponível sem trocar arquivo. */
  const icon = (name) => `<span class="prof-icon" style="--prof-icon:url('assets/professions/${name}.svg')" aria-hidden="true"></span>`;
  const officialIcon = (file) => `<img class="prof-official-icon" src="assets/professions/official/${file}" alt="" loading="lazy" decoding="async">`;
  const rarePicture = (className = "") => `<img class="rare-picture${className ? ` ${className}` : ""}" src="assets/professions/official/rare_pokemon_picture.png" alt="Rare Pokémon Picture" width="32" height="32" loading="lazy" decoding="async">`;

  root.innerHTML = `
    <section class="prof-hero">
      <img class="prof-official-banner" src="assets/professions/official/header_prestige.png" alt="Treinadores fotografando Pokémon no banner oficial das Profissões" width="1792" height="594">
      <div class="prof-hero-copy">
        <span class="kicker">Sistema de profissões</span>
        <h2 class="sec">Especializações do treinador</h2>
        <p class="sec-sub">Profissões oferecem mecânicas próprias e progressão por ranks. No momento, apenas o <b>Treinador de Prestígio</b> está disponível no jogo.</p>
      </div>
      <p class="prof-release"><i aria-hidden="true"></i><span><b>1 profissão ativa</b>Outras três e a árvore de talentos seguem em desenvolvimento.</span></p>
    </section>

    <section class="profession-active" aria-labelledby="prestige-title">
      <header class="profession-active-head">
        <span class="profession-emblem">${officialIcon("icon_prestige.png")}</span>
        <div>
          <p class="profession-status"><span class="profession-badge">Disponível no jogo</span><span class="kicker">Profissão ativa</span></p>
          <h3 id="prestige-title">Treinador de Prestígio</h3>
          <p>Uma carreira para quem caça Pokémon raros. Ela recompensa encontros com shinies e aumenta diretamente sua chance de captura conforme o rank avança.</p>
        </div>
      </header>
      <div class="profession-mechanics">
        <article>
          <span class="picture-mechanic-icon">${icon("shiny-photo")}${rarePicture("rare-picture-mechanic")}</span>
          <div>
            <h4>Fotografia de shinies</h4>
            <p>Quando um Shiny aparece na sua hunt, você recebe automaticamente <strong>1 Rare Pokémon Picture</strong>. A foto entra no inventário e é entregue para evoluir a profissão; não é necessário capturá-lo.</p>
          </div>
        </article>
        <article>
          ${icon("capture-bonus")}
          <div>
            <h4>Bônus de captura</h4>
            <p>Cada rank acrescenta 3% ao multiplicador da chance direta de captura: começa em <strong>+3% no rank E</strong> e chega a <strong>+18% no rank S</strong>.</p>
          </div>
        </article>
      </div>
    </section>

    <section class="profession-section" aria-labelledby="prestige-ranks-title">
      <header>
        <span class="kicker">Progressão</span>
        <h3 id="prestige-ranks-title">Ranks e bônus de captura</h3>
        <p>O bônus é cumulativo e acompanha o rank atual da profissão.</p>
      </header>
      <ol class="rank-track">
        ${RANKS.map((item, index) => `
        <li${item.rank === "S" ? ' class="is-final"' : ""}>
          <span class="rank-step">${String(index + 1).padStart(2, "0")}</span>
          <b class="rank-letter">${item.rank}</b>
          <h4>${item.title}</h4>
          <strong>${item.bonus}</strong>
          <small>${item.multiplier}</small>
        </li>`).join("")}
      </ol>
    </section>

    <section class="profession-section" aria-labelledby="prestige-req-title">
      <header>
        <span class="kicker">O que falta para evoluir</span>
        <h3 id="prestige-req-title">Requisitos de cada rank</h3>
        <p>Todas as metas da linha precisam ser cumpridas juntas.</p>
      </header>
      <div class="profession-table-wrap" tabindex="0" role="region" aria-labelledby="prestige-req-title">
        <table>
          <caption class="sr-only">Requisitos para avançar entre os ranks do Treinador de Prestígio</caption>
          <thead>
            <tr>
              <th scope="col">Evolução</th>
              <th scope="col">Espécies diferentes</th>
              <th scope="col"><span class="picture-column-title">${rarePicture("rare-picture-table")}Rare Pokémon Pictures</span></th>
              <th scope="col">Derrotas por tipo</th>
            </tr>
          </thead>
          <tbody>
            ${RANKS.filter((item) => item.next).map((item) => `
            <tr>
              <th scope="row"><b>${item.rank}</b><span aria-hidden="true">→</span><b>${item.next}</b></th>
              <td>${item.species}</td>
              <td>${item.photos}</td>
              <td>${item.defeats ?? "—"}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="profession-table-hint">Deslize a tabela para ver todas as colunas.</p>
      <div class="requirement-legend">
        <article><h4>Espécies</h4><p>Espécies diferentes registradas por captura.</p></article>
        <article class="picture-requirement"><div>${rarePicture("rare-picture-legend")}<h4>Rare Pokémon Picture</h4></div><p>Item oficial recebido automaticamente ao encontrar um Shiny e consumido na evolução de rank.</p></article>
        <article><h4>Derrotas por tipo</h4><p>Abates exigidos de cada tipo. A evolução E → D não pede derrotas.</p></article>
      </div>
    </section>

    <section class="talents-preview" aria-labelledby="talents-title">
      <div>
        <span class="kicker">Talentos do treinador</span>
        <h3 id="talents-title">Árvore de talentos ainda não disponível</h3>
        <p>O sistema é anunciado no jogo, mas ainda não está ativo: pontos, caminhos e efeitos ainda estão em desenvolvimento. Esta seção será atualizada assim que a árvore de talentos estiver disponível.</p>
        <div class="talent-assets" aria-label="Tipagens representadas pelos sprites oficiais da futura árvore de talentos">
          ${TALENT_ASSETS.map(([file, label]) => `<span>${officialIcon(`talent_${file}.png`)}<b>${label}</b></span>`).join("")}
        </div>
      </div>
    </section>

    <section class="profession-others" aria-labelledby="others-title">
      <header>
        <span class="kicker">Ainda não jogáveis</span>
        <h3 id="others-title">Outras profissões</h3>
        <p>Anunciadas no jogo, sem mecânicas ou requisitos publicados até agora.</p>
      </header>
      <ul class="profession-upcoming">
        ${UPCOMING.map((item) => `
        <li>
          ${officialIcon(item.file)}
          <div><h4>${item.name}</h4><p>Em desenvolvimento</p></div>
        </li>`).join("")}
      </ul>
    </section>

    `;

  /* Se a tabela transborda é o CSS que decide (media query em 789px), porque a
     largura do wrap é previsível e assim nenhum estado calculado em JS pode ficar
     desatualizado quando um resize não dispara. Aqui só apagamos o degradê ao
     chegar no fim da rolagem — e esse evento sempre acontece quando o usuário rola. */
  const wrap = root.querySelector(".profession-table-wrap");
  wrap.addEventListener("scroll", () => {
    const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 1;
    wrap.classList.toggle("is-at-end", atEnd);
  }, { passive: true });
})();
