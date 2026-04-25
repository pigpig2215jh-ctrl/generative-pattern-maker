import { createNoise2D } from 'simplex-noise';
import { buildVectorField } from '../engines/vectorField';
import { applyPalette, seededRng, hslToRgb } from '../utils/color';
import type { RGB } from '../utils/color';
import type { PatternParams, AnalysisResult } from '../types';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  age: number; maxAge: number;
  r: number; g: number; b: number;
}

let running = false;
let params: PatternParams;
let analysis: AnalysisResult;
let vectorField: Float32Array;
let particles: Particle[] = [];
let accCanvas: OffscreenCanvas;
let accCtx: OffscreenCanvasRenderingContext2D;
let noise2D: (x: number, y: number) => number;
let rng: () => number;

self.onmessage = (e: MessageEvent) => {
  const msg = e.data as { type: string; analysis?: AnalysisResult; params?: PatternParams };

  if (msg.type === 'INIT') {
    running = false;
    analysis = msg.analysis!;
    params = msg.params!;
    init();
    running = true;
    tick();
  } else if (msg.type === 'UPDATE_PARAMS') {
    params = msg.params!;
    respawnAll();
  } else if (msg.type === 'STOP') {
    running = false;
  }
};

function init() {
  const { width, height } = analysis;
  vectorField = buildVectorField(analysis.pixels, width, height);
  rng = seededRng(params.seed);
  noise2D = createNoise2D(rng);

  accCanvas = new OffscreenCanvas(width, height);
  accCtx = accCanvas.getContext('2d')!;

  const bg = params.paletteMode === 'neon' ? '#000000' : '#ffffff';
  accCtx.fillStyle = bg;
  accCtx.fillRect(0, 0, width, height);

  spawnParticles();
}

function respawnAll() {
  rng = seededRng(params.seed);
  noise2D = createNoise2D(rng);
  const bg = params.paletteMode === 'neon' ? '#000000' : '#ffffff';
  accCtx.fillStyle = bg;
  accCtx.fillRect(0, 0, analysis.width, analysis.height);
  spawnParticles();
}

function spawnParticles() {
  const count = Math.round(1000 + params.density * 49000);
  particles = [];
  // Stagger initial ages so particles don't all die simultaneously
  for (let i = 0; i < count; i++) particles.push(makeParticle(rng()));
}

function makeParticle(ageOffset = 0): Particle {
  const { width, height, edges } = analysis;
  let x = 0, y = 0;
  // Bias spawn toward high-edge regions
  for (let attempts = 0; attempts < 12; attempts++) {
    x = rng() * width; y = rng() * height;
    if (rng() < edges[Math.floor(y) * width + Math.floor(x)] * 0.9 + 0.1) break;
  }
  const maxAge = Math.round((80 + rng() * 200) * (0.3 + params.strokeFlow * 1.4));
  const [r, g, b] = sampleColor(x, y);
  return { x, y, vx: 0, vy: 0, age: ageOffset * maxAge, maxAge, r, g, b };
}

function sampleColor(x: number, y: number): RGB {
  const { width, height, pixels, palette } = analysis;
  const sx = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const i = (sy * width + sx) * 4;
  return applyPalette(pixels[i], pixels[i + 1], pixels[i + 2], params.paletteMode, palette as RGB[]);
}

function tick() {
  if (!running) return;

  const { width, height } = analysis;
  const fadeAlpha = params.paletteMode === 'neon' ? 0.03 : 0.04;
  const fadeBg = params.paletteMode === 'neon' ? `rgba(0,0,0,${fadeAlpha})` : `rgba(255,255,255,${fadeAlpha})`;

  accCtx.fillStyle = fadeBg;
  accCtx.fillRect(0, 0, width, height);

  const noiseScale = 0.003;
  const noiseStrength = params.entropy * Math.PI * 1.5;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const fx = Math.max(0, Math.min(width - 1, Math.floor(p.x)));
    const fy = Math.max(0, Math.min(height - 1, Math.floor(p.y)));
    const fi = (fy * width + fx) * 2;

    const fieldAngle = vectorField[fi];
    const fieldMag = vectorField[fi + 1];
    const noiseAngle = noise2D(p.x * noiseScale, p.y * noiseScale) * noiseStrength;
    const angle = fieldAngle + noiseAngle;

    const speed = (0.6 + fieldMag) * 1.8;
    p.vx = p.vx * 0.85 + Math.cos(angle) * speed * 0.15;
    p.vy = p.vy * 0.85 + Math.sin(angle) * speed * 0.15;

    const px = p.x, py = p.y;
    p.x += p.vx; p.y += p.vy; p.age++;

    const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.75;
    if (params.paletteMode === 'neon') {
      // Neon: derive hue from position for variety
      const hue = ((fx / width) + (fy / height) * 0.5) % 1;
      const [nr, ng, nb] = hslToRgb(hue, 1, 0.6);
      accCtx.strokeStyle = `rgba(${nr},${ng},${nb},${alpha})`;
    } else {
      accCtx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    }
    accCtx.lineWidth = 0.7;
    accCtx.beginPath();
    accCtx.moveTo(px, py);
    accCtx.lineTo(p.x, p.y);
    accCtx.stroke();

    if (p.age >= p.maxAge || p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) {
      particles[i] = makeParticle(rng());
    }
  }

  createImageBitmap(accCanvas).then(bitmap => {
    self.postMessage({ type: 'FRAME', bitmap }, { transfer: [bitmap as unknown as Transferable] });
    if (running) setTimeout(tick, 16);
  });
}
