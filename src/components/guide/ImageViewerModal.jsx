import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export const ImageViewerModal = ({ isOpen, onClose, images = [], initialIndex = 0, title = 'Technical Deliverable Artifact' }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  if (!isOpen || images.length === 0) return null;

  const currentImg = images[currentIndex] || images[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition z-50"
        aria-label="Close image viewer"
      >
        <X size={22} />
      </button>

      {/* Navigation Left */}
      {images.length > 1 && (
        <button
          onClick={() => setCurrentIndex(i => (i === 0 ? images.length - 1 : i - 1))}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-50"
          aria-label="Previous artifact image"
        >
          <ChevronLeft size={26} />
        </button>
      )}

      {/* Navigation Right */}
      {images.length > 1 && (
        <button
          onClick={() => setCurrentIndex(i => (i === images.length - 1 ? 0 : i + 1))}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-50"
          aria-label="Next artifact image"
        >
          <ChevronRight size={26} />
        </button>
      )}

      {/* Image Container */}
      <div className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900 max-h-[75vh] flex items-center justify-center">
          <img
            src={currentImg}
            alt={`Artifact ${currentIndex + 1}`}
            className="max-h-[75vh] max-w-full object-contain rounded-2xl select-none"
          />
        </div>

        {/* Caption & Counter */}
        <div className="mt-4 text-center text-white space-y-1">
          <p className="text-sm font-bold tracking-wide">{title} &bull; Artifact #{currentIndex + 1}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/70">
            <span>High-Resolution Technical Capture</span>
            <span>&bull;</span>
            <span className="font-mono font-bold text-mint-400">{currentIndex + 1} / {images.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
