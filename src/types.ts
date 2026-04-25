export type PatternMode = 'flowParticle' | 'voronoi' | 'pixelSort' | 'ascii' | 'halftone';
export type PaletteMode = 'original' | 'quantized' | 'neon';

export interface PatternParams {
  mode: PatternMode;
  entropy: number;    // 0-1
  density: number;    // 0-1
  strokeFlow: number; // 0-1
  paletteMode: PaletteMode;
  seed: number;
}

export interface AnalysisResult {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  edges: Float32Array;
  palette: [number, number, number][];
}
