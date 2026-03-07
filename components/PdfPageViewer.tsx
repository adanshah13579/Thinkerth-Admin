"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export interface PdfPageViewerProps {
  fileUrl: string;
  fileName?: string;
  maxHeight?: number;
  showAllPages?: boolean;
  onOpenInNewTab?: () => void;
}

const DEFAULT_PAGE_WIDTH = 420;

export const PdfPageViewer: React.FC<PdfPageViewerProps> = ({
  fileUrl,
  fileName = "Document",
  maxHeight = 280,
  showAllPages = false,
  onOpenInNewTab,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    setMounted(true);
  }, []);

  const onDocumentLoadSuccess = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setPageNumber(1);
    setLoadError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    setLoadError(error?.message || "Failed to load PDF");
  };

  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNext = () => setPageNumber((p) => Math.min(numPages, p + 1));

  if (!mounted) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center"
        style={{ minHeight: 160, maxHeight: showAllPages ? undefined : maxHeight }}
      >
        <span className="text-sm text-gray-500">Loading PDF…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800 mb-2">Preview unavailable ({loadError})</p>
        {onOpenInNewTab && (
          <button
            type="button"
            onClick={onOpenInNewTab}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Open {fileName} in new tab
          </button>
        )}
      </div>
    );
  }

  if (showAllPages) {
    return (
      <div className="group rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div
          className="flex flex-col items-center gap-4 overflow-y-auto bg-gray-100 py-4"
          style={{ maxHeight: 720 }}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center py-12 text-gray-500">Loading…</div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <Page
                key={p}
                pageNumber={p}
                width={DEFAULT_PAGE_WIDTH}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            ))}
          </Document>
        </div>
        {numPages > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-gray-900 text-white text-xs">
            <span className="text-[11px] font-medium">
              {numPages} page{numPages !== 1 ? "s" : ""}
            </span>
            {onOpenInNewTab && (
              <button
                type="button"
                onClick={onOpenInNewTab}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px]"
              >
                Open
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div
        className="group relative flex items-center justify-center overflow-auto scrollbar-hide bg-gray-100"
        style={{ maxHeight }}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center py-12 text-gray-500">Loading…</div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={
              Math.min(
                DEFAULT_PAGE_WIDTH,
                typeof window !== "undefined" ? window.innerWidth - 80 : DEFAULT_PAGE_WIDTH
              )
            }
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>

        {numPages > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={pageNumber <= 1}
              className="absolute inset-y-0 left-0 flex items-center pl-3 pr-6 text-white opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none z-10"
              aria-label="Previous page"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M15 19l-7-7 7-7" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={pageNumber >= numPages}
              className="absolute inset-y-0 right-0 flex items-center pr-3 pl-6 justify-end text-white opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none z-10"
              aria-label="Next page"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </>
        )}
      </div>

      {numPages > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-900 text-white text-xs">
          <span className="text-[11px] font-medium">
            {pageNumber} / {numPages}
          </span>
          {onOpenInNewTab && (
            <button
              type="button"
              onClick={onOpenInNewTab}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px]"
            >
              Open in new tab
            </button>
          )}
        </div>
      )}
    </div>
  );
};
