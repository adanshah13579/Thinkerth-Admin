"use client";

import { PdfPageViewer } from "./PdfPageViewer";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const UPLOADS_BASE = API_BASE.replace(/\/api\/?$/, "");

function resolveUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${UPLOADS_BASE}${url}`;
  }
  return `${UPLOADS_BASE}/${url}`;
}

function getFileName(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `http://localhost${url.startsWith("/") ? "" : "/"}${url}`;
    const pathname = new URL(u).pathname;
    const segment = pathname.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(segment) || "Document";
  } catch {
    return "Document";
  }
}

function isPdfUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith(".pdf") || lower.includes(".pdf?");
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

export interface PostMediaProps {
  urls: string[];
  onImageClick?: (src: string) => void;
  /** Fixed max height for consistent sizing (images + PDFs) */
  maxHeight?: number;
  /** Fixed max width for consistent sizing */
  maxWidth?: number;
  /** @deprecated Use maxHeight instead */
  compact?: boolean;
}

const DEFAULT_SIZE = 280;

export function PostMedia({ urls, onImageClick, maxHeight, maxWidth, compact = false }: PostMediaProps) {
  if (!urls.length) return null;

  const height = maxHeight ?? (compact ? 320 : 520);
  const width = maxWidth ?? DEFAULT_SIZE;

  return (
    <div className="flex flex-col gap-2">
      {urls.map((url, i) => {
        const resolved = resolveUrl(url);
        const fileName = getFileName(resolved);

        if (isImageUrl(resolved)) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onImageClick?.(resolved)}
              className="flex items-center justify-center rounded border border-gray-200 bg-gray-50 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40"
              style={{ width, height, minHeight: height }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolved}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            </button>
          );
        }

        if (isPdfUrl(resolved)) {
          return (
            <div key={i} style={{ width }}>
              <PdfPageViewer
                fileUrl={resolved}
                fileName={fileName}
                maxHeight={height}
                onOpenInNewTab={() => window.open(resolved, "_blank", "noopener,noreferrer")}
              />
            </div>
          );
        }

        return (
          <a
            key={i}
            href={resolved}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors"
          >
            <span>📄</span>
            <span className="truncate max-w-[200px]">{fileName}</span>
            <span className="text-blue-500">Open</span>
          </a>
        );
      })}
    </div>
  );
}
