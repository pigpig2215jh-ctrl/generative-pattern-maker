import type { PatternParams, AnalysisResult } from '../types';
import { applyPalette, seededRng } from '../utils/color';
import type { RGB } from '../utils/color';

self.onmessage = (e: MessageEvent) => {
  const { analysis, params } = e.data as { analysis: AnalysisResult; params: PatternParams };
  const { pixels, width, height, palette } = analysis;
  const pal = palette as RGB[];
  const rng = seededRng(params.seed);

  const result = new Uint8ClampedArray(pixels.length);
  result.set(pixels);

  const baseThreshold = (1 - params.entropy) * 200;
  const lum = (idx: number) => 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];

  // Per-column threshold variation driven by seed
  const colThresholds = new Float32Array(width);
  const variance = 40 * params.entropy; // seed 바꾸면 각 컬럼의 임계값이 달라짐
  for (let x = 0; x < width; x++) {
    colThresholds[x] = baseThreshold + (rng() - 0.5) * variance;
  }

  // seed로 일부 컬럼의 정렬 방향 반전
  const colReverse = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    colReverse[x] = rng() < 0.15 ? 1 : 0; // 약 15% 컬럼은 역방향 정렬
  }

  for (let x = 0; x < width; x++) {
    const threshold = colThresholds[x];
    const reverse = colReverse[x] === 1;
    let segStart = -1;

    for (let y = 0; y <= height; y++) {
      const idx = (y * width + x) * 4;
      const bright = y < height ? lum(idx) : -1;

      if (bright > threshold) {
        if (segStart === -1) segStart = y;
      } else {
        if (segStart !== -1 && y - segStart > 1) {
          const seg: { lum: number; r: number; g: number; b: number; a: number }[] = [];
          for (let sy = segStart; sy < y; sy++) {
            const si = (sy * width + x) * 4;
            seg.push({ lum: lum(si), r: pixels[si], g: pixels[si + 1], b: pixels[si + 2], a: pixels[si + 3] });
          }
          seg.sort((a, b) => reverse ? a.lum - b.lum : b.lum - a.lum);
          for (let i = 0; i < seg.length; i++) {
            const oy = segStart + i;
            const oi = (oy * width + x) * 4;
            const [r, g, b] = applyPalette(seg[i].r, seg[i].g, seg[i].b, params.paletteMode, pal);
            result[oi] = r; result[oi + 1] = g; result[oi + 2] = b; result[oi + 3] = seg[i].a;
          }
        }
        segStart = -1;
      }
    }
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(result, width, height), 0, 0);
  const bitmap = canvas.transferToImageBitmap();
  self.postMessage({ type: 'RENDER_DONE', bitmap }, { transfer: [bitmap as unknown as Transferable] });
};
