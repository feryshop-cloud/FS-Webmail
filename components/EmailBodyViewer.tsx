"use client";

import React, { useState, useMemo } from "react";
import { Globe, FileText, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

interface EmailBodyViewerProps {
  content: string;
  className?: string;
}

/**
 * Mendeteksi apakah string berisi struktur/tag HTML
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return (
    /<!doctype/i.test(trimmed) ||
    /<(html|body|div|table|p|span|section|main|article|table|tbody|tr|td|style|head)[^>]*>/i.test(
      trimmed,
    ) ||
    /<\/?[a-z][\s\S]*>/i.test(trimmed)
  );
}

/**
 * Membersihkan tag HTML untuk menghasilkan teks murni saat mode teks polos dipilih
 */
export function extractPlainTextFromHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

export function EmailBodyViewer({ content, className = "" }: EmailBodyViewerProps) {
  const isHtml = useMemo(() => isHtmlContent(content), [content]);
  const [viewMode, setViewMode] = useState<"html" | "text">(isHtml ? "html" : "text");
  const [isExpanded, setIsExpanded] = useState(false);

  const sandboxedSrcDoc = useMemo(() => {
    if (!isHtml) return "";
    const clean = content.trim();
    if (/<html/i.test(clean)) {
      return clean.replace(/<head[^>]*>/i, `$&<base target="_blank">`);
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1e293b;
      background-color: #ffffff;
      margin: 0;
      padding: 16px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    img { max-width: 100%; height: auto; display: block; margin: 8px 0; }
    a { color: #2563eb; text-decoration: underline; }
    table { max-width: 100% !important; }
  </style>
</head>
<body>
  ${clean}
</body>
</html>`;
  }, [content, isHtml]);

  const plainTextFallback = useMemo(() => {
    if (isHtml) {
      return extractPlainTextFromHtml(content);
    }
    return content;
  }, [content, isHtml]);

  const handleOpenRawInNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Control Toolbar Jika Konten Memiliki HTML */}
      {isHtml && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-100/70 p-2 text-xs text-slate-700"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <Globe className="h-3.5 w-3.5 text-blue-600" />
            <span>Format HTML Terdeteksi</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="shadow-2xs flex rounded-md border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("html")}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all ${
                  viewMode === "html"
                    ? "shadow-xs bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Globe className="h-3 w-3" />
                <span>Visual HTML</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("text")}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all ${
                  viewMode === "text"
                    ? "shadow-xs bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Teks Polos</span>
              </button>
            </div>

            {viewMode === "html" && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                title={isExpanded ? "Kecilkan Tampilan" : "Perbesar Tampilan"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenRawInNewTab}
              className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              title="Buka HTML di Tab Baru"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Konten Utama */}
      {isHtml && viewMode === "html" ? (
        <div
          className={`shadow-xs overflow-hidden rounded-lg border border-slate-200 bg-white transition-all ${
            isExpanded ? "h-[75vh]" : "h-[500px] min-h-[400px]"
          }`}
        >
          <iframe
            srcDoc={sandboxedSrcDoc}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className="h-full w-full border-0 bg-white"
            title="Pratinjau Pesan Email HTML"
          />
        </div>
      ) : (
        <div className="shadow-2xs rounded-lg border border-slate-200 bg-white p-5">
          <div className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">
            {plainTextFallback || (
              <span className="italic text-slate-400">Email ini tidak memiliki teks pesan.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
