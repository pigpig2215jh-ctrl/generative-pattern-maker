export type RGB = [number, number, number];

export function nearestPaletteColor(r: number, g: number, b: number, palette: RGB[]): RGB {
  let nearest = palette[0];
  let minD = Infinity;
  for (const c of palette) {
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < minD) { minD = d; nearest = c; }
  }
  return nearest;
}

export function applyPalette(
  r: number, g: number, b: number,
  mode: string,
  palette: RGB[]
): RGB {
  if (mode === 'quantized') return nearestPaletteColor(r, g, b, palette);
  if (mode === 'neon') return toNeon(r, g, b);
  if (mode === 'grayscale') {
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return [gray, gray, gray];
  }
  return [r, g, b];
}

function toNeon(r: number, g: number, b: number): RGB {
  const [h, , l] = rgbToHsl(r, g, b);
  // Dark tones → very dark, light tones → vivid bright
  const newL = l < 0.4 ? 0.05 : 0.65;
  return hslToRgb(h, 1.0, newL);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(hue2rgb(h + 1 / 3) * 255), Math.round(hue2rgb(h) * 255), Math.round(hue2rgb(h - 1 / 3) * 255)];
}

export function seededRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
