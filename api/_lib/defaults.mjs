/* Configuração-semente do site: usada quando ainda não existe nada salvo
   no armazenamento (primeiro deploy) e pelo botão "Restaurar padrão".
   Mantenha em sincronia com dados.js (fallback offline do frontend). */

export const ICON_KEYS = [
  "instagram", "youtube", "twitch", "whatsapp", "tiktok", "discord",
  "x", "telegram", "facebook", "kick", "email", "site"
];

export const DEFAULT_CONFIG = {
  whatsapp: "5547988930280",
  msgNegociar: "Olá, VP Store! 💎 Vim pelo site e quero negociar diamantes.",

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

  games: [
    {
      id: "pokeidle",
      nome: "PokeIdle World",
      item: "Diamonds",
      unidade: "diamante",
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

  contatos: [
    { icone: "instagram", nome: "Instagram", info: "@vperts_ot", url: "https://www.instagram.com/vperts_ot/" },
    { icone: "youtube", nome: "YouTube", info: "@vperts1", url: "https://www.youtube.com/@vperts1" },
    { icone: "twitch", nome: "Twitch", info: "@vpertsz — live diária", url: "https://www.twitch.tv/vpertsz" },
    { icone: "whatsapp", nome: "WhatsApp", info: "Atendimento e grupo de sorteios", url: "" }
  ]
};
