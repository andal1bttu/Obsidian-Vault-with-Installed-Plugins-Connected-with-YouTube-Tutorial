import { App, Modal, Notice, Setting, normalizePath } from "obsidian";
import { BGSettings, GraphData } from "./types";
import { ViewState, draw, isNodeShown, nodeRadius } from "./renderer";
import { PAGE_GROUPS, findPage, mmToPt, mmToPx } from "./pages";
import { jpegToPdf } from "./pdf";

const EXPORT_FOLDER = "Better Graph Exports";
const MAX_DIMENSION = 12000;

export class ExportModal extends Modal {
  private graph: GraphData;
  private settings: BGSettings;
  private state: ViewState;
  private viewWidth: number;
  private viewHeight: number;
  private onSave: () => Promise<void>;
  private texture: CanvasPattern | null;

  private customWmm = 210;
  private customHmm = 297;

  constructor(
    app: App,
    graph: GraphData,
    settings: BGSettings,
    state: ViewState,
    viewWidth: number,
    viewHeight: number,
    onSave: () => Promise<void>,
    texture: CanvasPattern | null = null
  ) {
    super(app);
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

    let sizeSetting: Setting;
    let customRow: Setting;
    let info: HTMLElement;

    new Setting(contentEl).setName("Format").addDropdown((dd) => {
      dd.addOption("png", "PNG");
      dd.addOption("jpg", "JPG");
      dd.addOption("pdf", "PDF");
      dd.setValue(d.format);
      dd.onChange((v) => {
        d.format = v as typeof d.format;
        update();
      });
    });

    new Setting(contentEl).setName("Page convention").addDropdown((dd) => {
      for (const group of Object.keys(PAGE_GROUPS)) dd.addOption(group, group);
      dd.setValue(d.pageGroup);
      dd.onChange((v) => {
        d.pageGroup = v;
        d.pageName = PAGE_GROUPS[v][0].name;
        rebuildSizes();
        update();
      });
    });

    sizeSetting = new Setting(contentEl).setName("Page size");
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

    customRow = new Setting(contentEl)
      .setName("Custom size (mm)")
      .addText((t) => {
        t.setPlaceholder("width").setValue(String(this.customWmm));
        t.inputEl.style.width = "70px";
        t.onChange((v) => {
          this.customWmm = Number(v) || 210;
          update();
        });
      })
      .addText((t) => {
        t.setPlaceholder("height").setValue(String(this.customHmm));
        t.inputEl.style.width = "70px";
        t.onChange((v) => {
          this.customHmm = Number(v) || 297;
          update();
        });
      });

    new Setting(contentEl).setName("Orientation").addDropdown((dd) => {
      dd.addOption("portrait", "Portrait");
      dd.addOption("landscape", "Landscape");
      dd.setValue(d.orientation);
      dd.onChange((v) => {
        d.orientation = v as typeof d.orientation;
        update();
      });
    });

    new Setting(contentEl).setName("Resolution (DPI)").addDropdown((dd) => {
      for (const dpi of [72, 150, 300, 600]) dd.addOption(String(dpi), String(dpi));
      dd.setValue(String(d.dpi));
      dd.onChange((v) => {
        d.dpi = Number(v);
        update();
      });
    });

    new Setting(contentEl).setName("Fit").addDropdown((dd) => {
      dd.addOption("graph", "Whole graph");
      dd.addOption("view", "Current viewport");
      dd.setValue(d.fit);
      dd.onChange((v) => {
        d.fit = v as typeof d.fit;
      });
    });

    new Setting(contentEl).setName("Margin (mm)").addText((t) => {
      t.setValue(String(d.marginMm));
      t.inputEl.style.width = "70px";
      t.onChange((v) => {
        d.marginMm = Math.max(Number(v) || 0, 0);
      });
    });

    new Setting(contentEl)
      .setName("Transparent background")
      .setDesc("PNG only")
      .addToggle((t) => {
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

    new Setting(contentEl).addButton((b) => {
      b.setButtonText("Export").setCta();
      b.onClick(async () => {
        this.close();
        try {
          await this.runExport();
          await this.onSave();
        } catch (err) {
          console.error("Better Graphs export failed", err);
          new Notice("Export failed. See the developer console for details.");
        }
      });
    });
  }

  onClose() {
    this.contentEl.empty();
  }

  private pageMm(): { wMm: number; hMm: number } {
    const d = this.settings.exportDefaults;
    let { wMm, hMm } =
      d.pageGroup === "Custom" ? { wMm: this.customWmm, hMm: this.customHmm } : findPage(d.pageGroup, d.pageName);
    if (d.orientation === "landscape" && hMm > wMm) [wMm, hMm] = [hMm, wMm];
    if (d.orientation === "portrait" && wMm > hMm) [wMm, hMm] = [hMm, wMm];
    return { wMm, hMm };
  }

  private pixelSize(): { wPx: number; hPx: number } {
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

  private async runExport() {
    const d = this.settings.exportDefaults;
    const { wPx, hPx } = this.pixelSize();
    const { wMm, hMm } = this.pageMm();
    const marginPx = mmToPx(d.marginMm, d.dpi) * (wPx / mmToPx(wMm, d.dpi));

    const canvas = document.createElement("canvas");
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");

    const exportState: ViewState = { ...this.state, hoveredId: null, connectSourceId: null };
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
      // Scale the current viewport onto the page.
      const factor = Math.min((wPx - marginPx * 2) / this.viewWidth, (hPx - marginPx * 2) / this.viewHeight);
      exportState.scale = this.state.scale * factor;
      exportState.offsetX = this.state.offsetX * factor + marginPx;
      exportState.offsetY = this.state.offsetY * factor + marginPx;
    }

    const transparent = d.format === "png" && d.transparent;
    let background: string | null;
    if (transparent) {
      background = null;
    } else if (this.settings.backgroundMode === "color") {
      background = this.settings.backgroundColor;
    } else if (this.settings.backgroundMode === "texture") {
      background = "#ffffff"; // base under the tiled texture
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
      labelScaleFloor: 0,
    });

    const stamp = timestamp();
    if (d.format === "pdf") {
      const jpegBlob = await toBlob(canvas, "image/jpeg", 0.92);
      const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
      const pdf = jpegToPdf(jpeg, wPx, hPx, mmToPt(wMm), mmToPt(hMm), 0);
      await this.saveBinary(`graph-${stamp}.pdf`, pdf.buffer as ArrayBuffer);
    } else {
      const mime = d.format === "png" ? "image/png" : "image/jpeg";
      const blob = await toBlob(canvas, mime, 0.92);
      await this.saveBinary(`graph-${stamp}.${d.format}`, await blob.arrayBuffer());
    }
  }

  private async saveBinary(name: string, data: ArrayBuffer) {
    const folder = normalizePath(EXPORT_FOLDER);
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }
    const path = normalizePath(`${folder}/${name}`);
    await this.app.vault.createBinary(path, data);
    new Notice(`Exported to ${path}`);
  }
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas export failed"))), mime, quality);
  });
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
