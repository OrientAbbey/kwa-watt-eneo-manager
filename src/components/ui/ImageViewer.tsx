import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const ZOOM_STEP = 1.4;

export default function ImageViewer({ src, alt = 'Image', onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  const scaleRef = useRef(MIN_SCALE);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const touchDrag = useRef<{ id: number; startX: number; startY: number } | null>(null);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const zoomIn = () => applyZoom(scaleRef.current * ZOOM_STEP);
  const zoomOut = () => applyZoom(scaleRef.current / ZOOM_STEP);

  const applyZoom = (next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    scaleRef.current = clamped;
    setScale(clamped);
    if (clamped === MIN_SCALE) {
      offsetRef.current = { x: 0, y: 0 };
      setOffset({ x: 0, y: 0 });
    }
  };

  const reset = () => {
    scaleRef.current = MIN_SCALE;
    setScale(MIN_SCALE);
    offsetRef.current = { x: 0, y: 0 };
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || scaleRef.current <= MIN_SCALE) return;
    dragStart.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
    setPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !dragStart.current) return;
    const next = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    offsetRef.current = next;
    setOffset(next);
  };

  const endDrag = () => {
    dragStart.current = null;
    setPanning(false);
  };

  const pinchDistance = (touches: React.TouchList) =>
    Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchDrag.current = null;
      pinchStart.current = { distance: pinchDistance(e.touches), scale: scaleRef.current };
    } else if (e.touches.length === 1 && scaleRef.current > MIN_SCALE) {
      const t = e.touches[0];
      touchDrag.current = {
        id: t.identifier,
        startX: t.clientX - offsetRef.current.x,
        startY: t.clientY - offsetRef.current.y,
      };
      setPanning(true);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      applyZoom(pinchStart.current.scale * (pinchDistance(e.touches) / pinchStart.current.distance));
    } else if (e.touches.length === 1 && touchDrag.current && touchDrag.current.id === e.touches[0].identifier) {
      const t = e.touches[0];
      const next = { x: t.clientX - touchDrag.current.startX, y: t.clientY - touchDrag.current.startY };
      offsetRef.current = next;
      setOffset(next);
    }
  };

  const onTouchEnd = () => {
    touchDrag.current = null;
    pinchStart.current = null;
    setPanning(false);
  };

  const onWheel = (e: React.WheelEvent) => {
    applyZoom(e.deltaY < 0 ? scaleRef.current * ZOOM_STEP : scaleRef.current / ZOOM_STEP);
  };

  const onDoubleClick = () => {
    if (scaleRef.current > MIN_SCALE) reset();
    else applyZoom(scaleRef.current * 2);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center select-none" onClick={onClose}>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 text-white bg-slate-900/40 hover:bg-slate-900/60 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 p-2 rounded-full transition-colors"
      >
        <X size={24} />
      </button>

      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/60 backdrop-blur px-3 py-2 rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          className="text-white p-1.5 hover:bg-white/10 rounded-full disabled:opacity-40 transition-colors"
          aria-label="Zoom arrière"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={reset}
          className="text-white p-1.5 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Réinitialiser le zoom"
        >
          <Maximize2 size={18} />
        </button>
        <button
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          className="text-white p-1.5 hover:bg-white/10 rounded-full disabled:opacity-40 transition-colors"
          aria-label="Zoom avant"
        >
          <ZoomIn size={18} />
        </button>
      </div>

      <div
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: panning ? 'none' : 'transform 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      >
        <img src={src} alt={alt} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-none" draggable={false} />
      </div>
    </div>
  );
}