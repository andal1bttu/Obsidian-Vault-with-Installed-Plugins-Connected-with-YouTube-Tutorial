import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, addIcon } from "obsidian";
import { BGSettings, DEFAULT_EDGE_STYLES, DEFAULT_SETTINGS } from "./types";
import { BetterGraphView, VIEW_TYPE_BETTER_GRAPH } from "./view";

export const BETTER_GRAPH_ICON = "better-graphs-fork-alert";

// Git-fork glyph with an exclamation mark on its left.
const ICON_SVG = `
<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
  <line x1="13" y1="22" x2="13" y2="58"/>
  <circle cx="13" cy="76" r="1.5" fill="currentColor"/>
  <circle cx="52" cy="27" r="10"/>
  <circle cx="88" cy="27" r="10"/>
  <circle cx="70" cy="73" r="10"/>
  <path d="M52 37 v6 c0 4 3 7 7 7 h22 c4 0 7 -3 7 -7 v-6"/>
  <path d="M70 50 v13"/>
</g>`;

export default class BetterGraphsPlugin extends Plugin {
  settings: BGSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    addIcon(BETTER_GRAPH_ICON, ICON_SVG);

    this.registerView(VIEW_TYPE_BETTER_GRAPH, (leaf: WorkspaceLeaf) => new BetterGraphView(leaf, this));

    this.addRibbonIcon(BETTER_GRAPH_ICON, "Open Better Graph", () => void this.activateView());
    this.addCommand({
      id: "open-better-graph",
      name: "Open Better Graph",
      callback: () => void this.activateView(),
    });

    this.addSettingTab(new BGSettingTab(this.app, this));
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
    const data = (await this.loadData()) ?? {};
    const edgeStyles = { ...DEFAULT_EDGE_STYLES };
    for (const kind of Object.keys(edgeStyles) as (keyof typeof edgeStyles)[]) {
      edgeStyles[kind] = { ...DEFAULT_EDGE_STYLES[kind], ...((data.edgeStyles ?? {})[kind] ?? {}) };
    }
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...data,
      exportDefaults: { ...DEFAULT_SETTINGS.exportDefaults, ...(data.exportDefaults ?? {}) },
      forces: { ...DEFAULT_SETTINGS.forces, ...(data.forces ?? {}) },
      relevanceWeights: { ...DEFAULT_SETTINGS.relevanceWeights, ...(data.relevanceWeights ?? {}) },
      edgeStyles,
      groups: Array.isArray(data.groups) ? data.groups : [],
      customColors: Array.isArray(data.customColors) ? data.customColors : [],
      nodeOverrides: data.nodeOverrides ?? {},
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class BGSettingTab extends PluginSettingTab {
  plugin: BetterGraphsPlugin;

  constructor(app: App, plugin: BetterGraphsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Better Graphs" });

    new Setting(containerEl)
      .setName("Pin nodes on drop")
      .setDesc("A dragged node keeps its position after release.")
      .addToggle((t) => {
        t.setValue(this.plugin.settings.pinOnDrop);
        t.onChange(async (v) => {
          this.plugin.settings.pinOnDrop = v;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Color property")
      .setDesc("Frontmatter field used when color mode is set to property.")
      .addText((t) => {
        t.setValue(this.plugin.settings.colorProperty);
        t.onChange(async (v) => {
          this.plugin.settings.colorProperty = v.trim() || "pillar";
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Icon property")
      .setDesc("Frontmatter field holding an emoji icon for the node.")
      .addText((t) => {
        t.setValue(this.plugin.settings.iconProperty);
        t.onChange(async (v) => {
          this.plugin.settings.iconProperty = v.trim() || "icon";
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Connections heading")
      .setDesc("Heading the connect tool appends links under.")
      .addText((t) => {
        t.setValue(this.plugin.settings.connectionsHeading);
        t.onChange(async (v) => {
          this.plugin.settings.connectionsHeading = v.trim() || "## Connections";
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Focus hops")
      .setDesc("Neighborhood depth for focus mode (Ctrl+click a node).")
      .addSlider((s) => {
        s.setLimits(1, 4, 1).setValue(this.plugin.settings.focusHops).setDynamicTooltip();
        s.onChange(async (v) => {
          this.plugin.settings.focusHops = v;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Show labels")
      .addToggle((t) => {
        t.setValue(this.plugin.settings.showLabels);
        t.onChange(async (v) => {
          this.plugin.settings.showLabels = v;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Clear all pinned positions and overrides")
      .addButton((b) => {
        b.setButtonText("Clear").setWarning();
        b.onClick(async () => {
          this.plugin.settings.nodeOverrides = {};
          await this.plugin.saveSettings();
        });
      });
  }
}
