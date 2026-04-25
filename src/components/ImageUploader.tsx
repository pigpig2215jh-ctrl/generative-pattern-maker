import { useRef, useState, useCallback } from 'react';

interface Props {
  onImageData: (data: ImageData) => void;
  isAnalyzing: boolean;
}

export default function ImageUploader({ onImageData, isAnalyzing }: Props) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);

    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      onImageData(ctx.getImageData(0, 0, w, h));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [onImageData]);

  const onDrop = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    setDragging(false);
    const file = ev.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div
      className={`uploader ${dragging ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        style={{ display: 'none' }}
      />
      {preview ? (
        <div className="uploader-preview">
          <img src={preview} alt="preview" />
          {isAnalyzing && <div className="uploader-overlay">Analyzing...</div>}
        </div>
      ) : (
        <div className="uploader-placeholder">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
              strokeLinecap="square" strokeLinejoin="miter"/>
          </svg>
          <p>Upload Image</p>
          <span>Drag & drop · JPG PNG WebP</span>
        </div>
      )}
    </div>
  );
}
