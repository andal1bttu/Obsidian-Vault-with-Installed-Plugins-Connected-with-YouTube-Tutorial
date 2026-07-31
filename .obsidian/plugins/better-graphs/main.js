var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  BETTER_GRAPH_ICON: () => BETTER_GRAPH_ICON,
  default: () => BetterGraphsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian9 = require("obsidian");

// src/types.ts
var DEFAULT_EDGE_STYLES = {
  link: { color: "#888888", width: 1, dash: "solid", head: "triangle" },
  north: { color: "#c0392b", width: 1.6, dash: "solid", head: "triangle" },
  south: { color: "#27ae60", width: 1.6, dash: "solid", head: "triangle" },
  west: { color: "#2980b9", width: 1.4, dash: "solid", head: "none" },
  east: { color: "#8e44ad", width: 1.4, dash: "dashed", head: "none" }
};
var DEFAULT_SETTINGS = {
  colorMode: "folder",
  colorProperty: "pillar",
  sizeMode: "links",
  iconProperty: "icon",
  pinOnDrop: true,
  connectionsHeading: "## Connections",
  focusHops: 2,
  showLabels: true,
  showOrphans: true,
  showLinkArrows: false,
  textFade: 0.45,
  textSize: 1,
  nodeScale: 1,
  lineWidth: 1,
  groups: [],
  forces: { center: 0.012, repel: 2600, linkStrength: 0.04, linkDistance: 130 },
  lockLayout: false,
  edgeStyle: "curved",
  curvature: 0.25,
  edgeStyles: DEFAULT_EDGE_STYLES,
  edgeColorMode: "mother",
  linkExaggeration: 0.5,
  customColors: [],
  backgroundMode: "theme",
  backgroundColor: "#fafafa",
  texturePath: "",
  texturesFolder: "Textures",
  labelColor: "auto",
  relevanceWeights: { connections: true, keywords: true, similarity: true, tags: true },
  clusterMode: "signals",
  clusterSignals: {
    links: 1,
    coCitation: 0,
    bibCoupling: 0,
    sharedTags: 0,
    tagCoocc: 0,
    titleSim: 0,
    fullText: 0,
    keywordCoocc: 0
  },
  stableClustering: true,
  extraStopwords: "",
  nodeOverrides: {},
  exportDefaults: {
    format: "png",
    pageGroup: "ISO A",
    pageName: "A4",
    orientation: "landscape",
    dpi: 300,
    fit: "graph",
    transparent: true,
    marginMm: 10
  },
  snapshotFolder: "Better Graph Snapshots",
  trackRevisits: true,
  revisits: {},
  usageLogging: false,
  usageConsentAcknowledged: false,
  participantId: "",
  usageFolder: "Better Graph Usage"
};
var PALETTE = [
  "#e15759",
  "#4e79a7",
  "#59a14f",
  "#f28e2b",
  "#b07aa1",
  "#76b7b2",
  "#edc948",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#86bcb6",
  "#d37295"
];
var DASH_PATTERNS = {
  solid: [],
  dashed: [6, 4],
  dotted: [1.5, 3.5]
};
function hashColor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = h * 31 + key.charCodeAt(i) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// src/view.ts
var import_obsidian6 = require("obsidian");

// src/data.ts
var COMPASS_RE = /^(North|South|West|East)::(.*)$/gm;
var WIKILINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
var TEXT_CAP = 6e4;
async function buildGraph(app, settings) {
  const files = app.vault.getMarkdownFiles();
  const nodes = [];
  const byId = /* @__PURE__ */ new Map();
  for (const file of files) {
    const cache2 = app.metadataCache.getFileCache(file);
    const fm = cache2?.frontmatter ?? {};
    const tags = [];
    if (cache2?.tags) for (const t of cache2.tags) tags.push(t.tag.replace(/^#/, "").toLowerCase());
    const fmTags = fm["tags"];
    if (Array.isArray(fmTags)) for (const t of fmTags) tags.push(String(t).toLowerCase());
    else if (typeof fmTags === "string") tags.push(fmTags.toLowerCase());
    const override = settings.nodeOverrides[file.path] ?? {};
    const angle = Math.random() * Math.PI * 2;
    const radius = 200 + Math.random() * 400;
    const node = {
      id: file.path,
      name: file.basename,
      folder: file.parent?.path ?? "",
      tags: Array.from(new Set(tags)),
      frontmatter: fm,
      headings: (cache2?.headings ?? []).map((h) => h.heading.toLowerCase()),
      text: "",
      wordCount: 0,
      compass: { north: false, south: false, west: false, east: false },
      mtime: file.stat.mtime,
      x: override.x ?? Math.cos(angle) * radius,
      y: override.y ?? Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      pinned: override.pinned ?? false,
      degree: 0,
      cluster: 0,
      heat: 0,
      heatKind: "none",
      color: override.color,
      icon: override.icon ?? (typeof fm[settings.iconProperty] === "string" ? String(fm[settings.iconProperty]) : void 0),
      sizeOverride: override.size
    };
    nodes.push(node);
    byId.set(file.path, node);
  }
  const compassEdges = [];
  for (const file of files) {
    let content;
    try {
      content = await app.vault.cachedRead(file);
    } catch {
      continue;
    }
    const node = byId.get(file.path);
    if (!node) continue;
    node.text = content.toLowerCase().slice(0, TEXT_CAP);
    node.wordCount = content.split(/\s+/).length;
    COMPASS_RE.lastIndex = 0;
    let m;
    while ((m = COMPASS_RE.exec(content)) !== null) {
      const kind = m[1].toLowerCase();
      if (m[2].trim().length > 0 && kind in node.compass) {
        node.compass[kind] = true;
      }
      WIKILINK_RE.lastIndex = 0;
      let lm;
      while ((lm = WIKILINK_RE.exec(m[2])) !== null) {
        const dest = app.metadataCache.getFirstLinkpathDest(lm[1].trim(), file.path);
        if (dest && byId.has(dest.path) && dest.path !== file.path) {
          compassEdges.push({ source: file.path, target: dest.path, kind, bidirectional: false });
        }
      }
    }
  }
  const compassPairs = new Set(compassEdges.map((e) => pairKey(e.source, e.target)));
  const edges = [...compassEdges];
  const resolved = app.metadataCache.resolvedLinks;
  const seen = /* @__PURE__ */ new Set();
  for (const src of Object.keys(resolved)) {
    if (!byId.has(src)) continue;
    for (const dst of Object.keys(resolved[src])) {
      if (!byId.has(dst) || src === dst) continue;
      const key = pairKey(src, dst);
      if (compassPairs.has(key) || seen.has(key)) continue;
      seen.add(key);
      const bidirectional = Boolean(resolved[dst] && resolved[dst][src]);
      edges.push({ source: src, target: dst, kind: "link", bidirectional });
    }
  }
  const adjacency = /* @__PURE__ */ new Map();
  for (const n of nodes) adjacency.set(n.id, /* @__PURE__ */ new Set());
  for (const e of edges) {
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  }
  for (const n of nodes) n.degree = adjacency.get(n.id)?.size ?? 0;
  return { nodes, edges, byId, adjacency };
}
function pairKey(a, b) {
  return a < b ? a + "\0" + b : b + "\0" + a;
}

// src/simulation.ts
var DAMPING = 0.82;
var MIN_ALPHA = 0.012;
var ForceSim = class {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.alpha = 0;
    this.forces = { center: 0.012, repel: 2600, linkStrength: 0.04, linkDistance: 130 };
    this.byId = /* @__PURE__ */ new Map();
  }
  setData(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
    this.byId = new Map(nodes.map((n) => [n.id, n]));
    this.reheat(1);
  }
  setForces(forces) {
    this.forces = forces;
    this.reheat(0.4);
  }
  reheat(alpha = 0.5) {
    this.alpha = Math.max(this.alpha, alpha);
  }
  get active() {
    return this.alpha > MIN_ALPHA;
  }
  // Runs the simulation to a near-steady state without rendering.
  warmup(ticks = 300) {
    this.reheat(1);
    for (let i = 0; i < ticks && this.active; i++) this.tick();
  }
  tick() {
    if (!this.active) return;
    const a = this.alpha;
    const { center, repel, linkStrength, linkDistance } = this.forces;
    const cutoff = Math.max(Math.sqrt(repel) * 6, 120);
    const cell = cutoff;
    const grid = /* @__PURE__ */ new Map();
    for (const n of this.nodes) {
      const key = Math.floor(n.x / cell) + ":" + Math.floor(n.y / cell);
      let bucket = grid.get(key);
      if (!bucket) grid.set(key, bucket = []);
      bucket.push(n);
    }
    for (const n of this.nodes) {
      const cx = Math.floor(n.x / cell);
      const cy = Math.floor(n.y / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const bucket = grid.get(gx + ":" + gy);
          if (!bucket) continue;
          for (const o of bucket) {
            if (o === n) continue;
            let dx = n.x - o.x;
            let dy = n.y - o.y;
            let d2 = dx * dx + dy * dy;
            if (d2 === 0) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              d2 = dx * dx + dy * dy;
            }
            if (d2 > cutoff * cutoff) continue;
            const f = repel / d2 * a;
            const d = Math.sqrt(d2);
            n.vx += dx / d * f;
            n.vy += dy / d * f;
          }
        }
      }
    }
    for (const e of this.edges) {
      const s = this.byId.get(e.source);
      const t = this.byId.get(e.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - linkDistance) * linkStrength * a;
      const fx = dx / d * f;
      const fy = dy / d * f;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }
    for (const n of this.nodes) {
      if (n.pinned) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.vx -= n.x * center * a;
      n.vy -= n.y * center * a;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }
    this.alpha *= 0.986;
    if (this.alpha < MIN_ALPHA) this.alpha = 0;
  }
};

// src/stopwords.ts
var BUILT_IN = [
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "aren",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "cannot",
  "could",
  "couldn",
  "did",
  "didn",
  "do",
  "does",
  "doesn",
  "doing",
  "don",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "hadn",
  "has",
  "hasn",
  "have",
  "haven",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "isn",
  "it",
  "its",
  "itself",
  "just",
  "let",
  "me",
  "more",
  "most",
  "must",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "re",
  "s",
  "same",
  "shan",
  "she",
  "should",
  "shouldn",
  "so",
  "some",
  "such",
  "t",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "ve",
  "very",
  "was",
  "wasn",
  "we",
  "were",
  "weren",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "won",
  "would",
  "wouldn",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  // light markdown and note noise
  "http",
  "https",
  "www",
  "com",
  "md",
  "png",
  "jpg",
  "note",
  "notes",
  "also",
  "one",
  "two",
  "get",
  "use",
  "using",
  "used",
  "make",
  "made",
  "see",
  "like",
  "via",
  // generic filler that carries no topic on its own
  "goes",
  "done",
  "never",
  "whole",
  "slow",
  "minutes",
  "apart",
  "thing",
  "things",
  "add",
  "into",
  "big",
  "free",
  "week",
  "hard",
  "side",
  "sides",
  "lot",
  "bit",
  "onto",
  "new",
  "old",
  "good",
  "every"
];
var cache = null;
function stopwordSet(extra = "") {
  if (cache && cache.extra === extra) return cache.set;
  const set = new Set(BUILT_IN);
  for (const w of extra.toLowerCase().split(/[\s,]+/)) {
    const t = w.trim();
    if (t) set.add(t);
  }
  cache = { extra, set };
  return set;
}
function tokenize(text, stops) {
  const out = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    if (/^\d+$/.test(raw)) continue;
    if (stops.has(raw)) continue;
    out.push(raw);
  }
  return out;
}

