# Deploy na Vercel

1. Importe o repositório oficial.
2. Framework Preset: **Other**.
3. Root Directory: raiz do repositório (`./`).
4. O `vercel.json` já define Build Command e Output Directory.
5. Adicione `ADMIN_USER`, `ADMIN_PASS` e `SESSION_SECRET` em Production e Preview.
6. Em Storage, conecte um Blob público a este projeto.
7. Faça o deploy e valide `/`, `/vplab/`, `/vplab/?tab=fipe` e `/admin.html`.

O domínio principal continua conectado ao mesmo projeto. Não é necessário criar
outro projeto Vercel nem outro domínio para o VPLab.

## Checklist após deploy

- Store abre e o botão Ferramenta leva a `/vplab/`.
- VPLab abre e seus botões de retorno levam a `/`.
- PokeFipe (aba do VPLab) calcula e contém as 251 espécies; `/pokefipe.html` redireciona para lá.
- Admin autentica, salva configuração e envia imagem.
- `/api/config` responde JSON.
- Domínios principal e `www` estão válidos com HTTPS.
