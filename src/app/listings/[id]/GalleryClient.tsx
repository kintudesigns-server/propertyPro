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
      {/* Gallery 3-col layout: hero left, 4 thumbs right in 2x2 */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div
          className="grid gap-1 h-[340px] sm:h-[420px] md:h-[480px]"
          style={{ gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "1fr 1fr" }}
        >
          {/* Hero — spans full 2 rows on left */}
          <div
            onClick={() => openFullscreen(0)}
            className="row-span-2 relative cursor-pointer overflow-hidden group"
          >
            <img
              src={images[0]}
              alt={`${title} main`}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </div>

          {/* 4 thumbnails: 2 columns × 2 rows on right */}
          {images.slice(1, 5).map((img, idx) => (
            <div
              key={idx}
              onClick={() => openFullscreen(idx + 1)}
              className={`hidden md:block relative cursor-pointer overflow-hidden group ${
                idx === 1 ? "rounded-tr-2xl" : idx === 3 ? "rounded-br-2xl" : ""
              }`}
            >
              <img
                src={img}
                alt={`${title} photo ${idx + 2}`}
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
          ))}
        </div>

        {/* "Show all" badge */}
        <button
          onClick={() => openFullscreen(0)}
          className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md px-3.5 py-2 rounded-xl font-semibold text-xs border border-slate-200 shadow-md flex items-center gap-2 transition-all active:scale-95 z-10"
        >
          <ImageIcon className="h-4 w-4 text-slate-500" />
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
                    ? "ring-2 ring-white scale-105 opacity-100"
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
