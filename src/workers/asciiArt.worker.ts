import type { PatternParams, AnalysisResult } from '../types';
import { applyPalette, seededRng } from '../utils/color';
import type { RGB } from '../utils/color';

const CHAR_SETS = [
  '@#%=+-. ',
  '@#%S?*+;:,. ',
  '@$#%&W M*+^~-:,. ',
  '@$B%8WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ',
];

self.onmessage = (e: MessageEvent) => {
  const { analysis, params } = e.data as { analysis: AnalysisResult; params: PatternParams };
  const { pixels, width, height, palette } = analysis;
  const pal = palette as RGB[];
  const rng = seededRng(params.seed);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  const cellSize = Math.round(4 + (1 - params.density) * 18);
  const charSet = CHAR_SETS[Math.min(3, Math.floor(params.entropy * 4))];
  const charW = cellSize * 0.6;
  const charH = cellSize;
  const cols = Math.ceil(width / charW);
  const rows = Math.ceil(height / charH);

  // seed로 각 셀에 고정된 노이즈 오프셋 미리 생성
  const noiseRange = Math.floor(params.entropy * 2); // 0–2 칸 범위 내 랜덤 이탈
  const cellNoise = new Int8Array(cols * rows);
  for (let i = 0; i < cellNoise.length; i++) {
    cellNoise[i] = Math.round((rng() - 0.5) * 2 * noiseRange);
  }

  const bg = params.paletteMode === 'neon' ? '#000' : '#fff';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${cellSize}px monospace`;
  ctx.textBaseline = 'top';

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = Math.min(width - 1, Math.floor(col * charW + charW / 2));
      const py = Math.min(height - 1, Math.floor(row * charH + charH / 2));
      const idx = (py * width + px) * 4;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // seed 기반 노이즈로 문자 인덱스를 ±noiseRange 내에서 이탈
      const baseIdx = Math.floor((1 - lum / 255) * (charSet.length - 1));
      const noise = cellNoise[row * cols + col];
      const charIdx = Math.max(0, Math.min(charSet.length - 1, baseIdx + noise));
      const char = charSet[charIdx];
      if (char === ' ') continue;

      const [cr, cg, cb] = applyPalette(r, g, b, params.paletteMode, pal);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillText(char, col * charW, row * charH);
    }
  }

  const bitmap = canvas.transferToImageBitmap();
  self.postMessage({ type: 'RENDER_DONE', bitmap }, { transfer: [bitmap as unknown as Transferable] });
};
