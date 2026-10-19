# WebMail (Feryshop) — Features & Code Coverage

**Last Updated:** 2026-10-19
**Coverage Threshold:** 80% Lines

---

## Overview

WebMail (Feryshop) terdiri dari 2 komponen utama:

| Komponen | Path | Purpose |
|---|---|---|
| **WebMail (Next.js)** | `WebMail/` | UI web untuk pembeli memeriksa email masuk (Inbox) |
| **imap-worker (Node.js)** | `WebMail/imap-worker/` | Background service untuk menangkap email via IMAP, mem-parsing, mengklasifikasi, dan menyimpan ke DB |

---

## Feature List

### A. Public Inbox (Kotak Masuk Publik)

| Fitur | Deskripsi | Status |
|---|---|---|
| Akses Anonim | Email dibaca tanpa login, cukup input alamat email virtual | ✅ |
| Filter Visibilitas | Email `visibility = 'buyer'` saja yang muncul di UI | ✅ |
| Real-time | Supabase Realtime untuk update langsung tanpa refresh | ✅ |
| Copy OTP | Tombol copy OTP langsung tanpa buka detail email | ✅ |

### B. Authentication & Session

| Fitur | Deskripsi | Status |
|---|---|---|
| Verify Mailbox Access | PIN/Password verification untuk akses inbox | ✅ |
| Rate Limiting | Max 5 failed attempts per 10 min per email | ✅ |
| Single-Mailbox Session | Clear existing cookies saat login baru | ✅ |
| HMAC-Signed Cookie | Session token tahan modifikasi (httpOnly, 7 hari) | ✅ |
| Revoke Access | Logout & clear semua session cookies | ✅ |

### C. Email Management

| Fitur | Deskripsi | Status |
|---|---|---|
| Inbox List | Tampilkan daftar email dengan metadata (subjek, waktu, status) | ✅ |
| Email Card UI | Tampilan email dalam format card dengan badge status | ✅ |
| Email Body Viewer | Tampilan isi email (text/html) dalam modal/overlay | ✅ |
| Archive/Unarchive | Move email ke/from arsip | ✅ |
| Delete Email | Hapus email permanent | ✅ |

### D. Password Management

| Fitur | Deskripsi | Status |
|---|---|---|
| Change Password Modal | Form ganti PIN/Password mailbox | ✅ |
| Security Headers | CSRF protection di form submit | ✅ |

### E. IMAP Worker

| Fitur | Deskripsi | Status |
|---|---|---|
| IMAP Connect | Koneksi ke mail server (Postfix) via IMAPS (port 993) | ✅ |
| Mailbox Lock | Lock INBOX untuk write-only access | ✅ |
| Email Fetch | Fetch single email via sequence number | ✅ |
| Email Parsing | Parse multipart email (subject, body, from, to, etc.) | ✅ |
| Email Classification | Klasifikasi otomatis ke 3 kategori | ✅ |
| OTP Extraction | Ekstrak kode angka dari teks email | ✅ |
| Insert to DB | Upsert ke `incoming_emails` (uniq constraint) | ✅ |
| Heartbeat | Ping ke `worker_heartbeat` tiap 2 menit | ✅ |
| Exponential Backoff | Reconnect delay: 1s → 2s → 4s → max 60s | ✅ |

---

## Code Coverage

### WebMail (Root) — 87.22% Lines (280/321)

| File | Lines | Status |
|---|---|---|
| `app/actions/email.ts` | 79.09% (87/110) | ✅ |
| `lib/logger.ts` | 94.73% (18/19) | ✅ |
| `lib/metrics.ts` | 100% (13/13) | ✅ |
| `lib/rate-limit.ts` | 64.28% (18/28) | ⚠️  |
| `lib/utils.ts` | 96.55% (28/29) | ✅ |
| `lib/auth/signed-token.ts` | 92.85% (39/42) | ✅ |
| `lib/logging/format.ts` | 100% (29/29) | ✅ |
| `lib/logging/request-context.ts` | 33.33% (1/3) | ⚠️  |
| `lib/logging/with-request-logging.ts` | 100% (17/17) | ✅ |
| `lib/supabase/client.ts` | 96.15% (25/26) | ✅ |
| `lib/supabase/server.ts` | 100% (5/5) | ✅ |

