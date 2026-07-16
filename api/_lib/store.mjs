/* Armazenamento da config e das imagens.
   - Na Vercel (BLOB_READ_WRITE_TOKEN presente): Vercel Blob.
   - Local (dev-server): pasta .data/ no disco. */

import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG } from "./defaults.mjs";

const CONFIG_KEY = "vp-store/config.json";
const DATA_DIR = path.join(process.cwd(), ".data");

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const clone = (o) => JSON.parse(JSON.stringify(o));

export async function getConfig() {
  if (useBlob()) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: CONFIG_KEY });
      const hit = blobs.find((b) => b.pathname === CONFIG_KEY);
      if (!hit) return clone(DEFAULT_CONFIG);
      const r = await fetch(hit.url, { cache: "no-store" });
      if (!r.ok) return clone(DEFAULT_CONFIG);
      return await r.json();
    } catch {
      return clone(DEFAULT_CONFIG);
    }
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, "config.json"), "utf-8"));
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
      contentType: "application/json"
    });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "config.json"), json);
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
