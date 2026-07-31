import { BGEdge, BGNode, ForceSettings } from "./types";

const DAMPING = 0.82;
const MIN_ALPHA = 0.012;

export class ForceSim {
  nodes: BGNode[] = [];
  edges: BGEdge[] = [];
  alpha = 0;
  forces: ForceSettings = { center: 0.012, repel: 2600, linkStrength: 0.04, linkDistance: 130 };
  private byId = new Map<string, BGNode>();

  setData(nodes: BGNode[], edges: BGEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.byId = new Map(nodes.map((n) => [n.id, n]));
    this.reheat(1);
  }

  setForces(forces: ForceSettings) {
    this.forces = forces;
    this.reheat(0.4);
  }

  reheat(alpha = 0.5) {
    this.alpha = Math.max(this.alpha, alpha);
  }

  get active(): boolean {
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

    // Repulsion via spatial grid.
    const cell = cutoff;
    const grid = new Map<string, BGNode[]>();
    for (const n of this.nodes) {
      const key = Math.floor(n.x / cell) + ":" + Math.floor(n.y / cell);
      let bucket = grid.get(key);
      if (!bucket) grid.set(key, (bucket = []));
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
            const f = (repel / d2) * a;
            const d = Math.sqrt(d2);
            n.vx += (dx / d) * f;
            n.vy += (dy / d) * f;
          }
        }
      }
    }

    // Link springs.
    for (const e of this.edges) {
      const s = this.byId.get(e.source);
      const t = this.byId.get(e.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - linkDistance) * linkStrength * a;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // Gravity toward origin, integration.
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
}
