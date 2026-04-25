type RGB = [number, number, number];

function colorDistSq(a: RGB, b: RGB): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export function extractPalette(pixels: Uint8ClampedArray, k = 5, seed = 42): RGB[] {
  const step = Math.max(1, Math.floor(pixels.length / (4 * 8000)));
  const samples: RGB[] = [];
  for (let i = 0; i < pixels.length; i += step * 4) {
    if (pixels[i + 3] < 128) continue;
    samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }
  if (samples.length < k) return [[128, 128, 128]] as RGB[];

  // Seeded LCG for reproducibility
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  // K-means++ initialization
  const centers: RGB[] = [samples[Math.floor(rng() * samples.length)]];
  while (centers.length < k) {
    const dists = samples.map(s => {
      let minD = Infinity;
      for (const c of centers) { const d = colorDistSq(s, c); if (d < minD) minD = d; }
      return minD;
    });
    const total = dists.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let chosen = 0;
    for (let i = 0; i < dists.length; i++) { r -= dists[i]; if (r <= 0) { chosen = i; break; } }
    centers.push([...samples[chosen]] as RGB);
  }

  // K-means iterations
  for (let iter = 0; iter < 25; iter++) {
    const sums: [number, number, number][] = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Array(k).fill(0);

    for (const s of samples) {
      let nearest = 0, minD = Infinity;
      for (let i = 0; i < k; i++) { const d = colorDistSq(s, centers[i]); if (d < minD) { minD = d; nearest = i; } }
      sums[nearest][0] += s[0]; sums[nearest][1] += s[1]; sums[nearest][2] += s[2];
      counts[nearest]++;
    }

    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        centers[i] = [sums[i][0] / counts[i], sums[i][1] / counts[i], sums[i][2] / counts[i]];
      }
    }
  }

  return centers.map(c => [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]) as RGB[];
}
