import type { PatternParams, PatternMode, PaletteMode } from '../types';

interface Props {
  params: PatternParams;
  onChange: (p: Partial<PatternParams>) => void;
  disabled: boolean;
  onExport: () => void;
}

const MODES: { id: PatternMode; label: string; desc: string }[] = [
  { id: 'flowParticle', label: 'Flow Particle', desc: '흐름 입자' },
  { id: 'voronoi',      label: 'Voronoi',        desc: '보로노이 파편' },
  { id: 'pixelSort',   label: 'Glitch',          desc: '픽셀 정렬' },
  { id: 'ascii',        label: 'ASCII Art',      desc: 'ASCII 아트' },
  { id: 'halftone',     label: 'Halftone',       desc: '하프톤' },
];

const PALETTES: { id: PaletteMode; label: string }[] = [
  { id: 'original',  label: 'Original' },
  { id: 'quantized', label: 'Quantized' },
  { id: 'neon',      label: 'Neon' },
  { id: 'grayscale', label: 'Grayscale' },
];

interface SliderProps {
  label: string; sub: string; value: number;
  min?: number; max?: number; step?: number;
  onChange: (v: number) => void; disabled: boolean;
}

function Slider({ label, sub, value, min = 0, max = 1, step = 0.01, onChange, disabled }: SliderProps) {
  return (
    <div className={`slider-row ${disabled ? 'disabled' : ''}`}>
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-sub">{sub}</span>
      </div>
      <span className="slider-value">{value.toFixed(2)}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
      />
    </div>
  );
}

export default function Controls({ params, onChange, disabled, onExport }: Props) {
  return (
    <div className="controls">

      <div className="ctrl-section">
        <span className="ctrl-section-label">Mode</span>
        <div className="ctrl-section-body" style={{ padding: 0 }}>
          <div className="mode-btns">
            {MODES.map(m => (
              <button
                key={m.id}
                className={`mode-btn ${params.mode === m.id ? 'active' : ''}`}
                onClick={() => onChange({ mode: m.id })}
                disabled={disabled}
              >
                <span className="mode-btn-label">{m.label}</span>
                <span className="mode-btn-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ctrl-section">
        <span className="ctrl-section-label">Parameters</span>
        <div className="ctrl-section-body">
          <Slider label="Entropy" sub="혼돈도" value={params.entropy} onChange={v => onChange({ entropy: v })} disabled={disabled} />
          <Slider label="Density" sub="밀도" value={params.density} onChange={v => onChange({ density: v })} disabled={disabled} />
          {params.mode === 'flowParticle' && (
            <Slider label="Stroke Flow" sub="흐름 길이" value={params.strokeFlow} onChange={v => onChange({ strokeFlow: v })} disabled={disabled} />
          )}
        </div>
      </div>

      <div className="ctrl-section">
        <span className="ctrl-section-label">Palette</span>
        <div className="ctrl-section-body" style={{ padding: 0 }}>
          <div className="palette-btns">
            {PALETTES.map(p => (
              <button
                key={p.id}
                className={`palette-btn ${params.paletteMode === p.id ? 'active' : ''}`}
                onClick={() => onChange({ paletteMode: p.id })}
                disabled={disabled}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ctrl-section">
        <span className="ctrl-section-label">Seed</span>
        <div className="ctrl-section-body" style={{ padding: 0 }}>
          <div className="seed-row">
            <label htmlFor="seed-input">#</label>
            <input
              id="seed-input"
              className="seed-input"
              type="number" value={params.seed} min={0} max={999999}
              onChange={e => onChange({ seed: parseInt(e.target.value) || 0 })}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <button className="export-btn" onClick={onExport} disabled={disabled}>
        Export PNG
      </button>

    </div>
  );
}
