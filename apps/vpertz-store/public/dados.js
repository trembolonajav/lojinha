/* ============================================================
   VP STORE — fallback offline da configuração
   ------------------------------------------------------------
   A configuração OFICIAL vem do servidor (/api/config) e é
   editada no painel admin (admin.html). Este arquivo só é usado
   quando o site é aberto sem a API (ex.: HTML aberto localmente).
   Fonte da verdade dos padrões: api/_lib/defaults.mjs.
   ============================================================ */

window.VP_DEFAULT_CONFIG = {
  /* Número no formato internacional, só dígitos: 55 + DDD + número */
  whatsapp: "5547988930280",

  /* Mensagem do botão "Negociar" do topo e dos atalhos de WhatsApp */
  msgNegociar: "Olá, VP Store! Vim pelo site e quero negociar diamantes.",

  /* Banners do carrossel da página inicial */
  banners: [
    {
      img: "assets/banner-live-diaria.webp",
      alt: "Live todos os dias das 18h às 22h na Twitch @vpertsz",
      link: "https://www.twitch.tv/vpertsz"
    },
    {
      img: "assets/banner-sorteio-membros.webp",
      alt: "Sorteio semanal de 50 diamantes para membros do grupo",
      link: "contato.html"
    }
  ],

  /* Jogos da loja — cada um tem seus próprios preços.
     precoCompra = quanto o CLIENTE PAGA por unidade ao comprar.
     precoVenda  = quanto o CLIENTE RECEBE por unidade ao vender. */
  games: [
    {
      id: "pokeidle",
      nome: "PokeIdle World",
      item: "Diamonds",          /* nome do item, no plural  */
      unidade: "diamante",       /* nome do item, no singular */
      botao: "[PokeIdle] Diamonds",
      img: "assets/card-pokeidle-world.webp",
      icone: "assets/diamante-pokeidle.webp",
      precoCompra: 0.30,
      precoVenda: 0.20,
      min: 1,
      max: 1000,
      ativo: true
    }
  ],

  /* Redes sociais / contatos — usados na página Contato,
     no rodapé e nos chips da seção do streamer.
     url vazia = abre o WhatsApp da loja. */
  contatos: [
    { icone: "instagram", nome: "Instagram", info: "@vperts_ot", url: "https://www.instagram.com/vperts_ot/" },
    { icone: "youtube",  nome: "YouTube",  info: "@vperts1", url: "https://www.youtube.com/@vperts1" },
    { icone: "twitch",   nome: "Twitch",   info: "@vpertsz — live diária", url: "https://www.twitch.tv/vpertsz" },
    { icone: "whatsapp", nome: "WhatsApp", info: "Atendimento oficial da loja", url: "" }
  ]
};
