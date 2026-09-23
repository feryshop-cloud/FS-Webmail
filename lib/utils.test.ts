import { describe, expect, it } from "vitest";
import { validateEmail, formatRelativeTime, extractEmailParam, stripHtmlToSnippet } from "./utils";

describe("validateEmail", () => {
  it("accepts valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("user.name+tag@sub.domain.co.id")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("rejects missing domain dot", () => {
    expect(validateEmail("user@example")).toBe(false);
  });

  it("rejects whitespace", () => {
    expect(validateEmail(" user@example.com")).toBe(false);
    expect(validateEmail("user @example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateEmail("")).toBe(false);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date();

  it("under 60s → 'Baru saja'", () => {
    const d = new Date(now.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(d)).toBe("Baru saja");
  });

  it("minutes → 'X menit lalu'", () => {
    const d = new Date(now.getTime() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(d)).toBe("5 menit lalu");
  });

  it("hours → 'X jam lalu'", () => {
    const d = new Date(now.getTime() - 3 * 3600_000).toISOString();
    expect(formatRelativeTime(d)).toBe("3 jam lalu");
  });

  it("days under 7 → 'X hari lalu'", () => {
    const d = new Date(now.getTime() - 2 * 86400_000).toISOString();
    expect(formatRelativeTime(d)).toBe("2 hari lalu");
  });

  it(">= 7 days → formatted date (id-ID)", () => {
    const d = new Date(now.getTime() - 10 * 86400_000).toISOString();
    const result = formatRelativeTime(d);
    expect(result).toMatch(/\d{1,2} \w{3} \d{4}/);
  });
});

describe("extractEmailParam", () => {
  it("decodes percent-encoded email", () => {
    expect(extractEmailParam("user%40example.com")).toBe("user@example.com");
  });

  it("returns input unchanged on malformed encoding", () => {
    expect(extractEmailParam("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("passes through plain email", () => {
    expect(extractEmailParam("user@example.com")).toBe("user@example.com");
  });
});

describe("stripHtmlToSnippet", () => {
  it("removes HTML tags and normalizes spaces", () => {
    const html = "<p>Halo <b>dunia</b>!</p> <p>Ini pesan test.</p>";
    expect(stripHtmlToSnippet(html)).toBe("Halo dunia! Ini pesan test.");
  });

  it("removes head, style, and script tags completely", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>.btn { color: red; }</style>
          <script>alert(1);</script>
        </head>
        <body>
          <h1>Sign up for Notion</h1>
          <p>Your code is <b>123456</b></p>
        </body>
      </html>
    `;
    expect(stripHtmlToSnippet(html)).toBe("Sign up for Notion Your code is 123456");
  });

  it("decodes HTML entities", () => {
    const html = "Kode &amp; PIN Anda: 123 &gt; 100 &quot;Aman&quot; &nbsp; OK";
    expect(stripHtmlToSnippet(html)).toBe('Kode & PIN Anda: 123 > 100 "Aman" OK');
  });

  it("truncates at maxLength if specified", () => {
    const text = "A".repeat(250);
    const result = stripHtmlToSnippet(text, 100);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBe(103);
  });
});