### Imap-Worker — 89.14% Lines (156/175)

| File | Lines | Status |
|---|---|---|
| `src/index.ts` | 90.9% (20/22) | ✅ |
| `src/classification/classifier.ts` | 100% (11/11) | ✅ |
| `src/classification/otp-extractor.ts` | 100% (8/8) | ✅ |
| `src/imap/connection.ts` | 90.76% (59/65) | ✅ |
| `src/supabase/client.ts` | 0% (0/4) | ⚠️  |
| `src/supabase/heartbeat.ts` | 100% (18/18) | ✅ |
| `src/supabase/insert-email.ts` | 100% (12/12) | ✅ |
| `src/utils/logger.ts` | 80% (28/35) | ✅ |

> **Notes:**
> - ⚠️ = Below ideal but acceptable threshold per file (overall passes 80%)
> - `request-context.ts` dan `client.ts` (imap-worker) low coverage karena singleton pattern dan minimal logic

---

## Test Files

### Root Tests (`bunx vitest run`)

| File | Purpose |
|---|---|
| `app/actions/email.test.ts` | Server actions: verifyMailboxAccess (rate-limit, PIN, cookie), getMailboxPinStatus, isMailboxAuthorized, revokeMailboxEmail, archive/delete via Edge Function |
| `lib/logger.test.ts` | Logger wrapper (debug/info/warn/error, meta handling, request-id) |
| `lib/metrics.test.ts` | Prometheus metrics registry & counters |
| `lib/utils.test.ts` | Email validation, relative time formatting |
| `lib/logging/format.test.ts` | Error serialization, log formatting |
| `lib/logging/with-request-logging.test.ts` | Request logging middleware (success/error paths) |
| `lib/supabase/client.test.ts` | Supabase browser client (singleton) |
| `lib/supabase/server.test.ts` | Server-side Supabase client with env validation |

> `lib/rate-limit.ts` dan `lib/auth/signed-token.ts` terkuji lewat `app/actions/email.test.ts` (dipanggil server action), bukan file test terpisah.

### Imap-Worker Tests (`cd imap-worker && bunx vitest run`)

| File | Purpose |
|---|---|
| `src/index.test.ts` | Main entry: heartbeat, IMAP connect, signal handlers (SIGINT/SIGTERM/uncaughtException) |
| `src/classification/classifier.test.ts` | Email classification: login_otp, security_alert, account_change_verification |
| `src/classification/otp-extractor.test.ts` | OTP regex extraction from email body |
| `src/imap/connection.test.ts` | IMAP connect, mailbox lock, exists event, reconnect backoff |
| `src/supabase/heartbeat.test.ts` | Heartbeat send & exponential backoff retry |
| `src/supabase/insert-email.test.ts` | Email insert to DB, duplicate handling |

### E2E Tests (`bun run test:e2e` — runner `e2e`, butuh `.env.local` kredensial test)

| File | Purpose |
|---|---|
| `tests/auth-flow.e2e.ts` | Login, logout, session revocation |
| `tests/inbox-features.e2e.ts` | Inbox access, email display, copy OTP |
| `tests/landing-page.e2e.ts` | Landing page rendering, form submission |

---

## Type Checking

```bash
# WebMail root
bunx tsc --noEmit  # Exit: 0

# Imap-worker
bunx tsc --noEmit  # Exit: 0
```

---

## CI/CD Integration

### Test Command (Root)
```bash
bunx vitest run --coverage
```

### Test Command (Imap-Worker)
```bash
cd imap-worker && bunx vitest run --coverage
```

### Coverage Threshold Gate
Set in `vitest.config.mts`:
```ts
coverage: {
  provider: "v8",
  thresholds: { lines: 80 }
}
```

---

## Summary

- **Total Tests:** 157 (103 root + 54 imap-worker; +3 spec E2E via `bun run test:e2e`, terpisah dari coverage gate)
- **Root Coverage:** 87.22% ✅ (≥80%)
- **Imap-Worker Coverage:** 89.14% ✅ (≥80%)
- **Type Safety:** Full (no TS errors)
- **Dependencies:** `@vitest/coverage-v8@4.1.11` pinned
