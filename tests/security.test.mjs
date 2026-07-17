import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  authConfigured,
  credentialsOk,
  makeSession,
  sessionUser
} from "../api/_lib/auth.mjs";
import { sameOrigin } from "../api/_lib/http.mjs";
import { sanitizeConfig } from "../api/_lib/validate.mjs";
import { DEFAULT_CONFIG } from "../api/_lib/defaults.mjs";

const originalEnv = { ...process.env };

test.afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test("produção exige usuário, senha e segredo de sessão", () => {
  process.env.VERCEL = "1";
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASS = "senha-forte";
  delete process.env.SESSION_SECRET;
  assert.equal(authConfigured(), false);
});

test("sessão válida expira quando a senha muda", () => {
  delete process.env.VERCEL;
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASS = "senha-forte";
  process.env.SESSION_SECRET = "segredo-de-teste-com-mais-de-trinta-caracteres";

  assert.equal(credentialsOk("admin", "senha-forte"), true);
  const token = makeSession("admin");
  assert.equal(sessionUser(token), "admin");

  process.env.ADMIN_PASS = "outra-senha";
  assert.equal(sessionUser(token), null);
});

test("assinatura adulterada não autentica", () => {
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASS = "senha-forte";
  process.env.SESSION_SECRET = "segredo-de-teste-com-mais-de-trinta-caracteres";
  const token = makeSession("admin");
  assert.equal(sessionUser(token.slice(0, -1) + "x"), null);
});

test("produção rejeita mutação sem Origin e aceita HTTPS da mesma origem", () => {
  process.env.VERCEL = "1";
  assert.equal(sameOrigin({ headers: { host: "loja.example" } }), false);
  assert.equal(sameOrigin({
    headers: { host: "loja.example", origin: "https://loja.example" }
  }), true);
  assert.equal(sameOrigin({
    headers: { host: "loja.example", origin: "https://atacante.example" }
  }), false);
});

test("sanitização remove HTML, limita números e recusa URL insegura", () => {
  const input = structuredClone(DEFAULT_CONFIG);
  input.msgNegociar = "<script>alert(1)</script>";
  input.games[0].precoCompra = -50;
  input.banners[0].link = "javascript:alert(1)";

  const clean = sanitizeConfig(input);
  assert.equal(clean.msgNegociar.includes("<"), false);
  assert.equal(clean.games[0].precoCompra, 0);
  assert.equal(clean.banners[0].link, "");
});

test("configuração exige WhatsApp válido e imagem segura", () => {
  const badPhone = structuredClone(DEFAULT_CONFIG);
  badPhone.whatsapp = "123";
  assert.throws(() => sanitizeConfig(badPhone), /WhatsApp/);

  const badImage = structuredClone(DEFAULT_CONFIG);
  badImage.banners[0].img = "javascript:alert(1)";
  assert.throws(() => sanitizeConfig(badImage), /imagem inválida/);
});

test("mensagem do WhatsApp preserva acentos na URL", () => {
  const message = DEFAULT_CONFIG.msgNegociar;
  assert.equal(message, "Olá, VP Store! Vim pelo site e quero negociar diamantes.");
  const url = `https://wa.me/${DEFAULT_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
  assert.equal(
    decodeURIComponent(new URL(url).searchParams.get("text")),
    message
  );
});

test("arquivos públicos não contêm caractere Unicode de substituição", () => {
  const publicRoot = path.join(process.cwd(), "apps", "vpertz-store", "public");
  const files = [
    "index.html", "jogos.html", "negociar.html", "contato.html", "pokefipe.html", "admin.html",
    "app.js", "pokefipe.js", "pokefipe-core.js", "admin.js", "config.js", "dados.js", "styles.css",
    "api/_lib/defaults.mjs", "api/_lib/validate.mjs"
  ];
  for (const file of files) {
    const source = file.startsWith("api/")
      ? path.join(process.cwd(), file)
      : path.join(publicRoot, file);
    const content = fs.readFileSync(source, "utf8");
    assert.equal(content.includes("\uFFFD"), false, `${file} contém caractere corrompido`);
  }
});
