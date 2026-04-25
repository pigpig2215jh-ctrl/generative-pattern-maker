// Returns Float32Array of [angle, magnitude] pairs interleaved per pixel
export function buildVectorField(pixels: Uint8ClampedArray, width: number, height: number): Float32Array {
  const field = new Float32Array(width * height * 2);

  const lum = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  };

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const dx = lum(x + 1, y) - lum(x - 1, y);
      const dy = lum(x, y + 1) - lum(x, y - 1);
      const i = (y * width + x) * 2;
      field[i] = Math.atan2(dy, dx);
      field[i + 1] = Math.sqrt(dx * dx + dy * dy) / (2 * 255);
    }
  }

  return field;
}
