import { BGNode, GraphData, RelevanceWeights } from "./types";

// Relevance of every note to one seed note. Used by the Litmaps-style
// ring layout and the sorted relevance list. Signals are user selectable.
export function relevanceScores(
  graph: GraphData,
  seedId: string,
  weights: RelevanceWeights
): Map<string, number> {
  const seed = graph.byId.get(seedId);
  const scores = new Map<string, number>();
  if (!seed) return scores;

  const seedNeighbors = graph.adjacency.get(seedId) ?? new Set<string>();
  const seedTags = new Set(seed.tags);
  const seedWords = titleWords(seed);

  for (const n of graph.nodes) {
    if (n.id === seedId) continue;
    let s = 0;

    if (weights.connections) {
      if (seedNeighbors.has(n.id)) s += 1.0;
      else {
        // Two hops out.
        for (const nb of graph.adjacency.get(n.id) ?? []) {
          if (seedNeighbors.has(nb)) {
            s += 0.35;
            break;
          }
        }
      }
      // Shared neighborhood (bibliographic coupling analog).
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
      s += Math.min((hits / seedWords.size) * 0.5, 0.5);
    }

    if (s > 0.01) scores.set(n.id, s);
  }
  return scores;
}

// Keyword relevance for the heatmap and its sorted result list.
export function keywordScores(
  graph: GraphData,
  query: string,
  weights: RelevanceWeights
): Map<string, { score: number; kind: "primary" | "secondary" }> {
  const out = new Map<string, { score: number; kind: "primary" | "secondary" }>();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter((t) => t.length > 1);
  if (terms.length === 0) return out;

  let max = 0;
  const primary = new Map<string, number>();
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

  // Secondary spread by connections, tags, and title similarity.
  const tagIndex = new Map<string, string[]>();
  if (weights.tags) {
    for (const id of primary.keys()) {
      const n = graph.byId.get(id);
      if (!n) continue;
      for (const t of n.tags) {
        let list = tagIndex.get(t);
        if (!list) tagIndex.set(t, (list = []));
        list.push(id);
      }
    }
  }
  const primaryWords = new Map<string, Set<string>>();
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

export function applyHeat(graph: GraphData, query: string, weights: RelevanceWeights) {
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

function titleWords(n: BGNode): Set<string> {
  return new Set(
    n.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

function countOccurrences(text: string, term: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(term, idx)) !== -1) {
    count++;
    idx += term.length;
    if (count >= 10) break;
  }
  return count;
}
