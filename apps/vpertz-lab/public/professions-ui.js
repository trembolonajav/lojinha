(() => {
  const root = document.querySelector("#tab-profissoes");
  if (!root) return;

  const ranks = [
    { rank:"E", title:"Aprendiz", bonus:"+3%", multiplier:"×1,03", next:"D", species:50, photos:20, defeats:"—" },
    { rank:"D", title:"Aventureiro", bonus:"+6%", multiplier:"×1,06", next:"C", species:100, photos:50, defeats:200 },
    { rank:"C", title:"Especialista", bonus:"+9%", multiplier:"×1,09", next:"B", species:200, photos:150, defeats:500 },
    { rank:"B", title:"Elite", bonus:"+12%", multiplier:"×1,12", next:"A", species:300, photos:300, defeats:"1.000" },
    { rank:"A", title:"Campeão", bonus:"+15%", multiplier:"×1,15", next:"S", species:450, photos:600, defeats:"2.000" },
    { rank:"S", title:"Mestre Pokémon", bonus:"+18%", multiplier:"×1,18" }
  ];

  root.innerHTML = `
    <section class="prof-hero">
      <div><span class="kicker">Sistema de profissões</span><h2 class="sec">Escolha uma especialização</h2><p class="sec-sub">Profissões oferecem mecânicas próprias e progressão por ranks. No momento, somente o <b>Treinador de Prestígio</b> está disponível no jogo.</p></div>
      <div class="prof-release"><i></i><div><b>1 profissão ativa</b><span>Outras 3 e os talentos estão em desenvolvimento.</span></div></div>
    </section>

    <div class="profession-picker" aria-label="Profissões disponíveis">
      <article class="soon"><span class="prof-icon">🌿</span><div><b>Botânico</b><small>Em desenvolvimento</small></div></article>
      <article class="soon"><span class="prof-icon">⚗</span><div><b>Cientista</b><small>Em desenvolvimento</small></div></article>
      <article class="soon"><span class="prof-icon">🔬</span><div><b>Pesquisador Pokémon</b><small>Em desenvolvimento</small></div></article>
      <article class="active"><span class="prof-icon">📕</span><div><b>Treinador de Prestígio</b><small>Disponível no jogo</small></div><em>ATIVA</em></article>
    </div>

    <section class="prestige-overview">
      <header><div class="prestige-title"><span class="prestige-mark">📕</span><div><span>Profissão ativa</span><h3>Treinador de Prestígio</h3><p>Uma carreira para quem caça Pokémon raros. Ela recompensa encontros com shinies e aumenta diretamente sua chance de captura conforme o rank avança.</p></div></div><button type="button" data-talents>Talentos do treinador <small>Em desenvolvimento</small></button></header>
      <div class="profession-mechanics">
        <article><span>📸</span><div><b>Fotografia de shinies</b><p>Quando um Shiny aparece na sua hunt, você recebe automaticamente <strong>1 Rare Pokémon Picture</strong>. Não é necessário capturá-lo para tirar a foto.</p></div></article>
        <article><span>🎯</span><div><b>Bônus de captura</b><p>Cada rank acrescenta 3% ao multiplicador da chance direta de captura: começa em <strong>+3% no rank E</strong> e chega a <strong>+18% no rank S</strong>.</p></div></article>
      </div>
    </section>

    <section class="profession-section">
      <header><span class="kicker">Progressão</span><h3>Ranks e bônus de captura</h3><p>O bônus é cumulativo e acompanha o rank atual da profissão.</p></header>
      <div class="rank-track">${ranks.map((item, index) => `<article><span>${String(index+1).padStart(2,"0")}</span><b>${item.rank}</b><h4>${item.title}</h4><strong>${item.bonus}</strong><small>${item.multiplier}</small></article>`).join("")}</div>
    </section>

    <section class="profession-section">
      <header><span class="kicker">O que falta para evoluir</span><h3>Requisitos de cada rank</h3><p>Todas as metas da linha precisam ser cumpridas juntas.</p></header>
      <div class="profession-table-wrap"><table><thead><tr><th>Evolução</th><th>Espécies diferentes</th><th>Rare Pokémon Pictures</th><th>Derrotas por tipo</th></tr></thead><tbody>${ranks.filter((item) => item.next).map((item) => `<tr><td><b>${item.rank}</b><span>→</span><b>${item.next}</b></td><td>${item.species}</td><td>${item.photos}</td><td>${item.defeats}</td></tr>`).join("")}</tbody></table></div>
      <div class="requirement-legend"><article><b>Espécies</b><span>Espécies diferentes registradas por captura.</span></article><article><b>Fotos</b><span>Rare Pokémon Pictures entregues.</span></article><article><b>Derrotas por tipo</b><span>Abates exigidos de cada tipo. A evolução E → D não pede derrotas.</span></article></div>
    </section>

    <section class="profession-section talents-preview">
      <div class="talent-lock">✦</div><div><span class="kicker">Talentos do treinador</span><h3>Em desenvolvimento</h3><p>A árvore de talentos ainda não está ativa. Ela aparece aqui apenas como funcionalidade anunciada, sem pontos, efeitos ou caminhos inventados.</p></div>
    </section>

    <footer class="profession-source">Dados de progressão conferidos na página pública <a href="https://atlas-poke.vercel.app/profissoes" target="_blank" rel="noreferrer">Poke Idle Atlas — Profissões</a>.</footer>
    <div class="talents-modal" data-talents-modal hidden role="dialog" aria-modal="true" aria-labelledby="talents-title"><div><button type="button" data-talents-close aria-label="Fechar">×</button><span>✦</span><h3 id="talents-title">Talentos do treinador</h3><b>Em desenvolvimento</b><p>A distribuição de pontos e os efeitos dos talentos ainda não estão disponíveis. Esta área será completada quando o sistema for lançado.</p></div></div>`;

  const modal = root.querySelector("[data-talents-modal]");
  const close = () => { modal.hidden = true; document.body.style.overflow = ""; };
  root.querySelector("[data-talents]").addEventListener("click", () => { modal.hidden = false; document.body.style.overflow = "hidden"; });
  root.querySelector("[data-talents-close]").addEventListener("click", close);
  modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) close(); });
})();
