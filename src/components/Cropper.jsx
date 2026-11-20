import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

// Shapes offered for a post. One shape applies to every picture in the post so they line up in the feed.
export const SHAPES = [
  { key: 'original', label: 'Original', ratio: null },
  { key: 'square', label: 'Square', ratio: 1 },
  { key: 'portrait', label: 'Portrait', ratio: 4 / 5 },
  { key: 'wide', label: 'Wide', ratio: 16 / 9 },
];

const OUTPUT_MAX = 1350; // longest side of the saved picture, in pixels

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Smallest scale that still fills the frame.
const coverScale = (img, fw, fh) => Math.max(fw / img.naturalWidth, fh / img.naturalHeight);

// Keeps the picture covering the frame: x and y are the picture's top-left corner inside the frame.
function clamp(pos, img, scale, fw, fh) {
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  return { x: Math.min(0, Math.max(fw - w, pos.x)), y: Math.min(0, Math.max(fh - h, pos.y)) };
}

// Draws the framed part of the picture into a new JPEG.
function render(img, view, fw, fh) {
  const scale = coverScale(img, fw, fh) * view.zoom;
  const sw = fw / scale;
  const sh = fh / scale;
  const sx = -view.x / scale;
  const sy = -view.y / scale;
  const out = Math.min(1, OUTPUT_MAX / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * out);
  canvas.height = Math.round(sh * out);
  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
}

// Full-screen editor: pick a shape, then drag and zoom each picture to frame it.
// `images` are data URLs; `onDone` receives the framed pictures in the same order.
export default function Cropper({ images, onDone, onCancel }) {
  const [imgs, setImgs] = useState(null);
  const [shape, setShape] = useState('original');
  const [index, setIndex] = useState(0);
  const [views, setViews] = useState(() => images.map(() => ({ zoom: 1, x: null, y: null })));
  const [box, setBox] = useState({ w: 320, h: 420 });
  const [busy, setBusy] = useState(false);
  const stage = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    let live = true;
    Promise.all(images.map(loadImage)).then((loaded) => { if (live) setImgs(loaded); }).catch(onCancel);
    return () => { live = false; };
  }, [images, onCancel]);

  useEffect(() => {
    const measure = () => setBox({ w: Math.min(stage.current?.clientWidth || 320, 480), h: stage.current?.clientHeight || 420 });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (!imgs) return <div className="cropper"><p className="hint" style={{ margin: 'auto', color: '#fff' }}>Opening pictures…</p></div>;

  const img = imgs[index];
  // "Original" keeps the first picture's shape, within the range the feed can show (9:16 to 2:1).
  const ratio = SHAPES.find((s) => s.key === shape).ratio
    ?? Math.min(2, Math.max(9 / 16, imgs[0].naturalWidth / imgs[0].naturalHeight));
  const fw = Math.round(Math.min(box.w, box.h * ratio));
  const fh = Math.round(fw / ratio);
  const view = views[index];
  const scale = coverScale(img, fw, fh) * view.zoom;
  // Centre a picture the first time it is shown in this shape.
  const pos = view.x === null
    ? { x: (fw - img.naturalWidth * scale) / 2, y: (fh - img.naturalHeight * scale) / 2 }
    : clamp(view, img, scale, fw, fh);

  const setView = (patch) => setViews((all) => all.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  const changeShape = (key) => { setShape(key); setViews(images.map(() => ({ zoom: 1, x: null, y: null }))); };

  const setZoom = (zoom) => {
    // Zoom around the middle of the frame.
    const next = coverScale(img, fw, fh) * zoom;
    const cx = (fw / 2 - pos.x) / scale;
    const cy = (fh / 2 - pos.y) / scale;
    setView({ zoom, ...clamp({ x: fw / 2 - cx * next, y: fh / 2 - cy * next }, img, next, fw, fh) });
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, x: pos.x, y: pos.y };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    setView(clamp({ x: d.x + e.clientX - d.sx, y: d.y + e.clientY - d.sy }, img, scale, fw, fh));
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e) => setZoom(Math.min(3, Math.max(1, view.zoom - e.deltaY / 500)));

  const finish = () => {
    setBusy(true);
    const out = imgs.map((im, i) => {
      const v = views[i];
      const s = coverScale(im, fw, fh) * v.zoom;
      const p = v.x === null
        ? { x: (fw - im.naturalWidth * s) / 2, y: (fh - im.naturalHeight * s) / 2 }
        : clamp(v, im, s, fw, fh);
      return render(im, { zoom: v.zoom, ...p }, fw, fh);
    });
    onDone(out);
  };

  return (
    <div className="cropper" role="dialog" aria-modal="true" aria-label="Frame your pictures">
      <header className="cropper-bar">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Cancel"><X size={24} /></button>
        <strong>Frame {images.length > 1 ? `picture ${index + 1} of ${images.length}` : 'your picture'}</strong>
        <button type="button" className="icon-btn" onClick={finish} disabled={busy} aria-label="Done"><Check size={26} /></button>
      </header>

      <div className="cropper-stage" ref={stage}>
        <div
          className="cropper-frame"
          style={{ width: fw, height: fh }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <img
            src={img.src}
            alt=""
            draggable={false}
            style={{ width: img.naturalWidth * scale, height: img.naturalHeight * scale, transform: `translate(${pos.x}px, ${pos.y}px)` }}
          />
          <span className="cropper-grid" aria-hidden="true" />
        </div>
      </div>

      <div className="cropper-tools">
        <label className="cropper-zoom">
          <span>Zoom</span>
          <input type="range" min="1" max="3" step="0.01" value={view.zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
        </label>
        <div className="cropper-shapes" role="radiogroup" aria-label="Shape">
          {SHAPES.map((s) => (
            <button key={s.key} type="button" role="radio" aria-checked={shape === s.key} onClick={() => changeShape(s.key)}>
              <span className={`shape-icon ${s.key}`} aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="cropper-thumbs">
            {imgs.map((im, i) => (
              <button key={i} type="button" aria-label={`Picture ${i + 1}`} aria-pressed={i === index} onClick={() => setIndex(i)}>
                <img src={im.src} alt="" />
              </button>
            ))}
          </div>
        )}
        <p className="cropper-hint">Drag to move · use the slider to zoom</p>
      </div>
    </div>
  );
}
