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
      load_system_dawg: parameters.numeric ? "0" : "1",
      load_freq_dawg: parameters.numeric ? "0" : "1",
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
    return longGreenRows >= 5 ? "bars" : "compact";
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
    const unit = Math.max(11, Math.round(canvas.height * .073));
    const box = (x, y, width, height) => ({
      x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)),
      width: Math.min(bitmap.width - Math.max(0, Math.round(x)), Math.max(1, Math.round(width))),
      height: Math.min(bitmap.height - Math.max(0, Math.round(y)), Math.max(1, Math.round(height)))
    });
    return {
      card: box(0, 0, bitmap.width, bitmap.height),
      dividerY: anchorY,
      name: box(0, Math.max(0, anchorY - unit * 5.2), bitmap.width * .62, unit * 1.65),
      level: box(0, anchorY + 2, bitmap.width * .21, unit * 1.55),
      quality: box(bitmap.width * .48, anchorY + 2, bitmap.width * .22, unit * 1.45),
      iv: box(bitmap.width * .70, anchorY + 2, bitmap.width * .16, unit * 1.45),
      ivLeft: box(bitmap.width * .63, anchorY + 1, bitmap.width * .29, unit * 1.8),
      ivRight: box(bitmap.width * .755, anchorY + 2, bitmap.width * .13, unit * 1.45),
      ivWide: box(bitmap.width * .62, anchorY, bitmap.width * .37, unit * 1.65),
      hp: box(0, anchorY + unit * 1.35, bitmap.width / 3, unit * 1.45),
      attack: box(bitmap.width / 3, anchorY + unit * 1.35, bitmap.width / 3, unit * 1.45),
      defense: box(bitmap.width * 2 / 3, anchorY + unit * 1.35, bitmap.width / 3, unit * 1.45),
      specialAttack: box(0, anchorY + unit * 2.55, bitmap.width / 3, unit * 1.5),
      specialDefense: box(bitmap.width / 3, anchorY + unit * 2.55, bitmap.width / 3, unit * 1.5),
      speed: box(bitmap.width * 2 / 3, anchorY + unit * 2.55, bitmap.width / 3, unit * 1.5),
      power: box(0, anchorY + unit * 3.85, bitmap.width * .62, unit * 1.65)
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
    const normalized = String(text || "").replace(/[|lI!]/g, "1").replace(/[zZ]/g, "2");
    const numbers = [...normalized.matchAll(/\d{1,3}/g)].map((m) => +m[0]).filter((n) => n >= 0 && n <= 192);
    const current = numbers.find((n) => n >= 6 && n <= 192 && n !== 192);
    if (current == null) return { current: "", maximum: "" };
    return { current: String(current), maximum: numbers.includes(192) ? "192" : "192" };
  }
  function parseNamedInteger(text, labels, max = 99999999) {
    const normalized = clean(text).replace(/[oO]/g, "0").replace(/[iIl!|]/g, "1");
    const labeled = normalized.match(new RegExp(`(?:${labels.join("|")})[^0-9]{0,10}([0-9][0-9.,]*)`, "i"));
    const value = digits(labeled?.[1] || normalized);
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

  async function readCompact(paths, bitmap, onProgress) {
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
      const read = layout === "compact" ? await readCompact(paths, source, onProgress) : await readBars(paths, bitmap, file, onProgress);
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
