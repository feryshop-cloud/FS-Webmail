# FerryMail (WebMail)

Layanan webmail & background worker dalam ekosistem Feryshop. Terdiri dari 3 bagian utama:
1. **WebMail Next.js App** — antarmuka inbox publik tanpa login untuk membaca email masuk & OTP.
2. **imap-worker** — daemon Node.js yang berjalan di VPS untuk mengambil email dari server IMAP (Postfix/Dovecot), melakukan parse/klasifikasi email, ekstraksi OTP, dan menulis langsung ke Supabase.
3. **Supabase Edge Function `change-mailbox-password`** — serverless function untuk mereset/mengganti password mailbox via cPanel UAPI dengan verifikasi OTP dan rate-limiting.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Worker**: Node.js + TypeScript (`imap-worker/`)
- **Database**: Supabase (PostgreSQL) — tabel `email_accounts`, `incoming_emails`
- **Edge Functions**: Supabase Edge Functions (`change-mailbox-password`)
- **IMAP**: `imapflow` untuk koneksi ke mail server

## Struktur Direktori

```
WebMail/
├── app/                      # Next.js 15 App Router (`/`, `/inbox/[email]`)
├── components/               # UI components (InboxList, EmailCard, ChangePasswordModal)
├── imap-worker/
│   ├── src/
│   │   ├── imap/             # IMAP connection handling
│   │   ├── classification/   # Email classification & OTP extraction
│   │   │   ├── classifier.ts
│   │   │   └── otp-extractor.ts
│   │   └── supabase/         # Database integration & heartbeat
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   └── functions/
│       └── change-mailbox-password/  # Edge Function untuk ganti password
├── scripts/                  # Maintenance scripts
└── package.json
```

## Quick Commands (Windows PowerShell)

```powershell
# WebMail Next.js Frontend
npm install
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run lint                 # ESLint

# IMAP Worker (daemon Node.js di VPS)
cd imap-worker
npm install
npm run dev                  # start daemon (development)
npm run build                # compile TypeScript
npm run start                # start daemon (production)

# Supabase Edge Functions
supabase functions deploy change-mailbox-password
```

## Prerequisites

- Node.js >= 18.x
- npm / pnpm / yarn
- Proyek Supabase aktif dengan tabel `email_accounts` dan `incoming_emails`
- Mail server IMAP (cPanel/Mailserver) dengan akses IMAP enabled
- (Opsional) VPS untuk menjalankan `imap-worker` daemon

## Konfigurasi

Buat file `.env.local` di root `WebMail/` untuk Next.js app:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Untuk `imap-worker`, konfigurasi via `.env` atau environment variable VPS:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
IMAP_HOST=mail.yourdomain.com
IMAP_PORT=993
IMAP_USER=user@yourdomain.com
IMAP_PASS=password
```

## Alur Data

```text
Mail Server (IMAP)
    ↓
imap-worker (daemon Node.js di VPS)
    ↓ parse/classify/extract OTP
    ↓
Supabase (tabel incoming_emails)
    ↓
WebMail Next.js App (baca via RLS)
    ↓
User / Admin (inbox publik)
```

## Catatan Keamanan

- Jangan commit `.env.local` atau secret apapun.
- Edge Function `change-mailbox-password` memverifikasi OTP sebelum mengirim kredensial ke cPanel UAPI.
- RLS di Supabase memastikan email hanya dibaca sesuai visibility (`buyer` / `admin_only`).

## Deployment

- **WebMail Next.js**: deploy ke Vercel / Railway (standalone).
- **imap-worker**: jalankan sebagai service daemon di VPS (pm2 / systemd).
- **Edge Function**: `supabase functions deploy change-mailbox-password`.

---

_Dikembangkan dengan Zero-Hallucination Vibe Coding Principles._
