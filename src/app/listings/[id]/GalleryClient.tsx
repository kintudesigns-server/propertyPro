"use client";

import { useState } from "react";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryClientProps {
  images: string[];
  title: string;
}

export function GalleryClient({ images, title }: GalleryClientProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

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

  const count = images.length;

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs bg-slate-100 font-sans">
        
        {/* ── Case 1: 1 Image (Full Width Hero Container) ── */}
        {count === 1 && (
          <div
            onClick={() => openFullscreen(0)}
            className="relative h-[340px] sm:h-[420px] md:h-[480px] w-full cursor-pointer overflow-hidden group"
          >
            <img
              src={images[0]}
              alt={`${title} main photo`}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </div>
        )}

        {/* ── Case 2: 2 Images (50/50 Split Grid) ── */}
        {count === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 h-[340px] sm:h-[420px] md:h-[480px]">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => openFullscreen(idx)}
                className="relative cursor-pointer overflow-hidden group h-full"
              >
                <img
                  src={img}
                  alt={`${title} photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
            ))}
          </div>
        )}

        {/* ── Case 3: 3 Images (Hero Left + 2 Right) ── */}
        {count === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 h-[340px] sm:h-[420px] md:h-[480px]">
            <div
              onClick={() => openFullscreen(0)}
              className="md:col-span-2 relative cursor-pointer overflow-hidden group h-full"
            >
              <img
                src={images[0]}
                alt={`${title} main`}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
            <div className="hidden md:grid grid-rows-2 gap-1 h-full">
              {images.slice(1, 3).map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => openFullscreen(idx + 1)}
                  className="relative cursor-pointer overflow-hidden group h-full"
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
          </div>
        )}

        {/* ── Case 4: 4 Images (Hero Left + 3 Stacked Right) ── */}
        {count === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 h-[340px] sm:h-[420px] md:h-[480px]">
            <div
              onClick={() => openFullscreen(0)}
              className="md:col-span-2 relative cursor-pointer overflow-hidden group h-full"
            >
              <img
                src={images[0]}
                alt={`${title} main`}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
            <div className="hidden md:grid grid-rows-3 gap-1 h-full">
              {images.slice(1, 4).map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => openFullscreen(idx + 1)}
                  className="relative cursor-pointer overflow-hidden group h-full"
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
          </div>
        )}

        {/* ── Case 5+: 5 or More Images (Bento Grid) ── */}
        {count >= 5 && (
          <div
            className="grid gap-1 h-[340px] sm:h-[420px] md:h-[480px]"
            style={{ gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "1fr 1fr" }}
          >
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

            {images.slice(1, 5).map((img, idx) => (
              <div
                key={idx}
                onClick={() => openFullscreen(idx + 1)}
                className="hidden md:block relative cursor-pointer overflow-hidden group"
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
        )}

        {/* "Show all" badge button */}
        <button
          onClick={() => openFullscreen(0)}
          className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-[#1D1D1F] backdrop-blur-md px-3.5 py-2 rounded-xl font-medium text-xs border border-slate-200/80 shadow-2xs flex items-center gap-2 transition-all active:scale-95 z-10 cursor-pointer"
        >
          <ImageIcon className="h-4 w-4 text-slate-500" />
          <span>{count === 1 ? "View photo" : `Show all ${count} photos`}</span>
        </button>
      </div>

      {/* Fullscreen iOS Image Viewer Modal */}
      {fullscreenIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-white z-10 pt-safe">
            <span className="text-xs font-medium text-white/70">
              {fullscreenIndex + 1} of {images.length}
            </span>
            <button
              onClick={closeFullscreen}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            {images.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-2 sm:left-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-10 cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <img
              src={images[fullscreenIndex]}
              alt={`${title} preview ${fullscreenIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all"
            />

            {images.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-2 sm:right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-10 cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 pb-safe">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setFullscreenIndex(idx)}
                  className={`h-12 w-16 rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer ${
                    fullscreenIndex === idx
                      ? "ring-2 ring-white scale-105 opacity-100"
                      : "opacity-40 hover:opacity-80"
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
