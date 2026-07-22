/* OCR local dos cards do PokeIdle. A API pública é window.IvScan.readCard(). */
(function () {
  "use strict";

  const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
  const TIMEOUT = 60000;
  const PSM = { SINGLE_WORD: "8", SINGLE_LINE: "7", RAW_LINE: "13", SPARSE: "11" };
  const clean = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let workerPromise;
  let progressHandler;

  function getWorker(paths) {
    if (!workerPromise) {
      workerPromise = Tesseract.createWorker("por+eng", 1, {
        ...paths,
        logger(message) {
          if (message.status === "recognizing text") progressHandler?.(message.progress);
        }
      });
    }
    return workerPromise;
  }

  async function recognize(paths, image, parameters) {
    const worker = await getWorker(paths);
    await worker.setParameters({
      tessedit_pageseg_mode: parameters.psm,
      tessedit_char_whitelist: parameters.whitelist || "",
      user_defined_dpi: "300"
    });
    let timer;
    try {
      return (await Promise.race([
        worker.recognize(image),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("OCR_TIMEOUT")), TIMEOUT); })
      ])).data;
    } finally {
      clearTimeout(timer);
    }
  }

  function canvasFrom(bitmap, box, scale = 1, smoothing = true) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = smoothing;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
    return { canvas, ctx };
  }

  function addPadding(source, amount = 18) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width + amount * 2;
    canvas.height = source.height + amount * 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, amount, amount);
    return canvas;
  }

  function enhance(canvas, options = {}) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    const lo = options.lo ?? 35, hi = options.hi ?? 190;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = pixels[i] * .299 + pixels[i + 1] * .587 + pixels[i + 2] * .114;
      let value = options.threshold ? (gray >= options.threshold ? 255 : 0) :
        Math.max(0, Math.min(255, (gray - lo) * 255 / (hi - lo)));
      if (options.invert) value = 255 - value;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

  function detectLayout(bitmap) {
    const { canvas, ctx } = canvasFrom(bitmap, { x: 0, y: 0, width: bitmap.width, height: bitmap.height }, Math.min(1, 500 / bitmap.width));
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let longGreenRows = 0;
    for (let y = 0; y < canvas.height; y += 2) {
      let run = 0, longest = 0;
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i + 1] > 95 && pixels[i + 1] > pixels[i] + 25 && pixels[i + 1] > pixels[i + 2] + 40) run++;
        else { longest = Math.max(longest, run); run = 0; }
      }
      if (Math.max(longest, run) > canvas.width * .32) longGreenRows++;
    }
    return longGreenRows >= 5 ? "my-pokes" : "inventory";
  }

  function compactGeometry(bitmap) {
    const { canvas, ctx } = canvasFrom(bitmap, { x: 0, y: 0, width: bitmap.width, height: bitmap.height });
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const rowScores = [];
    for (let y = Math.round(canvas.height * .22); y < canvas.height * .7; y++) {
      let run = 0, longest = 0;
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (r > 15 && g > 15 && r >= g && g >= b && r - b > 5) run++;
        else { longest = Math.max(longest, run); run = 0; }
      }
      rowScores.push({ y, longest: Math.max(longest, run) });
    }
    const divider = rowScores.sort((a, b) => b.longest - a.longest)[0];
    const anchorY = divider && divider.longest > canvas.width * .55 ? divider.y : Math.round(canvas.height * .46);
    /* A largura do tooltip e estavel; a altura varia quando existem instrucoes
       no rodape. Usar a largura impede que esse rodape desloque os recortes. */
    const referenceScale = canvas.width / 255;
    const unit = 18 * referenceScale;
    const headerY = 79 * referenceScale;
    const statsY = 99 * referenceScale;
    const secondStatsY = 120 * referenceScale;
    const powerY = 139 * referenceScale;
    const box = (x, y, width, height) => ({
      x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)),
      width: Math.min(bitmap.width - Math.max(0, Math.round(x)), Math.max(1, Math.round(width))),
      height: Math.min(bitmap.height - Math.max(0, Math.round(y)), Math.max(1, Math.round(height)))
    });
    return {
      card: box(0, 0, bitmap.width, bitmap.height),
      dividerY: anchorY,
      name: box(4 * referenceScale, 5 * referenceScale, bitmap.width * .7, 28 * referenceScale),
      header: box(3 * referenceScale, headerY, bitmap.width - 6 * referenceScale, 27 * referenceScale),
      statsGrid: box(3 * referenceScale, statsY, bitmap.width - 6 * referenceScale, 48 * referenceScale),
      level: box(3 * referenceScale, headerY, bitmap.width * .24, 25 * referenceScale),
      quality: box(bitmap.width * .34, headerY, bitmap.width * .38, 25 * referenceScale),
      iv: box(bitmap.width * .72, headerY, bitmap.width * .18, 25 * referenceScale),
      ivLeft: box(bitmap.width * .65, headerY, bitmap.width * .28, 25 * referenceScale),
      ivRight: box(bitmap.width * .77, headerY, bitmap.width * .14, 25 * referenceScale),
      ivWide: box(bitmap.width * .64, headerY, bitmap.width * .35, 27 * referenceScale),
      hp: box(3 * referenceScale, statsY, bitmap.width / 3, 25 * referenceScale),
      attack: box(bitmap.width / 3, statsY, bitmap.width / 3, 25 * referenceScale),
      defense: box(bitmap.width * 2 / 3, statsY, bitmap.width / 3, 25 * referenceScale),
      specialAttack: box(3 * referenceScale, secondStatsY, bitmap.width / 3, 25 * referenceScale),
      specialDefense: box(bitmap.width / 3, secondStatsY, bitmap.width / 3, 25 * referenceScale),
      speed: box(bitmap.width * 2 / 3, secondStatsY, bitmap.width / 3, 25 * referenceScale),
      power: box(3 * referenceScale, powerY, bitmap.width * .62, 27 * referenceScale)
    };
  }

  function digits(value) { return String(value || "").replace(/[oO]/g, "0").replace(/[iIl!|]/g, "1").replace(/[^0-9]/g, ""); }
  function parseLevel(text) {
    const hit = clean(text).match(/(?:nv|nivel|lvl)\s*[:.]?\s*([0-9oil!|]{1,3})/i);
    return hit ? digits(hit[1]) : digits(text).slice(0, 3);
  }
  function parseQuality(text) {
    let token = clean(text).match(/(?:x|lendaria|qualidade)[^0-9]{0,20}([01][.,/]?\d{1,3})/i)?.[1] || "";
    token = token.replace(",", ".").replace("/", ".");
    if (/^1\d{2}$/.test(token)) token = `1.${token.slice(1)}`;
    const value = Number(token);
    return value >= .8 && value <= 1.8 ? String(value) : "";
  }
  function parseIv(text) {
    const original = String(text || "");
    const normalized = original
      .replace(/\b(?:1V|lV|\|V|!V)\b/gi, "IV")
      .replace(/[oO]/g, "0")
      .replace(/\s+/g, " ")
      .trim();
    const labeled = normalized.match(/\bIV\s*[:\-]?\s*(\d{1,3})\s*(?:[\/|]\s*192|\s+192|192)\b/i);
    const anchored = normalized.match(/\b(\d{1,3})\s*[\/|]\s*192\b/);
    const isolated = !/\bIV\b/i.test(normalized) && normalized.match(/^\D*(\d{1,3})\D*$/);
    const value = Number(labeled?.[1] || anchored?.[1] || isolated?.[1]);
    if (!Number.isInteger(value) || value < 6 || value > 192) return { current: "", maximum: "" };
    return { current: String(value), maximum: "192" };
  }
  function parseNamedInteger(text, labels, max = 99999999) {
    const normalized = clean(text).replace(/[oO]/g, "0").replace(/[iIl!|]/g, "1");
    const labeled = normalized.match(new RegExp(`(?:${labels.join("|")})[^0-9]{0,10}([0-9][0-9.,]*)`, "i"));
    if (!labeled) return "";
    const value = digits(labeled[1]);
    return value && +value > 0 && +value <= max ? String(+value) : "";
  }

  function field(value = "", confidence = 0, raw = "", variant = "", source = "ocr") {
    return { value, confidence: Math.round(confidence || 0), raw: String(raw || "").trim(), variant, source: value ? source : "missing" };
  }

  async function readRegion(paths, bitmap, name, box, config, debug) {
    const scale = Math.max(3, Math.min(8, Math.ceil(850 / Math.max(box.width, 1))));
    const variants = [
      { name: "lanczos-color", smoothing: true, options: null },
      { name: "lanczos-contrast", smoothing: true, options: { lo: 32, hi: 185, invert: true } },
      { name: "nearest-contrast", smoothing: false, options: { lo: 32, hi: 185, invert: true } },
      { name: "lanczos-binary", smoothing: true, options: { threshold: 105, invert: true } },
      { name: "lanczos-gray", smoothing: true, options: { lo: 25, hi: 150 } }
    ];
    if (name.startsWith("iv")) {
      for (const threshold of [65, 80, 95, 120, 140, 165]) {
        variants.push({ name: `binary-${threshold}`, smoothing: true, options: { threshold, invert: true } });
      }
    }
    if (config.maxVariants) variants.splice(config.maxVariants);
    let best = field();
    let bestScore = -1;
    const candidates = new Map();
    for (const variant of variants) {
      const drawn = canvasFrom(bitmap, box, scale, variant.smoothing);
      if (variant.options) enhance(drawn.canvas, variant.options);
      const image = addPadding(drawn.canvas, 16);
      const data = await recognize(paths, await toBlob(image), config);
      const value = config.parse(data.text || "");
      const confidence = Number(data.confidence) || 0;
      debug.push({ region: name, box, variant: variant.name, raw: data.text || "", confidence, normalized: value });
      const structural = config.score ? config.score(value, data.text || "", confidence) : confidence;
      if (value) {
        const candidate = candidates.get(value) || { count:0, structural:-1, item:null };
        candidate.count++;
        if (structural > candidate.structural) {
          candidate.structural = structural;
          candidate.item = field(value, confidence, data.text, variant.name);
        }
        candidates.set(value, candidate);
      }
      if (value && structural > bestScore) { best = field(value, confidence, data.text, variant.name); bestScore = structural; }
      if (value && confidence >= (config.acceptConfidence || 70) && !config.tryAll) break;
    }
    if (name.startsWith("iv") && candidates.size) {
      const winner = [...candidates.values()].sort((a, b) => b.count - a.count || b.structural - a.structural)[0];
      best = winner.item;
      best.votes = winner.count;
    }
    return best;
  }

  async function readCompactLegacy(paths, bitmap, onProgress) {
    const regions = compactGeometry(bitmap);
    const debug = [];
    const originalCanvas = canvasFrom(bitmap, regions.card, 1, true).canvas;
    onProgress("Detectando textos do card", 0);
    const originalData = await recognize(paths, await toBlob(originalCanvas), { psm: "6" });
    const originalWhole = parseWholeCard(originalData.text || "");
    debug.push({ region: "card", box: regions.card, variant: "whole-original", raw: originalData.text || "", confidence: originalData.confidence, normalized: originalWhole });
    const wholeScale = Math.min(6, Math.max(2, Math.ceil(1500 / bitmap.width)));
    const wholeCanvas = canvasFrom(bitmap, regions.card, wholeScale, true);
    enhance(wholeCanvas.canvas, { lo: 45, hi: 200, invert: true });
    onProgress("Mapeando o card", 0);
    const wholeData = await recognize(paths, await toBlob(wholeCanvas.canvas), { psm: "6" });
    const whole = parseWholeCard(wholeData.text || "");
    debug.push({ region: "card", box: regions.card, variant: "whole-lanczos-contrast", raw: wholeData.text || "", confidence: wholeData.confidence, normalized: whole });
    const jobs = [
      ["name", { psm: PSM.SINGLE_LINE, parse: (t) => String(t || "").trim().replace(/[^A-Za-zÀ-ÿ♀♂ '-]/g, "") }],
      ["level", { psm: PSM.SINGLE_LINE, whitelist: "NvNIVELnivelvlL0123456789", numeric: true, parse: parseLevel }],
      ["quality", { psm: PSM.SINGLE_WORD, whitelist: "xX.,0123456789", numeric: true, parse: parseQuality }],
      ["iv", { psm: PSM.SINGLE_WORD, whitelist: "0123456789", numeric: true, tryAll: true, score: (v, _t, c) => (v?.length === 3 ? 100 : 0) + c, parse: (t) => {
        const value = digits(t); return +value >= 6 && +value < 192 ? String(+value) : "";
      } }],
      ["ivLeft", { psm: PSM.SINGLE_WORD, whitelist: "0123456789", numeric: true, tryAll: true, score: (v, _t, c) => (v?.length === 3 ? 100 : 0) + c, parse: (t) => {
        const value = digits(t); return +value >= 6 && +value < 192 ? String(+value) : "";
      } }],
      ["ivRight", { psm: PSM.SINGLE_WORD, whitelist: "0123456789", numeric: true, tryAll: true, score: (v, _t, c) => (v?.length === 3 ? 100 : 0) + c, parse: (t) => {
        const value = digits(t); return +value >= 6 && +value < 192 ? String(+value) : "";
      } }],
      ["ivWide", { psm: PSM.SINGLE_LINE, tryAll: true, score: (v, t, c) => (v?.length === 3 ? 100 : 0) + (/192/.test(t) ? 50 : 0) + c, parse: (t) => parseIv(t).current }],
      ["hp", { psm: PSM.SINGLE_LINE, whitelist: "HP0123456789", numeric: true, parse: (t) => parseNamedInteger(t, ["hp"], 9999999) }],
      ["attack", { psm: PSM.SINGLE_LINE, whitelist: "AtkATK0123456789", numeric: true, parse: (t) => parseNamedInteger(t, ["atk"], 9999999) }],
      ["defense", { psm: PSM.SINGLE_LINE, whitelist: "DefDEF0123456789", numeric: true, parse: (t) => parseNamedInteger(t, ["def"], 9999999) }],
      ["specialAttack", { psm: PSM.SINGLE_LINE, whitelist: "SpA0123456789", numeric: true, parse: (t) => parseNamedInteger(t, ["spa"], 9999999) }],
      ["specialDefense", { psm: PSM.SINGLE_LINE, whitelist: "SpD0123456789", numeric: true, parse: (t) => parseNamedInteger(t, ["spd", "spb", "spo"], 9999999) }],
      ["speed", { psm: PSM.SINGLE_LINE, whitelist: "VelVEL0123456789", numeric: true, parse: (t) => parseNamedInteger(t, ["vel"], 9999999) }],
      ["power", { psm: PSM.SINGLE_LINE, whitelist: "PoderPOWERpoderpower.0123456789", numeric: true, parse: (t) => parseNamedInteger(t, ["poder", "power"]) }]
    ];
    const result = {};
    for (let i = 0; i < jobs.length; i++) {
      const [name, config] = jobs[i];
      onProgress(`Lendo ${name === "iv" ? "IV" : "dados do card"}`, i / jobs.length);
      result[name] = await readRegion(paths, bitmap, name, regions[name], config, debug);
    }
    if (bitmap.width > 300) {
      const canonical = canvasFrom(bitmap, regions.card, 247 / bitmap.width, true).canvas;
      const canonicalRegions = compactGeometry(canonical);
      const ivConfig = jobs.find(([name]) => name === "ivRight")[1];
      result.ivCanonical = await readRegion(paths, canonical, "ivCanonical", canonicalRegions.ivRight, ivConfig, debug);
    }
    const wholeValues = {
      level: whole.level, quality: whole.quality, iv: whole.ivTotal, power: whole.power,
      hp: whole.stats[0], attack: whole.stats[1], defense: whole.stats[2],
      specialAttack: whole.stats[3], specialDefense: whole.stats[4], speed: whole.stats[5]
    };
    const originalValues = {
      level: originalWhole.level, quality: originalWhole.quality, iv: originalWhole.ivTotal, power: originalWhole.power,
      hp: originalWhole.stats[0], attack: originalWhole.stats[1], defense: originalWhole.stats[2],
      specialAttack: originalWhole.stats[3], specialDefense: originalWhole.stats[4], speed: originalWhole.stats[5]
    };
    for (const [name, value] of Object.entries(originalValues)) {
      if (value && !wholeValues[name]) result[name] = field(value, originalData.confidence, originalData.text, "whole-original");
    }
    for (const [name, value] of Object.entries(wholeValues)) {
      if (value) result[name] = field(value, wholeData.confidence, wholeData.text, "whole-lanczos-contrast");
    }
    const ivCandidates = [result.iv, result.ivLeft, result.ivRight, result.ivWide]
      .filter((item) => item?.value?.length === 3)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0) || b.confidence - a.confidence);
    if (ivCandidates.length) result.iv = ivCandidates[0];
    if (result.quality.value && result.ivLeft?.value?.length === 3) result.iv = result.ivLeft;
    if ((!result.iv.value || result.iv.value.length < 3) && result.ivCanonical?.value?.length === 3) result.iv = result.ivCanonical;
    delete result.ivRight;
    delete result.ivLeft;
    delete result.ivCanonical;
    delete result.ivWide;
    result.ivMaximum = field(result.iv.value ? "192" : "", result.iv.confidence, result.iv.raw, result.iv.variant);
    return { result, regions, debug };
  }

  async function readCompactGrouped(paths, bitmap, onProgress) {
    const regions = compactGeometry(bitmap);
    const debug = [];
    const grouped = async (name, box, config, progress) => {
      onProgress("Mapeando campos do card", progress);
      const scale = Math.max(3, Math.min(6, Math.ceil(1200 / Math.max(box.width, 1))));
      const drawn = canvasFrom(bitmap, box, scale, true);
      enhance(drawn.canvas, { lo: 32, hi: 190, invert: true });
      const data = await recognize(paths, await toBlob(addPadding(drawn.canvas, 18)), config);
      debug.push({ region: name, box, variant: "grouped-contrast", raw: data.text || "", confidence: data.confidence });
      return data;
    };

    /* O caminho comum usa quatro blocos. Recortes individuais sao usados
       somente para recuperar valores que ficaram ausentes ou invalidos. */
    const nameData = await grouped("name", regions.name, { psm: PSM.SINGLE_LINE }, .05);
    const headerData = await grouped("header", regions.header, { psm: PSM.SINGLE_LINE }, .22);
    const statsData = await grouped("statsGrid", regions.statsGrid, { psm: "6" }, .42);
    const powerData = await grouped("power", regions.power, { psm: PSM.SINGLE_LINE }, .60);
    const header = parseWholeCard(headerData.text || "");
    const stats = parseWholeCard(statsData.text || "");
    const power = parseWholeCard(powerData.text || "");
    const make = (value, data, variant) => field(value, data.confidence, data.text, variant);
    const result = {
      name: make(String(nameData.text || "").trim().replace(/[^A-Za-zÀ-ÿ♀♂ '-]/g, ""), nameData, "grouped-name"),
      level: make(header.level, headerData, "grouped-header"),
      quality: make(header.quality, headerData, "grouped-header"),
      iv: make(header.ivTotal, headerData, "grouped-header"),
      power: make(power.power || parseNamedInteger(powerData.text, ["poder", "power"]), powerData, "grouped-power"),
      hp: make(stats.stats[0], statsData, "grouped-stats"),
      attack: make(stats.stats[1], statsData, "grouped-stats"),
      defense: make(stats.stats[2], statsData, "grouped-stats"),
      specialAttack: make(stats.stats[3], statsData, "grouped-stats"),
      specialDefense: make(stats.stats[4], statsData, "grouped-stats"),
      speed: make(stats.stats[5], statsData, "grouped-stats")
    };
    const configs = {
      name: { psm: PSM.SINGLE_LINE, maxVariants: 2, parse: (t) => String(t || "").trim().replace(/[^A-Za-zÀ-ÿ♀♂ '-]/g, "") },
      level: { psm: PSM.SINGLE_LINE, whitelist: "NvNIVELnivelvlL0123456789", numeric: true, maxVariants: 2, parse: parseLevel },
      quality: { psm: PSM.SINGLE_WORD, whitelist: "xX.,0123456789", numeric: true, maxVariants: 3, parse: parseQuality },
      iv: { psm: PSM.SINGLE_LINE, whitelist: "IViv/0123456789", numeric: true, tryAll: true, maxVariants: 5, score: (v, t, c) => (String(v).length === 3 ? 100 : 0) + (/192/.test(t) ? 50 : 0) + c, parse: (t) => parseIv(t).current },
      hp: { psm: PSM.SINGLE_LINE, whitelist: "HP0123456789", numeric: true, maxVariants: 2, parse: (t) => parseNamedInteger(t, ["hp"], 9999999) },
      attack: { psm: PSM.SINGLE_LINE, whitelist: "AtkATK0123456789", numeric: true, maxVariants: 2, parse: (t) => parseNamedInteger(t, ["atk"], 9999999) },
      defense: { psm: PSM.SINGLE_LINE, whitelist: "DefDEF0123456789", numeric: true, maxVariants: 2, parse: (t) => parseNamedInteger(t, ["def"], 9999999) },
      specialAttack: { psm: PSM.SINGLE_LINE, whitelist: "SpA0123456789", numeric: true, maxVariants: 2, parse: (t) => parseNamedInteger(t, ["spa"], 9999999) },
      specialDefense: { psm: PSM.SINGLE_LINE, whitelist: "SpD0123456789", numeric: true, maxVariants: 2, parse: (t) => parseNamedInteger(t, ["spd", "spb", "spo"], 9999999) },
      speed: { psm: PSM.SINGLE_LINE, whitelist: "VelVEL0123456789", numeric: true, maxVariants: 2, parse: (t) => parseNamedInteger(t, ["vel"], 9999999) },
      power: { psm: PSM.SINGLE_LINE, whitelist: "PoderPOWERpoderpower.0123456789", numeric: true, maxVariants: 2, parse: (t) => parseNamedInteger(t, ["poder", "power"]) }
    };
    const names = Object.keys(configs);
    const recovery = names.filter((name) => !result[name]?.value);
    for (let i = 0; i < recovery.length; i++) {
      const name = recovery[i];
      onProgress(`Confirmando ${name === "iv" ? "IV" : "campos difíceis"}`, .65 + .3 * i / Math.max(1, recovery.length));
      const region = name === "iv" ? regions.ivRight : regions[name];
      result[name] = await readRegion(paths, bitmap, name, region, configs[name], debug);
    }
    if (!result.iv.value) {
      result.iv = await readRegion(paths, bitmap, "ivWide", regions.ivWide, configs.iv, debug);
    }
    result.ivMaximum = field(result.iv.value ? "192" : "", result.iv.confidence, result.iv.raw, result.iv.variant);
    return { result, regions, debug };
  }

  async function readCompact(paths, bitmap, onProgress) {
    const regions = compactGeometry(bitmap);
    const usefulHeight = Math.min(bitmap.height, regions.power.y + regions.power.height + Math.round(bitmap.width * .02));
    const usefulCard = { x:0, y:0, width:bitmap.width, height:usefulHeight };
    const scale = Math.max(4, Math.min(6, Math.ceil(1200 / Math.max(bitmap.width, 1))));
    /* A primeira tentativa preserva as cores. O contraste binario apagava
       partes cinzas/laranjas e transformava 24 em 2 em cards pequenos. */
    const drawn = canvasFrom(bitmap, usefulCard, scale, true);
    onProgress("Lendo o card", .08);
    const data = await recognize(paths, await toBlob(addPadding(drawn.canvas, 20)), { psm:"6" });
    const parsed = parseWholeCard(data.text || "");
    const firstLine = String(data.text || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
    const make = (value) => field(value, data.confidence, data.text, "whole-useful-card");
    const result = {
      name: make(firstLine.replace(/[^A-Za-zÀ-ÿ♀♂ '-]/g, "")),
      level: make(parsed.level), quality: make(parsed.quality),
      iv: make(parsed.ivTotal), ivMaximum: make(parsed.ivTotal ? "192" : ""),
      power: make(parsed.power), hp: make(parsed.stats[0]), attack: make(parsed.stats[1]),
      defense: make(parsed.stats[2]), specialAttack: make(parsed.stats[3]),
      specialDefense: make(parsed.stats[4]), speed: make(parsed.stats[5])
    };
    const knownStatSum = [result.hp, result.attack, result.defense, result.specialAttack,
      result.specialDefense, result.speed].reduce((sum, item) => sum + (+item.value || 0), 0);
    if (+result.power.value > 0 && +result.power.value < knownStatSum * .8) {
      result.power = field();
    }
    const complete = result.name.value && result.level.value && result.quality.value &&
      result.iv.value && result.power.value && [result.hp, result.attack, result.defense,
        result.specialAttack, result.specialDefense, result.speed].every((item) => item.value);
    const initialDebug = [{ region:"usefulCard", box:usefulCard, variant:"whole-contrast", raw:data.text || "", confidence:data.confidence, normalized:parsed }];
    if (complete) {
      onProgress("Leitura concluída", 1);
      return { result, regions:{ ...regions, usefulCard }, debug:initialDebug };
    }
    const fallback = await readCompactGrouped(paths, bitmap, onProgress);
    for (const [name, item] of Object.entries(result)) {
      if (item?.value) fallback.result[name] = item;
    }
    fallback.regions.usefulCard = usefulCard;
    fallback.debug.unshift(...initialDebug);
    return fallback;
  }

  function parseWholeCard(text) {
    const normalized = clean(text);
    const lineInteger = (labels) => {
      for (const label of labels) {
        const hit = normalized.match(new RegExp(`(?:^|\\s)${label}[^\\n0-9]{0,12}([0-9][0-9.,]*)`, "im"));
        if (hit) return digits(hit[1]);
      }
      return "";
    };
    const iv = parseIv(normalized.match(/(?:^|\s)(?:iv|1v)\b[^\n]*/)?.[0] || "");
    const powerAfter = normalized.match(/(?:poder|power)[^\n0-9]{0,8}([0-9][0-9.,]*)/i)?.[1];
    const powerBefore = normalized.match(/([0-9][0-9.,]*)[^\n0-9]{0,4}(?:poder|power)/i)?.[1];
    return {
      level: parseLevel(normalized.match(/(?:nv|nivel|lvl)[^\n]*/)?.[0] || ""),
      quality: parseQuality(normalized), ivTotal: iv.current, ivMaximum: iv.maximum,
      power: digits(powerAfter || powerBefore || ""),
      stats: [
        lineInteger(["hp"]), lineInteger(["atk"]), lineInteger(["def"]),
        lineInteger(["sp[ah]"]), lineInteger(["sp[dpob]"]), lineInteger(["vel"])
      ]
    };
  }

  async function readBars(paths, bitmap, file, onProgress) {
    onProgress("Lendo card completo", 0);
    progressHandler = (p) => onProgress("Lendo card completo", p);
    const data = await recognize(paths, file, { psm: "6" });
    const parsed = parseWholeCard(data.text || "");
    const make = (value) => field(value, data.confidence, data.text, "whole-card");
    return {
      result: {
        name: make(""), level: make(parsed.level), quality: make(parsed.quality),
        iv: make(parsed.ivTotal), ivMaximum: make(parsed.ivMaximum), power: make(parsed.power),
        hp: make(parsed.stats[0]), attack: make(parsed.stats[1]), defense: make(parsed.stats[2]),
        specialAttack: make(parsed.stats[3]), specialDefense: make(parsed.stats[4]), speed: make(parsed.stats[5])
      },
      regions: { card: { x: 0, y: 0, width: bitmap.width, height: bitmap.height } },
      debug: [{ region: "card", variant: "original", raw: data.text || "", confidence: data.confidence }]
    };
  }

  async function readCard(file, { paths = {}, onProgress = () => {}, debug = false } = {}) {
    if (!window.Tesseract) throw new Error("TESSERACT_MISSING");
    const bitmap = await createImageBitmap(file);
    try {
      const layout = detectLayout(bitmap);
      const source = bitmap;
      const read = layout === "inventory" ? await readCompact(paths, source, onProgress) : await readBars(paths, bitmap, file, onProgress);
      const r = read.result;
      const fields = {
        level: r.level.value, quality: r.quality.value, power: r.power.value,
        total: r.iv.value, totalMax: r.ivMaximum.value,
        stats: [r.hp, r.attack, r.defense, r.specialAttack, r.specialDefense, r.speed].map((item) => item.value)
      };
      const sources = {
        level: r.level.source, quality: r.quality.source, power: r.power.source,
        total: r.iv.source, totalMax: r.ivMaximum.source,
        stats: [r.hp, r.attack, r.defense, r.specialAttack, r.specialDefense, r.speed].map((item) => item.source)
      };
      const searchText = read.debug.map((item) => item.raw).join("\n");
      if (/lendaria/i.test(clean(searchText)) && +fields.quality > 0 && +fields.quality < 1.7) {
        fields.quality = "";
        sources.quality = "missing";
      }
      const statSum = fields.stats.reduce((sum, value) => sum + (+value || 0), 0);
      const inconsistent = fields.stats.every(Boolean) && +fields.quality > 0 && +fields.power > 0 &&
        Math.abs(Math.round(statSum * +fields.quality) - +fields.power) > 1;
      if (debug) console.table(read.debug.map((item) => ({ ...item, box: item.box ? JSON.stringify(item.box) : "" })));
      return { layout, fields, sources, regions: read.regions, debug: read.debug, searchText, inconsistent };
    } finally {
      progressHandler = null;
      bitmap.close();
    }
  }

  window.IvScan = { readCard, isAcceptedImage: (file) => Boolean(file) && ACCEPTED_TYPES.has(file.type), detectLayout, compactGeometry, parseIv, parseWholeCard };
})();
