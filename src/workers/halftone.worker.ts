import type { PatternParams, AnalysisResult } from '../types';
import { applyPalette, seededRng } from '../utils/color';
import type { RGB } from '../utils/color';

self.onmessage = (e: MessageEvent) => {
  const { analysis, params } = e.data as { analysis: AnalysisResult; params: PatternParams };
  const { pixels, width, height, palette } = analysis;
  const pal = palette as RGB[];
  const rng = seededRng(params.seed);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = params.paletteMode === 'neon' ? '#000' : '#fff';
  ctx.fillRect(0, 0, width, height);

  const spacing = Math.round(3 + (1 - params.density) * 22);
  const maxR = spacing * 0.8;
  // seed로 각 도트 위치에 jitter 추가 (완벽한 격자 → 유기적 배치)
  const jitter = spacing * 0.22;

  const angle = params.entropy * (Math.PI / 4);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const cxC = width / 2, cyC = height / 2;
  const diag = Math.ceil(Math.sqrt(width * width + height * height) / spacing) + 2;

  for (let row = -diag; row <= diag; row++) {
    for (let col = -diag; col <= diag; col++) {
      const gx = col * spacing;
      const gy = row * spacing;

      // seed 기반 jitter: 같은 seed면 항상 같은 위치 이탈
      const jx = (rng() - 0.5) * 2 * jitter;
      const jy = (rng() - 0.5) * 2 * jitter;

      const sx = cxC + gx * cosA - gy * sinA + jx;
      const sy = cyC + gx * sinA + gy * cosA + jy;

      if (sx < -maxR || sx > width + maxR || sy < -maxR || sy > height + maxR) continue;

      const ix = Math.max(0, Math.min(width - 1, Math.round(sx)));
      const iy = Math.max(0, Math.min(height - 1, Math.round(sy)));
      const idx = (iy * width + ix) * 4;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const tone = 1 - lum / 255;
      const dotR = maxR * Math.pow(tone, 0.55);
      if (dotR < 0.3) continue;

      const [dr, dg, db] = applyPalette(r, g, b, params.paletteMode, pal);
      ctx.fillStyle = `rgb(${dr},${dg},${db})`;
      ctx.beginPath();
      ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const bitmap = canvas.transferToImageBitmap();
  self.postMessage({ type: 'RENDER_DONE', bitmap }, { transfer: [bitmap as unknown as Transferable] });
};
