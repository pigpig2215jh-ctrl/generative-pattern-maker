import { sobelEdge } from '../engines/sobelEdge';
import { extractPalette } from '../engines/kmeansColor';

self.onmessage = (e: MessageEvent) => {
  const { pixelBuffer, width, height, seed } = e.data as {
    pixelBuffer: ArrayBuffer;
    width: number;
    height: number;
    seed: number;
  };

  const pixels = new Uint8ClampedArray(pixelBuffer);
  const edges = sobelEdge(pixels, width, height);
  const palette = extractPalette(pixels, 5, seed);

  // Transfer edges buffer to avoid copying
  self.postMessage(
    { type: 'ANALYSIS_DONE', edges, palette, width, height },
    { transfer: [edges.buffer] }
  );
};
