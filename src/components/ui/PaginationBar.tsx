"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemLabel = "items",
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate numbered pages with smart ellipsis
  const getPageNumbers = () => {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
    );
  };

  const pages = getPageNumbers();

  return (
    <div className="bg-white border-t border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs text-[#6E6E73] font-normal text-center sm:text-left">
        Showing <span className="font-bold text-slate-800">{startItem}</span> to{" "}
        <span className="font-bold text-slate-800">{endItem}</span> of{" "}
        <span className="font-bold text-slate-800">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* Previous Button */}
        <Button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          variant="outline"
          className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1 text-xs px-3 rounded-lg font-bold shadow-2xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Button>

        {/* Numbered Page Buttons */}
        {pages.map((page, idx) => {
          const prevPage = pages[idx - 1];
          const showEllipsis = prevPage && page - prevPage > 1;

          return (
            <React.Fragment key={page}>
              {showEllipsis && <span className="text-xs font-bold text-slate-400 px-1 select-none">...</span>}
              <button
                onClick={() => onPageChange(page)}
                className={`h-8 min-w-[32px] px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentPage === page
                    ? "bg-blue-600 text-white shadow-xs scale-105"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}

        {/* Next Button */}
        <Button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          variant="outline"
          className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1 text-xs px-3 rounded-lg font-bold shadow-2xs"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
