// Minimal single-page PDF writer embedding one JPEG image. No dependencies.
export function jpegToPdf(
  jpeg: Uint8Array,
  imgWpx: number,
  imgHpx: number,
  pageWpt: number,
  pageHpt: number,
  marginPt: number
): Uint8Array {
  const availW = pageWpt - marginPt * 2;
  const availH = pageHpt - marginPt * 2;
  const scale = Math.min(availW / imgWpx, availH / imgHpx);
  const drawW = imgWpx * scale;
  const drawH = imgHpx * scale;
  const tx = (pageWpt - drawW) / 2;
  const ty = (pageHpt - drawH) / 2;

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObj = (num: number) => {
    offsets[num] = length;
    push(`${num} 0 obj\n`);
  };

  push("%PDF-1.4\n%\xB5\xB5\xB5\xB5\n");

  beginObj(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObj(2);
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  beginObj(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pageWpt)} ${fmt(pageHpt)}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  beginObj(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${imgWpx} /Height ${imgHpx} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  push(jpeg);
  push("\nendstream\nendobj\n");

  const content = `q\n${fmt(drawW)} 0 0 ${fmt(drawH)} ${fmt(tx)} ${fmt(ty)} cm\n/Im0 Do\nQ\n`;
  beginObj(5);
  push(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);

  const xrefStart = length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

function fmt(n: number): string {
  return n.toFixed(2).replace(/\.00$/, "");
}
