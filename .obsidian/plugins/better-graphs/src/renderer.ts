import { BGEdge, BGNode, BGSettings, DASH_PATTERNS, GraphData, PALETTE, hashColor } from "./types";
import { heatColor, heatColorCss } from "./heat";

export interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
  hoveredId: string | null;
  lockedId: string | null;
  focusSet: Set<string> | null; // n-hop focus, null = off
  visible: Set<string> | null; // filter result, null = all visible
  densityMode: boolean;
  heatActive: boolean;
  connectSourceId: string | null;
  glowId: string | null; // focal node for Litmaps-style views
  dark: boolean;
}

export interface DrawOptions {
  export?: boolean;
  background?: string | null; // null = transparent; overrides settings when set
  texture?: CanvasPattern | null; // background texture pattern, tiled
  labelScaleFloor?: number;
  dpr?: number; // device pixel ratio; width/height are CSS pixels
}

export function nodeRadius(n: BGNode, settings: BGSettings, now: number): number {
  const base = n.sizeOverride ?? rawRadius(n, settings, now);
  return base * settings.nodeScale;
}

function rawRadius(n: BGNode, settings: BGSettings, now: number): number {
  switch (settings.sizeMode) {
    case "links":
      // linkExaggeration is the exponent on the connection count. 0.5 is
      // the classic square root; higher values exaggerate the hubs.
      return 4 + Math.pow(n.degree, settings.linkExaggeration) * 2.2;
    case "words":
      return 4 + Math.min(Math.sqrt(n.wordCount / 60), 10);
    case "age": {
      const days = Math.max((now - n.mtime) / 86400000, 0);
      return 4 + Math.max(10 - Math.sqrt(days), 0);
    }
    default:
      return 6;
  }
}

function customColorFor(n: BGNode, settings: BGSettings): string | null {
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
      if (val !== undefined && val !== null) {
        if (want === "" || String(val).toLowerCase().includes(want)) return c.color;
      }
    }
  }
  return null;
}

// Recency ramp: pale for old notes, saturated for fresh ones.
function rampColor(n: BGNode, now: number): string {
  const days = Math.max((now - n.mtime) / 86400000, 0);
  const t = Math.max(0, Math.min(1, 1 - days / 365));
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${mix(208, 8)},${mix(227, 69)},${mix(244, 148)})`;
}

export function nodeColor(n: BGNode, settings: BGSettings): string {
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
      return v !== undefined && v !== null && v !== "" ? hashColor(String(v)) : "#9a9a9a";
    }
    case "cluster":
      return PALETTE[n.cluster % PALETTE.length];
    case "ramp":
      return rampColor(n, Date.now());
  }
}

export function isNodeShown(n: BGNode, settings: BGSettings, state: ViewState): boolean {
  if (!settings.showOrphans && n.degree === 0) return false;
  if (state.visible && !state.visible.has(n.id)) return false;
  if (state.focusSet && !state.focusSet.has(n.id)) return false;
  return true;
}

// VOSViewer bows every connection as a circular-looking arc. A quadratic
// bezier whose control point sits perpendicular to the midpoint reads the
// same way at these sizes.
function controlPoint(s: BGNode, t: BGNode, curvature: number): { cx: number; cy: number } {
  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  return { cx: mx - dy * curvature * 0.5, cy: my + dx * curvature * 0.5 };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  graph: GraphData,
  settings: BGSettings,
  state: ViewState,
  opts: DrawOptions = {}
) {
  const now = Date.now();
  const dpr = opts.dpr ?? 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (opts.background !== null) {
    let fill: string;
    if (opts.background !== undefined) fill = opts.background;
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
  let isolateSet: Set<string> | null = null;
  if (isolateId) {
    isolateSet = new Set([isolateId]);
    for (const nb of graph.adjacency.get(isolateId) ?? []) isolateSet.add(nb);
  }

  const shown = graph.nodes.filter((n) => isNodeShown(n, settings, state));
  const shownIds = new Set(shown.map((n) => n.id));
  const curved = settings.edgeStyle === "curved";

  if (state.densityMode) {
    drawDensity(ctx, width, height, dpr, shown, settings, state, now);
  } else {
    // Focal glow behind everything else, Litmaps style.
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

    // Edges.
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

    // Heat halos under nodes.
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

    // Nodes.
    for (const n of shown) {
      const r = nodeRadius(n, settings, now);
      let alpha = 1;
      if (isolateSet && !isolateSet.has(n.id)) alpha = 0.08;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = nodeColor(n, settings);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Soft rim so nodes separate from edges passing behind them.
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

  // Labels, fading in around the text-fade threshold.
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
      let labelFill: string;
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

// Edge color. In "mother" mode the edge inherits the color of the file that
// declares the link. A both-way connection follows the larger node, meaning
// the endpoint with more connections.
function edgeColor(
  e: BGEdge,
  s: BGNode,
  t: BGNode,
  fixed: string,
  settings: BGSettings
): string {
  if (settings.edgeColorMode !== "mother") return fixed;
  if (e.bidirectional) return nodeColor(s.degree >= t.degree ? s : t, settings);
  return nodeColor(s, settings);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  s: BGNode,
  t: BGNode,
  targetRadius: number,
  color: string,
  curvature: number,
  head: "triangle" | "open" | "circle" | "none"
) {
  if (head === "none") return;
  // Tangent at the target end. For the quadratic arc this is P1 - Pc.
  let ux: number;
  let uy: number;
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

// VOSViewer-style density surface: accumulate gaussian blobs, then colorize.
function drawDensity(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  shown: BGNode[],
  settings: BGSettings,
  state: ViewState,
  now: number
) {
  const downscale = 4;
  const w = Math.max(Math.floor(width / downscale), 8);
  const h = Math.max(Math.floor(height / downscale), 8);
  const field = new Float32Array(w * h);
  const sigma = 60 * state.scale / downscale;
  const cutoff = sigma * 3;

  let maxDegree = 1;
  for (const n of shown) maxDegree = Math.max(maxDegree, n.degree);

  for (const n of shown) {
    const weight = state.heatActive ? n.heat : 0.25 + (0.75 * n.degree) / maxDegree;
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
