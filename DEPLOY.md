# VP Store — como colocar no ar (Vercel)

O projeto é um site estático + funções serverless em `api/` + Vercel Blob
para guardar a configuração e as imagens enviadas pelo painel.

## Passo a passo (primeira vez, ~10 minutos)

### 1. Suba o projeto para o GitHub
1. Crie um repositório novo (pode ser **privado**) em github.com.
2. Nesta pasta, rode:
   ```
   git remote add origin https://github.com/SEU-USUARIO/vp-store.git
   git push -u origin main
   ```
   (o repositório git local já está pronto, com commit feito)

### 2. Importe na Vercel
1. Crie a conta em vercel.com (pode entrar com o GitHub).
2. **Add New > Project** e selecione o repositório `vp-store`.
3. Framework Preset: **Other**. Não mude mais nada. **Deploy**.

### 3. Configure as variáveis de ambiente
No projeto na Vercel: **Settings > Environment Variables**, adicione:

| Nome            | Valor                                          |
|-----------------|------------------------------------------------|
| `ADMIN_USER`    | o usuário que você quiser (ex.: `vperts`)      |
| `ADMIN_PASS`    | uma senha FORTE (longa, única, com símbolos)   |
| `SESSION_SECRET`| qualquer frase longa e aleatória               |

### 4. Crie o armazenamento (Blob)
1. Na aba **Storage** do projeto: **Create Database > Blob**.
2. **Connect Project** → escolha o projeto `vp-store`.
   Isso configura automaticamente a autenticação do Blob. Conexões novas usam
   OIDC e podem criar `BLOB_STORE_ID`; conexões antigas usam
   `BLOB_READ_WRITE_TOKEN`.

### 5. Redeploy
Em **Deployments**, menu **⋯ > Redeploy** (para as variáveis valerem).

### 6. Pronto — teste
- Site: `https://seu-projeto.vercel.app`
- Painel: `https://seu-projeto.vercel.app/admin.html` (login = ADMIN_USER/ADMIN_PASS)
- Troque um banner, salve e recarregue o site em outra aba/celular. A propagação
  do Blob pode levar até 1 minuto.

## Dia a dia
- Banners, jogos, preços, contatos e WhatsApp: tudo pelo `/admin.html`.
  Nada de mexer em código — **Salvar e publicar** atualiza o site.
- Deploy novo só é preciso quando alterar o CÓDIGO (HTML/CSS/JS):
  `git add -A && git commit -m "..." && git push` → a Vercel publica sozinha.

## Testar no seu PC (opcional)
```
set ADMIN_USER=vperts
set ADMIN_PASS=minha-senha
node dev-server.mjs
```
Abre http://127.0.0.1:8736 — funciona igual à Vercel (dados ficam na pasta .data/).

## Segurança — como está protegido
- Preços/banners/contatos vêm do servidor (`/api/config`): mexer no navegador,
  no HTML ou no localStorage NÃO muda o site para ninguém (nem os preços).
- Painel exige login; a senha fica só no servidor (variável de ambiente),
  nunca no código. Sessão em cookie HttpOnly assinado, expira em 12h.
- Força bruta no login: bloqueio temporário após 8 erros + resposta lenta.
- Upload aceita só imagem de verdade (PNG/JPG/WebP/GIF, checado pelos bytes,
  máx. 2,5MB).
- Tudo que o painel salva é validado no servidor (preços não-negativos,
  URLs seguras, textos limpos) e o site escapa tudo ao renderizar (anti-XSS).
- Headers de segurança (CSP etc.) em `vercel.json`.
- Configure no Firewall da Vercel uma regra de rate limit para `/api/login`
  (por exemplo, 10 requisições por IP a cada minuto).
- Trocar `ADMIN_USER`, `ADMIN_PASS` ou `SESSION_SECRET` invalida as sessões antigas.

## Plano da Vercel

Tecnicamente o projeto cabe com folga nos limites gratuitos para tráfego pequeno.
Porém, a Vercel descreve o plano Hobby como destinado a uso pessoal e não
comercial. Como este site é uma loja, confirme os termos vigentes e use o plano
Pro quando o projeto entrar em operação comercial.

No Hobby, se a franquia do Blob for excedida, o armazenamento pode ficar
indisponível até a renovação da franquia. Monitore Storage e Usage no painel.

## Validação do Preview antes de promover para produção

1. Abra `/api/config` e confirme resposta JSON.
2. Entre em `/admin.html` com as variáveis do ambiente Preview.
3. Envie uma imagem WebP pequena.
4. Troque um banner e clique em **Salvar e publicar**.
5. Abra o site em janela anônima e confirme a mudança após até 1 minuto.
6. Saia do painel e confirme que `/api/admin/config` retorna `401`.
7. Troque `ADMIN_PASS`, faça redeploy e confirme que o cookie anterior perdeu acesso.
8. Confira Functions Logs e Blob Usage no dashboard.

Limite honesto: qualquer pessoa pode alterar a PRÓPRIA tela com o F12 do
navegador (isso vale para qualquer site do mundo). Mas isso não muda o site
para os outros nem os preços reais — e a venda sempre se confirma no seu
WhatsApp, com o valor calculado pela cotação oficial.
