import { useState, useRef, useCallback, useEffect } from 'react';
import type { PatternParams, AnalysisResult } from './types';
import ImageUploader from './components/ImageUploader';
import Controls from './components/Controls';
import Canvas from './components/Canvas';
import './App.css';

const DEFAULT_PARAMS: PatternParams = {
  mode: 'flowParticle',
  entropy: 0.45,
  density: 0.45,
  strokeFlow: 0.5,
  paletteMode: 'original',
  seed: 42,
};

export default function App() {
  const [params, setParams] = useState<PatternParams>(DEFAULT_PARAMS);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisWorkerRef = useRef<Worker | null>(null);

  const getAnalysisWorker = useCallback(() => {
    if (!analysisWorkerRef.current) {
      analysisWorkerRef.current = new Worker(
        new URL('./workers/imageAnalysis.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return analysisWorkerRef.current;
  }, []);

  const handleImageData = useCallback((imageData: ImageData) => {
    setIsAnalyzing(true);
    setAnalysis(null);

    const worker = getAnalysisWorker();
    const pixelBuffer = imageData.data.buffer.slice(0);

    worker.onmessage = (e) => {
      if (e.data.type === 'ANALYSIS_DONE') {
        setAnalysis({
          width: imageData.width,
          height: imageData.height,
          pixels: imageData.data,
          edges: e.data.edges,
          palette: e.data.palette,
        });
        setIsAnalyzing(false);
      }
    };

    worker.postMessage(
      { pixelBuffer, width: imageData.width, height: imageData.height, seed: params.seed },
      [pixelBuffer]
    );
  }, [getAnalysisWorker, params.seed]);

  const handleParamsChange = useCallback((delta: Partial<PatternParams>) => {
    setParams(prev => ({ ...prev, ...delta }));
  }, []);

  useEffect(() => () => { analysisWorkerRef.current?.terminate(); }, []);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `pattern_${params.mode}_${Date.now()}.png`;
    a.click();
  }, [params.mode]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Generative<br />Pattern Maker</h1>
        </div>
        <ImageUploader onImageData={handleImageData} isAnalyzing={isAnalyzing} />
        <Controls
          params={params}
          onChange={handleParamsChange}
          disabled={!analysis}
          onExport={handleExport}
        />
      </aside>

      <main className="main">
        {isRendering && params.mode !== 'flowParticle' && (
          <div className="render-badge">Rendering...</div>
        )}
        <Canvas
          analysis={analysis}
          params={params}
          onRenderingChange={setIsRendering}
          canvasRef={canvasRef}
        />
      </main>
    </div>
  );
}
