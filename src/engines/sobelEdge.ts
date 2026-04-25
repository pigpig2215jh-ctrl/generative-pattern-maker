export function sobelEdge(pixels: Uint8ClampedArray, width: number, height: number): Float32Array {
  const result = new Float32Array(width * height);

  const lum = (idx: number) => 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
  const px = (x: number, y: number) => (y * width + x) * 4;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = lum(px(x - 1, y - 1)), tc = lum(px(x, y - 1)), tr = lum(px(x + 1, y - 1));
      const ml = lum(px(x - 1, y)),                               mr = lum(px(x + 1, y));
      const bl = lum(px(x - 1, y + 1)), bc = lum(px(x, y + 1)), br = lum(px(x + 1, y + 1));

      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      // Normalize: max possible value is 4 * 255 * sqrt(2)
      result[y * width + x] = Math.sqrt(gx * gx + gy * gy) / (4 * 255 * Math.SQRT2);
    }
  }

  return result;
}
