import { ItemView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type BetterGraphsPlugin from "./main";
import { GraphData, BGNode, ColorMode, SizeMode, EdgeKind, DashStyle, HeadStyle } from "./types";
import { buildGraph } from "./data";
import { ForceSim } from "./simulation";
import { assignClusters } from "./clusters";
import { applyHeat, relevanceScores } from "./relevance";
import { applyFilter } from "./filter";
import { ViewState, draw, isNodeShown, nodeRadius } from "./renderer";
import { ConnectModal } from "./connect";
import { ExportModal } from "./print";
import { EmojiPickerModal } from "./emoji";

export const VIEW_TYPE_BETTER_GRAPH = "better-graphs-view";

const EDGE_KINDS: [EdgeKind, string][] = [
  ["link", "Plain link"],
  ["north", "North"],
  ["south", "South"],
  ["west", "West"],
  ["east", "East"],
];

export class BetterGraphView extends ItemView {
  private plugin: BetterGraphsPlugin;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private graph: GraphData = { nodes: [], edges: [], byId: new Map(), adjacency: new Map() };
  private sim = new ForceSim();
  private state: ViewState = {
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
    dark: document.body.classList.contains("theme-dark"),
  };
  private rafId = 0;
  private draggingNode: BGNode | null = null;
  private panning = false;
  private lastMouse = { x: 0, y: 0 };
  private moved = false;
  private connectMode = false;
  private saveTimer: number | null = null;
  private settleFit = false;
  private controlsEl!: HTMLElement;
  private relevanceListEl: HTMLElement | null = null;
  private texturePattern: CanvasPattern | null = null;
  private litmapsActive = false;

  constructor(leaf: WorkspaceLeaf, plugin: BetterGraphsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_BETTER_GRAPH;
  }

  getDisplayText(): string {
    return "Better Graph";
  }

  getIcon(): string {
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
  }

  async onClose() {
    cancelAnimationFrame(this.rafId);
  }

  async reload() {
    this.graph = await buildGraph(this.app, this.plugin.settings);
    assignClusters(this.graph);
    this.refreshGroups();
    this.sim.setForces(this.plugin.settings.forces);
    this.sim.setData(this.graph.nodes, this.graph.edges);
    this.sim.warmup(280);
    this.centerGraph();
    this.settleFit = true;
  }

  private refreshGroups() {
    for (const n of this.graph.nodes) n.groupColor = undefined;
    for (const g of this.plugin.settings.groups) {
      if (!g.query.trim()) continue;
      const match = applyFilter(this.graph.nodes, g.query);
      if (!match) continue;
      for (const n of this.graph.nodes) {
        if (n.groupColor === undefined && match.has(n.id)) n.groupColor = g.color;
      }
    }
  }

  private loadTexture() {
    this.texturePattern = null;
    const path = this.plugin.settings.texturePath;
    if (!path) return;
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) return;
    const img = new Image();
    img.onload = () => {
      this.texturePattern = this.ctx.createPattern(img, "repeat");
    };
    img.src = this.app.vault.getResourcePath(f);
  }

  // ---------- Litmaps-style views ----------

  // Relevance rings: seed in the middle, everything else on concentric
  // rings sorted by relevance. Invoked from a node's right click menu.
  litmapsRings(seedId: string) {
    const seed = this.graph.byId.get(seedId);
    if (!seed) return;
    const scores = relevanceScores(this.graph, seedId, this.plugin.settings.relevanceWeights);
    const ranked = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60);
    if (ranked.length === 0) {
      new Notice("No related notes found for this seed.");
      return;
    }
    const included = new Set<string>([seedId]);
    const ringRadius = [170, 300, 430];
    const perRing = Math.ceil(ranked.length / 3);
    ranked.forEach(([id], i) => {
      const node = this.graph.byId.get(id);
      if (!node) return;
      included.add(id);
      const ring = Math.min(Math.floor(i / perRing), 2);
      const idxInRing = i - ring * perRing;
      const count = Math.min(perRing, ranked.length - ring * perRing);
      const angle = (idxInRing / Math.max(count, 1)) * Math.PI * 2 + ring * 0.35;
      node.x = seed.x + Math.cos(angle) * ringRadius[ring];
      node.y = seed.y + Math.sin(angle) * ringRadius[ring];
      node.vx = 0;
      node.vy = 0;
    });
    this.enterLitmaps(seedId, included);
  }

  // Focal burst: direct and second-hop neighbors radiate out from the
  // focal note with a glow, like the Litmaps promotional diagram.
  litmapsBurst(seedId: string) {
    const seed = this.graph.byId.get(seedId);
    if (!seed) return;
    const hop1 = Array.from(this.graph.adjacency.get(seedId) ?? []);
    const hop2: string[] = [];
    const seen = new Set<string>([seedId, ...hop1]);
    for (const h of hop1) {
      for (const nb of this.graph.adjacency.get(h) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          hop2.push(nb);
        }
      }
    }
    if (hop1.length === 0) {
      new Notice("This note has no connections to burst.");
      return;
    }
    const place = (ids: string[], radius: number, offset: number) => {
      ids.forEach((id, i) => {
        const node = this.graph.byId.get(id);
        if (!node) return;
        const angle = (i / Math.max(ids.length, 1)) * Math.PI * 2 + offset;
        node.x = seed.x + Math.cos(angle) * radius;
        node.y = seed.y + Math.sin(angle) * radius;
        node.vx = 0;
        node.vy = 0;
      });
    };
    place(hop1, 190, 0);
    place(hop2.slice(0, 80), 360, 0.2);
    const included = new Set<string>([seedId, ...hop1, ...hop2.slice(0, 80)]);
    this.enterLitmaps(seedId, included);
  }

  private enterLitmaps(seedId: string, included: Set<string>) {
    this.state.focusSet = included;
    this.state.glowId = seedId;
    this.state.lockedId = null;
    this.litmapsActive = true;
    this.sim.alpha = 0; // freeze the layout while the view is arranged
    const seed = this.graph.byId.get(seedId);
    if (seed) {
      const w = this.canvas.clientWidth || 800;
      const h = this.canvas.clientHeight || 600;
      this.state.scale = Math.min((Math.min(w, h) - 80) / 980, 1.2);
      this.state.offsetX = w / 2 - seed.x * this.state.scale;
      this.state.offsetY = h / 2 - seed.y * this.state.scale;
    }
    new Notice("Press Escape to exit this view.");
  }

  private exitLitmaps() {
    if (!this.litmapsActive) return;
    this.litmapsActive = false;
    this.state.glowId = null;
    this.state.focusSet = null;
    this.sim.reheat(0.5);
  }

  // ---------- toolbar ----------

  private buildToolbar(container: HTMLElement) {
    const bar = container.createDiv();
    bar.style.display = "flex";
    bar.style.flexWrap = "wrap";
    bar.style.gap = "6px";
    bar.style.padding = "6px 8px";
    bar.style.alignItems = "center";
    bar.style.borderBottom = "1px solid var(--background-modifier-border)";

    const btn = (label: string, title: string, cb: (el: HTMLElement) => void): HTMLElement => {
      const b = bar.createEl("button", { text: label });
      b.title = title;
      b.onclick = () => cb(b);
      return b;
    };

    btn("Reload", "Rebuild the graph from the vault", () => void this.reload());
    btn("Fit", "Fit the whole graph in the view", () => this.centerGraph());

    btn("Density", "Toggle density heatmap view", (el) => {
      this.state.densityMode = !this.state.densityMode;
      el.toggleClass("mod-cta", this.state.densityMode);
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

    btn("Controls", "Show or hide the graph controls panel", (el) => {
      const hidden = this.controlsEl.style.display === "none";
      this.controlsEl.style.display = hidden ? "" : "none";
      el.toggleClass("mod-cta", hidden);
    });
  }

  // ---------- controls panel ----------

  private buildControls(wrap: HTMLElement) {
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

    const section = (title: string): HTMLElement => {
      const h = panel.createEl("div", { text: title });
      h.style.fontWeight = "600";
      h.style.margin = "10px 0 4px";
      h.style.color = "var(--text-muted)";
      return panel.createDiv();
    };

    const slider = (
      parent: HTMLElement,
      label: string,
      min: number,
      max: number,
      step: number,
      value: number,
      cb: (v: number) => void
    ) => {
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

    const toggle = (parent: HTMLElement, label: string, value: boolean, cb: (v: boolean) => void) => {
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

    const select = (
      parent: HTMLElement,
      options: [string, string][],
      value: string,
      cb: (v: string) => void
    ): HTMLSelectElement => {
      const sel = parent.createEl("select");
      sel.style.width = "100%";
      sel.style.margin = "3px 0";
      for (const [v, label] of options) sel.createEl("option", { value: v, text: label });
      sel.value = value;
      sel.onchange = () => cb(sel.value);
      return sel;
    };

    // Filters. Same operators as the native graph view groups:
    // path:, file:, tag:, line:(...), section:(...), [property]
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

    // Heatmap and relevance.
    const heatSec = section("Heatmap and relevance");
    const heatInput = heatSec.createEl("input", { type: "text" });
    heatInput.placeholder = "keyword or #hashtag, Enter to run";
    heatInput.style.width = "100%";
    heatInput.onkeydown = (ev) => {
      if (ev.key !== "Enter") return;
      applyHeat(this.graph, heatInput.value, s.relevanceWeights);
      this.state.heatActive = heatInput.value.trim().length > 0;
      this.renderRelevanceList();
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

    // Groups, following the native Obsidian group grammar.
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

    // Custom colors for specific folders, tags, or property values.
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
          ["property", "prop"],
        ]) {
          kind.createEl("option", { value: v, text: label });
        }
        kind.value = c.kind;
        kind.onchange = () => {
          c.kind = kind.value as typeof c.kind;
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

    // Display.
    const display = section("Display");
    select(
      display,
      [
        ["folder", "Color: folder"],
        ["tag", "Color: tag"],
        ["property", "Color: property"],
        ["cluster", "Color: cluster"],
        ["ramp", "Color: recency ramp"],
      ],
      s.colorMode,
      (v) => {
        s.colorMode = v as ColorMode;
        save();
      }
    );
    select(
      display,
      [
        ["links", "Size: links"],
        ["words", "Size: words"],
        ["age", "Size: recency"],
        ["uniform", "Size: uniform"],
      ],
      s.sizeMode,
      (v) => {
        s.sizeMode = v as SizeMode;
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
        ["straight", "Lines: straight"],
      ],
      s.edgeStyle,
      (v) => {
        s.edgeStyle = v as "straight" | "curved";
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

    // Edge styles per relation kind.
    const edges = section("Arrows and lines");
    select(
      edges,
      [
        ["mother", "Arrow color: follow mother file"],
        ["fixed", "Arrow color: fixed per type"],
      ],
      s.edgeColorMode,
      (v) => {
        s.edgeColorMode = v as "mother" | "fixed";
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
        st.dash = dash.value as DashStyle;
        save();
      };
      const headSel = row.createEl("select");
      for (const hd of ["triangle", "open", "circle", "none"]) headSel.createEl("option", { value: hd, text: hd });
      headSel.value = st.head;
      headSel.title = "Arrowhead";
      headSel.onchange = () => {
        st.head = headSel.value as HeadStyle;
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

    // Background.
    const bg = section("Background");
    select(
      bg,
      [
        ["theme", "Background: theme"],
        ["color", "Background: color"],
        ["texture", "Background: texture"],
      ],
      s.backgroundMode,
      (v) => {
        s.backgroundMode = v as typeof s.backgroundMode;
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
        ["light", "Labels: light (dark backgrounds)"],
      ],
      s.labelColor,
      (v) => {
        s.labelColor = v as typeof s.labelColor;
        save();
      }
    );
    // Any folder named like the configured textures folder counts, at any
    // depth in the vault, so texture packs can live next to project notes.
    const folderName = s.texturesFolder.toLowerCase();
    const textures = this.app.vault
      .getFiles()
      .filter(
        (f) =>
          ["png", "jpg", "jpeg", "webp"].includes(f.extension.toLowerCase()) &&
          f.path.toLowerCase().split("/").slice(0, -1).includes(folderName)
      )
      .sort((a, b) => a.basename.localeCompare(b.basename));
    const texOptions: [string, string][] = [["", "No texture"]];
    for (const f of textures) texOptions.push([f.path, f.basename]);
    select(bg, texOptions, s.texturePath, (v) => {
      s.texturePath = v;
      this.loadTexture();
      save();
    });
    if (textures.length === 0) {
      const hint = bg.createEl("div", {
        text: `No images found in any "${s.texturesFolder}" folder. Create one anywhere in the vault and drop image files in it, then reopen the graph.`,
      });
      hint.style.color = "var(--text-muted)";
    }

    // Forces.
    const forces = section("Forces");
    slider(forces, "Center force", 0, 0.06, 0.002, s.forces.center, (v) => {
      s.forces.center = v;
      this.sim.setForces(s.forces);
      save();
    });
    slider(forces, "Repel force", 200, 9000, 100, s.forces.repel, (v) => {
      s.forces.repel = v;
      this.sim.setForces(s.forces);
      save();
    });
    slider(forces, "Link force", 0, 0.15, 0.005, s.forces.linkStrength, (v) => {
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
  private renderRelevanceList() {
    const el = this.relevanceListEl;
    if (!el) return;
    el.empty();
    if (!this.state.heatActive) return;
    const ranked = this.graph.nodes
      .filter((n) => n.heat > 0.02)
      .sort((a, b) => b.heat - a.heat)
      .slice(0, 25);
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

  private loop() {
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
      texture: this.texturePattern,
    });
  }

  private centerGraph() {
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
    this.state.offsetX = w / 2 - ((minX + maxX) / 2) * scale;
    this.state.offsetY = h / 2 - ((minY + maxY) / 2) * scale;
  }

  // ---------- interaction ----------

  private toWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.state.offsetX) / this.state.scale,
      y: (sy - this.state.offsetY) / this.state.scale,
    };
  }

  private hitTest(sx: number, sy: number): BGNode | null {
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

  private bindEvents() {
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
      const factor = Math.exp(-ev.deltaY * 0.0012);
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
      if (file instanceof TFile) void this.app.workspace.getLeaf(false).openFile(file);
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

  private handleClick(node: BGNode, ev: MouseEvent) {
    if (this.connectMode) {
      if (!this.state.connectSourceId) {
        this.state.connectSourceId = node.id;
        new Notice(`Source: ${node.name}. Now click the target node.`);
      } else if (this.state.connectSourceId !== node.id) {
        const source = this.state.connectSourceId;
        this.state.connectSourceId = null;
        const modal = new ConnectModal(this.app, source, node.id, this.plugin.settings.connectionsHeading);
        modal.open();
        const origClose = modal.onClose.bind(modal);
        modal.onClose = () => {
          origClose();
          window.setTimeout(() => void this.reload(), 400);
        };
      }
      return;
    }
    if (ev.ctrlKey || ev.metaKey) {
      this.state.focusSet = this.nHop(node.id, this.plugin.settings.focusHops);
      return;
    }
    this.state.lockedId = this.state.lockedId === node.id ? null : node.id;
  }

  private nHop(id: string, hops: number): Set<string> {
    const set = new Set([id]);
    let frontier = [id];
    for (let i = 0; i < hops; i++) {
      const next: string[] = [];
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

  private nodeMenu(node: BGNode, ev: MouseEvent) {
    const menu = new Menu();
    menu.addItem((i) =>
      i.setTitle(node.pinned ? "Unpin position" : "Pin position").setIcon("pin").onClick(() => {
        node.pinned = !node.pinned;
        this.persistNode(node);
        if (!node.pinned) this.sim.reheat(0.3);
      })
    );
    menu.addItem((i) =>
      i.setTitle("Set icon...").setIcon("smile").onClick(() => {
        new EmojiPickerModal(this.app, node.name, (choice) => {
          const targets = [node];
          if (choice.applyToConnected) {
            for (const nb of this.graph.adjacency.get(node.id) ?? []) {
              const other = this.graph.byId.get(nb);
              if (other) targets.push(other);
            }
          }
          for (const t of targets) {
            t.icon = choice.emoji ?? undefined;
            this.persistIcon(t);
          }
        }).open();
      })
    );
    menu.addItem((i) =>
      i.setTitle("Set color...").setIcon("palette").onClick(() => {
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
    menu.addItem((i) =>
      i.setTitle("Clear color override").onClick(() => {
        node.color = undefined;
        this.persistNode(node);
      })
    );
    menu.addItem((i) =>
      i.setTitle("Relevance rings").setIcon("circle-dot").onClick(() => {
        this.litmapsRings(node.id);
      })
    );
    menu.addItem((i) =>
      i.setTitle("Focal burst").setIcon("sun").onClick(() => {
        this.litmapsBurst(node.id);
      })
    );
    menu.addItem((i) =>
      i.setTitle("Focus neighborhood").setIcon("target").onClick(() => {
        this.state.focusSet = this.nHop(node.id, this.plugin.settings.focusHops);
      })
    );
    menu.addItem((i) =>
      i.setTitle("Open note").setIcon("file").onClick(() => {
        const file = this.app.vault.getAbstractFileByPath(node.id);
        if (file instanceof TFile) void this.app.workspace.getLeaf(false).openFile(file);
      })
    );
    menu.showAtMouseEvent(ev);
  }

  private persistNode(node: BGNode) {
    const overrides = this.plugin.settings.nodeOverrides;
    overrides[node.id] = {
      ...(overrides[node.id] ?? {}),
      x: node.x,
      y: node.y,
      pinned: node.pinned,
      color: node.color,
    };
    this.scheduleSave();
  }

  private persistIcon(node: BGNode) {
    const overrides = this.plugin.settings.nodeOverrides;
    overrides[node.id] = { ...(overrides[node.id] ?? {}), icon: node.icon };
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.plugin.saveSettings(), 800);
  }
}
