# Better Graphs

An Obsidian plugin that replaces the stock graph view with a controllable one. Nodes stay where you put them. Edges carry meaning. The whole view prints at page quality.

## Features in this version

### Relevance rings and focal burst
Both invoked from a node's right click menu:
- **Relevance rings**: the chosen note sits in the middle. Every related note arranges on three concentric rings, sorted by relevance. The strongest matches take the inner ring. Relevance signals (connections, keywords, word similarity, tags) are chosen with checkboxes in the Controls panel under "Heatmap and relevance".
- **Focal burst**: the chosen note glows in the center while its direct connections form an inner ring and second-hop connections form an outer ring, matching the Litmaps promotional diagram.
Press Escape to leave either view; the force layout resumes.

### Relevance sorting
Run a heatmap query and a ranked list appears in the Controls panel: every matching note sorted by relevance score, top 25. Clicking a row centers the view on that note and locks its neighborhood highlight. The same relevance signal checkboxes control which evidence counts: connections, keywords, word similarity, and tags.

### Arrows and lines
- Arrow color follows the mother file by default: an edge takes the color of the note that declares the link. A both-way connection follows the larger node, meaning the endpoint with more connections. Switch to fixed per-type colors in the Controls panel.
- Per relation type (plain link, North, South, West, East): line color, line width, dash style (solid, dashed, dotted), and arrowhead style (triangle, open, circle, none).
- Lines render curved (default) or straight, with a curvature slider.

### Backgrounds
Background options in the Controls panel: theme (default), a custom color, or a tiled texture. Textures are image files read from a `Textures` folder at the vault root (folder name configurable in plugin settings).

### Icons
Right click a node and pick "Set icon...". The picker holds a searchable catalog of several hundred emojis, organized the way Iconize groups icons, plus a paste box for any emoji not in the catalog. A checkbox applies the same icon to all directly connected notes in one step.

### Obsidian graph view parity
Everything the stock graph view offers stays available, inside the Controls panel (Controls button in the toolbar):
- Filters and Groups use the native group grammar: `path:`, `file:`, `tag:`, `line:(words on one line)`, `section:(words under one heading)`, and `[property]` or `[property:value]`. First matching group wins.
- Display: arrows toggle for plain links, text size slider, text fade threshold slider, node size slider, link thickness slider.
- Forces: center force, repel force, link force, and link distance sliders.

### Startup view
The layout settles off-screen before the first frame, then fits itself to the viewport. No more opening onto a random exploding hairball. It fits again automatically once the simulation cools down.

### Line styles
- Lines: curved (VOSViewer style arcs, the default) or straight. A curvature slider controls how far the arcs bow.
- Arrowheads follow the arc tangent, so they sit correctly on curved connections.

### Node controls
- Pinned positions. Drag a node and it stays there. Positions persist across restarts.
- Node color by folder, tag, frontmatter property, cluster, or a manual override from the right click menu.
- Node size by link count, word count, recency, or uniform.
- Emoji icons per node, read from a frontmatter field (default `icon`).
- Hover isolation. Hovering a node keeps it and its neighbors at full color while the rest fades. Click to lock, click empty space to release.
- Focus mode. Ctrl and click a node to show only its neighborhood within n hops. Escape clears.
- Right click menu: pin, color, focus, open note.

### Edge controls
- Compass-typed edges. Inline fields `North::`, `South::`, `West::`, and `East::` render as distinct colored edges. North and South carry arrows. East renders dashed.
- Plain wikilinks render as thin gray lines.
- Connect mode. Click Connect, click a source node, click a target node, then pick a write mode:
  1. Mother to child: appends the child link under a heading in the source note.
  2. Reciprocal: writes a bold mention of each note inside the other.
  3. Compass: writes the link into the source note's compass block as North, South, West, or East. Creates the block when missing.
- Notes under `References/` accept only the compass write mode, since Zotero owns the rest of those files.

### Analysis views
- Cluster colors through label propagation community detection. Pick "Color: cluster" in the toolbar.
- Keyword and hashtag heatmap. Type a term in the heatmap box and press Enter. Direct hits glow as primary heat, weighted by where the term appears (title, tags, headings, body). Linked and tag-sharing neighbors glow as cooler secondary heat.
- Density view. One toggle switches to a VOSViewer style density surface, blue through green and yellow to red, with labels on top.
- Filter bar with free text plus `tag:x`, `path:y`, and `prop:key=value` operators.

### Printing and export
- Print button opens one dialog for everything.
- Formats: PNG (with optional transparent background), JPG, and PDF. The PDF writer is built in, no dependency.
- Resolution presets: 72, 150, 300, 600 DPI, with the output pixel size shown before export.
- Page sizes grouped by convention: ISO A (A5 to A0), US and ANSI (Letter, Legal, Tabloid, Ledger, ANSI C to E), ARCH (A to E), and Custom in millimeters.
- Portrait and landscape. Fit whole graph or current viewport. Adjustable margin.
- Exports save into a `Better Graph Exports` folder in the vault.

## Install

1. Copy this folder into `<your vault>/.obsidian/plugins/better-graphs/`. The folder must contain `manifest.json` and `main.js`.
2. In Obsidian, open Settings, then Community plugins, and enable Better Graphs.
3. Open the view from the ribbon icon or the command palette ("Open Better Graph").

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type check and production build
```

Built output is `main.js` at the repo root.

## Roadmap

Planned but not in this version: relevance ring layout with weightable importance sliders, focal burst view with edge bundling, timeline and hierarchy layouts, saved views, suggested connections panel, seed expansion, animated growth, minimap, multi-page tiling with crop marks, title block and legend on export, item versus cluster density modes.

## License

MIT
