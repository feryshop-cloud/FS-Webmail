import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateEmail(email: string): boolean {
  // RFC 2822 compliant standard email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Baru saja";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function extractEmailParam(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/**
 * Membersihkan tag HTML, style, script, dan entity agar cuplikan di daftar email
 * tampil sebagai teks biasa yang rapi dan mudah dibaca tanpa skrip kode HTML.
 */
export function stripHtmlToSnippet(htmlOrText: string | null | undefined, maxLength = 180): string {
  if (!htmlOrText) return "";

  // 1. Hapus komentar HTML
  let text = htmlOrText.replace(/<!--[\s\S]*?-->/g, " ");

  // 2. Hapus blok <style> dan <script> beserta seluruh isinya
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");

  // 3. Hapus blok <head> beserta seluruh isinya
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ");

  // 4. Hapus seluruh tag HTML yang tersisa
  text = text.replace(/<[^>]+>/g, " ");

  // 5. Decode entitas HTML umum
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&[a-z0-9]+;/gi, " ");

  // 6. Normalisasi spasi sebelum tanda baca yang mungkin timbul dari tag inline (contoh <b>kata</b>!)
  text = text.replace(/\s+([!?,.:;])/g, "$1");

  // 7. Normalisasi whitespace menjadi satu spasi
  text = text.replace(/\s+/g, " ").trim();

  if (maxLength > 0 && text.length > maxLength) {
    return text.slice(0, maxLength).trim() + "...";
  }

  return text;
}
