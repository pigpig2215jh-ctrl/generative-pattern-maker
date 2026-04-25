import { Delaunay } from 'd3-delaunay';
import type { PatternParams, AnalysisResult } from '../types';
import { applyPalette, seededRng } from '../utils/color';
import type { RGB } from '../utils/color';

self.onmessage = (e: MessageEvent) => {
  const { analysis, params } = e.data as { analysis: AnalysisResult; params: PatternParams };
  const { pixels, width, height, edges, palette } = analysis;
  const pal = palette as RGB[];
  const rng = seededRng(params.seed);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  // --- Seed point generation (weighted toward edges) ---
  const seedCount = Math.round(100 + params.density * 2400);
  const flatPts: number[] = [];

  let attempts = 0;
  while (flatPts.length / 2 < seedCount && attempts < seedCount * 20) {
    const x = rng() * width;
    const y = rng() * height;
    const edgeVal = edges[Math.floor(y) * width + Math.floor(x)];
    if (rng() < edgeVal * 0.85 + 0.15) {
      flatPts.push(x, y);
    }
    attempts++;
  }
  while (flatPts.length / 2 < seedCount) {
    flatPts.push(rng() * width, rng() * height);
  }

  const n = flatPts.length / 2;

  // --- Voronoi diagram using flat Float64Array constructor ---
  const delaunay = new Delaunay(Float64Array.from(flatPts));
  const voronoi = delaunay.voronoi([0, 0, width, height]);

  // --- Render cells ---
  for (let i = 0; i < n; i++) {
    const cx = Math.max(0, Math.min(width - 1, Math.round(flatPts[i * 2])));
    const cy = Math.max(0, Math.min(height - 1, Math.round(flatPts[i * 2 + 1])));
    const pi = (cy * width + cx) * 4;
    const [r, g, b] = applyPalette(pixels[pi], pixels[pi + 1], pixels[pi + 2], params.paletteMode, pal);

    const cellPath = voronoi.renderCell(i);
    if (!cellPath) continue;
    const p2d = new Path2D(cellPath);

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill(p2d);

    ctx.strokeStyle = params.paletteMode === 'neon' ? `rgba(255,255,255,0.15)` : `rgba(0,0,0,0.12)`;
    ctx.lineWidth = 0.5;
    ctx.stroke(p2d);
  }

  const bitmap = canvas.transferToImageBitmap();
  self.postMessage({ type: 'RENDER_DONE', bitmap }, { transfer: [bitmap as unknown as Transferable] });
};
