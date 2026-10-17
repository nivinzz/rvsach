import React, { useState, useEffect, useRef } from 'react';
import { Type, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

const STORAGE_KEY = 'matchabook_font_scale';
const DEFAULT_SCALE = 105; // 105% default gives mobile a crisp, comfortable reading size
const MIN_SCALE = 85;
const MAX_SCALE = 150;
const STEP = 10;

export const FontSizeAdjuster: React.FC = () => {
  const [scale, setScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_SCALE && val <= MAX_SCALE) {
          return val;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SCALE;
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isScrolledIdle, setIsScrolledIdle] = useState<boolean>(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply scale to CSS custom property --reading-font-scale ONLY (not root html fontSize)
  useEffect(() => {
    // Clear any previous root html fontSize so layout/padding/hero never stretch or break
    document.documentElement.style.fontSize = '';
    document.documentElement.style.setProperty('--reading-font-scale', `${scale / 100}`);
    try {
      localStorage.setItem(STORAGE_KEY, scale.toString());
    } catch {
      // Storage unavailable
    }
  }, [scale]);

  // Auto-collapse timer when expanded
  useEffect(() => {
    if (isExpanded) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 4000);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isExpanded, scale]);

  // Subtle fade on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledIdle(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolledIdle(false);
      }, 1500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(MAX_SCALE, prev + STEP));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(MIN_SCALE, prev - STEP));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(100);
  };

  return (
    <div
      className={`fixed bottom-5 right-4 z-50 no-print transition-all duration-300 ${
        isScrolledIdle && !isExpanded ? 'opacity-40 hover:opacity-100' : 'opacity-100'
      }`}
    >
      {!isExpanded ? (
        /* Minimized Floating Button (Tự ẩn / Thu gọn nhẹ nhàng) */
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-purple-950/90 text-lime-300 hover:bg-purple-900 border border-lime-400/40 shadow-xl backdrop-blur-md cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
          title="Điều chỉnh cỡ chữ toàn bộ trang"
          aria-label="Cỡ chữ"
        >
          <Type className="w-3.5 h-3.5 text-lime-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold font-mono tracking-tight">
            {scale}%
          </span>
        </button>
      ) : (
        /* Expanded Floating Toolbar */
        <div
          className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-purple-950/95 text-white border-2 border-lime-400/50 shadow-2xl backdrop-blur-lg animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Zoom Out Button */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold cursor-pointer transition"
            title="Giảm cỡ chữ (A-)"
          >
            <ZoomOut className="w-3.5 h-3.5 text-purple-200" />
          </button>

          {/* Current Scale Display & Quick Reset */}
          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded-xl bg-lime-400/20 hover:bg-lime-400/30 border border-lime-400/40 text-lime-300 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition"
            title="Bấm để đưa về 100% mặc định"
          >
            <span>{scale}%</span>
            {scale !== 100 && <RotateCcw className="w-2.5 h-2.5 opacity-70" />}
          </button>

          {/* Zoom In Button */}
          <button
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            className="w-8 h-8 rounded-xl bg-lime-500 hover:bg-lime-400 active:bg-lime-600 text-lime-950 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold cursor-pointer shadow-xs transition"
            title="Tăng cỡ chữ (A+)"
          >
            <ZoomIn className="w-3.5 h-3.5 text-lime-950" />
          </button>

          {/* Close / Collapse Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="w-6 h-6 rounded-lg text-purple-300 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition ml-0.5"
            title="Thu nhỏ thanh điều chỉnh"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
