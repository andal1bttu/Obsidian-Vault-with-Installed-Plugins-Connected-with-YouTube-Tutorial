import { App, Modal, Notice, TFile } from "obsidian";

export type ConnectMode = "mother-child" | "reciprocal" | "compass";
export type CompassDir = "North" | "South" | "West" | "East";

export class ConnectModal extends Modal {
  private sourcePath: string;
  private targetPath: string;
  private heading: string;

  constructor(app: App, sourcePath: string, targetPath: string, heading: string) {
    super(app);
    this.sourcePath = sourcePath;
    this.targetPath = targetPath;
    this.heading = heading;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Connect notes" });
    contentEl.createEl("p", {
      text: `${basename(this.sourcePath)}  →  ${basename(this.targetPath)}`,
    });

    const inReferences = this.sourcePath.startsWith("References/") || this.targetPath.startsWith("References/");
    if (inReferences) {
      contentEl.createEl("p", {
        text: "One of these notes lives in References. Only the compass write mode is allowed there.",
      });
    }

    const addButton = (label: string, cb: () => void, disabled = false) => {
      const btn = contentEl.createEl("button", { text: label });
      btn.style.display = "block";
      btn.style.margin = "6px 0";
      btn.style.width = "100%";
      btn.disabled = disabled;
      btn.onclick = () => {
        this.close();
        cb();
      };
    };

    addButton(
      `Mother to child: append link under "${this.heading}" in the source note`,
      () => void writeMotherChild(this.app, this.sourcePath, this.targetPath, this.heading),
      inReferences
    );
    addButton(
      "Reciprocal: bold mention of each note inside the other",
      () => void writeReciprocal(this.app, this.sourcePath, this.targetPath, this.heading),
      inReferences
    );

    contentEl.createEl("p", { text: "Compass: write into the source note's compass block as..." });
    const row = contentEl.createDiv();
    row.style.display = "flex";
    row.style.gap = "6px";
    for (const dir of ["North", "South", "West", "East"] as CompassDir[]) {
      const btn = row.createEl("button", { text: dir });
      btn.style.flex = "1";
      btn.onclick = () => {
        this.close();
        void writeCompass(this.app, this.sourcePath, this.targetPath, dir);
      };
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

function basename(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.md$/, "");
}

function getFile(app: App, path: string): TFile | null {
  const f = app.vault.getAbstractFileByPath(path);
  return f instanceof TFile ? f : null;
}

async function appendUnderHeading(app: App, file: TFile, heading: string, line: string) {
  await app.vault.process(file, (content) => {
    const idx = content.indexOf(heading);
    if (idx === -1) {
      return content.replace(/\s*$/, "") + `\n\n${heading}\n${line}\n`;
    }
    const afterHeading = idx + heading.length;
    const nextHeading = content.slice(afterHeading).search(/\n#{1,6} /);
    const insertAt = nextHeading === -1 ? content.length : afterHeading + nextHeading;
    const before = content.slice(0, insertAt).replace(/\s*$/, "");
    return before + `\n${line}\n` + content.slice(insertAt).replace(/^\n/, "\n");
  });
}

export async function writeMotherChild(app: App, motherPath: string, childPath: string, heading: string) {
  const mother = getFile(app, motherPath);
  if (!mother) return;
  await appendUnderHeading(app, mother, heading, `- [[${basename(childPath)}]]`);
  new Notice(`Linked [[${basename(childPath)}]] inside ${basename(motherPath)}`);
}

export async function writeReciprocal(app: App, aPath: string, bPath: string, heading: string) {
  const a = getFile(app, aPath);
  const b = getFile(app, bPath);
  if (!a || !b) return;
  await appendUnderHeading(app, a, heading, `- **[[${basename(bPath)}]]**`);
  await appendUnderHeading(app, b, heading, `- **[[${basename(aPath)}]]**`);
  new Notice(`Cross-linked ${basename(aPath)} and ${basename(bPath)}`);
}

// Writes into the ExcaliBrain compass block. Creates the block if missing.
export async function writeCompass(app: App, sourcePath: string, targetPath: string, dir: CompassDir) {
  const file = getFile(app, sourcePath);
  if (!file) return;
  const link = `[[${basename(targetPath)}]]`;
  await app.vault.process(file, (content) => {
    const lineRe = new RegExp(`^(${dir}::)(.*)$`, "m");
    const m = content.match(lineRe);
    if (m) {
      if (m[2].includes(link)) return content;
      const existing = m[2].trim();
      const updated = existing.length > 0 ? `${dir}:: ${existing}, ${link}` : `${dir}:: ${link}`;
      return content.replace(lineRe, updated);
    }
    // No compass line for this direction. Look for an existing compass block.
    const blockRe = /%%\s*\n((?:(?:North|South|West|East)::[^\n]*\n?)+)\s*%%/;
    const bm = content.match(blockRe);
    if (bm) {
      const inner = bm[1].replace(/\s*$/, "");
      return content.replace(blockRe, `%%\n${inner}\n${dir}:: ${link}\n%%`);
    }
    const lines = ["North::", "South::", "West::", "East::"].map((l) =>
      l.startsWith(dir) ? `${l} ${link}` : l
    );
    return content.replace(/\s*$/, "") + `\n\n%%\n${lines.join("\n")}\n%%\n`;
  });
  new Notice(`${dir} link set: ${basename(sourcePath)} → ${basename(targetPath)}`);
}
