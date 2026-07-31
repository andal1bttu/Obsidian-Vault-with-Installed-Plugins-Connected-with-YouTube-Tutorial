export type EdgeKind = "link" | "north" | "south" | "west" | "east";

export interface BGNode {
  id: string; // vault path
  name: string; // basename without extension
  folder: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
  headings: string[];
  text: string; // lowercased body text, capped
  wordCount: number;
  mtime: number;
  // simulation state
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
  // derived
  degree: number;
  cluster: number;
  heat: number; // 0..1 heatmap score
  heatKind: "none" | "primary" | "secondary";
  // style overrides
  color?: string;
  groupColor?: string;
  icon?: string;
  sizeOverride?: number;
}

export interface BGEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  bidirectional: boolean;
}

export interface GraphData {
  nodes: BGNode[];
  edges: BGEdge[];
  byId: Map<string, BGNode>;
  adjacency: Map<string, Set<string>>;
}

export type ColorMode = "folder" | "tag" | "property" | "cluster" | "ramp";
export type SizeMode = "links" | "words" | "age" | "uniform";
export type DashStyle = "solid" | "dashed" | "dotted";
export type HeadStyle = "triangle" | "open" | "circle" | "none";

export interface EdgeKindStyle {
  color: string;
  width: number;
  dash: DashStyle;
  head: HeadStyle;
}

export interface NodeOverride {
  x?: number;
  y?: number;
  pinned?: boolean;
  color?: string;
  icon?: string;
  size?: number;
}

export interface ColorGroup {
  query: string;
  color: string;
}

export interface CustomColor {
  kind: "folder" | "tag" | "property";
  key: string; // folder path, tag name, or property "name=value"
  color: string;
}

export interface ForceSettings {
  center: number;
  repel: number;
  linkStrength: number;
  linkDistance: number;
}

export interface RelevanceWeights {
  connections: boolean;
  keywords: boolean;
  similarity: boolean;
  tags: boolean;
}

export interface ExportDefaults {
  format: "png" | "jpg" | "pdf";
  pageGroup: string;
  pageName: string;
  orientation: "portrait" | "landscape";
  dpi: number;
  fit: "graph" | "view";
  transparent: boolean;
  marginMm: number;
}

export interface BGSettings {
  colorMode: ColorMode;
  colorProperty: string;
  sizeMode: SizeMode;
  iconProperty: string;
  pinOnDrop: boolean;
  connectionsHeading: string;
  focusHops: number;
  showLabels: boolean;
  // Obsidian graph view parity
  showOrphans: boolean;
  showLinkArrows: boolean;
  textFade: number; // zoom level where labels start to appear
  textSize: number; // label size multiplier
  nodeScale: number; // node size multiplier
  lineWidth: number; // link thickness multiplier
  groups: ColorGroup[];
  forces: ForceSettings;
  lockLayout: boolean;
  // edge geometry and style
  edgeStyle: "straight" | "curved";
  curvature: number; // 0..1 arc bow
  edgeStyles: Record<EdgeKind, EdgeKindStyle>;
  edgeColorMode: "mother" | "fixed"; // mother = edge inherits the declaring file's node color
  // node sizing
  linkExaggeration: number; // exponent applied to connection count
  // coloring
  customColors: CustomColor[];
  // background
  backgroundMode: "theme" | "color" | "texture";
  backgroundColor: string;
  texturePath: string;
  texturesFolder: string;
  labelColor: "auto" | "light" | "dark";
  // relevance
  relevanceWeights: RelevanceWeights;
  nodeOverrides: Record<string, NodeOverride>;
  exportDefaults: ExportDefaults;
}

export const DEFAULT_EDGE_STYLES: Record<EdgeKind, EdgeKindStyle> = {
  link: { color: "#888888", width: 1, dash: "solid", head: "triangle" },
  north: { color: "#c0392b", width: 1.6, dash: "solid", head: "triangle" },
  south: { color: "#27ae60", width: 1.6, dash: "solid", head: "triangle" },
  west: { color: "#2980b9", width: 1.4, dash: "solid", head: "none" },
  east: { color: "#8e44ad", width: 1.4, dash: "dashed", head: "none" },
};

export const DEFAULT_SETTINGS: BGSettings = {
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
  nodeOverrides: {},
  exportDefaults: {
    format: "png",
    pageGroup: "ISO A",
    pageName: "A4",
    orientation: "landscape",
    dpi: 300,
    fit: "graph",
    transparent: true,
    marginMm: 10,
  },
};

export const PALETTE = [
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
  "#d37295",
];

export const DASH_PATTERNS: Record<DashStyle, number[]> = {
  solid: [],
  dashed: [6, 4],
  dotted: [1.5, 3.5],
};

export function hashColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
