"use client";

import { useState } from "react";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryClientProps {
  images: string[];
  title: string;
}

export function GalleryClient({ images, title }: GalleryClientProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
  };

  const closeFullscreen = () => {
    setFullscreenIndex(null);
  };

  const prevImage = () => {
    if (fullscreenIndex !== null) {
      setFullscreenIndex((fullscreenIndex - 1 + images.length) % images.length);
    }
  };

  const nextImage = () => {
    if (fullscreenIndex !== null) {
      setFullscreenIndex((fullscreenIndex + 1) % images.length);
    }
  };

  return (
    <>
      {/* iOS Gallery 5-Grid Layout */}
      <div className="relative rounded-[22px] overflow-hidden border border-black/10 shadow-sm bg-[#E5E5EA]">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[340px] sm:h-[420px] md:h-[480px]">
          {/* Main Hero Photo */}
          <div
            onClick={() => openFullscreen(0)}
            className="md:col-span-2 md:row-span-2 relative h-full cursor-pointer overflow-hidden group"
          >
            <img
              src={images[0]}
              alt={`${title} main`}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* 4 Secondary Photos */}
          {images.slice(1, 5).map((img, idx) => (
            <div
              key={idx}
              onClick={() => openFullscreen(idx + 1)}
              className="hidden md:block relative h-full cursor-pointer overflow-hidden group"
            >
              <img
                src={img}
                alt={`${title} photo ${idx + 2}`}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        {/* Frosted Action Badge: Show All Photos */}
        <button
          onClick={() => openFullscreen(0)}
          className="absolute bottom-4 right-4 bg-white/85 hover:bg-white text-[#1D1D1F] backdrop-blur-md px-3.5 py-2 rounded-full font-semibold text-xs border border-white/60 shadow-md flex items-center gap-2 transition-all active:scale-95 z-10"
        >
          <ImageIcon className="h-4 w-4 text-[#007AFF]" />
          <span>Show all {images.length} photos</span>
        </button>
      </div>

      {/* Fullscreen iOS Image Viewer Modal */}
      {fullscreenIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex items-center justify-between text-white z-10 pt-safe">
            <span className="text-xs font-semibold text-white/70">
              {fullscreenIndex + 1} of {images.length}
            </span>
            <button
              onClick={closeFullscreen}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Image Container */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <button
              onClick={prevImage}
              className="absolute left-2 sm:left-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <img
              src={images[fullscreenIndex]}
              alt={`${title} preview ${fullscreenIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all"
            />

            <button
              onClick={nextImage}
              className="absolute right-2 sm:right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-10"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 pb-safe">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setFullscreenIndex(idx)}
                className={`h-12 w-16 rounded-lg overflow-hidden shrink-0 transition-all ${
                  fullscreenIndex === idx
                    ? "ring-2 ring-[#007AFF] scale-105 opacity-100"
                    : "opacity-40 hover:opacity-80"
                }`}
              >
                <img src={img} alt="thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
