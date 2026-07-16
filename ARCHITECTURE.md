# Arquitetura da VP Store

## Decisão tecnológica

O projeto permanece em HTML, CSS e JavaScript nativos. React não é necessário
para o volume atual de telas e estado, e adicionaria build, dependências e custo
de manutenção sem resolver um problema existente.

## Mapa

```text
/
├── api/                    Funções serverless da Vercel
│   ├── _lib/               Autenticação, HTTP, validação e armazenamento
│   └── admin/              Rotas autenticadas do painel
├── assets/                 Imagens públicas otimizadas
├── tests/                  Testes automatizados locais
├── *.html                  Páginas estáticas e painel
├── app.js                  Interface pública
├── admin.js                Interface administrativa
├── config.js               Helpers e carregamento da configuração
├── dados.js                Fallback somente para visualização offline
├── styles.css              Estilos compartilhados
├── dev-server.mjs          Servidor local compatível com os handlers
├── vercel.json             Headers e configuração da Vercel
└── .vercelignore           Exclusões do pacote de deploy
```

Manter os HTMLs e seus arquivos diretamente na raiz é intencional: preserva
URLs simples (`/`, `/admin.html`, `/negociar.html`) e dispensa uma etapa de build.

## Persistência

- Produção: Vercel Blob.
- Desenvolvimento: `.data/`, ignorada pelo Git e pelo deploy.
- Configuração: `vp-store/config.json`.
- Imagens: `vp-store/uploads/`.

Não existe banco de pedidos. A aplicação publica catálogo e abre a negociação
no WhatsApp; qualquer valor recebido deve ser confirmado pelo atendente.

## Fronteiras de segurança

- Dados públicos são lidos por `/api/config`.
- Alterações exigem cookie de sessão assinado e requisição da mesma origem.
- Credenciais e segredo existem somente nas variáveis da Vercel.
- Alterar usuário, senha ou segredo invalida sessões anteriores.
- Uploads são limitados e verificados por assinatura do arquivo.