// src/clusters.ts
var DEGREE_CAP = 60;
var DF_MIN = 2;
var DF_MAX_ABS = 120;
var TOP_TERMS = 40;
var TOP_KEYWORDS = 12;
function assignClusters(graph, settings) {
  const nodes = graph.nodes;
  const n = nodes.length;
  if (n === 0) return 0;
  const labels = settings.clusterMode === "folder" ? partitionBy(nodes, (i) => nodes[i].folder || "(root)") : settings.clusterMode === "recency" ? partitionBy(nodes, (i) => recencyBucket(nodes[i].mtime)) : settings.clusterMode === "components" ? components(graph) : settings.clusterMode === "compass" ? compassRoots(graph) : signalClusters(graph, settings);
  return commit(nodes, labels);
}
function partitionBy(nodes, key) {
  const map = /* @__PURE__ */ new Map();
  const out = new Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    const k = key(i);
    let id = map.get(k);
    if (id === void 0) map.set(k, id = map.size);
    out[i] = id;
  }
  return out;
}
function recencyBucket(mtime) {
  const days = (Date.now() - mtime) / 864e5;
  if (days <= 90) return "0-90 days";
  if (days <= 180) return "90-180 days";
  if (days <= 365) return "180-365 days";
  return "over a year";
}
function components(graph) {
  const idx = indexMap(graph);
  const n = graph.nodes.length;
  const labels = new Array(n).fill(-1);
  let c = 0;
  for (let start = 0; start < n; start++) {
    if (labels[start] !== -1) continue;
    const queue = [start];
    labels[start] = c;
    while (queue.length) {
      const cur = queue.pop();
      const node = graph.nodes[cur];
      for (const nb of graph.adjacency.get(node.id) ?? []) {
        const j = idx.get(nb);
        if (j !== void 0 && labels[j] === -1) {
          labels[j] = c;
          queue.push(j);
        }
      }
    }
    c++;
  }
  return labels;
}
function compassRoots(graph) {
  const idx = indexMap(graph);
  const north = /* @__PURE__ */ new Map();
  for (const e of graph.edges) {
    if (e.kind !== "north") continue;
    const s = idx.get(e.source);
    const t = idx.get(e.target);
    if (s !== void 0 && t !== void 0 && !north.has(s)) north.set(s, t);
  }
  const rootOf = (start) => {
    let cur = start;
    const seen = /* @__PURE__ */ new Set();
    while (north.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = north.get(cur);
    }
    return cur;
  };
  const labels = new Array(graph.nodes.length);
  const rootLabel = /* @__PURE__ */ new Map();
  for (let i = 0; i < graph.nodes.length; i++) {
    const r = rootOf(i);
    let id = rootLabel.get(r);
    if (id === void 0) rootLabel.set(r, id = rootLabel.size);
    labels[i] = id;
  }
  return labels;
}
function signalClusters(graph, settings) {
  const n = graph.nodes.length;
  const w = normalizeWeights(settings.clusterSignals);
  const idx = indexMap(graph);
  const aff = Array.from({ length: n }, () => /* @__PURE__ */ new Map());
  const add = (a, b, weight) => {
    if (a === b || weight <= 0) return;
    aff[a].set(b, (aff[a].get(b) ?? 0) + weight);
    aff[b].set(a, (aff[b].get(a) ?? 0) + weight);
  };
  if (w.links > 0) {
    for (let i = 0; i < n; i++) {
      const node = graph.nodes[i];
      for (const nb of graph.adjacency.get(node.id) ?? []) {
        const j = idx.get(nb);
        if (j !== void 0 && j > i) add(i, j, w.links);
      }
    }
  }
  if (w.coCitation > 0 || w.bibCoupling > 0) {
    const { out, inn } = directed(graph, idx);
    if (w.coCitation > 0) for (const arr of out) pairs(arr, DEGREE_CAP, (a, b) => add(a, b, w.coCitation));
    if (w.bibCoupling > 0) for (const arr of inn) pairs(arr, DEGREE_CAP, (a, b) => add(a, b, w.bibCoupling));
  }
  if (w.sharedTags > 0 || w.tagCoocc > 0) {
    const index = /* @__PURE__ */ new Map();
    for (let i = 0; i < n; i++) for (const t of graph.nodes[i].tags) push(index, t, i);
    const dfMax = dfCeiling(n);
    for (const list of index.values()) {
      if (list.length < DF_MIN || list.length > dfMax) continue;
      const idf = Math.log(1 + n / list.length);
      const weight = w.sharedTags + w.tagCoocc * idf;
      pairs(list, dfMax, (a, b) => add(a, b, weight));
    }
  }
  if (w.titleSim > 0) {
    const stops = stopwordSet(settings.extraStopwords);
    const index = /* @__PURE__ */ new Map();
    for (let i = 0; i < n; i++) {
      const node = graph.nodes[i];
      const words = new Set(tokenize(node.name + " " + node.headings.join(" "), stops));
      for (const word of words) push(index, word, i);
    }
    const dfMax = dfCeiling(n);
    for (const list of index.values()) {
      if (list.length < DF_MIN || list.length > dfMax) continue;
      const idf = Math.log(1 + n / list.length);
      pairs(list, dfMax, (a, b) => add(a, b, w.titleSim * idf));
    }
  }
  if (w.fullText > 0 || w.keywordCoocc > 0) {
    buildTextSignals(graph, settings, w, add);
  }
  const labels = louvain(aff, settings.stableClustering);
  return splitDisconnected(aff, labels);
}
function buildTextSignals(graph, settings, w, add) {
  const n = graph.nodes.length;
  const stops = stopwordSet(settings.extraStopwords);
  const tfPerNote = [];
  const df = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) {
    const counts = /* @__PURE__ */ new Map();
    const body = graph.nodes[i].text.replace(/^---\n[\s\S]*?\n---/, " ").replace(/%%[\s\S]*?%%/g, " ");
    for (const term of tokenize(body, stops)) counts.set(term, (counts.get(term) ?? 0) + 1);
    const kept = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, TOP_TERMS);
    const tf = new Map(kept);
    tfPerNote.push(tf);
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const dfMax = dfCeiling(n);
  const idf = (term) => Math.log(1 + n / (df.get(term) ?? 1));
  if (w.fullText > 0) {
    const index = /* @__PURE__ */ new Map();
    for (let i = 0; i < n; i++) {
      for (const [term, count] of tfPerNote[i]) {
        const d = df.get(term) ?? 1;
        if (d < DF_MIN || d > dfMax) continue;
        const weight = (1 + Math.log(count)) * idf(term);
        push2(index, term, [i, weight]);
      }
    }
    for (const list of index.values()) {
      if (list.length < DF_MIN) continue;
      pairsWeighted(list, dfMax, (a, wa, b, wb) => add(a, b, w.fullText * wa * wb));
    }
  }
  if (w.keywordCoocc > 0) {
    const index = /* @__PURE__ */ new Map();
    for (let i = 0; i < n; i++) {
      const top = Array.from(tfPerNote[i].entries()).map(([term, count]) => [term, (1 + Math.log(count)) * idf(term)]).sort((a, b) => b[1] - a[1]).slice(0, TOP_KEYWORDS);
      for (const [term] of top) {
        const d = df.get(term) ?? 1;
        if (d < DF_MIN || d > dfMax) continue;
        push(index, term, i);
      }
    }
    for (const [term, list] of index) {
      if (list.length < DF_MIN || list.length > dfMax) continue;
      const weight = w.keywordCoocc * idf(term);
      pairs(list, dfMax, (a, b) => add(a, b, weight));
    }
  }
}
function louvain(aff, deterministic) {
  const n = aff.length;
  if (n === 0) return [];
  const mapping = new Array(n);
  for (let i = 0; i < n; i++) mapping[i] = i;
  let curAdj = aff;
  let curN = n;
  for (let level = 0; level < 20; level++) {
    const k = new Float64Array(curN);
    let m2 = 0;
    for (let i = 0; i < curN; i++) {
      let sum = 0;
      for (const [j, wt] of curAdj[i]) sum += j === i ? wt * 2 : wt;
      k[i] = sum;
      m2 += sum;
    }
    if (m2 === 0) break;
    const order = sequence(curN, deterministic);
    const comm = localMoving(curAdj, k, m2, order);
    const relabeled = compact(comm);
    const c = relabeled.count;
    for (let o = 0; o < n; o++) mapping[o] = relabeled.labels[mapping[o]];
    if (c === curN) break;
    curAdj = aggregate(curAdj, relabeled.labels, c);
    curN = c;
  }
  return mapping;
}
function localMoving(adj, k, m2, order) {
  const n = adj.length;
  const comm = new Array(n);
  const sigmaTot = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    comm[i] = i;
    sigmaTot[i] = k[i];
  }
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (const i of order) {
      const ci = comm[i];
      const neigh = /* @__PURE__ */ new Map();
      for (const [j, wt] of adj[i]) {
        if (j === i) continue;
        const cj = comm[j];
        neigh.set(cj, (neigh.get(cj) ?? 0) + wt);
      }
      sigmaTot[ci] -= k[i];
      let best = ci;
      let bestGain = (neigh.get(ci) ?? 0) - sigmaTot[ci] * k[i] / m2;
      for (const [c, wsum] of neigh) {
        if (c === ci) continue;
        const gain = wsum - sigmaTot[c] * k[i] / m2;
        if (gain > bestGain + 1e-12) {
          best = c;
          bestGain = gain;
        }
      }
      sigmaTot[best] += k[i];
      if (best !== ci) {
        comm[i] = best;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return comm;
}
function aggregate(adj, comm, c) {
  const out = Array.from({ length: c }, () => /* @__PURE__ */ new Map());
  const bump = (a, b, wt) => {
    out[a].set(b, (out[a].get(b) ?? 0) + wt);
  };
  for (let i = 0; i < adj.length; i++) {
    const cu = comm[i];
    for (const [j, wt] of adj[i]) {
      if (j < i) continue;
      const cv = comm[j];
      if (i === j) {
        bump(cu, cu, wt);
      } else if (cu === cv) {
        bump(cu, cu, wt);
      } else {
        bump(cu, cv, wt);
        bump(cv, cu, wt);
      }
    }
  }
  return out;
}
function splitDisconnected(aff, labels) {
  const n = labels.length;
  const members = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) push(members, String(labels[i]), i);
  const out = new Array(n).fill(-1);
  let next = 0;
  for (const group of members.values()) {
    const inGroup = new Set(group);
    for (const start of group) {
      if (out[start] !== -1) continue;
      const queue = [start];
      out[start] = next;
      while (queue.length) {
        const cur = queue.pop();
        for (const j of aff[cur].keys()) {
          if (j !== cur && inGroup.has(j) && out[j] === -1) {
            out[j] = next;
            queue.push(j);
          }
        }
      }
      next++;
    }
  }
  return out;
}
function indexMap(graph) {
  const idx = /* @__PURE__ */ new Map();
  graph.nodes.forEach((node, i) => idx.set(node.id, i));
  return idx;
}
function directed(graph, idx) {
  const n = graph.nodes.length;
  const outSet = Array.from({ length: n }, () => /* @__PURE__ */ new Set());
  const inSet = Array.from({ length: n }, () => /* @__PURE__ */ new Set());
  for (const e of graph.edges) {
    const s = idx.get(e.source);
    const t = idx.get(e.target);
    if (s === void 0 || t === void 0) continue;
    outSet[s].add(t);
    inSet[t].add(s);
    if (e.bidirectional) {
      outSet[t].add(s);
      inSet[s].add(t);
    }
  }
  return { out: outSet.map((s) => Array.from(s)), inn: inSet.map((s) => Array.from(s)) };
}
function push(map, key, value) {
  let list = map.get(key);
  if (!list) map.set(key, list = []);
  list.push(value);
}
function push2(map, key, value) {
  let list = map.get(key);
  if (!list) map.set(key, list = []);
  list.push(value);
}
function pairs(list, cap, cb) {
  if (list.length < 2 || list.length > cap) return;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) cb(list[i], list[j]);
}
function pairsWeighted(list, cap, cb) {
  if (list.length < 2 || list.length > cap) return;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) cb(list[i][0], list[i][1], list[j][0], list[j][1]);
}
function dfCeiling(n) {
  return Math.min(DF_MAX_ABS, Math.max(DF_MIN, Math.floor(n * 0.5)));
}
function normalizeWeights(s) {
  const any = s.links + s.coCitation + s.bibCoupling + s.sharedTags + s.tagCoocc + s.titleSim + s.fullText + s.keywordCoocc;
  if (any > 0) return s;
  return { ...s, links: 1 };
}
function sequence(n, deterministic) {
  const order = Array.from({ length: n }, (_, i) => i);
  if (deterministic) return order;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
function compact(labels) {
  const map = /* @__PURE__ */ new Map();
  const out = new Array(labels.length);
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];
    let id = map.get(l);
    if (id === void 0) map.set(l, id = map.size);
    out[i] = id;
  }
  return { labels: out, count: map.size };
}
function commit(nodes, labels) {
  const sizes = /* @__PURE__ */ new Map();
  for (const l of labels) sizes.set(l, (sizes.get(l) ?? 0) + 1);
  const ordered = Array.from(sizes.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const rank = /* @__PURE__ */ new Map();
  ordered.forEach(([l], i) => rank.set(l, i));
  for (let i = 0; i < nodes.length; i++) nodes[i].cluster = rank.get(labels[i]) ?? 0;
  return ordered.length;
}

// src/relevance.ts
function relevanceScores(graph, seedId, weights) {
  const seed = graph.byId.get(seedId);
  const scores = /* @__PURE__ */ new Map();
  if (!seed) return scores;
  const seedNeighbors = graph.adjacency.get(seedId) ?? /* @__PURE__ */ new Set();
  const seedTags = new Set(seed.tags);
  const seedWords = titleWords(seed);
  for (const n of graph.nodes) {
    if (n.id === seedId) continue;
    let s = 0;
    if (weights.connections) {
      if (seedNeighbors.has(n.id)) s += 1;
      else {
        for (const nb of graph.adjacency.get(n.id) ?? []) {
          if (seedNeighbors.has(nb)) {
            s += 0.35;
            break;
          }
        }
      }
      let shared = 0;
      for (const nb of graph.adjacency.get(n.id) ?? []) if (seedNeighbors.has(nb)) shared++;
      s += Math.min(shared * 0.08, 0.4);
    }
    if (weights.tags && seedTags.size > 0) {
      let shared = 0;
      for (const t of n.tags) if (seedTags.has(t)) shared++;
      s += Math.min(shared * 0.18, 0.54);
    }
    if (weights.similarity) {
      s += jaccard(seedWords, titleWords(n)) * 0.6;
      if (n.folder === seed.folder) s += 0.1;
    }
    if (weights.keywords && seedWords.size > 0) {
      let hits = 0;
      for (const w of seedWords) {
        if (w.length > 3 && n.text.includes(w)) hits++;
      }
      s += Math.min(hits / seedWords.size * 0.5, 0.5);
    }
    if (s > 0.01) scores.set(n.id, s);
  }
  return scores;
}
function keywordScores(graph, query, weights) {
  const out = /* @__PURE__ */ new Map();
  const terms = query.toLowerCase().split(/\s+/).map((t) => t.replace(/^#/, "").trim()).filter((t) => t.length > 1);
  if (terms.length === 0) return out;
  let max = 0;
  const primary = /* @__PURE__ */ new Map();
  for (const n of graph.nodes) {
    let score = 0;
    const name = n.name.toLowerCase();
    for (const term of terms) {
      if (name.includes(term)) score += 5;
      if (n.tags.some((t) => t.includes(term))) score += 4;
      if (n.headings.some((h) => h.includes(term))) score += 3;
      score += Math.min(countOccurrences(n.text, term), 10);
    }
    if (score > 0) primary.set(n.id, score);
    if (score > max) max = score;
  }
  if (max === 0) return out;
  for (const [id, score] of primary) out.set(id, { score: score / max, kind: "primary" });
  const tagIndex = /* @__PURE__ */ new Map();
  if (weights.tags) {
    for (const id of primary.keys()) {
      const n = graph.byId.get(id);
      if (!n) continue;
      for (const t of n.tags) {
        let list = tagIndex.get(t);
        if (!list) tagIndex.set(t, list = []);
        list.push(id);
      }
    }
  }
  const primaryWords = /* @__PURE__ */ new Map();
  if (weights.similarity) {
    for (const id of primary.keys()) {
      const n = graph.byId.get(id);
      if (n) primaryWords.set(id, titleWords(n));
    }
  }
  for (const n of graph.nodes) {
    if (out.has(n.id)) continue;
    let s = 0;
    if (weights.connections) {
      for (const nb of graph.adjacency.get(n.id) ?? []) {
        const p = out.get(nb);
        if (p && p.kind === "primary") s = Math.max(s, p.score * 0.45);
      }
    }
    if (weights.tags) {
      for (const t of n.tags) {
        for (const id of tagIndex.get(t) ?? []) {
          const p = out.get(id);
          if (p) s = Math.max(s, p.score * 0.3);
        }
      }
    }
    if (weights.similarity) {
      const words = titleWords(n);
      for (const [id, pw] of primaryWords) {
        const sim = jaccard(words, pw);
        if (sim > 0.2) {
          const p = out.get(id);
          if (p) s = Math.max(s, p.score * sim * 0.5);
        }
      }
    }
    if (s > 0.02) out.set(n.id, { score: s, kind: "secondary" });
  }
  return out;
}
function applyHeat(graph, query, weights) {
  for (const n of graph.nodes) {
    n.heat = 0;
    n.heatKind = "none";
  }
  const scores = keywordScores(graph, query, weights);
  for (const [id, { score, kind }] of scores) {
    const n = graph.byId.get(id);
    if (!n) continue;
    n.heat = score;
    n.heatKind = kind;
  }
}
function titleWords(n) {
  return new Set(
    n.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  );
}
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}
function countOccurrences(text, term) {
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(term, idx)) !== -1) {
    count++;
    idx += term.length;
    if (count >= 10) break;
  }
  return count;
}

// src/filter.ts
var OPS = "path|file|tag|line|section|prop";
function tokenize2(query) {
  const tokens = [];
  const bracket = /^\[([^\]]+)\]/;
  const opColon = new RegExp(`^(${OPS}):`, "i");
  const nextMarker = new RegExp(`\\[[^\\]]+\\]|\\b(?:${OPS}):`, "gi");
  let i = 0;
  while (i < query.length) {
    if (/\s/.test(query[i])) {
      i++;
      continue;
    }
    const slice = query.slice(i);
    const bm = slice.match(bracket);
    if (bm) {
      tokens.push({ op: "prop", value: bm[1].toLowerCase() });
      i += bm[0].length;
      continue;
    }
    const om = slice.match(opColon);
    if (om) {
      const vStart = i + om[0].length;
      nextMarker.lastIndex = vStart;
      const next = nextMarker.exec(query);
      const vEnd = next ? next.index : query.length;
      let value = query.slice(vStart, vEnd).trim();
      if (value.startsWith('"') && value.endsWith('"') && value.length >= 2 || value.startsWith("(") && value.endsWith(")")) {
        value = value.slice(1, -1).trim();
      }
      tokens.push({ op: om[1].toLowerCase(), value: value.toLowerCase() });
      i = vEnd;
      continue;
    }
    const wm = slice.match(/^\S+/);
    const word = wm ? wm[0] : slice;
    tokens.push({ op: "word", value: word.toLowerCase() });
    i += word.length;
  }
  return tokens;
}
function matchToken(n, t) {
  switch (t.op) {
    case "path":
      return n.id.toLowerCase().includes(t.value);
    case "file":
      return n.name.toLowerCase().includes(t.value);
    case "tag":
      return n.tags.some((nt) => nt.includes(t.value.replace(/^#/, "")));
    case "line": {
      const words = t.value.split(/\s+/).filter(Boolean);
      if (words.length === 0) return true;
      return n.text.split("\n").some((line) => words.every((w) => line.includes(w)));
    }
    case "section": {
      const words = t.value.split(/\s+/).filter(Boolean);
      if (words.length === 0) return true;
      return n.text.split(/\n#{1,6} /).some((sec) => words.every((w) => sec.includes(w)));
    }
    case "prop": {
      const eq = t.value.indexOf(t.value.includes("=") ? "=" : ":");
      const key = eq > 0 ? t.value.slice(0, eq) : t.value;
      const want = eq > 0 ? t.value.slice(eq + 1) : "";
      const val = n.frontmatter[key];
      if (val === void 0 || val === null) return false;
      if (want === "") return true;
      if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(want));
      return String(val).toLowerCase().includes(want);
    }
    default:
      return n.name.toLowerCase().includes(t.value);
  }
}
function applyFilter(nodes, query) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const tokens = tokenize2(trimmed);
  const result = /* @__PURE__ */ new Set();
  for (const n of nodes) {
    if (tokens.every((t) => matchToken(n, t))) result.add(n.id);
  }
  return result;
}

// src/heat.ts
var STOPS = [
  [0, 32, 160],
  [0, 170, 220],
  [60, 180, 90],
  [240, 220, 60],
  [215, 40, 30]
];
function heatColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  const pos = clamped * (STOPS.length - 1);
  const i = Math.min(Math.floor(pos), STOPS.length - 2);
  const f = pos - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f)
  ];
}
function heatColorCss(t, alpha = 1) {
  const [r, g, b] = heatColor(t);
  return `rgba(${r},${g},${b},${alpha})`;
}

