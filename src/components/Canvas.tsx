import { useEffect, useRef, useCallback } from 'react';
import type { PatternParams, AnalysisResult } from '../types';

interface Props {
  analysis: AnalysisResult | null;
  params: PatternParams;
  onRenderingChange: (v: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const createFlowWorker = () =>
  new Worker(new URL('../workers/flowParticle.worker.ts', import.meta.url), { type: 'module' });
const createVoronoiWorker = () =>
  new Worker(new URL('../workers/voronoi.worker.ts', import.meta.url), { type: 'module' });
const createPixelSortWorker = () =>
  new Worker(new URL('../workers/pixelSort.worker.ts', import.meta.url), { type: 'module' });
const createAsciiWorker = () =>
  new Worker(new URL('../workers/asciiArt.worker.ts', import.meta.url), { type: 'module' });
const createHalftoneWorker = () =>
  new Worker(new URL('../workers/halftone.worker.ts', import.meta.url), { type: 'module' });

export default function Canvas({ analysis, params, onRenderingChange, canvasRef }: Props) {
  const workerRef = useRef<Worker | null>(null);
  const prevModeRef = useRef<string | null>(null);
  const prevAnalysisRef = useRef<AnalysisResult | null>(null);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!analysis || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = analysis.width;
    canvas.height = analysis.height;
    const ctx = canvas.getContext('2d')!;

    const modeChanged = prevModeRef.current !== params.mode;
    const analysisChanged = prevAnalysisRef.current !== analysis;
    prevModeRef.current = params.mode;
    prevAnalysisRef.current = analysis;

    // Terminate and restart when mode or underlying image changes
    if (modeChanged || analysisChanged) terminateWorker();

    if (params.mode === 'flowParticle') {
      if (!workerRef.current) {
        const worker = createFlowWorker();
        workerRef.current = worker;
        worker.onmessage = (e) => {
          if (e.data.type === 'FRAME' && canvasRef.current) {
            ctx.drawImage(e.data.bitmap, 0, 0);
            e.data.bitmap.close();
          }
        };
        onRenderingChange(true);
        worker.postMessage({ type: 'INIT', analysis, params });
      } else {
        workerRef.current.postMessage({ type: 'UPDATE_PARAMS', params });
      }
    } else {
      // Static render: always re-render on any param or analysis change
      terminateWorker();
      onRenderingChange(true);

      const worker =
        params.mode === 'voronoi'    ? createVoronoiWorker() :
        params.mode === 'ascii'      ? createAsciiWorker() :
        params.mode === 'halftone'   ? createHalftoneWorker() :
                                       createPixelSortWorker();
      workerRef.current = worker;
      worker.onmessage = (e) => {
        if (e.data.type === 'RENDER_DONE' && canvasRef.current) {
          ctx.drawImage(e.data.bitmap, 0, 0);
          e.data.bitmap.close();
          onRenderingChange(false);
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
        }
      };
      worker.postMessage({ type: 'RENDER', analysis, params });
    }
  }, [analysis, params, terminateWorker, onRenderingChange, canvasRef]);

  useEffect(() => () => terminateWorker(), [terminateWorker]);

  const aspectRatio = analysis ? `${analysis.width} / ${analysis.height}` : undefined;

  return (
    <div className="canvas-wrapper">
      {!analysis && (
        <div className="canvas-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p>이미지를 업로드하면 작품이 생성됩니다</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          display: analysis ? 'block' : 'none',
          aspectRatio,
          maxWidth: 'calc(100% - 40px)',
          maxHeight: 'calc(100vh - 40px)',
        }}
      />
    </div>
  );
}
