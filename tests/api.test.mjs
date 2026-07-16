import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import login from "../api/login.js";
import logout from "../api/logout.js";
import publicConfig from "../api/config.js";
import adminConfig from "../api/admin/config.js";
import upload from "../api/admin/upload.js";

function request({ method = "GET", url = "/", headers = {}, body } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = headers;
  req.body = body;
  req.socket = { remoteAddress: "127.0.0.1" };
  return req;
}

function response() {
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  return {
    status: 0,
    headers: {},
    body: "",
    done,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body = "") {
      this.body = body;
      resolve(this);
    }
  };
}

async function call(handler, req) {
  const res = response();
  await handler(req, res);
  await res.done;
  return res;
}

function cookieFrom(res) {
  return res.headers["Set-Cookie"].split(";")[0];
}

test.before(() => {
  delete process.env.VERCEL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASS = "senha-forte";
  process.env.SESSION_SECRET = "segredo-de-integracao-com-mais-de-trinta-caracteres";
});

test("login incorreto falha e login correto cria cookie HttpOnly", async () => {
  const bad = await call(login, request({
    method: "POST",
    url: "/api/login",
    headers: { origin: "http://localhost", host: "localhost" },
    body: { user: "admin", pass: "errada" }
  }));
  assert.equal(bad.status, 401);

  const good = await call(login, request({
    method: "POST",
    url: "/api/login",
    headers: { origin: "http://localhost", host: "localhost" },
    body: { user: "admin", pass: "senha-forte" }
  }));
  assert.equal(good.status, 200);
  assert.match(good.headers["Set-Cookie"], /HttpOnly/);
  assert.match(good.headers["Set-Cookie"], /SameSite=Strict/);
});

test("API administrativa rejeita anônimo e aceita sessão válida", async () => {
  const anonymous = await call(adminConfig, request({
    method: "GET",
    url: "/api/admin/config"
  }));
  assert.equal(anonymous.status, 401);

  const logged = await call(login, request({
    method: "POST",
    url: "/api/login",
    headers: { origin: "http://localhost", host: "localhost" },
    body: { user: "admin", pass: "senha-forte" }
  }));
  const authenticated = await call(adminConfig, request({
    method: "GET",
    url: "/api/admin/config",
    headers: { cookie: cookieFrom(logged) }
  }));
  assert.equal(authenticated.status, 200);
  assert.ok(JSON.parse(authenticated.body).banners);
});

test("configuração pública permite somente GET", async () => {
  const get = await call(publicConfig, request({ method: "GET", url: "/api/config" }));
  assert.equal(get.status, 200);
  assert.ok(JSON.parse(get.body).games);

  const post = await call(publicConfig, request({ method: "POST", url: "/api/config" }));
  assert.equal(post.status, 405);
});

test("upload exige autenticação e rejeita conteúdo que não seja imagem", async () => {
  const anonymous = await call(upload, request({
    method: "POST",
    url: "/api/admin/upload",
    body: Buffer.alloc(64)
  }));
  assert.equal(anonymous.status, 401);

  const logged = await call(login, request({
    method: "POST",
    url: "/api/login",
    headers: { origin: "http://localhost", host: "localhost" },
    body: { user: "admin", pass: "senha-forte" }
  }));
  const invalid = await call(upload, request({
    method: "POST",
    url: "/api/admin/upload",
    headers: {
      cookie: cookieFrom(logged),
      origin: "http://localhost",
      host: "localhost"
    },
    body: Buffer.alloc(64)
  }));
  assert.equal(invalid.status, 415);
});

test("logout remove o cookie da sessão", async () => {
  const res = await call(logout, request({
    method: "POST",
    url: "/api/logout",
    headers: { origin: "http://localhost", host: "localhost" }
  }));
  assert.equal(res.status, 200);
  assert.match(res.headers["Set-Cookie"], /Max-Age=0/);
});
