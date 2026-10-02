/** WCAG contrast helpers. Used where a background colour comes from data (group colours) and the text colour must follow it. */
function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const DARK = "#0B0B0B"; // near-black: the group colours in the middle of the range only reach 4.5:1 with a very dark text
const LIGHT = "#FFFFFF";
/** Text colour for a label over one or several background stops: whichever of near-black or white is more readable on the worst stop. */
export function readableText(stops: readonly string[]): string {
  const worst = (text: string) => Math.min(...stops.map((s) => contrastRatio(s, text)));
  return worst(DARK) >= worst(LIGHT) ? DARK : LIGHT;
}
