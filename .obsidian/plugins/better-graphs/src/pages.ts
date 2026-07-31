// Page catalog, grouped by drafting convention. Sizes in millimeters, portrait.
export interface PageSize {
  name: string;
  wMm: number;
  hMm: number;
}

const IN = 25.4;

export const PAGE_GROUPS: Record<string, PageSize[]> = {
  "ISO A": [
    { name: "A5", wMm: 148, hMm: 210 },
    { name: "A4", wMm: 210, hMm: 297 },
    { name: "A3", wMm: 297, hMm: 420 },
    { name: "A2", wMm: 420, hMm: 594 },
    { name: "A1", wMm: 594, hMm: 841 },
    { name: "A0", wMm: 841, hMm: 1189 },
  ],
  "US / ANSI": [
    { name: "Letter", wMm: 8.5 * IN, hMm: 11 * IN },
    { name: "Legal", wMm: 8.5 * IN, hMm: 14 * IN },
    { name: "Tabloid", wMm: 11 * IN, hMm: 17 * IN },
    { name: "Ledger", wMm: 17 * IN, hMm: 11 * IN },
    { name: "ANSI C", wMm: 17 * IN, hMm: 22 * IN },
    { name: "ANSI D", wMm: 22 * IN, hMm: 34 * IN },
    { name: "ANSI E", wMm: 34 * IN, hMm: 44 * IN },
  ],
  ARCH: [
    { name: "ARCH A", wMm: 9 * IN, hMm: 12 * IN },
    { name: "ARCH B", wMm: 12 * IN, hMm: 18 * IN },
    { name: "ARCH C", wMm: 18 * IN, hMm: 24 * IN },
    { name: "ARCH D", wMm: 24 * IN, hMm: 36 * IN },
    { name: "ARCH E1", wMm: 30 * IN, hMm: 42 * IN },
    { name: "ARCH E", wMm: 36 * IN, hMm: 48 * IN },
  ],
  Custom: [{ name: "Custom", wMm: 210, hMm: 297 }],
};

export function findPage(group: string, name: string): PageSize {
  const list = PAGE_GROUPS[group] ?? PAGE_GROUPS["ISO A"];
  return list.find((p) => p.name === name) ?? list[0];
}

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / IN) * dpi);
}

export function mmToPt(mm: number): number {
  return (mm / IN) * 72;
}
