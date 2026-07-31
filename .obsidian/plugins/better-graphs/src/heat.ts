// VOSViewer-style colormap: blue, cyan, green, yellow, red.
const STOPS: [number, number, number][] = [
  [0, 32, 160],
  [0, 170, 220],
  [60, 180, 90],
  [240, 220, 60],
  [215, 40, 30],
];

export function heatColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const pos = clamped * (STOPS.length - 1);
  const i = Math.min(Math.floor(pos), STOPS.length - 2);
  const f = pos - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function heatColorCss(t: number, alpha = 1): string {
  const [r, g, b] = heatColor(t);
  return `rgba(${r},${g},${b},${alpha})`;
}