// src/renderer.ts
function nodeRadius(n, settings, now) {
  const base = n.sizeOverride ?? rawRadius(n, settings, now);
  return base * settings.nodeScale;
}
function rawRadius(n, settings, now) {
  switch (settings.sizeMode) {
    case "links":
      return 4 + Math.pow(n.degree, settings.linkExaggeration) * 2.2;
    case "words":
      return 4 + Math.min(Math.sqrt(n.wordCount / 60), 10);
    case "age": {
      const days = Math.max((now - n.mtime) / 864e5, 0);
      return 4 + Math.max(10 - Math.sqrt(days), 0);
    }
    default:
      return 6;
  }
}
function customColorFor(n, settings) {
  for (const c of settings.customColors) {
    const key = c.key.toLowerCase().trim();
    if (!key) continue;
    if (c.kind === "folder" && n.folder.toLowerCase().includes(key)) return c.color;
    if (c.kind === "tag" && n.tags.some((t) => t.includes(key.replace(/^#/, "")))) return c.color;
    if (c.kind === "property") {
      const eq = key.indexOf("=");
      const name = eq > 0 ? key.slice(0, eq) : key;
      const want = eq > 0 ? key.slice(eq + 1) : "";
      const val = n.frontmatter[name];
      if (val !== void 0 && val !== null) {
        if (want === "" || String(val).toLowerCase().includes(want)) return c.color;
      }
    }
  }
  return null;
}
function rampColor(n, now) {
  const days = Math.max((now - n.mtime) / 864e5, 0);
  const t = Math.max(0, Math.min(1, 1 - days / 365));
  const mix = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${mix(208, 8)},${mix(227, 69)},${mix(244, 148)})`;
}
function nodeColor(n, settings) {
  if (n.color) return n.color;
  const custom = customColorFor(n, settings);
  if (custom) return custom;
  if (n.groupColor) return n.groupColor;
  switch (settings.colorMode) {
    case "folder":
      return hashColor(n.folder || "root");
    case "tag":
      return n.tags.length ? hashColor(n.tags[0]) : "#9a9a9a";
    case "property": {
      const v = n.frontmatter[settings.colorProperty];
      return v !== void 0 && v !== null && v !== "" ? hashColor(String(v)) : "#9a9a9a";
    }
    case "cluster":
      return PALETTE[n.cluster % PALETTE.length];
    case "ramp":
      return rampColor(n, Date.now());
  }
}
function isNodeShown(n, settings, state) {
  if (!settings.showOrphans && n.degree === 0) return false;
  if (state.visible && !state.visible.has(n.id)) return false;
  if (state.focusSet && !state.focusSet.has(n.id)) return false;
  return true;
}
function controlPoint(s, t, curvature) {
  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  return { cx: mx - dy * curvature * 0.5, cy: my + dx * curvature * 0.5 };
}
function draw(ctx, width, height, graph, settings, state, opts = {}) {
  const now = Date.now();
  const dpr = opts.dpr ?? 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (opts.background !== null) {
    let fill;
    if (opts.background !== void 0) fill = opts.background;
    else if (settings.backgroundMode === "color") fill = settings.backgroundColor;
    else fill = state.dark ? "#1e1e1e" : "#fafafa";
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
    if (settings.backgroundMode === "texture" && opts.texture) {
      ctx.fillStyle = opts.texture;
      ctx.fillRect(0, 0, width, height);
    }
  }
  ctx.setTransform(state.scale * dpr, 0, 0, state.scale * dpr, state.offsetX * dpr, state.offsetY * dpr);
  const isolateId = state.hoveredId ?? state.lockedId;
  let isolateSet = null;
  if (isolateId) {
    isolateSet = /* @__PURE__ */ new Set([isolateId]);
    for (const nb of graph.adjacency.get(isolateId) ?? []) isolateSet.add(nb);
  }
  const shown = graph.nodes.filter((n) => isNodeShown(n, settings, state));
  const shownIds = new Set(shown.map((n) => n.id));
  const curved = settings.edgeStyle === "curved";
  if (state.densityMode) {
    drawDensity(ctx, width, height, dpr, shown, settings, state, now);
  } else {
    if (state.glowId) {
      const g = graph.byId.get(state.glowId);
      if (g && shownIds.has(g.id)) {
        const r = nodeRadius(g, settings, now);
        const halo = r + 90 / state.scale;
        const grad = ctx.createRadialGradient(g.x, g.y, r * 0.3, g.x, g.y, halo);
        grad.addColorStop(0, "rgba(255,196,150,0.75)");
        grad.addColorStop(0.55, "rgba(255,220,190,0.30)");
        grad.addColorStop(1, "rgba(255,220,190,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(g.x, g.y, halo, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const e of graph.edges) {
      if (!shownIds.has(e.source) || !shownIds.has(e.target)) continue;
      const s = graph.byId.get(e.source);
      const t = graph.byId.get(e.target);
      if (!s || !t) continue;
      const style = settings.edgeStyles[e.kind];
      const color = edgeColor(e, s, t, style.color, settings);
      let alpha = e.kind === "link" ? 0.22 : 0.7;
      if (isolateSet) {
        alpha = isolateSet.has(e.source) && isolateSet.has(e.target) ? Math.min(alpha + 0.25, 1) : 0.03;
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (style.width / state.scale + style.width * 0.4) * settings.lineWidth;
      ctx.setLineDash(DASH_PATTERNS[style.dash]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      if (curved) {
        const { cx, cy } = controlPoint(s, t, settings.curvature);
        ctx.quadraticCurveTo(cx, cy, t.x, t.y);
      } else {
        ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const head = e.kind === "link" && !settings.showLinkArrows ? "none" : style.head;
      if (head !== "none" && alpha > 0.1) {
        drawArrow(ctx, s, t, nodeRadius(t, settings, now), color, curved ? settings.curvature : 0, head);
      }
    }
    ctx.globalAlpha = 1;
    if (state.heatActive) {
      for (const n of shown) {
        if (n.heat <= 0.02) continue;
        const r = nodeRadius(n, settings, now);
        const halo = r + 10 + n.heat * 26;
        const grad = ctx.createRadialGradient(n.x, n.y, r * 0.4, n.x, n.y, halo);
        const alpha = n.heatKind === "primary" ? 0.55 : 0.3;
        grad.addColorStop(0, heatColorCss(n.heat, alpha * n.heat + 0.12));
        grad.addColorStop(1, heatColorCss(n.heat, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, halo, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const n of shown) {
      const r = nodeRadius(n, settings, now);
      let alpha = 1;
      if (isolateSet && !isolateSet.has(n.id)) alpha = 0.08;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = nodeColor(n, settings);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = state.dark ? "rgba(30,30,30,0.85)" : "rgba(250,250,250,0.9)";
      ctx.lineWidth = 1.2 / state.scale;
      ctx.stroke();
      if (n.pinned) {
        ctx.strokeStyle = state.dark ? "#ffffff" : "#333333";
        ctx.lineWidth = 1.4 / state.scale;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 2 / state.scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (n.id === state.connectSourceId) {
        ctx.strokeStyle = "#f39c12";
        ctx.lineWidth = 3 / state.scale;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 4 / state.scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (n.icon) {
        ctx.font = `${Math.max(r * 1.3, 8)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.icon, n.x, n.y + r * 0.08);
      }
    }
    ctx.globalAlpha = 1;
  }
  const fadeAt = opts.export ? 0 : Math.max(opts.labelScaleFloor ?? settings.textFade, 0.01);
  const fade = opts.export ? 1 : Math.min(Math.max((state.scale - fadeAt) / (fadeAt * 0.6 + 0.02), 0), 1);
  if (settings.showLabels && fade > 0.02) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const n of shown) {
      const r = state.densityMode ? 6 : nodeRadius(n, settings, now);
      let alpha = (state.densityMode ? 0.9 : 0.85) * fade;
      if (!state.densityMode && isolateSet && !isolateSet.has(n.id)) alpha = 0.05;
      const size = Math.min(11 + r * 0.4, 20) * settings.textSize;
      ctx.font = `${size}px sans-serif`;
      ctx.globalAlpha = alpha;
      let labelFill;
      if (state.densityMode) labelFill = "#111111";
      else if (settings.labelColor === "light") labelFill = "#e8e8e8";
      else if (settings.labelColor === "dark") labelFill = "#222222";
      else labelFill = state.dark ? "#dddddd" : "#333333";
      ctx.fillStyle = labelFill;
      if (state.densityMode) {
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 3;
        ctx.strokeText(n.name, n.x, n.y + r + 3);
      }
      ctx.fillText(n.name, n.x, n.y + r + 3);
    }
    ctx.globalAlpha = 1;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function edgeColor(e, s, t, fixed, settings) {
  if (settings.edgeColorMode !== "mother") return fixed;
  if (e.bidirectional) return nodeColor(s.degree >= t.degree ? s : t, settings);
  return nodeColor(s, settings);
}
function drawArrow(ctx, s, t, targetRadius, color, curvature, head) {
  if (head === "none") return;
  let ux;
  let uy;
  if (curvature > 0) {
    const { cx, cy } = controlPoint(s, t, curvature);
    const dx = t.x - cx;
    const dy = t.y - cy;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    ux = dx / d;
    uy = dy / d;
  } else {
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    ux = dx / d;
    uy = dy / d;
  }
  const tipX = t.x - ux * (targetRadius + 2);
  const tipY = t.y - uy * (targetRadius + 2);
  const size = 7;
  if (head === "circle") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tipX - ux * size * 0.4, tipY - uy * size * 0.4, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const leftX = tipX - ux * size - uy * size * 0.5;
  const leftY = tipY - uy * size + ux * size * 0.5;
  const rightX = tipX - ux * size + uy * size * 0.5;
  const rightY = tipY - uy * size - ux * size * 0.5;
  if (head === "open") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fill();
}
function drawDensity(ctx, width, height, dpr, shown, settings, state, now) {
  const downscale = 4;
  const w = Math.max(Math.floor(width / downscale), 8);
  const h = Math.max(Math.floor(height / downscale), 8);
  const field = new Float32Array(w * h);
  const sigma = 60 * state.scale / downscale;
  const cutoff = sigma * 3;
  let maxDegree = 1;
  for (const n of shown) maxDegree = Math.max(maxDegree, n.degree);
  for (const n of shown) {
    const weight = state.heatActive ? n.heat : 0.25 + 0.75 * n.degree / maxDegree;
    if (weight <= 0.01) continue;
    const sx = (n.x * state.scale + state.offsetX) / downscale;
    const sy = (n.y * state.scale + state.offsetY) / downscale;
    const x0 = Math.max(Math.floor(sx - cutoff), 0);
    const x1 = Math.min(Math.ceil(sx + cutoff), w - 1);
    const y0 = Math.max(Math.floor(sy - cutoff), 0);
    const y1 = Math.min(Math.ceil(sy + cutoff), h - 1);
    const inv = 1 / (2 * sigma * sigma);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - sx;
        const dy = y - sy;
        field[y * w + x] += weight * Math.exp(-(dx * dx + dy * dy) * inv);
      }
    }
  }
  let max = 0;
  for (let i = 0; i < field.length; i++) if (field[i] > max) max = field[i];
  if (max === 0) return;
  const img = new ImageData(w, h);
  for (let i = 0; i < field.length; i++) {
    const t = field[i] / max;
    const [r, g, b] = heatColor(t);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = Math.min(t * 3, 1) * 235;
  }
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  if (!offCtx) return;
  offCtx.putImageData(img, 0, 0);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, w, h, 0, 0, width, height);
  ctx.restore();
  ctx.setTransform(state.scale * dpr, 0, 0, state.scale * dpr, state.offsetX * dpr, state.offsetY * dpr);
}

