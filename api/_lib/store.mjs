/* Armazenamento da config e das imagens.
   - Na Vercel (BLOB_READ_WRITE_TOKEN presente): Vercel Blob.
   - Local (dev-server): pasta .data/ no disco. */

import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG } from "./defaults.mjs";

const CONFIG_KEY = "vp-store/config.json";
const DATA_DIR = path.join(process.cwd(), ".data");
const CACHE_MS = 30 * 1000;
let memoryConfig = null;
let memoryUntil = 0;

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const clone = (o) => JSON.parse(JSON.stringify(o));
const normalizeLegacyText = (cfg) => {
  const out = clone(cfg);
  if (typeof out.msgNegociar === "string") {
    out.msgNegociar = out.msgNegociar
      .replace(/\uFFFD/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return out;
};

export async function getConfig() {
  if (memoryConfig && Date.now() < memoryUntil) return clone(memoryConfig);
  if (useBlob()) {
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let hit;
    try {
      hit = await head(CONFIG_KEY);
    } catch (error) {
      if (error instanceof BlobNotFoundError) return clone(DEFAULT_CONFIG);
      throw error;
    }
    const r = await fetch(hit.url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Falha ao ler configuração (${r.status}).`);
    memoryConfig = normalizeLegacyText(await r.json());
    memoryUntil = Date.now() + CACHE_MS;
    return clone(memoryConfig);
  }
  try {
    memoryConfig = normalizeLegacyText(
      JSON.parse(await fs.readFile(path.join(DATA_DIR, "config.json"), "utf-8"))
    );
    memoryUntil = Date.now() + CACHE_MS;
    return clone(memoryConfig);
  } catch {
    return clone(DEFAULT_CONFIG);
  }
}

export async function setConfig(cfg) {
  const json = JSON.stringify(cfg, null, 2);
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    await put(CONFIG_KEY, json, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60
    });
    memoryConfig = clone(cfg);
    memoryUntil = Date.now() + CACHE_MS;
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "config.json"), json);
  memoryConfig = clone(cfg);
  memoryUntil = Date.now() + CACHE_MS;
}

/* Salva uma imagem e devolve a URL pública dela. */
export async function putImage(name, buffer, contentType) {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`vp-store/uploads/${name}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType
    });
    return blob.url;
  }
  const dir = path.join(DATA_DIR, "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}
