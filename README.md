# VP Store

Loja responsiva para compra e venda de itens de jogos, com catálogo público,
integração com WhatsApp e painel administrativo protegido. O projeto foi
desenvolvido para operar na Vercel usando páginas estáticas, Functions
serverless e Vercel Blob.

## Funcionalidades

- Carrossel de banners administrável.
- Catálogo de jogos e itens.
- Cotações separadas de compra e venda.
- Cálculo de quantidade e valor em tempo real.
- Mensagens de negociação prontas para o WhatsApp.
- Painel administrativo em `/admin.html`.
- Upload de PNG, JPG, WebP e GIF com limite de 2,5 MB.
- Administração de banners, jogos, preços, contatos e WhatsApp.
- Exportação e importação de backup da configuração.
- Persistência de configurações e imagens no Vercel Blob.

## Arquitetura

```text
Navegador
├── páginas HTML, CSS e JavaScript estáticos
├── GET /api/config
└── painel administrativo
    ├── POST /api/login
    ├── POST /api/logout
    ├── GET/PUT /api/admin/config
    └── POST /api/admin/upload
             │
             └── Vercel Blob
                 ├── vp-store/config.json
                 └── vp-store/uploads/*
```

O projeto permanece em JavaScript nativo porque não necessita de uma etapa de
build ou do custo de manutenção de um framework para o conjunto atual de telas.

Mais detalhes estão em [ARCHITECTURE.md](ARCHITECTURE.md).

## Segurança

- Credenciais mantidas somente em variáveis de ambiente.
- Sessão assinada com HMAC-SHA256.
- Cookie `HttpOnly`, `Secure` na Vercel e `SameSite=Strict`.
- Alterações de usuário, senha ou segredo invalidam sessões anteriores.
- Comparação de credenciais em tempo constante.
- Verificação de mesma origem nas operações que alteram dados.
- Validação e sanitização server-side de toda a configuração.
- Escape de dados dinâmicos no frontend.
- Verificação de imagens por assinatura binária, não somente por extensão.
- CSP, HSTS, proteção contra framing e outros headers de segurança.
- Nenhuma credencial ou configuração administrativa em `localStorage`.

Recomenda-se configurar uma regra de rate limit para `/api/login` no Firewall
da Vercel.

## Requisitos

- Node.js 20 ou superior.
- npm.
- Conta na Vercel para o deploy.
- Um Vercel Blob conectado ao projeto.

## Desenvolvimento local

Instale as dependências:

```powershell
npm install
```

Configure as variáveis na sessão do PowerShell:

```powershell
$env:ADMIN_USER="admin"
$env:ADMIN_PASS="uma-senha-longa-e-unica"
$env:SESSION_SECRET="uma-frase-aleatoria-com-mais-de-32-caracteres"
```

Inicie o projeto:

```powershell
npm run dev
```

Endereços locais:

- Loja: `http://127.0.0.1:8736`
- Painel: `http://127.0.0.1:8736/admin.html`

Em desenvolvimento, os dados ficam em `.data/`. Essa pasta não é versionada e
não é enviada para a Vercel.

## Testes

Execute todas as verificações:

```powershell
npm run verify
```

O comando executa:

- Validação de sintaxe.
- Testes de autenticação e autorização.
- Testes de sessão, origem e sanitização.
- Testes de caracteres UTF-8 e mensagens do WhatsApp.
- Teste HTTP ponta a ponta com login, upload, publicação, leitura, restauração e logout.

Comandos individuais:

```text
npm run check
npm test
npm run test:e2e
```

## Deploy na Vercel

Variáveis obrigatórias:

| Variável | Finalidade |
|---|---|
| `ADMIN_USER` | Usuário do painel |
| `ADMIN_PASS` | Senha forte do painel |
| `SESSION_SECRET` | Assinatura das sessões |
| Credencial do Blob | Criada automaticamente ao conectar o Vercel Blob |

Conexões novas normalmente usam OIDC e `BLOB_STORE_ID`. Conexões antigas podem
usar `BLOB_READ_WRITE_TOKEN`. Não crie nem copie essas credenciais manualmente:
conecte o armazenamento ao projeto pelo painel da Vercel.

O roteiro completo de publicação e validação está em [DEPLOY.md](DEPLOY.md).

## Persistência e limitações

O projeto não possui banco de pedidos ou sistema de pagamentos. Ele publica o
catálogo e encaminha a negociação para o WhatsApp. Preços e dados devem ser
confirmados durante o atendimento.

As imagens e a configuração são persistidas no Vercel Blob. Imagens antigas
substituídas não são removidas automaticamente e devem ser revisadas
periodicamente no armazenamento.

O plano Hobby pode atender tecnicamente um projeto pequeno dentro das franquias,
mas a Vercel o descreve como destinado a uso pessoal e não comercial. Para uma
loja em operação comercial, confira os termos vigentes e o plano Pro.

## Licença

Projeto privado da VP Store. Todos os direitos reservados.