// src/connect.ts
var import_obsidian = require("obsidian");
var ConnectModal = class extends import_obsidian.Modal {
  constructor(app, sourcePath, targetPath, heading) {
    super(app);
    this.sourcePath = sourcePath;
    this.targetPath = targetPath;
    this.heading = heading;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Connect notes" });
    contentEl.createEl("p", {
      text: `${basename(this.sourcePath)}  \u2192  ${basename(this.targetPath)}`
    });
    const inReferences = this.sourcePath.startsWith("References/") || this.targetPath.startsWith("References/");
    if (inReferences) {
      contentEl.createEl("p", {
        text: "One of these notes lives in References. Only the compass write mode is allowed there."
      });
    }
    const addButton = (label, cb, disabled = false) => {
      const btn = contentEl.createEl("button", { text: label });
      btn.style.display = "block";
      btn.style.margin = "6px 0";
      btn.style.width = "100%";
      btn.disabled = disabled;
      btn.onclick = () => {
        this.close();
        cb();
      };
    };
    addButton(
      `Mother to child: append link under "${this.heading}" in the source note`,
      () => void writeMotherChild(this.app, this.sourcePath, this.targetPath, this.heading),
      inReferences
    );
    addButton(
      "Reciprocal: bold mention of each note inside the other",
      () => void writeReciprocal(this.app, this.sourcePath, this.targetPath, this.heading),
      inReferences
    );
    contentEl.createEl("p", { text: "Compass: write into the source note's compass block as..." });
    const row = contentEl.createDiv();
    row.style.display = "flex";
    row.style.gap = "6px";
    for (const dir of ["North", "South", "West", "East"]) {
      const btn = row.createEl("button", { text: dir });
      btn.style.flex = "1";
      btn.onclick = () => {
        this.close();
        void writeCompass(this.app, this.sourcePath, this.targetPath, dir);
      };
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
function basename(path) {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.md$/, "");
}
function getFile(app, path) {
  const f = app.vault.getAbstractFileByPath(path);
  return f instanceof import_obsidian.TFile ? f : null;
}
async function appendUnderHeading(app, file, heading, line) {
  await app.vault.process(file, (content) => {
    const idx = content.indexOf(heading);
    if (idx === -1) {
      return content.replace(/\s*$/, "") + `

${heading}
${line}
`;
    }
    const afterHeading = idx + heading.length;
    const nextHeading = content.slice(afterHeading).search(/\n#{1,6} /);
    const insertAt = nextHeading === -1 ? content.length : afterHeading + nextHeading;
    const before = content.slice(0, insertAt).replace(/\s*$/, "");
    return before + `
${line}
` + content.slice(insertAt).replace(/^\n/, "\n");
  });
}
async function writeMotherChild(app, motherPath, childPath, heading) {
  const mother = getFile(app, motherPath);
  if (!mother) return;
  await appendUnderHeading(app, mother, heading, `- [[${basename(childPath)}]]`);
  new import_obsidian.Notice(`Linked [[${basename(childPath)}]] inside ${basename(motherPath)}`);
}
async function writeReciprocal(app, aPath, bPath, heading) {
  const a = getFile(app, aPath);
  const b = getFile(app, bPath);
  if (!a || !b) return;
  await appendUnderHeading(app, a, heading, `- **[[${basename(bPath)}]]**`);
  await appendUnderHeading(app, b, heading, `- **[[${basename(aPath)}]]**`);
  new import_obsidian.Notice(`Cross-linked ${basename(aPath)} and ${basename(bPath)}`);
}
async function writeCompass(app, sourcePath, targetPath, dir) {
  const file = getFile(app, sourcePath);
  if (!file) return;
  const link = `[[${basename(targetPath)}]]`;
  await app.vault.process(file, (content) => {
    const lineRe = new RegExp(`^(${dir}::)(.*)$`, "m");
    const m = content.match(lineRe);
    if (m) {
      if (m[2].includes(link)) return content;
      const existing = m[2].trim();
      const updated = existing.length > 0 ? `${dir}:: ${existing}, ${link}` : `${dir}:: ${link}`;
      return content.replace(lineRe, updated);
    }
    const blockRe = /%%\s*\n((?:(?:North|South|West|East)::[^\n]*\n?)+)\s*%%/;
    const bm = content.match(blockRe);
    if (bm) {
      const inner = bm[1].replace(/\s*$/, "");
      return content.replace(blockRe, `%%
${inner}
${dir}:: ${link}
%%`);
    }
    const lines = ["North::", "South::", "West::", "East::"].map(
      (l) => l.startsWith(dir) ? `${l} ${link}` : l
    );
    return content.replace(/\s*$/, "") + `

%%
${lines.join("\n")}
%%
`;
  });
  new import_obsidian.Notice(`${dir} link set: ${basename(sourcePath)} \u2192 ${basename(targetPath)}`);
}

// src/print.ts
var import_obsidian2 = require("obsidian");

// src/pages.ts
var IN = 25.4;
var PAGE_GROUPS = {
  "ISO A": [
    { name: "A5", wMm: 148, hMm: 210 },
    { name: "A4", wMm: 210, hMm: 297 },
    { name: "A3", wMm: 297, hMm: 420 },
    { name: "A2", wMm: 420, hMm: 594 },
    { name: "A1", wMm: 594, hMm: 841 },
    { name: "A0", wMm: 841, hMm: 1189 }
  ],
  "US / ANSI": [
    { name: "Letter", wMm: 8.5 * IN, hMm: 11 * IN },
    { name: "Legal", wMm: 8.5 * IN, hMm: 14 * IN },
    { name: "Tabloid", wMm: 11 * IN, hMm: 17 * IN },
    { name: "Ledger", wMm: 17 * IN, hMm: 11 * IN },
    { name: "ANSI C", wMm: 17 * IN, hMm: 22 * IN },
    { name: "ANSI D", wMm: 22 * IN, hMm: 34 * IN },
    { name: "ANSI E", wMm: 34 * IN, hMm: 44 * IN }
  ],
  ARCH: [
    { name: "ARCH A", wMm: 9 * IN, hMm: 12 * IN },
    { name: "ARCH B", wMm: 12 * IN, hMm: 18 * IN },
    { name: "ARCH C", wMm: 18 * IN, hMm: 24 * IN },
    { name: "ARCH D", wMm: 24 * IN, hMm: 36 * IN },
    { name: "ARCH E1", wMm: 30 * IN, hMm: 42 * IN },
    { name: "ARCH E", wMm: 36 * IN, hMm: 48 * IN }
  ],
  Custom: [{ name: "Custom", wMm: 210, hMm: 297 }]
};
function findPage(group, name) {
  const list = PAGE_GROUPS[group] ?? PAGE_GROUPS["ISO A"];
  return list.find((p) => p.name === name) ?? list[0];
}
function mmToPx(mm, dpi) {
  return Math.round(mm / IN * dpi);
}
function mmToPt(mm) {
  return mm / IN * 72;
}

// src/pdf.ts
function jpegToPdf(jpeg, imgWpx, imgHpx, pageWpt, pageHpt, marginPt) {
  const availW = pageWpt - marginPt * 2;
  const availH = pageHpt - marginPt * 2;
  const scale = Math.min(availW / imgWpx, availH / imgHpx);
  const drawW = imgWpx * scale;
  const drawH = imgHpx * scale;
  const tx = (pageWpt - drawW) / 2;
  const ty = (pageHpt - drawH) / 2;
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push3 = (data) => {
    const bytes = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObj = (num2) => {
    offsets[num2] = length;
    push3(`${num2} 0 obj
`);
  };
  push3("%PDF-1.4\n%\xB5\xB5\xB5\xB5\n");
  beginObj(1);
  push3("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObj(2);
  push3("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  beginObj(3);
  push3(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pageWpt)} ${fmt(pageHpt)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`
  );
  beginObj(4);
  push3(
    `<< /Type /XObject /Subtype /Image /Width ${imgWpx} /Height ${imgHpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>
stream
`
  );
  push3(jpeg);
  push3("\nendstream\nendobj\n");
  const content = `q
${fmt(drawW)} 0 0 ${fmt(drawH)} ${fmt(tx)} ${fmt(ty)} cm
/Im0 Do
Q
`;
  beginObj(5);
  push3(`<< /Length ${enc.encode(content).length} >>
stream
${content}endstream
endobj
`);
  const xrefStart = length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  push3(xref);
  push3(`trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefStart}
%%EOF
`);
  const out = new Uint8Array(length);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
function fmt(n) {
  return n.toFixed(2).replace(/\.00$/, "");
}

// src/print.ts
var EXPORT_FOLDER = "Better Graph Exports";
var MAX_DIMENSION = 12e3;
var ExportModal = class extends import_obsidian2.Modal {
  constructor(app, graph, settings, state, viewWidth, viewHeight, onSave, texture = null) {
    super(app);
    this.customWmm = 210;
    this.customHmm = 297;
    this.graph = graph;
    this.settings = settings;
    this.state = state;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.onSave = onSave;
    this.texture = texture;
  }
  onOpen() {
    const { contentEl } = this;
    const d = this.settings.exportDefaults;
    contentEl.createEl("h3", { text: "Print / export graph" });
    let sizeSetting;
    let customRow;
    let info;
    new import_obsidian2.Setting(contentEl).setName("Format").addDropdown((dd) => {
      dd.addOption("png", "PNG");
      dd.addOption("jpg", "JPG");
      dd.addOption("pdf", "PDF");
      dd.setValue(d.format);
      dd.onChange((v) => {
        d.format = v;
        update();
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Page convention").addDropdown((dd) => {
      for (const group of Object.keys(PAGE_GROUPS)) dd.addOption(group, group);
      dd.setValue(d.pageGroup);
      dd.onChange((v) => {
        d.pageGroup = v;
        d.pageName = PAGE_GROUPS[v][0].name;
        rebuildSizes();
        update();
      });
    });
    sizeSetting = new import_obsidian2.Setting(contentEl).setName("Page size");
    const rebuildSizes = () => {
      sizeSetting.clear();
      sizeSetting.setName("Page size");
      sizeSetting.addDropdown((dd) => {
        for (const p of PAGE_GROUPS[d.pageGroup]) dd.addOption(p.name, p.name);
        dd.setValue(d.pageName);
        dd.onChange((v) => {
          d.pageName = v;
          update();
        });
      });
      customRow.settingEl.style.display = d.pageGroup === "Custom" ? "" : "none";
    };
    customRow = new import_obsidian2.Setting(contentEl).setName("Custom size (mm)").addText((t) => {
      t.setPlaceholder("width").setValue(String(this.customWmm));
      t.inputEl.style.width = "70px";
      t.onChange((v) => {
        this.customWmm = Number(v) || 210;
        update();
      });
    }).addText((t) => {
      t.setPlaceholder("height").setValue(String(this.customHmm));
      t.inputEl.style.width = "70px";
      t.onChange((v) => {
        this.customHmm = Number(v) || 297;
        update();
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Orientation").addDropdown((dd) => {
      dd.addOption("portrait", "Portrait");
      dd.addOption("landscape", "Landscape");
      dd.setValue(d.orientation);
      dd.onChange((v) => {
        d.orientation = v;
        update();
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Resolution (DPI)").addDropdown((dd) => {
      for (const dpi of [72, 150, 300, 600]) dd.addOption(String(dpi), String(dpi));
      dd.setValue(String(d.dpi));
      dd.onChange((v) => {
        d.dpi = Number(v);
        update();
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Fit").addDropdown((dd) => {
      dd.addOption("graph", "Whole graph");
      dd.addOption("view", "Current viewport");
      dd.setValue(d.fit);
      dd.onChange((v) => {
        d.fit = v;
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Margin (mm)").addText((t) => {
      t.setValue(String(d.marginMm));
      t.inputEl.style.width = "70px";
      t.onChange((v) => {
        d.marginMm = Math.max(Number(v) || 0, 0);
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Transparent background").setDesc("PNG only").addToggle((t) => {
      t.setValue(d.transparent);
      t.onChange((v) => {
        d.transparent = v;
      });
    });
    info = contentEl.createEl("p", { text: "" });
    info.style.color = "var(--text-muted)";
    const update = () => {
      const { wPx, hPx } = this.pixelSize();
      const capped = Math.max(wPx, hPx) > MAX_DIMENSION;
      info.setText(
        `Output: ${wPx} x ${hPx} px` + (capped ? ` (capped to ${MAX_DIMENSION} px on the long side)` : "")
      );
    };
    rebuildSizes();
    update();
    new import_obsidian2.Setting(contentEl).addButton((b) => {
      b.setButtonText("Export").setCta();
      b.onClick(async () => {
        this.close();
        try {
          await this.runExport();
          await this.onSave();
        } catch (err) {
          console.error("Better Graphs export failed", err);
          new import_obsidian2.Notice("Export failed. See the developer console for details.");
        }
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
  pageMm() {
    const d = this.settings.exportDefaults;
    let { wMm, hMm } = d.pageGroup === "Custom" ? { wMm: this.customWmm, hMm: this.customHmm } : findPage(d.pageGroup, d.pageName);
    if (d.orientation === "landscape" && hMm > wMm) [wMm, hMm] = [hMm, wMm];
    if (d.orientation === "portrait" && wMm > hMm) [wMm, hMm] = [hMm, wMm];
    return { wMm, hMm };
  }
  pixelSize() {
    const d = this.settings.exportDefaults;
    const { wMm, hMm } = this.pageMm();
    let wPx = mmToPx(wMm, d.dpi);
    let hPx = mmToPx(hMm, d.dpi);
    const long = Math.max(wPx, hPx);
    if (long > MAX_DIMENSION) {
      const f = MAX_DIMENSION / long;
      wPx = Math.round(wPx * f);
      hPx = Math.round(hPx * f);
    }
    return { wPx, hPx };
  }
  async runExport() {
    const d = this.settings.exportDefaults;
    const { wPx, hPx } = this.pixelSize();
    const { wMm, hMm } = this.pageMm();
    const marginPx = mmToPx(d.marginMm, d.dpi) * (wPx / mmToPx(wMm, d.dpi));
    const canvas = document.createElement("canvas");
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    const exportState = { ...this.state, hoveredId: null, connectSourceId: null };
    if (d.fit === "graph") {
      const shown = this.graph.nodes.filter((n) => isNodeShown(n, this.settings, exportState));
      if (shown.length === 0) throw new Error("nothing to export");
      const now = Date.now();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of shown) {
        const r = nodeRadius(n, this.settings, now) + 30;
        minX = Math.min(minX, n.x - r);
        minY = Math.min(minY, n.y - r);
        maxX = Math.max(maxX, n.x + r);
        maxY = Math.max(maxY, n.y + r);
      }
      const availW = wPx - marginPx * 2;
      const availH = hPx - marginPx * 2;
      const scale = Math.min(availW / (maxX - minX), availH / (maxY - minY));
      exportState.scale = scale;
      exportState.offsetX = marginPx + (availW - (maxX - minX) * scale) / 2 - minX * scale;
      exportState.offsetY = marginPx + (availH - (maxY - minY) * scale) / 2 - minY * scale;
    } else {
      const factor = Math.min((wPx - marginPx * 2) / this.viewWidth, (hPx - marginPx * 2) / this.viewHeight);
      exportState.scale = this.state.scale * factor;
      exportState.offsetX = this.state.offsetX * factor + marginPx;
      exportState.offsetY = this.state.offsetY * factor + marginPx;
    }
    const transparent = d.format === "png" && d.transparent;
    let background;
    if (transparent) {
      background = null;
    } else if (this.settings.backgroundMode === "color") {
      background = this.settings.backgroundColor;
    } else if (this.settings.backgroundMode === "texture") {
      background = "#ffffff";
    } else if (exportState.dark && d.format !== "pdf") {
      background = "#1e1e1e";
    } else {
      background = "#ffffff";
    }
    if (d.format === "pdf") exportState.dark = false;
    draw(ctx, wPx, hPx, this.graph, this.settings, exportState, {
      export: true,
      background,
      texture: transparent ? null : this.texture,
      labelScaleFloor: 0
    });
    const stamp = timestamp();
    if (d.format === "pdf") {
      const jpegBlob = await toBlob(canvas, "image/jpeg", 0.92);
      const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
      const pdf = jpegToPdf(jpeg, wPx, hPx, mmToPt(wMm), mmToPt(hMm), 0);
      await this.saveBinary(`graph-${stamp}.pdf`, pdf.buffer);
    } else {
      const mime = d.format === "png" ? "image/png" : "image/jpeg";
      const blob = await toBlob(canvas, mime, 0.92);
      await this.saveBinary(`graph-${stamp}.${d.format}`, await blob.arrayBuffer());
    }
  }
  async saveBinary(name, data) {
    const folder = (0, import_obsidian2.normalizePath)(EXPORT_FOLDER);
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }
    const path = (0, import_obsidian2.normalizePath)(`${folder}/${name}`);
    await this.app.vault.createBinary(path, data);
    new import_obsidian2.Notice(`Exported to ${path}`);
  }
};
function toBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("canvas export failed")), mime, quality);
  });
}
function timestamp() {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// src/emoji.ts
var import_obsidian3 = require("obsidian");
var EMOJI_CATALOG = [
  // Knowledge and writing
  ["\u{1F4DD}", "memo note writing"],
  ["\u{1F4C4}", "page document"],
  ["\u{1F4C3}", "page curl"],
  ["\u{1F4D1}", "bookmark tabs"],
  ["\u{1F4DA}", "books library"],
  ["\u{1F4D6}", "open book reading"],
  ["\u{1F4D5}", "red book"],
  ["\u{1F4D7}", "green book"],
  ["\u{1F4D8}", "blue book"],
  ["\u{1F4D9}", "orange book"],
  ["\u{1F4D3}", "notebook"],
  ["\u{1F4D4}", "notebook decorative"],
  ["\u{1F4D2}", "ledger"],
  ["\u{1F5D2}\uFE0F", "spiral notepad"],
  ["\u270F\uFE0F", "pencil"],
  ["\u{1F58A}\uFE0F", "pen"],
  ["\u{1F58B}\uFE0F", "fountain pen"],
  ["\u2712\uFE0F", "black nib"],
  ["\u{1F58D}\uFE0F", "crayon"],
  ["\u{1F4CC}", "pushpin pin"],
  ["\u{1F4CD}", "round pushpin location"],
  ["\u{1F4CE}", "paperclip"],
  ["\u{1F516}", "bookmark"],
  ["\u{1F3F7}\uFE0F", "label tag"],
  ["\u{1F5C2}\uFE0F", "card index dividers"],
  ["\u{1F4C1}", "folder"],
  ["\u{1F4C2}", "open folder"],
  ["\u{1F5C3}\uFE0F", "card file box"],
  ["\u{1F5C4}\uFE0F", "file cabinet"],
  // Ideas and thinking
  ["\u{1F4A1}", "idea light bulb"],
  ["\u{1F9E0}", "brain thinking"],
  ["\u{1F4AD}", "thought balloon"],
  ["\u{1F5EF}\uFE0F", "anger bubble"],
  ["\u{1F4AC}", "speech bubble comment"],
  ["\u{1F50D}", "magnifying glass search"],
  ["\u{1F50E}", "search right"],
  ["\u{1F3AF}", "target goal dart"],
  ["\u{1F9E9}", "puzzle piece"],
  ["\u2699\uFE0F", "gear settings"],
  ["\u{1F527}", "wrench tool"],
  ["\u{1F528}", "hammer build"],
  ["\u{1F6E0}\uFE0F", "hammer wrench tools"],
  ["\u26A1", "lightning fast energy"],
  ["\u{1F525}", "fire hot trending"],
  ["\u2728", "sparkles new"],
  ["\u2B50", "star favorite"],
  ["\u{1F31F}", "glowing star"],
  ["\u2753", "question mark"],
  ["\u2757", "exclamation important"],
  ["\u26A0\uFE0F", "warning caution"],
  ["\u2705", "check done complete"],
  ["\u274C", "cross wrong"],
  ["\u{1F6AB}", "prohibited no"],
  // Tech and science
  ["\u{1F4BB}", "laptop computer code"],
  ["\u{1F5A5}\uFE0F", "desktop computer"],
  ["\u2328\uFE0F", "keyboard"],
  ["\u{1F5B1}\uFE0F", "mouse"],
  ["\u{1F4F1}", "phone mobile"],
  ["\u{1F916}", "robot ai bot"],
  ["\u{1F47E}", "alien monster game"],
  ["\u{1F3AE}", "game controller"],
  ["\u{1F579}\uFE0F", "joystick"],
  ["\u{1F4E1}", "satellite antenna signal"],
  ["\u{1F6F0}\uFE0F", "satellite space"],
  ["\u{1F52C}", "microscope science"],
  ["\u{1F52D}", "telescope astronomy"],
  ["\u{1F9EA}", "test tube experiment"],
  ["\u{1F9EC}", "dna genetics"],
  ["\u2697\uFE0F", "alembic chemistry"],
  ["\u{1F9EE}", "abacus calculation"],
  ["\u{1F4BE}", "floppy disk save"],
  ["\u{1F4BF}", "cd disk"],
  ["\u{1F5DC}\uFE0F", "clamp compress"],
  ["\u{1F50B}", "battery power"],
  ["\u{1F50C}", "plug electric"],
  ["\u{1F4CA}", "bar chart analytics data"],
  ["\u{1F4C8}", "chart up growth"],
  ["\u{1F4C9}", "chart down decline"],
  ["\u{1F9ED}", "compass navigation"],
  ["\u{1F5FA}\uFE0F", "map world"],
  ["\u{1F310}", "globe web internet"],
  ["\u{1F30D}", "earth africa europe"],
  ["\u{1F30E}", "earth americas"],
  ["\u{1F30F}", "earth asia"],
  ["\u{1F6DC}", "wifi wireless"],
  ["\u{1F4F6}", "signal bars"],
  // Media and creative
  ["\u{1F3A5}", "movie camera video"],
  ["\u{1F3AC}", "clapper board film"],
  ["\u{1F4F9}", "video camera"],
  ["\u{1F4F7}", "camera photo"],
  ["\u{1F4F8}", "camera flash"],
  ["\u{1F39E}\uFE0F", "film frames"],
  ["\u{1F4FA}", "television"],
  ["\u{1F399}\uFE0F", "studio microphone podcast"],
  ["\u{1F3A4}", "microphone"],
  ["\u{1F3A7}", "headphones audio"],
  ["\u{1F50A}", "speaker loud volume"],
  ["\u{1F3B5}", "musical note"],
  ["\u{1F3B6}", "musical notes"],
  ["\u{1F3A8}", "artist palette design"],
  ["\u{1F58C}\uFE0F", "paintbrush"],
  ["\u{1F5BC}\uFE0F", "framed picture image"],
  ["\u2702\uFE0F", "scissors cut"],
  ["\u{1F4D0}", "triangular ruler"],
  ["\u{1F4CF}", "straight ruler"],
  ["\u{1F587}\uFE0F", "linked paperclips"],
  ["\u{1F3AD}", "performing arts theater"],
  ["\u{1F3AA}", "circus tent"],
  // Nature and landscape
  ["\u{1F331}", "seedling plant sprout"],
  ["\u{1F33F}", "herb leaves"],
  ["\u{1F340}", "four leaf clover"],
  ["\u{1F333}", "deciduous tree"],
  ["\u{1F332}", "evergreen tree"],
  ["\u{1F334}", "palm tree"],
  ["\u{1F335}", "cactus"],
  ["\u{1F33E}", "sheaf of rice grain"],
  ["\u{1F341}", "maple leaf"],
  ["\u{1F342}", "fallen leaves"],
  ["\u{1F338}", "cherry blossom"],
  ["\u{1F33C}", "blossom flower"],
  ["\u{1F33B}", "sunflower"],
  ["\u{1F339}", "rose"],
  ["\u{1FAB4}", "potted plant"],
  ["\u26F0\uFE0F", "mountain"],
  ["\u{1F3D4}\uFE0F", "snow mountain"],
  ["\u{1F30B}", "volcano"],
  ["\u{1F3DE}\uFE0F", "national park landscape"],
  ["\u{1F3DC}\uFE0F", "desert"],
  ["\u{1F3D6}\uFE0F", "beach"],
  ["\u{1F3DD}\uFE0F", "island"],
  ["\u{1F30A}", "wave water ocean"],
  ["\u{1F4A7}", "droplet water"],
  ["\u{1F327}\uFE0F", "rain cloud"],
  ["\u26C5", "sun behind cloud"],
  ["\u2600\uFE0F", "sun sunny"],
  ["\u{1F324}\uFE0F", "sun small cloud"],
  ["\u{1F319}", "crescent moon night"],
  ["\u{1F308}", "rainbow"],
  ["\u2744\uFE0F", "snowflake"],
  ["\u{1F32A}\uFE0F", "tornado"],
  ["\u{1F321}\uFE0F", "thermometer temperature"],
  // Buildings and places
  ["\u{1F3E0}", "house home"],
  ["\u{1F3E1}", "house garden"],
  ["\u{1F3E2}", "office building"],
  ["\u{1F3DB}\uFE0F", "classical building museum"],
  ["\u{1F3D7}\uFE0F", "building construction crane"],
  ["\u{1F3F0}", "castle"],
  ["\u{1F5FC}", "tower"],
  ["\u{1F306}", "cityscape dusk"],
  ["\u{1F307}", "sunset city"],
  ["\u{1F3D9}\uFE0F", "cityscape skyline"],
  ["\u{1F6D6}", "hut"],
  ["\u26FA", "tent camping"],
  ["\u{1F3DF}\uFE0F", "stadium"],
  ["\u{1F54C}", "mosque"],
  ["\u26EA", "church"],
  ["\u{1F3EB}", "school"],
  ["\u{1F3E5}", "hospital"],
  ["\u{1F3ED}", "factory industry"],
  ["\u{1F68F}", "bus stop"],
  ["\u{1F6E3}\uFE0F", "motorway road"],
  ["\u{1F309}", "bridge night"],
  // Transport
  ["\u{1F697}", "car automobile"],
  ["\u{1F68C}", "bus"],
  ["\u{1F6B2}", "bicycle bike"],
  ["\u{1F6F4}", "kick scooter"],
  ["\u{1F682}", "locomotive train"],
  ["\u{1F687}", "metro subway"],
  ["\u2708\uFE0F", "airplane flight"],
  ["\u{1F680}", "rocket launch"],
  ["\u{1F6F8}", "flying saucer ufo"],
  ["\u{1F681}", "helicopter"],
  ["\u26F5", "sailboat"],
  ["\u{1F6A2}", "ship"],
  ["\u{1F6F6}", "canoe"],
  ["\u{1F6A7}", "construction barrier"],
  // People and activity
  ["\u{1F464}", "person silhouette"],
  ["\u{1F465}", "people silhouettes"],
  ["\u{1F9D1}\u200D\u{1F3EB}", "teacher instructor"],
  ["\u{1F9D1}\u200D\u{1F4BB}", "technologist developer"],
  ["\u{1F9D1}\u200D\u{1F393}", "student graduate"],
  ["\u{1F9D1}\u200D\u{1F52C}", "scientist"],
  ["\u{1F9D1}\u200D\u{1F3A8}", "artist"],
  ["\u{1F477}", "construction worker"],
  ["\u{1F575}\uFE0F", "detective sleuth"],
  ["\u{1F4AA}", "flexed biceps strength"],
  ["\u{1F44D}", "thumbs up like"],
  ["\u{1F44E}", "thumbs down"],
  ["\u{1F44F}", "clapping hands applause"],
  ["\u{1F64C}", "raising hands celebration"],
  ["\u{1F91D}", "handshake deal"],
  ["\u{1F44B}", "waving hand hello"],
  ["\u270D\uFE0F", "writing hand"],
  ["\u{1FAF5}", "pointing at viewer"],
  ["\u{1F3C3}", "runner running"],
  ["\u{1F6B6}", "walking"],
  ["\u{1F9D8}", "lotus meditation"],
  ["\u{1F3CB}\uFE0F", "weight lifting"],
  // Time and planning
  ["\u{1F4C5}", "calendar date"],
  ["\u{1F4C6}", "tear off calendar"],
  ["\u{1F5D3}\uFE0F", "spiral calendar"],
  ["\u23F0", "alarm clock"],
  ["\u23F1\uFE0F", "stopwatch"],
  ["\u23F3", "hourglass time"],
  ["\u{1F550}", "clock one"],
  ["\u{1F4CB}", "clipboard checklist"],
  ["\u{1F5F3}\uFE0F", "ballot box"],
  ["\u{1F4E4}", "outbox sent"],
  ["\u{1F4E5}", "inbox received"],
  ["\u{1F4E6}", "package box"],
  ["\u{1F4EC}", "mailbox mail"],
  ["\u2709\uFE0F", "envelope email"],
  ["\u{1F4EE}", "postbox"],
  // Symbols and shapes
  ["\u2764\uFE0F", "red heart love"],
  ["\u{1F9E1}", "orange heart"],
  ["\u{1F49B}", "yellow heart"],
  ["\u{1F49A}", "green heart"],
  ["\u{1F499}", "blue heart"],
  ["\u{1F49C}", "purple heart"],
  ["\u{1F5A4}", "black heart"],
  ["\u{1F90D}", "white heart"],
  ["\u{1F534}", "red circle"],
  ["\u{1F7E0}", "orange circle"],
  ["\u{1F7E1}", "yellow circle"],
  ["\u{1F7E2}", "green circle"],
  ["\u{1F535}", "blue circle"],
  ["\u{1F7E3}", "purple circle"],
  ["\u26AB", "black circle"],
  ["\u26AA", "white circle"],
  ["\u{1F7E5}", "red square"],
  ["\u{1F7E7}", "orange square"],
  ["\u{1F7E8}", "yellow square"],
  ["\u{1F7E9}", "green square"],
  ["\u{1F7E6}", "blue square"],
  ["\u{1F7EA}", "purple square"],
  ["\u2B1B", "black square"],
  ["\u2B1C", "white square"],
  ["\u{1F53A}", "red triangle up"],
  ["\u{1F53B}", "red triangle down"],
  ["\u{1F536}", "orange diamond"],
  ["\u{1F537}", "blue diamond"],
  ["\u{1F4A0}", "diamond with dot"],
  ["\u{1F517}", "link chain"],
  ["\u267E\uFE0F", "infinity"],
  ["\u2795", "plus add"],
  ["\u2796", "minus subtract"],
  ["\u2733\uFE0F", "eight spoked asterisk"],
  ["\u{1F531}", "trident"],
  ["\u269C\uFE0F", "fleur de lis"],
  ["\u{1F530}", "beginner shield"],
  // Awards and value
  ["\u{1F3C6}", "trophy winner"],
  ["\u{1F947}", "gold medal first"],
  ["\u{1F948}", "silver medal second"],
  ["\u{1F949}", "bronze medal third"],
  ["\u{1F396}\uFE0F", "military medal"],
  ["\u{1F48E}", "gem diamond"],
  ["\u{1F4B0}", "money bag"],
  ["\u{1F4B5}", "dollar bill"],
  ["\u{1FA99}", "coin"],
  ["\u{1F381}", "gift present"],
  ["\u{1F389}", "party popper celebration"],
  ["\u{1F38A}", "confetti ball"],
  ["\u{1F388}", "balloon"],
  // Animals
  ["\u{1F41D}", "bee"],
  ["\u{1F98B}", "butterfly"],
  ["\u{1F41B}", "bug caterpillar"],
  ["\u{1F41C}", "ant"],
  ["\u{1F577}\uFE0F", "spider"],
  ["\u{1F422}", "turtle"],
  ["\u{1F40D}", "snake"],
  ["\u{1F98E}", "lizard"],
  ["\u{1F438}", "frog"],
  ["\u{1F426}", "bird"],
  ["\u{1F985}", "eagle"],
  ["\u{1F989}", "owl wisdom"],
  ["\u{1F427}", "penguin"],
  ["\u{1F43A}", "wolf"],
  ["\u{1F98A}", "fox"],
  ["\u{1F431}", "cat"],
  ["\u{1F436}", "dog"],
  ["\u{1F42D}", "mouse animal"],
  ["\u{1F439}", "hamster"],
  ["\u{1F430}", "rabbit"],
  ["\u{1F43B}", "bear"],
  ["\u{1F43C}", "panda"],
  ["\u{1F428}", "koala"],
  ["\u{1F981}", "lion"],
  ["\u{1F42F}", "tiger"],
  ["\u{1F418}", "elephant"],
  ["\u{1F992}", "giraffe"],
  ["\u{1F40B}", "whale"],
  ["\u{1F42C}", "dolphin"],
  ["\u{1F419}", "octopus"],
  ["\u{1F988}", "shark"],
  ["\u{1F41F}", "fish"],
  ["\u{1F980}", "crab"],
  ["\u{1F434}", "horse"],
  ["\u{1F984}", "unicorn"],
  // Food
  ["\u2615", "coffee hot beverage"],
  ["\u{1F375}", "tea"],
  ["\u{1F964}", "cup straw"],
  ["\u{1F34E}", "apple red"],
  ["\u{1F34A}", "orange tangerine"],
  ["\u{1F34B}", "lemon"],
  ["\u{1F347}", "grapes"],
  ["\u{1F353}", "strawberry"],
  ["\u{1F951}", "avocado"],
  ["\u{1F955}", "carrot"],
  ["\u{1F33D}", "corn"],
  ["\u{1F35E}", "bread"],
  ["\u{1F9C0}", "cheese"],
  ["\u{1F355}", "pizza"],
  ["\u{1F354}", "hamburger"],
  ["\u{1F32E}", "taco"],
  ["\u{1F35C}", "noodles ramen"],
  ["\u{1F370}", "cake dessert"],
  ["\u{1F36A}", "cookie"],
  ["\u{1F36B}", "chocolate"]
];
var EmojiPickerModal = class extends import_obsidian3.Modal {
  constructor(app, nodeName, onPick) {
    super(app);
    this.applyToConnected = false;
    this.nodeName = nodeName;
    this.onPick = onPick;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: `Icon for ${this.nodeName}` });
    const scopeRow = contentEl.createDiv();
    scopeRow.style.display = "flex";
    scopeRow.style.gap = "8px";
    scopeRow.style.alignItems = "center";
    scopeRow.style.margin = "4px 0 8px";
    const scope = scopeRow.createEl("input", { type: "checkbox" });
    scope.id = "bg-emoji-scope";
    const scopeLabel = scopeRow.createEl("label", { text: "Also apply to directly connected notes" });
    scopeLabel.htmlFor = scope.id;
    scope.onchange = () => {
      this.applyToConnected = scope.checked;
    };
    const search = contentEl.createEl("input", { type: "text" });
    search.placeholder = "Search emojis, or paste any emoji and press Enter";
    search.style.width = "100%";
    search.style.marginBottom = "8px";
    const grid = contentEl.createDiv();
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(10, 1fr)";
    grid.style.gap = "2px";
    grid.style.maxHeight = "320px";
    grid.style.overflowY = "auto";
    const render = (filter) => {
      grid.empty();
      const f = filter.toLowerCase().trim();
      for (const [emoji, name] of EMOJI_CATALOG) {
        if (f && !name.includes(f) && !emoji.includes(f)) continue;
        const b = grid.createEl("button", { text: emoji });
        b.title = name;
        b.style.fontSize = "18px";
        b.style.padding = "4px 2px";
        b.style.background = "transparent";
        b.style.border = "none";
        b.style.cursor = "pointer";
        b.onclick = () => {
          this.close();
          this.onPick({ emoji, applyToConnected: this.applyToConnected });
        };
      }
    };
    render("");
    search.oninput = () => render(search.value);
    search.onkeydown = (ev) => {
      if (ev.key === "Enter" && search.value.trim() && !/[a-z0-9]/i.test(search.value.trim())) {
        this.close();
        this.onPick({ emoji: search.value.trim(), applyToConnected: this.applyToConnected });
      }
    };
    const clearBtn = contentEl.createEl("button", { text: "Clear icon" });
    clearBtn.style.marginTop = "8px";
    clearBtn.onclick = () => {
      this.close();
      this.onPick({ emoji: null, applyToConnected: this.applyToConnected });
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/metrics.ts
var import_obsidian4 = require("obsidian");
var SNAPSHOT_SCHEMA = "better-graphs-snapshot/1";
var SNAP_W = 2e3;
var SNAP_H = 1400;
function round1(n) {
  return Math.round(n * 10) / 10;
}
function computeMetrics(graph, settings) {
  const nodes = graph.nodes;
  const nodeCount = nodes.length;
  const edgeCount = graph.edges.length;
  let linkEdgeCount = 0;
  for (const e of graph.edges) if (e.kind === "link") linkEdgeCount++;
  const compassEdgeCount = edgeCount - linkEdgeCount;
  let crossTopic = 0;
  let crossFolder = 0;
  for (const e of graph.edges) {
    const a = graph.byId.get(e.source);
    const b = graph.byId.get(e.target);
    if (!a || !b) continue;
    if (a.cluster !== b.cluster) crossTopic++;
    if (a.folder !== b.folder) crossFolder++;
  }
  const clusters = /* @__PURE__ */ new Set();
  let orphanCount = 0;
  let islandCount = 0;
  let north = 0;
  let south = 0;
  let west = 0;
  let east = 0;
  let anyField = 0;
  let allFields = 0;
  let filledFields = 0;
  let degSum = 0;
  let degMax = 0;
  for (const n of nodes) {
    if (n.degree > 0) clusters.add(n.cluster);
    if (n.degree === 0) orphanCount++;
    if (!n.compass.north) islandCount++;
    if (n.compass.north) north++;
    if (n.compass.south) south++;
    if (n.compass.west) west++;
    if (n.compass.east) east++;
    const filled = (n.compass.north ? 1 : 0) + (n.compass.south ? 1 : 0) + (n.compass.west ? 1 : 0) + (n.compass.east ? 1 : 0);
    filledFields += filled;
    if (filled > 0) anyField++;
    if (filled === 4) allFields++;
    degSum += n.degree;
    if (n.degree > degMax) degMax = n.degree;
  }
  const revisitData = settings.revisits ?? {};
  let totalOpens = 0;
  let uniqueOpened = 0;
  for (const path of Object.keys(revisitData)) {
    if (!graph.byId.has(path)) continue;
    const count = revisitData[path] ?? 0;
    if (count > 0) {
      totalOpens += count;
      uniqueOpened++;
    }
  }
  return {
    schema: SNAPSHOT_SCHEMA,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    participantId: settings.participantId ?? "",
    vaultName: "",
    // filled in by exportSnapshot, which has the App handle
    nodeCount,
    edgeCount,
    linkEdgeCount,
    compassEdgeCount,
    clusterCount: clusters.size,
    crossTopicLinkCount: crossTopic,
    crossTopicLinkPct: edgeCount > 0 ? round1(crossTopic / edgeCount * 100) : 0,
    crossFolderLinkCount: crossFolder,
    crossFolderLinkPct: edgeCount > 0 ? round1(crossFolder / edgeCount * 100) : 0,
    orphanCount,
    islandCount,
    compass: {
      notesWithNorth: north,
      notesWithSouth: south,
      notesWithWest: west,
      notesWithEast: east,
      notesWithAnyField: anyField,
      notesWithAllFields: allFields,
      fieldCompletenessPct: nodeCount > 0 ? round1(filledFields / (nodeCount * 4) * 100) : 0
    },
    meanDegree: nodeCount > 0 ? round1(degSum / nodeCount) : 0,
    maxDegree: degMax,
    revisits: {
      tracked: settings.trackRevisits,
      totalOpens,
      uniqueNotesOpened: uniqueOpened,
      meanOpensPerOpenedNote: uniqueOpened > 0 ? round1(totalOpens / uniqueOpened) : 0
    }
  };
}
function fitState(graph, settings, width, height) {
  const state = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    hoveredId: null,
    lockedId: null,
    focusSet: null,
    visible: null,
    densityMode: false,
    heatActive: false,
    connectSourceId: null,
    glowId: null,
    dark: false
  };
  const shown = graph.nodes.filter((n) => isNodeShown(n, settings, state));
  if (shown.length === 0) return state;
  const now = Date.now();
  const margin = 60;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of shown) {
    const r = nodeRadius(n, settings, now) + 24;
    minX = Math.min(minX, n.x - r);
    minY = Math.min(minY, n.y - r);
    maxX = Math.max(maxX, n.x + r);
    maxY = Math.max(maxY, n.y + r);
  }
  const availW = width - margin * 2;
  const availH = height - margin * 2;
  const scale = Math.min(availW / Math.max(maxX - minX, 1), availH / Math.max(maxY - minY, 1), 3);
  state.scale = scale;
  state.offsetX = margin + (availW - (maxX - minX) * scale) / 2 - minX * scale;
  state.offsetY = margin + (availH - (maxY - minY) * scale) / 2 - minY * scale;
  return state;
}
async function renderSnapshotPng(graph, settings, texture) {
  const canvas = document.createElement("canvas");
  canvas.width = SNAP_W;
  canvas.height = SNAP_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  const state = fitState(graph, settings, SNAP_W, SNAP_H);
  const background = settings.backgroundMode === "color" ? settings.backgroundColor : "#ffffff";
  draw(ctx, SNAP_W, SNAP_H, graph, settings, state, {
    export: true,
    background,
    texture: settings.backgroundMode === "texture" ? texture : null,
    labelScaleFloor: 0
  });
  const blob = await toBlob2(canvas, "image/png", 0.95);
  return blob.arrayBuffer();
}
function toBlob2(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("canvas export failed")), mime, quality);
  });
}
function csvColumns(m) {
  return [
    ["generatedAt", m.generatedAt],
    ["participantId", m.participantId],
    ["vaultName", m.vaultName],
    ["nodeCount", m.nodeCount],
    ["edgeCount", m.edgeCount],
    ["linkEdges", m.linkEdgeCount],
    ["compassEdges", m.compassEdgeCount],
    ["clusterCount", m.clusterCount],
    ["crossTopicLinks", m.crossTopicLinkCount],
    ["crossTopicPct", m.crossTopicLinkPct],
    ["crossFolderLinks", m.crossFolderLinkCount],
    ["crossFolderPct", m.crossFolderLinkPct],
    ["orphans", m.orphanCount],
    ["islandsNoNorth", m.islandCount],
    ["notesWithNorth", m.compass.notesWithNorth],
    ["notesWithSouth", m.compass.notesWithSouth],
    ["notesWithWest", m.compass.notesWithWest],
    ["notesWithEast", m.compass.notesWithEast],
    ["compassFieldPct", m.compass.fieldCompletenessPct],
    ["meanDegree", m.meanDegree],
    ["maxDegree", m.maxDegree],
    ["totalRevisits", m.revisits.totalOpens],
    ["uniqueNotesOpened", m.revisits.uniqueNotesOpened]
  ];
}
function csvEscape(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
async function ensureFolder(app, path) {
  const parts = (0, import_obsidian4.normalizePath)(path).split("/");
  let cur = "";
  for (const part of parts) {
    if (!part) continue;
    cur = cur ? `${cur}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(cur)) {
      try {
        await app.vault.createFolder(cur);
      } catch {
      }
    }
  }
}
async function appendCsvRow(app, path, metrics) {
  const cols = csvColumns(metrics);
  const row = cols.map((c) => csvEscape(c[1])).join(",");
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian4.TFile) {
    const prev = await app.vault.read(existing);
    const sep = prev.length === 0 || prev.endsWith("\n") ? "" : "\n";
    await app.vault.modify(existing, prev + sep + row + "\n");
  } else {
    const header = cols.map((c) => csvEscape(c[0])).join(",");
    await app.vault.create(path, header + "\n" + row + "\n");
  }
}
function fileStamp() {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(
    d.getMinutes()
  )}${p(d.getSeconds())}`;
}
async function exportSnapshot(app, settings, graph, texture) {
  const metrics = computeMetrics(graph, settings);
  metrics.vaultName = app.vault.getName();
  const folder = (0, import_obsidian4.normalizePath)(settings.snapshotFolder || "Better Graph Snapshots");
  await ensureFolder(app, folder);
  const stamp = fileStamp();
  const base = `graph-snapshot-${stamp}`;
  const jsonPath = (0, import_obsidian4.normalizePath)(`${folder}/${base}.json`);
  const pngPath = (0, import_obsidian4.normalizePath)(`${folder}/${base}.png`);
  const csvPath = (0, import_obsidian4.normalizePath)(`${folder}/snapshots-log.csv`);
  const png = await renderSnapshotPng(graph, settings, texture);
  await app.vault.createBinary(pngPath, png);
  await app.vault.create(jsonPath, JSON.stringify(metrics, null, 2));
  await appendCsvRow(app, csvPath, metrics);
  return { metrics, jsonPath, pngPath, csvPath };
}

// src/timeline.ts
var import_obsidian5 = require("obsidian");
var TimelineModal = class extends import_obsidian5.Modal {
  constructor(app, settings) {
    super(app);
    this.entries = [];
    this.token = 0;
    this.settings = settings;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Snapshot timeline" });
    this.entries = this.collect();
    if (this.entries.length === 0) {
      const p = contentEl.createEl("p", {
        text: 'No snapshots yet. Open the Better Graph view and click Snapshot, or run "Export graph snapshot and metrics" from the command palette. Then reopen this timeline.'
      });
      p.style.color = "var(--text-muted)";
      return;
    }
    const stage = contentEl.createDiv();
    stage.style.textAlign = "center";
    this.imgEl = stage.createEl("img");
    this.imgEl.style.maxWidth = "100%";
    this.imgEl.style.maxHeight = "56vh";
    this.imgEl.style.border = "1px solid var(--background-modifier-border)";
    this.imgEl.style.borderRadius = "6px";
    this.imgEl.style.background = "#ffffff";
    this.captionEl = contentEl.createEl("div");
    this.captionEl.style.textAlign = "center";
    this.captionEl.style.fontWeight = "600";
    this.captionEl.style.margin = "8px 0 2px";
    this.metricsEl = contentEl.createEl("div");
    this.metricsEl.style.textAlign = "center";
    this.metricsEl.style.color = "var(--text-muted)";
    this.metricsEl.style.fontSize = "12px";
    this.metricsEl.style.minHeight = "18px";
    const controls = contentEl.createDiv();
    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "8px";
    controls.style.marginTop = "10px";
    const prev = controls.createEl("button", { text: "<" });
    prev.title = "Previous snapshot";
    this.slider = controls.createEl("input", { type: "range" });
    this.slider.min = "0";
    this.slider.max = String(this.entries.length - 1);
    this.slider.step = "1";
    this.slider.value = String(this.entries.length - 1);
    this.slider.style.flex = "1";
    const next = controls.createEl("button", { text: ">" });
    next.title = "Next snapshot";
    const present = controls.createEl("button", { text: "Present" });
    present.title = "Jump to the newest snapshot";
    present.classList.add("mod-cta");
    const clamp = (v) => Math.max(0, Math.min(this.entries.length - 1, v));
    const go = (v) => {
      const i = clamp(v);
      this.slider.value = String(i);
      void this.show(i);
    };
    this.slider.oninput = () => void this.show(Number(this.slider.value));
    prev.onclick = () => go(Number(this.slider.value) - 1);
    next.onclick = () => go(Number(this.slider.value) + 1);
    present.onclick = () => go(this.entries.length - 1);
    void this.show(this.entries.length - 1);
  }
  onClose() {
    this.contentEl.empty();
  }
  collect() {
    const folder = (0, import_obsidian5.normalizePath)(this.settings.snapshotFolder || "Better Graph Snapshots");
    const prefix = `${folder}/graph-snapshot-`;
    const byStamp = /* @__PURE__ */ new Map();
    for (const f of this.app.vault.getFiles()) {
      if (!f.path.startsWith(prefix)) continue;
      const m = f.basename.match(/graph-snapshot-(\d{8}-\d{6})/);
      if (!m) continue;
      const stamp = m[1];
      let e = byStamp.get(stamp);
      if (!e) byStamp.set(stamp, e = { stamp, label: pretty(stamp), png: null, json: null });
      if (f.extension.toLowerCase() === "png") e.png = f;
      if (f.extension.toLowerCase() === "json") e.json = f;
    }
    return Array.from(byStamp.values()).sort((a, b) => a.stamp.localeCompare(b.stamp));
  }
  async show(index) {
    const entry = this.entries[index];
    if (!entry) return;
    const mine = ++this.token;
    const which = index + 1;
    this.captionEl.setText(`${entry.label}   (${which} of ${entry ? this.entries.length : 0})`);
    if (entry.png) {
      this.imgEl.src = this.app.vault.getResourcePath(entry.png);
      this.imgEl.style.display = "";
    } else {
      this.imgEl.removeAttribute("src");
      this.imgEl.style.display = "none";
    }
    this.metricsEl.setText("");
    if (!entry.json) return;
    try {
      const raw = await this.app.vault.read(entry.json);
      if (mine !== this.token) return;
      const m = JSON.parse(raw);
      const compass = m.compass ?? {};
      const parts = [
        `${num(m.nodeCount)} notes`,
        `${num(m.edgeCount)} links`,
        `${num(m.crossTopicLinkCount)} cross-topic`,
        `compass ${num(compass.fieldCompletenessPct)}%`,
        `${num(m.orphanCount)} orphans`
      ];
      this.metricsEl.setText(parts.join("  ,  "));
    } catch {
      this.metricsEl.setText("(could not read this snapshot's metrics)");
    }
  }
};
function num(v) {
  return typeof v === "number" ? String(v) : "0";
}
function pretty(stamp) {
  const m = stamp.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!m) return stamp;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
}

// src/view.ts
var VIEW_TYPE_BETTER_GRAPH = "better-graphs-view";
var EDGE_KINDS = [
  ["link", "Plain link"],
  ["north", "North"],
  ["south", "South"],
  ["west", "West"],
  ["east", "East"]
];
var BetterGraphView = class extends import_obsidian6.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.graph = { nodes: [], edges: [], byId: /* @__PURE__ */ new Map(), adjacency: /* @__PURE__ */ new Map() };
    this.sim = new ForceSim();
    this.state = {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      hoveredId: null,
      lockedId: null,
      focusSet: null,
      visible: null,
      densityMode: false,
      heatActive: false,
      connectSourceId: null,
      glowId: null,
      dark: document.body.classList.contains("theme-dark")
    };
    this.rafId = 0;
    this.draggingNode = null;
    this.panning = false;
    this.lastMouse = { x: 0, y: 0 };
    this.moved = false;
    this.connectMode = false;
    this.saveTimer = null;
    this.settleFit = false;
    this.relevanceListEl = null;
    this.texturePattern = null;
    this.litmapsActive = false;
    this.colorModeSelect = null;
    this.clusterTimer = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_BETTER_GRAPH;
  }
  getDisplayText() {
    return "Better Graph";
  }
  getIcon() {
    return "better-graphs-fork-alert";
  }
  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.padding = "0";
    this.buildToolbar(container);
    const wrap = container.createDiv();
    wrap.style.flex = "1";
    wrap.style.position = "relative";
    wrap.style.overflow = "hidden";
    this.canvas = wrap.createEl("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.inset = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    this.ctx = ctx;
    this.buildControls(wrap);
    this.bindEvents();
    this.loadTexture();
    await this.reload();
    this.loop();
    this.plugin.usage.log("graph_open");
  }
  async onClose() {
    cancelAnimationFrame(this.rafId);
  }
  // Snapshot the current graph (with its live layout and pins) plus metrics.
  // Called by the toolbar button and by the plugin command when a view is open.
  async exportSnapshot() {
    try {
      const res = await exportSnapshot(this.app, this.plugin.settings, this.graph, this.texturePattern);
      this.plugin.usage.log("snapshot_export", { nodes: res.metrics.nodeCount });
      new import_obsidian6.Notice(`Snapshot saved to ${res.jsonPath}`);
    } catch (err) {
      console.error("Better Graphs snapshot failed", err);
      new import_obsidian6.Notice("Snapshot failed. See the developer console for details.");
    }
  }
  async reload() {
    this.graph = await buildGraph(this.app, this.plugin.settings);
    assignClusters(this.graph, this.plugin.settings);
    this.refreshGroups();
    this.sim.setForces(this.plugin.settings.forces);
    this.sim.setData(this.graph.nodes, this.graph.edges);
    this.sim.warmup(280);
    this.centerGraph();
    this.settleFit = true;
  }
  // Rebuild the graph from the vault but keep every node where it is. Used after
  // drawing a connection: the new edge appears, nothing else moves.
  async softReload() {
    const prev = new Map(
      this.graph.nodes.map((n) => [n.id, { x: n.x, y: n.y, pinned: n.pinned }])
    );
    this.graph = await buildGraph(this.app, this.plugin.settings);
    for (const n of this.graph.nodes) {
      const p = prev.get(n.id);
      if (p) {
        n.x = p.x;
        n.y = p.y;
        n.vx = 0;
        n.vy = 0;
        n.pinned = p.pinned;
      }
    }
    assignClusters(this.graph, this.plugin.settings);
    this.refreshGroups();
    this.sim.setData(this.graph.nodes, this.graph.edges);
    this.sim.alpha = 0;
  }
  // Regroup only. Recomputes clusters and colors the graph by cluster so the
  // effect is visible at once (cluster colors are hidden under other color
  // modes). Leaves the layout in place. `announce` shows a summary notice.
  recluster(announce = true) {
    const count = assignClusters(this.graph, this.plugin.settings);
    this.refreshGroups();
    if (this.plugin.settings.colorMode !== "cluster") {
      this.plugin.settings.colorMode = "cluster";
      if (this.colorModeSelect) this.colorModeSelect.value = "cluster";
    }
    void this.plugin.saveSettings();
    this.plugin.usage.log("recluster");
    if (announce) {
      const mode = this.plugin.settings.clusterMode;
      new import_obsidian6.Notice(`Reclustered by ${mode}: ${count} group${count === 1 ? "" : "s"}. Coloring by cluster.`);
    }
  }
  scheduleRecluster() {
    if (this.clusterTimer !== null) window.clearTimeout(this.clusterTimer);
    this.clusterTimer = window.setTimeout(() => this.recluster(false), 300);
  }
  refreshGroups() {
    for (const n of this.graph.nodes) n.groupColor = void 0;
    for (const g of this.plugin.settings.groups) {
      if (!g.query.trim()) continue;
      const match = applyFilter(this.graph.nodes, g.query);
      if (!match) continue;
      for (const n of this.graph.nodes) {
        if (n.groupColor === void 0 && match.has(n.id)) n.groupColor = g.color;
      }
    }
  }
  loadTexture() {
    this.texturePattern = null;
    const path = this.plugin.settings.texturePath;
    if (!path) return;
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof import_obsidian6.TFile)) return;
    const img = new Image();
    img.onload = () => {
      this.texturePattern = this.ctx.createPattern(img, "repeat");
    };
    img.src = this.app.vault.getResourcePath(f);
  }
  // ---------- Litmaps-style views ----------
  // Relevance rings: seed in the middle, everything else on concentric
  // rings sorted by relevance. Invoked from a node's right click menu.
  litmapsRings(seedId) {
    const seed = this.graph.byId.get(seedId);
    if (!seed) return;
    const scores = relevanceScores(this.graph, seedId, this.plugin.settings.relevanceWeights);
    const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 60);
    if (ranked.length === 0) {
      new import_obsidian6.Notice("No related notes found for this seed.");
      return;
    }
    const included = /* @__PURE__ */ new Set([seedId]);
    const ringRadius = [170, 300, 430];
    const perRing = Math.ceil(ranked.length / 3);
    ranked.forEach(([id], i) => {
      const node = this.graph.byId.get(id);
      if (!node) return;
      included.add(id);
      const ring = Math.min(Math.floor(i / perRing), 2);
      const idxInRing = i - ring * perRing;
      const count = Math.min(perRing, ranked.length - ring * perRing);
      const angle = idxInRing / Math.max(count, 1) * Math.PI * 2 + ring * 0.35;
      node.x = seed.x + Math.cos(angle) * ringRadius[ring];
      node.y = seed.y + Math.sin(angle) * ringRadius[ring];
      node.vx = 0;
      node.vy = 0;
    });
    this.plugin.usage.log("relevance_rings", { related: ranked.length });
    this.enterLitmaps(seedId, included);
  }
  // Focal burst: direct and second-hop neighbors radiate out from the
  // focal note with a glow, like the Litmaps promotional diagram.
  litmapsBurst(seedId) {
    const seed = this.graph.byId.get(seedId);
    if (!seed) return;
    const hop1 = Array.from(this.graph.adjacency.get(seedId) ?? []);
    const hop2 = [];
    const seen = /* @__PURE__ */ new Set([seedId, ...hop1]);
    for (const h of hop1) {
      for (const nb of this.graph.adjacency.get(h) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          hop2.push(nb);
        }
      }
    }
    if (hop1.length === 0) {
      new import_obsidian6.Notice("This note has no connections to burst.");
      return;
    }
    const place = (ids, radius, offset) => {
      ids.forEach((id, i) => {
        const node = this.graph.byId.get(id);
        if (!node) return;
        const angle = i / Math.max(ids.length, 1) * Math.PI * 2 + offset;
        node.x = seed.x + Math.cos(angle) * radius;
        node.y = seed.y + Math.sin(angle) * radius;
        node.vx = 0;
        node.vy = 0;
      });
    };
    place(hop1, 190, 0);
    place(hop2.slice(0, 80), 360, 0.2);
    const included = /* @__PURE__ */ new Set([seedId, ...hop1, ...hop2.slice(0, 80)]);
    this.plugin.usage.log("focal_burst", { hop1: hop1.length });
    this.enterLitmaps(seedId, included);
  }
  enterLitmaps(seedId, included) {
    this.state.focusSet = included;
    this.state.glowId = seedId;
    this.state.lockedId = null;
    this.litmapsActive = true;
    this.sim.alpha = 0;
    const seed = this.graph.byId.get(seedId);
    if (seed) {
      const w = this.canvas.clientWidth || 800;
      const h = this.canvas.clientHeight || 600;
      this.state.scale = Math.min((Math.min(w, h) - 80) / 980, 1.2);
      this.state.offsetX = w / 2 - seed.x * this.state.scale;
      this.state.offsetY = h / 2 - seed.y * this.state.scale;
    }
    new import_obsidian6.Notice("Press Escape to exit this view.");
  }
  exitLitmaps() {
    if (!this.litmapsActive) return;
    this.litmapsActive = false;
    this.state.glowId = null;
    this.state.focusSet = null;
    this.sim.reheat(0.5);
  }
  // ---------- toolbar ----------
  buildToolbar(container) {
    const bar = container.createDiv();
    bar.style.display = "flex";
    bar.style.flexWrap = "wrap";
    bar.style.gap = "6px";
    bar.style.padding = "6px 8px";
    bar.style.alignItems = "center";
    bar.style.borderBottom = "1px solid var(--background-modifier-border)";
    const btn = (label, title, cb) => {
      const b = bar.createEl("button", { text: label });
      b.title = title;
      b.onclick = () => cb(b);
      return b;
    };
    btn("Reload", "Rebuild the graph from the vault", () => void this.reload());
    btn("Recluster", "Regroup with the current Cluster by choice, without moving the layout", () => this.recluster());
    btn("Fit", "Fit the whole graph in the view", () => this.centerGraph());
    btn("Density", "Toggle density heatmap view", (el) => {
      this.state.densityMode = !this.state.densityMode;
      el.toggleClass("mod-cta", this.state.densityMode);
      this.plugin.usage.log("density_toggle", { on: this.state.densityMode });
    });
    btn("Connect", "Connect mode: click a source node, then a target node", (el) => {
      this.connectMode = !this.connectMode;
      this.state.connectSourceId = null;
      el.toggleClass("mod-cta", this.connectMode);
    });
    btn("Print", "Export as PNG, JPG, or PDF", () => {
      new ExportModal(
        this.app,
        this.graph,
        this.plugin.settings,
        this.state,
        this.canvas.clientWidth,
        this.canvas.clientHeight,
        () => this.plugin.saveSettings(),
        this.texturePattern
      ).open();
    });
    btn("Snapshot", "Save the graph image plus a metrics JSON at this moment", () => {
      void this.exportSnapshot();
    });
    btn("Timeline", "Scrub through past snapshots over time", () => {
      new TimelineModal(this.app, this.plugin.settings).open();
    });
    btn("Controls", "Show or hide the graph controls panel", (el) => {
      const hidden = this.controlsEl.style.display === "none";
      this.controlsEl.style.display = hidden ? "" : "none";
      el.toggleClass("mod-cta", hidden);
    });
  }
  // ---------- controls panel ----------
  buildControls(wrap) {
    const s = this.plugin.settings;
    const panel = wrap.createDiv();
    this.controlsEl = panel;
    panel.style.position = "absolute";
    panel.style.top = "10px";
    panel.style.right = "10px";
    panel.style.width = "250px";
    panel.style.maxHeight = "calc(100% - 20px)";
    panel.style.overflowY = "auto";
    panel.style.padding = "10px";
    panel.style.borderRadius = "8px";
    panel.style.background = "var(--background-primary)";
    panel.style.border = "1px solid var(--background-modifier-border)";
    panel.style.boxShadow = "var(--shadow-s)";
    panel.style.fontSize = "12px";
    panel.style.zIndex = "10";
    panel.style.display = "none";
    const save = () => void this.plugin.saveSettings();
    const section = (title) => {
      const h = panel.createEl("div", { text: title });
      h.style.fontWeight = "600";
      h.style.margin = "10px 0 4px";
      h.style.color = "var(--text-muted)";
      return panel.createDiv();
    };
    const slider = (parent, label, min, max, step, value, cb) => {
      const row = parent.createDiv();
      row.style.margin = "4px 0";
      row.createEl("div", { text: label });
      const input = row.createEl("input", { type: "range" });
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.style.width = "100%";
      input.oninput = () => cb(Number(input.value));
    };
    const toggle = (parent, label, value, cb) => {
      const row = parent.createDiv();
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.margin = "4px 0";
      row.createEl("span", { text: label });
      const input = row.createEl("input", { type: "checkbox" });
      input.checked = value;
      input.onchange = () => cb(input.checked);
    };
    const select = (parent, options, value, cb) => {
      const sel = parent.createEl("select");
      sel.style.width = "100%";
      sel.style.margin = "3px 0";
      for (const [v, label] of options) sel.createEl("option", { value: v, text: label });
      sel.value = value;
      sel.onchange = () => cb(sel.value);
      return sel;
    };
    const filters = section("Filters");
    const filterInput = filters.createEl("input", { type: "text" });
    filterInput.placeholder = "path: file: tag: line:() section:() [prop]";
    filterInput.style.width = "100%";
    filterInput.oninput = () => {
      this.state.visible = applyFilter(this.graph.nodes, filterInput.value);
    };
    toggle(filters, "Orphans", s.showOrphans, (v) => {
      s.showOrphans = v;
      save();
    });
    const heatSec = section("Heatmap and relevance");
    const heatInput = heatSec.createEl("input", { type: "text" });
    heatInput.placeholder = "keyword or #hashtag, Enter to run";
    heatInput.style.width = "100%";
    heatInput.onkeydown = (ev) => {
      if (ev.key !== "Enter") return;
      applyHeat(this.graph, heatInput.value, s.relevanceWeights);
      this.state.heatActive = heatInput.value.trim().length > 0;
      this.renderRelevanceList();
      if (this.state.heatActive) this.plugin.usage.log("heatmap_run");
    };
    const weightRow = heatSec.createDiv();
    weightRow.createEl("div", { text: "Relevance signals:" });
    toggle(weightRow, "Connections", s.relevanceWeights.connections, (v) => {
      s.relevanceWeights.connections = v;
      save();
    });
    toggle(weightRow, "Keywords", s.relevanceWeights.keywords, (v) => {
      s.relevanceWeights.keywords = v;
      save();
    });
    toggle(weightRow, "Word similarity", s.relevanceWeights.similarity, (v) => {
      s.relevanceWeights.similarity = v;
      save();
    });
    toggle(weightRow, "Tags", s.relevanceWeights.tags, (v) => {
      s.relevanceWeights.tags = v;
      save();
    });
    this.relevanceListEl = heatSec.createDiv();
    this.relevanceListEl.style.maxHeight = "160px";
    this.relevanceListEl.style.overflowY = "auto";
    this.relevanceListEl.style.marginTop = "4px";
    const groupsSec = section("Groups");
    const groupList = groupsSec.createDiv();
    const renderGroups = () => {
      groupList.empty();
      s.groups.forEach((g, idx) => {
        const row = groupList.createDiv();
        row.style.display = "flex";
        row.style.gap = "4px";
        row.style.margin = "3px 0";
        const q = row.createEl("input", { type: "text" });
        q.value = g.query;
        q.placeholder = "Enter query...";
        q.style.flex = "1";
        q.style.minWidth = "0";
        q.oninput = () => {
          g.query = q.value;
          this.refreshGroups();
          save();
        };
        const c = row.createEl("input", { type: "color" });
        c.value = g.color;
        c.oninput = () => {
          g.color = c.value;
          this.refreshGroups();
          save();
        };
        const x = row.createEl("button", { text: "x" });
        x.onclick = () => {
          s.groups.splice(idx, 1);
          this.refreshGroups();
          save();
          renderGroups();
        };
      });
    };
    renderGroups();
    const addGroup = groupsSec.createEl("button", { text: "New group" });
    addGroup.style.marginTop = "3px";
    addGroup.onclick = () => {
      s.groups.push({ query: "", color: "#e15759" });
      save();
      renderGroups();
    };
    const customSec = section("Custom colors");
    const customList = customSec.createDiv();
    const renderCustom = () => {
      customList.empty();
      s.customColors.forEach((c, idx) => {
        const row = customList.createDiv();
        row.style.display = "flex";
        row.style.gap = "4px";
        row.style.margin = "3px 0";
        const kind = row.createEl("select");
        for (const [v, label] of [
          ["folder", "folder"],
          ["tag", "tag"],
          ["property", "prop"]
        ]) {
          kind.createEl("option", { value: v, text: label });
        }
        kind.value = c.kind;
        kind.onchange = () => {
          c.kind = kind.value;
          save();
        };
        const key = row.createEl("input", { type: "text" });
        key.value = c.key;
        key.placeholder = c.kind === "property" ? "name=value" : "name";
        key.style.flex = "1";
        key.style.minWidth = "0";
        key.oninput = () => {
          c.key = key.value;
          save();
        };
        const col = row.createEl("input", { type: "color" });
        col.value = c.color;
        col.oninput = () => {
          c.color = col.value;
          save();
        };
        const x = row.createEl("button", { text: "x" });
        x.onclick = () => {
          s.customColors.splice(idx, 1);
          save();
          renderCustom();
        };
      });
    };
    renderCustom();
    const addCustom = customSec.createEl("button", { text: "New custom color" });
    addCustom.style.marginTop = "3px";
    addCustom.onclick = () => {
      s.customColors.push({ kind: "tag", key: "", color: "#4e79a7" });
      save();
      renderCustom();
    };
    const clusterSec = section("Clustering");
    const chint = clusterSec.createEl("div", {
      text: "Choosing a mode or moving a slider recolors the graph by cluster. Recluster now reapplies."
    });
    chint.style.color = "var(--text-muted)";
    chint.style.marginBottom = "4px";
    const modeSel = clusterSec.createEl("select");
    modeSel.style.width = "100%";
    modeSel.style.margin = "3px 0";
    for (const [v, label] of [
      ["signals", "Cluster by: signals (mix)"],
      ["folder", "Cluster by: folder"],
      ["recency", "Cluster by: recency"],
      ["components", "Cluster by: connected components"],
      ["compass", "Cluster by: compass hierarchy"]
    ]) {
      modeSel.createEl("option", { value: v, text: label });
    }
    modeSel.value = s.clusterMode;
    const signalsBox = clusterSec.createDiv();
    const signalDefs = [
      ["links", "Links"],
      ["coCitation", "Co-citation"],
      ["bibCoupling", "Bibliographic coupling"],
      ["sharedTags", "Shared tags"],
      ["tagCoocc", "Tag co-occurrence"],
      ["titleSim", "Title and heading"],
      ["fullText", "Full text (TF-IDF)"],
      ["keywordCoocc", "Keyword co-occurrence"]
    ];
    for (const [key, label] of signalDefs) {
      slider(signalsBox, label, 0, 1, 0.1, s.clusterSignals[key], (v) => {
        s.clusterSignals[key] = v;
        save();
        if (s.clusterMode === "signals") this.scheduleRecluster();
      });
    }
    const applyMode = () => {
      signalsBox.style.display = s.clusterMode === "signals" ? "" : "none";
    };
    applyMode();
    modeSel.onchange = () => {
      s.clusterMode = modeSel.value;
      save();
      applyMode();
      this.recluster();
    };
    toggle(clusterSec, "Stable clustering", s.stableClustering, (v) => {
      s.stableClustering = v;
      save();
      this.recluster();
    });
    const reclusterBtn = clusterSec.createEl("button", { text: "Recluster now" });
    reclusterBtn.style.marginTop = "4px";
    reclusterBtn.onclick = () => this.recluster();
    const display = section("Display");
    this.colorModeSelect = select(
      display,
      [
        ["folder", "Color: folder"],
        ["tag", "Color: tag"],
        ["property", "Color: property"],
        ["cluster", "Color: cluster"],
        ["ramp", "Color: recency ramp"]
      ],
      s.colorMode,
      (v) => {
        s.colorMode = v;
        save();
      }
    );
    select(
      display,
      [
        ["links", "Size: links"],
        ["words", "Size: words"],
        ["age", "Size: recency"],
        ["uniform", "Size: uniform"]
      ],
      s.sizeMode,
      (v) => {
        s.sizeMode = v;
        save();
      }
    );
    slider(display, "Connection exaggeration", 0.1, 1.6, 0.05, s.linkExaggeration, (v) => {
      s.linkExaggeration = v;
      save();
    });
    select(
      display,
      [
        ["curved", "Lines: curved"],
        ["straight", "Lines: straight"]
      ],
      s.edgeStyle,
      (v) => {
        s.edgeStyle = v;
        save();
      }
    );
    slider(display, "Curvature", 0, 0.8, 0.05, s.curvature, (v) => {
      s.curvature = v;
      save();
    });
    toggle(display, "Arrows on plain links", s.showLinkArrows, (v) => {
      s.showLinkArrows = v;
      save();
    });
    toggle(display, "Labels", s.showLabels, (v) => {
      s.showLabels = v;
      save();
    });
    toggle(display, "Lock layout", s.lockLayout, (v) => {
      s.lockLayout = v;
      if (!v) this.sim.reheat(0.3);
      save();
    });
    slider(display, "Text size", 0.5, 2.5, 0.1, s.textSize, (v) => {
      s.textSize = v;
      save();
    });
    slider(display, "Text fade threshold", 0.05, 1.5, 0.05, s.textFade, (v) => {
      s.textFade = v;
      save();
    });
    slider(display, "Node size", 0.3, 3, 0.1, s.nodeScale, (v) => {
      s.nodeScale = v;
      save();
    });
    slider(display, "Link thickness", 0.3, 4, 0.1, s.lineWidth, (v) => {
      s.lineWidth = v;
      save();
    });
    const edges = section("Arrows and lines");
    select(
      edges,
      [
        ["mother", "Arrow color: follow mother file"],
        ["fixed", "Arrow color: fixed per type"]
      ],
      s.edgeColorMode,
      (v) => {
        s.edgeColorMode = v;
        save();
      }
    );
    for (const [kind, label] of EDGE_KINDS) {
      const st = s.edgeStyles[kind];
      const head = edges.createEl("div", { text: label });
      head.style.marginTop = "6px";
      head.style.fontWeight = "500";
      const row = edges.createDiv();
      row.style.display = "flex";
      row.style.gap = "4px";
      row.style.alignItems = "center";
      const col = row.createEl("input", { type: "color" });
      col.value = st.color;
      col.title = "Line color (used in fixed mode)";
      col.oninput = () => {
        st.color = col.value;
        save();
      };
      const dash = row.createEl("select");
      for (const d of ["solid", "dashed", "dotted"]) dash.createEl("option", { value: d, text: d });
      dash.value = st.dash;
      dash.onchange = () => {
        st.dash = dash.value;
        save();
      };
      const headSel = row.createEl("select");
      for (const hd of ["triangle", "open", "circle", "none"]) headSel.createEl("option", { value: hd, text: hd });
      headSel.value = st.head;
      headSel.title = "Arrowhead";
      headSel.onchange = () => {
        st.head = headSel.value;
        save();
      };
      const width = row.createEl("input", { type: "range" });
      width.min = "0.4";
      width.max = "4";
      width.step = "0.2";
      width.value = String(st.width);
      width.title = "Line width";
      width.style.width = "60px";
      width.oninput = () => {
        st.width = Number(width.value);
        save();
      };
    }
    const bg = section("Background");
    select(
      bg,
      [
        ["theme", "Background: theme"],
        ["color", "Background: color"],
        ["texture", "Background: texture"]
      ],
      s.backgroundMode,
      (v) => {
        s.backgroundMode = v;
        save();
      }
    );
    const bgColor = bg.createEl("input", { type: "color" });
    bgColor.value = s.backgroundColor;
    bgColor.oninput = () => {
      s.backgroundColor = bgColor.value;
      save();
    };
    select(
      bg,
      [
        ["auto", "Labels: match theme"],
        ["dark", "Labels: dark (light backgrounds)"],
        ["light", "Labels: light (dark backgrounds)"]
      ],
      s.labelColor,
      (v) => {
        s.labelColor = v;
        save();
      }
    );
    const folderName = s.texturesFolder.toLowerCase();
    const textures = this.app.vault.getFiles().filter(
      (f) => ["png", "jpg", "jpeg", "webp"].includes(f.extension.toLowerCase()) && f.path.toLowerCase().split("/").slice(0, -1).includes(folderName)
    ).sort((a, b) => a.basename.localeCompare(b.basename));
    const texOptions = [["", "No texture"]];
    for (const f of textures) texOptions.push([f.path, f.basename]);
    select(bg, texOptions, s.texturePath, (v) => {
      s.texturePath = v;
      this.loadTexture();
      save();
    });
    if (textures.length === 0) {
      const hint = bg.createEl("div", {
        text: `No images found in any "${s.texturesFolder}" folder. Create one anywhere in the vault and drop image files in it, then reopen the graph.`
      });
      hint.style.color = "var(--text-muted)";
    }
    const forces = section("Forces");
    slider(forces, "Center force", 0, 0.06, 2e-3, s.forces.center, (v) => {
      s.forces.center = v;
      this.sim.setForces(s.forces);
      save();
    });
    slider(forces, "Repel force", 200, 9e3, 100, s.forces.repel, (v) => {
      s.forces.repel = v;
      this.sim.setForces(s.forces);
      save();
    });
    slider(forces, "Link force", 0, 0.15, 5e-3, s.forces.linkStrength, (v) => {
      s.forces.linkStrength = v;
      this.sim.setForces(s.forces);
      save();
    });
    slider(forces, "Link distance", 40, 400, 10, s.forces.linkDistance, (v) => {
      s.forces.linkDistance = v;
      this.sim.setForces(s.forces);
      save();
    });
  }
  // Sorted list of notes by heat score after a heatmap run.
  renderRelevanceList() {
    const el = this.relevanceListEl;
    if (!el) return;
    el.empty();
    if (!this.state.heatActive) return;
    const ranked = this.graph.nodes.filter((n) => n.heat > 0.02).sort((a, b) => b.heat - a.heat).slice(0, 25);
    for (const n of ranked) {
      const row = el.createDiv();
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.cursor = "pointer";
      row.style.padding = "1px 2px";
      const name = row.createEl("span", { text: n.name });
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      name.style.whiteSpace = "nowrap";
      const score = row.createEl("span", { text: n.heat.toFixed(2) });
      score.style.color = "var(--text-muted)";
      score.style.marginLeft = "6px";
      row.onclick = () => {
        const w = this.canvas.clientWidth || 800;
        const h = this.canvas.clientHeight || 600;
        this.state.offsetX = w / 2 - n.x * this.state.scale;
        this.state.offsetY = h / 2 - n.y * this.state.scale;
        this.state.lockedId = n.id;
      };
    }
  }
  // ---------- render loop ----------
  loop() {
    this.rafId = requestAnimationFrame(() => this.loop());
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.centerGraph();
    }
    const wasActive = this.sim.active;
    if (!this.plugin.settings.lockLayout && !this.litmapsActive) this.sim.tick();
    if (this.settleFit && wasActive && !this.sim.active) {
      this.settleFit = false;
      this.centerGraph();
    }
    this.state.dark = document.body.classList.contains("theme-dark");
    draw(this.ctx, w, h, this.graph, this.plugin.settings, this.state, {
      dpr,
      texture: this.texturePattern
    });
  }
  centerGraph() {
    const shown = this.graph.nodes.filter((n) => isNodeShown(n, this.plugin.settings, this.state));
    if (shown.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of shown) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    const pad = 80;
    const scale = Math.min((w - pad) / Math.max(maxX - minX, 1), (h - pad) / Math.max(maxY - minY, 1), 1.6);
    this.state.scale = scale;
    this.state.offsetX = w / 2 - (minX + maxX) / 2 * scale;
    this.state.offsetY = h / 2 - (minY + maxY) / 2 * scale;
  }
  // ---------- interaction ----------
  toWorld(sx, sy) {
    return {
      x: (sx - this.state.offsetX) / this.state.scale,
      y: (sy - this.state.offsetY) / this.state.scale
    };
  }
  hitTest(sx, sy) {
    const { x, y } = this.toWorld(sx, sy);
    const now = Date.now();
    for (let i = this.graph.nodes.length - 1; i >= 0; i--) {
      const n = this.graph.nodes[i];
      if (!isNodeShown(n, this.plugin.settings, this.state)) continue;
      const r = nodeRadius(n, this.plugin.settings, now) + 3 / this.state.scale;
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  }
  bindEvents() {
    const canvas = this.canvas;
    canvas.addEventListener("mousedown", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      this.lastMouse = { x: sx, y: sy };
      this.moved = false;
      if (ev.button === 0) {
        const hit = this.hitTest(sx, sy);
        if (hit && !this.connectMode) {
          this.draggingNode = hit;
        } else if (!hit) {
          this.panning = true;
        }
      }
    });
    canvas.addEventListener("mousemove", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const dx = sx - this.lastMouse.x;
      const dy = sy - this.lastMouse.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.moved = true;
      if (this.draggingNode) {
        const w = this.toWorld(sx, sy);
        this.draggingNode.x = w.x;
        this.draggingNode.y = w.y;
        this.draggingNode.vx = 0;
        this.draggingNode.vy = 0;
        if (!this.litmapsActive && !this.plugin.settings.lockLayout) this.sim.reheat(0.25);
      } else if (this.panning) {
        this.state.offsetX += dx;
        this.state.offsetY += dy;
      } else {
        const hit = this.hitTest(sx, sy);
        this.state.hoveredId = hit ? hit.id : null;
        canvas.style.cursor = hit ? "pointer" : "default";
      }
      this.lastMouse = { x: sx, y: sy };
    });
    canvas.addEventListener("mouseup", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      if (this.draggingNode) {
        if (this.moved && this.plugin.settings.pinOnDrop) {
          this.draggingNode.pinned = true;
          this.persistNode(this.draggingNode);
          this.plugin.usage.log("node_pinned");
        }
        const node = this.draggingNode;
        this.draggingNode = null;
        if (!this.moved) this.handleClick(node, ev);
        return;
      }
      if (this.panning) {
        this.panning = false;
        if (!this.moved) {
          this.state.lockedId = null;
          this.state.focusSet = this.litmapsActive ? this.state.focusSet : null;
          if (this.connectMode) this.state.connectSourceId = null;
        }
        return;
      }
      const hit = this.hitTest(sx, sy);
      if (hit && !this.moved) this.handleClick(hit, ev);
    });
    canvas.addEventListener("mouseleave", () => {
      this.state.hoveredId = null;
      this.draggingNode = null;
      this.panning = false;
    });
    canvas.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const factor = Math.exp(-ev.deltaY * 12e-4);
      const next = Math.min(Math.max(this.state.scale * factor, 0.05), 8);
      const real = next / this.state.scale;
      this.state.offsetX = sx - (sx - this.state.offsetX) * real;
      this.state.offsetY = sy - (sy - this.state.offsetY) * real;
      this.state.scale = next;
    }, { passive: false });
    canvas.addEventListener("dblclick", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const hit = this.hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
      if (!hit) return;
      const file = this.app.vault.getAbstractFileByPath(hit.id);
      if (file instanceof import_obsidian6.TFile) void this.app.workspace.getLeaf(false).openFile(file);
    });
    canvas.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const hit = this.hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
      if (hit) this.nodeMenu(hit, ev);
    });
    this.registerDomEvent(document, "keydown", (ev) => {
      if (ev.key === "Escape") {
        this.exitLitmaps();
        this.state.focusSet = null;
        this.state.lockedId = null;
        this.state.connectSourceId = null;
      }
    });
  }
  handleClick(node, ev) {
    if (this.connectMode) {
      if (!this.state.connectSourceId) {
        this.state.connectSourceId = node.id;
        new import_obsidian6.Notice(`Source: ${node.name}. Now click the target node.`);
      } else if (this.state.connectSourceId !== node.id) {
        const source = this.state.connectSourceId;
        this.state.connectSourceId = null;
        this.plugin.usage.log("connect_link");
        const modal = new ConnectModal(this.app, source, node.id, this.plugin.settings.connectionsHeading);
        modal.open();
        const origClose = modal.onClose.bind(modal);
        modal.onClose = () => {
          origClose();
          window.setTimeout(() => void this.softReload(), 400);
        };
      }
      return;
    }
    if (ev.ctrlKey || ev.metaKey) {
      this.state.focusSet = this.nHop(node.id, this.plugin.settings.focusHops);
      this.plugin.usage.log("focus_mode");
      return;
    }
    this.state.lockedId = this.state.lockedId === node.id ? null : node.id;
  }
  nHop(id, hops) {
    const set = /* @__PURE__ */ new Set([id]);
    let frontier = [id];
    for (let i = 0; i < hops; i++) {
      const next = [];
      for (const f of frontier) {
        for (const nb of this.graph.adjacency.get(f) ?? []) {
          if (!set.has(nb)) {
            set.add(nb);
            next.push(nb);
          }
        }
      }
      frontier = next;
    }
    return set;
  }
  nodeMenu(node, ev) {
    const menu = new import_obsidian6.Menu();
    menu.addItem(
      (i) => i.setTitle(node.pinned ? "Unpin position" : "Pin position").setIcon("pin").onClick(() => {
        node.pinned = !node.pinned;
        this.persistNode(node);
        if (node.pinned) this.plugin.usage.log("node_pinned");
        else this.sim.reheat(0.3);
      })
    );
    menu.addItem(
      (i) => i.setTitle("Set icon...").setIcon("smile").onClick(() => {
        new EmojiPickerModal(this.app, node.name, (choice) => {
          const targets = [node];
          if (choice.applyToConnected) {
            for (const nb of this.graph.adjacency.get(node.id) ?? []) {
              const other = this.graph.byId.get(nb);
              if (other) targets.push(other);
            }
          }
          for (const t of targets) {
            t.icon = choice.emoji ?? void 0;
            this.persistIcon(t);
          }
        }).open();
      })
    );
    menu.addItem(
      (i) => i.setTitle("Set color...").setIcon("palette").onClick(() => {
        const input = document.createElement("input");
        input.type = "color";
        input.value = node.color ?? "#4e79a7";
        input.oninput = () => {
          node.color = input.value;
          this.persistNode(node);
        };
        input.click();
      })
    );
    menu.addItem(
      (i) => i.setTitle("Clear color override").onClick(() => {
        node.color = void 0;
        this.persistNode(node);
      })
    );
    menu.addItem(
      (i) => i.setTitle("Relevance rings").setIcon("circle-dot").onClick(() => {
        this.litmapsRings(node.id);
      })
    );
    menu.addItem(
      (i) => i.setTitle("Focal burst").setIcon("sun").onClick(() => {
        this.litmapsBurst(node.id);
      })
    );
    menu.addItem(
      (i) => i.setTitle("Focus neighborhood").setIcon("target").onClick(() => {
        this.state.focusSet = this.nHop(node.id, this.plugin.settings.focusHops);
      })
    );
    menu.addItem(
      (i) => i.setTitle("Open note").setIcon("file").onClick(() => {
        const file = this.app.vault.getAbstractFileByPath(node.id);
        if (file instanceof import_obsidian6.TFile) void this.app.workspace.getLeaf(false).openFile(file);
      })
    );
    menu.showAtMouseEvent(ev);
  }
  persistNode(node) {
    const overrides = this.plugin.settings.nodeOverrides;
    overrides[node.id] = {
      ...overrides[node.id] ?? {},
      x: node.x,
      y: node.y,
      pinned: node.pinned,
      color: node.color
    };
    this.scheduleSave();
  }
  persistIcon(node) {
    const overrides = this.plugin.settings.nodeOverrides;
    overrides[node.id] = { ...overrides[node.id] ?? {}, icon: node.icon };
    this.scheduleSave();
  }
  scheduleSave() {
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.plugin.saveSettings(), 800);
  }
};

// src/usage.ts
var import_obsidian7 = require("obsidian");
var LOG_FILE = "usage-log.jsonl";
var FLUSH_DELAY = 1500;
var UsageLogger = class {
  constructor(app, plugin) {
    this.buffer = [];
    this.timer = null;
    this.app = app;
    this.plugin = plugin;
  }
  get enabled() {
    return this.plugin.settings.usageLogging === true;
  }
  // Make sure an anonymous participant id exists. Returns the id.
  ensureParticipantId() {
    if (!this.plugin.settings.participantId) {
      this.plugin.settings.participantId = randomId();
    }
    return this.plugin.settings.participantId;
  }
  // Record one event. No-op unless logging is enabled. Detail values are
  // limited by type to numbers and flags, so no text can leak into the log.
  log(event, detail) {
    if (!this.enabled) return;
    const record = {
      t: (/* @__PURE__ */ new Date()).toISOString(),
      pid: this.plugin.settings.participantId || "",
      ev: event
    };
    if (detail) {
      for (const key of Object.keys(detail)) {
        const v = detail[key];
        if (typeof v === "number" || typeof v === "boolean") record[key] = v;
      }
    }
    this.buffer.push(JSON.stringify(record));
    this.scheduleFlush();
  }
  // Called by the settings tab when consent is given and the toggle goes on.
  async startSession() {
    this.ensureParticipantId();
    this.plugin.settings.usageConsentAcknowledged = true;
    await this.plugin.saveSettings();
    this.log("session_start");
    await this.flush();
  }
  scheduleFlush() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), FLUSH_DELAY);
  }
  async flush() {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;
    const lines = this.buffer.join("\n") + "\n";
    this.buffer = [];
    const folder = (0, import_obsidian7.normalizePath)(this.plugin.settings.usageFolder || "Better Graph Usage");
    const path = (0, import_obsidian7.normalizePath)(`${folder}/${LOG_FILE}`);
    try {
      await this.ensureFolder(folder);
      await this.app.vault.adapter.append(path, lines);
    } catch (err) {
      console.error("Better Graphs usage log write failed", err);
    }
  }
  async ensureFolder(path) {
    const parts = (0, import_obsidian7.normalizePath)(path).split("/");
    let cur = "";
    for (const part of parts) {
      if (!part) continue;
      cur = cur ? `${cur}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        try {
          await this.app.vault.createFolder(cur);
        } catch {
        }
      }
    }
  }
};
function randomId() {
  try {
    const uuid = crypto.randomUUID?.();
    if (uuid) return "p-" + uuid.replace(/-/g, "").slice(0, 12);
  } catch {
  }
  return "p-" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

// src/usageview.ts
var import_obsidian8 = require("obsidian");
var EVENT_LABELS = {
  session_start: "Logging turned on (session start)",
  graph_open: "Opened the graph",
  node_pinned: "Pinned a node",
  heatmap_run: "Ran a heatmap search",
  relevance_rings: "Opened relevance rings",
  focal_burst: "Opened focal burst",
  density_toggle: "Toggled the density view",
  focus_mode: "Focused a neighborhood",
  connect_link: "Drew a connection",
  recluster: "Reclustered the graph",
  snapshot_export: "Exported a snapshot"
};
var UsageSummaryModal = class extends import_obsidian8.Modal {
  constructor(app, settings) {
    super(app);
    this.settings = settings;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Usage summary" });
    const folder = (0, import_obsidian8.normalizePath)(this.settings.usageFolder || "Better Graph Usage");
    const path = (0, import_obsidian8.normalizePath)(`${folder}/usage-log.jsonl`);
    let raw = "";
    try {
      if (await this.app.vault.adapter.exists(path)) raw = await this.app.vault.adapter.read(path);
    } catch {
      raw = "";
    }
    if (!raw.trim()) {
      const p = contentEl.createEl("p", {
        text: this.settings.usageLogging ? "Logging is on, but nothing has been recorded yet. Use the graph a little and reopen this." : "Usage logging is off, so there is no log to show. You can turn it on in the plugin settings, under Research and study tools."
      });
      p.style.color = "var(--text-muted)";
      this.pathHint(contentEl, path);
      return;
    }
    const s = summarize(raw);
    const meta = contentEl.createEl("div");
    meta.style.color = "var(--text-muted)";
    meta.style.fontSize = "12px";
    meta.style.marginBottom = "8px";
    meta.setText(
      `${s.lines} events, ${s.sessions} session(s), ${s.participants.size} participant id(s). From ${s.first || "?"} to ${s.last || "?"}.`
    );
    const table = contentEl.createEl("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    const header = table.createEl("tr");
    for (const h of ["Action", "Count"]) {
      const th = header.createEl("th", { text: h });
      th.style.textAlign = h === "Count" ? "right" : "left";
      th.style.borderBottom = "1px solid var(--background-modifier-border)";
      th.style.padding = "4px 6px";
    }
    const rows = Array.from(s.counts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [ev, count] of rows) {
      const tr = table.createEl("tr");
      const name = tr.createEl("td", { text: EVENT_LABELS[ev] ?? ev });
      name.style.padding = "3px 6px";
      const c = tr.createEl("td", { text: String(count) });
      c.style.textAlign = "right";
      c.style.padding = "3px 6px";
    }
    const actions = contentEl.createEl("div");
    actions.style.marginTop = "12px";
    actions.style.display = "flex";
    actions.style.gap = "8px";
    const exportBtn = actions.createEl("button", { text: "Export summary as CSV" });
    exportBtn.classList.add("mod-cta");
    exportBtn.onclick = () => void this.exportCsv(folder, s);
    this.pathHint(contentEl, path);
  }
  onClose() {
    this.contentEl.empty();
  }
  pathHint(parent, path) {
    const hint = parent.createEl("p", { text: `Raw log: ${path}` });
    hint.style.color = "var(--text-muted)";
    hint.style.fontSize = "11px";
    hint.style.marginTop = "10px";
  }
  async exportCsv(folder, s) {
    const rows = ["action,event,count"];
    const ordered = Array.from(s.counts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [ev, count] of ordered) {
      const label = (EVENT_LABELS[ev] ?? ev).replace(/"/g, '""');
      rows.push(`"${label}",${ev},${count}`);
    }
    rows.push("");
    rows.push(`sessions,,${s.sessions}`);
    rows.push(`participants,,${s.participants.size}`);
    rows.push(`firstEvent,,${s.first}`);
    rows.push(`lastEvent,,${s.last}`);
    const path = (0, import_obsidian8.normalizePath)(`${folder}/usage-summary.csv`);
    try {
      await this.app.vault.adapter.write(path, rows.join("\n") + "\n");
      new import_obsidian8.Notice(`Usage summary written to ${path}`);
    } catch (err) {
      console.error("Better Graphs usage summary export failed", err);
      new import_obsidian8.Notice("Could not write the usage summary. See the developer console.");
    }
  }
};
function summarize(raw) {
  const counts = /* @__PURE__ */ new Map();
  const participants = /* @__PURE__ */ new Set();
  let sessions = 0;
  let first = "";
  let last = "";
  let lines = 0;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    lines++;
    const ev = typeof obj.ev === "string" ? obj.ev : "unknown";
    counts.set(ev, (counts.get(ev) ?? 0) + 1);
    if (ev === "session_start") sessions++;
    if (typeof obj.pid === "string" && obj.pid) participants.add(obj.pid);
    if (typeof obj.t === "string") {
      if (!first || obj.t < first) first = obj.t;
      if (!last || obj.t > last) last = obj.t;
    }
  }
  return { counts, sessions, participants, first, last, lines };
}

// src/main.ts
var BETTER_GRAPH_ICON = "better-graphs-fork-alert";
var ICON_SVG = `
<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
  <line x1="13" y1="22" x2="13" y2="58"/>
  <circle cx="13" cy="76" r="1.5" fill="currentColor"/>
  <circle cx="52" cy="27" r="10"/>
  <circle cx="88" cy="27" r="10"/>
  <circle cx="70" cy="73" r="10"/>
  <path d="M52 37 v6 c0 4 3 7 7 7 h22 c4 0 7 -3 7 -7 v-6"/>
  <path d="M70 50 v13"/>
</g>`;
var BetterGraphsPlugin = class extends import_obsidian9.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.revisitSaveTimer = null;
  }
  async onload() {
    await this.loadSettings();
    (0, import_obsidian9.addIcon)(BETTER_GRAPH_ICON, ICON_SVG);
    this.usage = new UsageLogger(this.app, this);
    this.registerView(VIEW_TYPE_BETTER_GRAPH, (leaf) => new BetterGraphView(leaf, this));
    this.addRibbonIcon(BETTER_GRAPH_ICON, "Open Better Graph", () => void this.activateView());
    this.addCommand({
      id: "open-better-graph",
      name: "Open Better Graph",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "export-graph-snapshot",
      name: "Export graph snapshot and metrics",
      callback: () => void this.runSnapshot()
    });
    this.addCommand({
      id: "open-graph-timeline",
      name: "Open snapshot timeline",
      callback: () => new TimelineModal(this.app, this.settings).open()
    });
    this.addCommand({
      id: "view-usage-summary",
      name: "View usage summary",
      callback: () => new UsageSummaryModal(this.app, this.settings).open()
    });
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!this.settings.trackRevisits || !(file instanceof import_obsidian9.TFile) || file.extension !== "md") return;
        this.settings.revisits[file.path] = (this.settings.revisits[file.path] ?? 0) + 1;
        this.scheduleRevisitSave();
      })
    );
    this.addSettingTab(new BGSettingTab(this.app, this));
  }
  onunload() {
    void this.usage?.flush();
  }
  scheduleRevisitSave() {
    if (this.revisitSaveTimer !== null) window.clearTimeout(this.revisitSaveTimer);
    this.revisitSaveTimer = window.setTimeout(() => void this.saveSettings(), 2e3);
  }
  // One command: capture the graph image plus a metrics JSON at a timestamp.
  // Uses the open graph view when there is one, so pinned positions and the
  // current layout are captured; otherwise it builds and lays out a fresh graph.
  async runSnapshot() {
    try {
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BETTER_GRAPH);
      if (leaves.length > 0 && leaves[0].view instanceof BetterGraphView) {
        await leaves[0].view.exportSnapshot();
        return;
      }
      new import_obsidian9.Notice("Building the graph for a snapshot...");
      const graph = await buildGraph(this.app, this.settings);
      assignClusters(graph, this.settings);
      const sim = new ForceSim();
      sim.setForces(this.settings.forces);
      sim.setData(graph.nodes, graph.edges);
      sim.warmup(280);
      const res = await exportSnapshot(this.app, this.settings, graph, null);
      this.usage.log("snapshot_export", { nodes: res.metrics.nodeCount });
      new import_obsidian9.Notice(`Snapshot saved to ${res.jsonPath}`);
    } catch (err) {
      console.error("Better Graphs snapshot failed", err);
      new import_obsidian9.Notice("Snapshot failed. See the developer console for details.");
    }
  }
  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_BETTER_GRAPH);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_BETTER_GRAPH, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async loadSettings() {
    const data = await this.loadData() ?? {};
    const edgeStyles = { ...DEFAULT_EDGE_STYLES };
    for (const kind of Object.keys(edgeStyles)) {
      edgeStyles[kind] = { ...DEFAULT_EDGE_STYLES[kind], ...(data.edgeStyles ?? {})[kind] ?? {} };
    }
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...data,
      exportDefaults: { ...DEFAULT_SETTINGS.exportDefaults, ...data.exportDefaults ?? {} },
      forces: { ...DEFAULT_SETTINGS.forces, ...data.forces ?? {} },
      relevanceWeights: { ...DEFAULT_SETTINGS.relevanceWeights, ...data.relevanceWeights ?? {} },
      clusterSignals: { ...DEFAULT_SETTINGS.clusterSignals, ...data.clusterSignals ?? {} },
      edgeStyles,
      groups: Array.isArray(data.groups) ? data.groups : [],
      customColors: Array.isArray(data.customColors) ? data.customColors : [],
      nodeOverrides: data.nodeOverrides ?? {},
      revisits: data.revisits && typeof data.revisits === "object" ? data.revisits : {}
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var BGSettingTab = class extends import_obsidian9.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Better Graphs" });
    new import_obsidian9.Setting(containerEl).setName("Pin nodes on drop").setDesc("A dragged node keeps its position after release.").addToggle((t) => {
      t.setValue(this.plugin.settings.pinOnDrop);
      t.onChange(async (v) => {
        this.plugin.settings.pinOnDrop = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Color property").setDesc("Frontmatter field used when color mode is set to property.").addText((t) => {
      t.setValue(this.plugin.settings.colorProperty);
      t.onChange(async (v) => {
        this.plugin.settings.colorProperty = v.trim() || "pillar";
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Icon property").setDesc("Frontmatter field holding an emoji icon for the node.").addText((t) => {
      t.setValue(this.plugin.settings.iconProperty);
      t.onChange(async (v) => {
        this.plugin.settings.iconProperty = v.trim() || "icon";
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Connections heading").setDesc("Heading the connect tool appends links under.").addText((t) => {
      t.setValue(this.plugin.settings.connectionsHeading);
      t.onChange(async (v) => {
        this.plugin.settings.connectionsHeading = v.trim() || "## Connections";
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Focus hops").setDesc("Neighborhood depth for focus mode (Ctrl+click a node).").addSlider((s) => {
      s.setLimits(1, 4, 1).setValue(this.plugin.settings.focusHops).setDynamicTooltip();
      s.onChange(async (v) => {
        this.plugin.settings.focusHops = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Show labels").addToggle((t) => {
      t.setValue(this.plugin.settings.showLabels);
      t.onChange(async (v) => {
        this.plugin.settings.showLabels = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Custom stopwords").setDesc(
      "Extra words to ignore when clustering by full text or keywords, on top of the built-in list. Separate with spaces or commas."
    ).addTextArea((t) => {
      t.setValue(this.plugin.settings.extraStopwords);
      t.inputEl.rows = 2;
      t.onChange(async (v) => {
        this.plugin.settings.extraStopwords = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Clear all pinned positions and overrides").addButton((b) => {
      b.setButtonText("Clear").setWarning();
      b.onClick(async () => {
        this.plugin.settings.nodeOverrides = {};
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("h3", { text: "Research and study tools" });
    new import_obsidian9.Setting(containerEl).setName("Export graph snapshot and metrics").setDesc(
      "Save a graph image plus a metrics JSON at this moment, and add one row to a running CSV. Run it once early and once late to collect matched before and after data. Also available from the command palette."
    ).addButton((b) => {
      b.setButtonText("Export now").setCta();
      b.onClick(() => void this.plugin.runSnapshot());
    });
    new import_obsidian9.Setting(containerEl).setName("Snapshot folder").setDesc("Folder the snapshot image, JSON, and CSV are written to.").addText((t) => {
      t.setValue(this.plugin.settings.snapshotFolder);
      t.onChange(async (v) => {
        this.plugin.settings.snapshotFolder = v.trim() || "Better Graph Snapshots";
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Track note revisits").setDesc(
      "Count how many times each note is opened. Stored only in this vault and used for the revisit number in snapshots. It never leaves your machine on its own."
    ).addToggle((t) => {
      t.setValue(this.plugin.settings.trackRevisits);
      t.onChange(async (v) => {
        this.plugin.settings.trackRevisits = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Reset revisit counts").setDesc("Clear the stored open counts, for example before a new study period.").addButton((b) => {
      b.setButtonText("Reset").setWarning();
      b.onClick(async () => {
        this.plugin.settings.revisits = {};
        await this.plugin.saveSettings();
        new import_obsidian9.Notice("Revisit counts cleared.");
      });
    });
    containerEl.createEl("h4", { text: "Anonymized usage logging" });
    const consentText = "Off by default. When on, Better Graphs records which features you use (opening the graph, pinning nodes, running heatmaps and relevance views) as one line per event. Each line holds an event name, a time, an anonymous id, and a few numbers. It never stores note names, note paths, search text, or any file content. The log stays in this vault until you choose to share it, and you can turn it off at any time.";
    containerEl.createEl("p", { text: consentText }).style.color = "var(--text-muted)";
    new import_obsidian9.Setting(containerEl).setName("Enable anonymized usage logging").setDesc(`Writes to ${this.plugin.settings.usageFolder}/usage-log.jsonl.`).addToggle((t) => {
      t.setValue(this.plugin.settings.usageLogging);
      t.onChange(async (v) => {
        this.plugin.settings.usageLogging = v;
        await this.plugin.saveSettings();
        if (v) {
          await this.plugin.usage.startSession();
          new import_obsidian9.Notice("Usage logging on. It is anonymized and stays in this vault.");
        } else {
          await this.plugin.usage.flush();
          new import_obsidian9.Notice("Usage logging off.");
        }
        this.display();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Anonymous participant id").setDesc("Pairs your own before and after logs. It contains no personal information.").addText((t) => {
      t.setValue(this.plugin.settings.participantId || "(none yet)");
      t.setDisabled(true);
    }).addButton((b) => {
      b.setButtonText("Regenerate");
      b.onClick(async () => {
        this.plugin.settings.participantId = "";
        this.plugin.usage.ensureParticipantId();
        await this.plugin.saveSettings();
        new import_obsidian9.Notice("New participant id generated.");
        this.display();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Usage log folder").setDesc("Folder the usage log is written to.").addText((t) => {
      t.setValue(this.plugin.settings.usageFolder);
      t.onChange(async (v) => {
        this.plugin.settings.usageFolder = v.trim() || "Better Graph Usage";
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("View usage summary").setDesc("See the log as plain counts per action, and export those counts to a CSV.").addButton((b) => {
      b.setButtonText("View summary");
      b.onClick(() => new UsageSummaryModal(this.app, this.plugin.settings).open());
    });
  }
};
