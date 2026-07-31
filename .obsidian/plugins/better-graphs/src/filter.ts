import { BGNode } from "./types";

// Native Obsidian group grammar:
//   path:  match path of the file
//   file:  match file name
//   tag:   search for tags
//   line:(a b)     keywords on the same line
//   section:(a b)  keywords under the same heading
//   [property] or [property:value]  match frontmatter property
// Legacy prop:key=value stays supported. Bare words match file names.

interface Token {
  op: string; // "path" | "file" | "tag" | "line" | "section" | "prop" | "word"
  value: string;
}

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  const re = /\[([^\]]+)\]|(path|file|tag|line|section|prop):(\([^)]*\)|"[^"]*"|\S*)|(\S+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query)) !== null) {
    if (m[1] !== undefined) {
      tokens.push({ op: "prop", value: m[1].toLowerCase() });
    } else if (m[2] !== undefined) {
      let v = m[3] ?? "";
      if (v.startsWith("(") || v.startsWith('"')) v = v.slice(1, -1);
      tokens.push({ op: m[2].toLowerCase(), value: v.toLowerCase() });
    } else if (m[4]) {
      tokens.push({ op: "word", value: m[4].toLowerCase() });
    }
  }
  return tokens;
}

function matchToken(n: BGNode, t: Token): boolean {
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
      // Sections are the stretches between headings.
      return n.text.split(/\n#{1,6} /).some((sec) => words.every((w) => sec.includes(w)));
    }
    case "prop": {
      const eq = t.value.indexOf(t.value.includes("=") ? "=" : ":");
      const key = eq > 0 ? t.value.slice(0, eq) : t.value;
      const want = eq > 0 ? t.value.slice(eq + 1) : "";
      const val = n.frontmatter[key];
      if (val === undefined || val === null) return false;
      if (want === "") return true;
      if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(want));
      return String(val).toLowerCase().includes(want);
    }
    default:
      return n.name.toLowerCase().includes(t.value);
  }
}

export function matchesQuery(n: BGNode, query: string): boolean {
  return tokenize(query).every((t) => matchToken(n, t));
}

export function applyFilter(nodes: BGNode[], query: string): Set<string> | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const tokens = tokenize(trimmed);
  const result = new Set<string>();
  for (const n of nodes) {
    if (tokens.every((t) => matchToken(n, t))) result.add(n.id);
  }
  return result;
}
