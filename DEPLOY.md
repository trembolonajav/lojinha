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
1. Na aba **Storage** do projeto: **Create Database > Blob** (plano free).
2. **Connect Project** → escolha o projeto `vp-store`.
   Isso cria sozinho a variável `BLOB_READ_WRITE_TOKEN`.

### 5. Redeploy
Em **Deployments**, menu **⋯ > Redeploy** (para as variáveis valerem).

### 6. Pronto — teste
- Site: `https://seu-projeto.vercel.app`
- Painel: `https://seu-projeto.vercel.app/admin.html` (login = ADMIN_USER/ADMIN_PASS)
- Troque um banner, salve, recarregue o site em outra aba/celular: mudou para todos.

## Dia a dia
- Banners, jogos, preços, contatos e WhatsApp: tudo pelo `/admin.html`.
  Nada de mexer em código — **Salvar e publicar** já atualiza o site.
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

Limite honesto: qualquer pessoa pode alterar a PRÓPRIA tela com o F12 do
navegador (isso vale para qualquer site do mundo). Mas isso não muda o site
para os outros nem os preços reais — e a venda sempre se confirma no seu
WhatsApp, com o valor calculado pela cotação oficial.
