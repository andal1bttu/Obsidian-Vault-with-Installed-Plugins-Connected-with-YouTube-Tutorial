import { GraphData } from "./types";

// Label propagation community detection. Fast and good enough for vault-scale graphs.
export function assignClusters(graph: GraphData, iterations = 24): number {
  const labels = new Map<string, number>();
  graph.nodes.forEach((n, i) => labels.set(n.id, i));

  const order = graph.nodes.map((n) => n.id);
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    shuffle(order);
    for (const id of order) {
      const neighbors = graph.adjacency.get(id);
      if (!neighbors || neighbors.size === 0) continue;
      const counts = new Map<number, number>();
      for (const nb of neighbors) {
        const l = labels.get(nb);
        if (l === undefined) continue;
        counts.set(l, (counts.get(l) ?? 0) + 1);
      }
      let best = labels.get(id) ?? 0;
      let bestCount = -1;
      for (const [l, c] of counts) {
        if (c > bestCount || (c === bestCount && l < best)) {
          best = l;
          bestCount = c;
        }
      }
      if (best !== labels.get(id)) {
        labels.set(id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Compact labels to 0..k-1, largest cluster first.
  const sizes = new Map<number, number>();
  for (const l of labels.values()) sizes.set(l, (sizes.get(l) ?? 0) + 1);
  const ordered = Array.from(sizes.entries()).sort((a, b) => b[1] - a[1]);
  const compact = new Map<number, number>();
  ordered.forEach(([l], i) => compact.set(l, i));
  for (const n of graph.nodes) n.cluster = compact.get(labels.get(n.id) ?? 0) ?? 0;
  return ordered.length;
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
