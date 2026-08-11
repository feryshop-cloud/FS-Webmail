# Roadmap Development — `feryshop-webmail`

**Versi:** 1.0  
**Status:** Aktif — Fokus saat ini  
**Lingkup:** Coding aplikasi `feryshop-webmail` saja. Fase VPS (Postfix, Dovecot, `imap-worker`) **belum dimulai** dan tidak masuk dokumen ini.  
**Referensi wajib:** `prd.md` · `AI_GUARDRAILS.md`

> **Cara pakai roadmap ini:**
> Setiap fase selesai, katakan **"LANJUT"** → AI melanjutkan ke fase berikutnya.
> Jika ada yang perlu disesuaikan atau ada pertanyaan di tengah fase, tanyakan dulu sebelum LANJUT.
> AI **TIDAK BOLEH** melompat ke fase berikutnya tanpa instruksi LANJUT dari Anda.

---

## Gambaran Besar: 7 Fase Coding

```
FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 6 → FASE 7
Setup     Types    Landing  Inbox    Realtime  Ganti    Polish
Proyek    & DB     Page     Page     + Copy    Password & Final
```

Semua fase dikerjakan di **satu repositori**: `feryshop-webmail`.  
Tidak ada ketergantungan ke VPS atau `imap-worker` — kita gunakan **Supabase dengan data dummy/seed** untuk testing lokal sampai imap-worker siap nantinya.

---

## FASE 1 — Project Setup & Foundation

**Tujuan:** Repositori berdiri dengan struktur folder, dependency, dan konfigurasi dasar yang benar — persis seperti di Bab 8 PRD. Tidak ada halaman yang "cantik" dulu, tapi semua fondasi sudah terpasang.

### Yang dikerjakan:
1. Inisialisasi project Next.js 15 (App Router) + TypeScript
   - Perintah: `npx create-next-app@latest feryshop-webmail --typescript --tailwind --app --src-dir no --import-alias "@/*"`
2. Pasang dependency wajib:
   - `@supabase/supabase-js` — database client
   - `lucide-react` — ikon utama
   - `@phosphor-icons/react` — ikon pendamping
3. Setup struktur folder persis seperti Bab 8 PRD (bukan struktur default `create-next-app`)
4. Buat file konfigurasi dasar:
   - `tailwind.config.ts` — extend palet warna sesuai Design System PRD
   - `.env.local` — template dengan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (nilai diisi Anda)
   - `next.config.js` — konfigurasi minimal
5. Setup font di `app/layout.tsx` — pakai `Geist` via `next/font/local` (bawaan Next.js)
6. `app/globals.css` — import Tailwind base saja

### Output yang bisa diverifikasi:
- `npm run dev` berjalan tanpa error
- Folder structure sesuai PRD Bab 8
- Tidak ada halaman UI yang dikerjakan di fase ini

### Estimasi: 1 sesi coding

---

## FASE 2 — Types, Supabase Client & Utilities

**Tujuan:** Seluruh "infrastruktur kode" terpasang — type definitions, Supabase client, dan helper functions. Ini fondasi yang mencegah AI berhalusinasi struktur data di fase-fase selanjutnya.

### Yang dikerjakan:
1. **`types/email.ts`** — TypeScript interface untuk:
   - `IncomingEmail` (skema persis dari Bab 5.1 PRD)
   - `MailboxAccount` (Bab 5.2 PRD)
   - Tidak menambah field yang tidak ada di PRD
2. **`lib/supabase/client.ts`** — Supabase browser client
   - Untuk Client Component (realtime subscription)
3. **`lib/supabase/server.ts`** — Supabase server client
   - Untuk Server Component (initial fetch SSR)
4. **`lib/utils.ts`** — Helper functions:
   - `validateEmail(email: string): boolean` — validasi regex format email
   - `formatRelativeTime(date: string): string` — "2 menit lalu", "1 jam lalu"
   - `extractEmailParam(encoded: string): string` — decode URL param email
5. **SQL Setup (dicatat sebagai komentar/README)** — SQL yang perlu dijalankan di Supabase Dashboard:
   ```sql
   -- Index
   CREATE INDEX idx_incoming_emails_recipient ON incoming_emails (recipient_email);
   CREATE INDEX idx_incoming_emails_received_at ON incoming_emails (received_at DESC);
   -- Unique constraint untuk idempotency (diperlukan imap-worker nantinya)
   ALTER TABLE incoming_emails ADD CONSTRAINT uniq_recipient_message 
     UNIQUE (recipient_email, message_id);
   -- RLS: aktifkan di Supabase Dashboard untuk kedua tabel
   ```
6. **Seed data untuk testing** (opsional, satu file `scripts/seed.ts`):
   - Insert 3-5 baris dummy ke `incoming_emails` dengan `visibility = 'buyer'` dan 1 baris `admin_only` — untuk memverifikasi filter berjalan benar

### Output yang bisa diverifikasi:
- TypeScript tidak ada error di `types/email.ts` dan `lib/`
- `supabase/client.ts` berhasil diimpor tanpa error

### Estimasi: 1 sesi coding

---

## FASE 3 — Landing Page (Form Input Email)

**Tujuan:** Halaman pertama yang dilihat pembeli — form input alamat email, sederhana tapi sudah menerapkan Design System PRD secara utuh.

### Yang dikerjakan:
1. **`components/ui/Input.tsx`** — Komponen input reusable
   - `rounded-md`, border `border-slate-200`, fokus `ring-blue-600`
   - Props: `placeholder`, `value`, `onChange`, `error`
2. **`components/ui/Button.tsx`** — Komponen button reusable
   - Varian: `primary` (bg-blue-600), `secondary` (outline)
   - Loading state dengan spinner
3. **`components/EmailForm.tsx`** — Client Component
   - Input email + tombol "Cek Kode OTP"
   - Validasi format email client-side (pakai `validateEmail` dari utils)
   - Error message di bawah input jika format salah
   - Redirect ke `/inbox/[email]` setelah validasi sukses
   - Microcopy: "Masukkan alamat email akun game yang kamu beli"
4. **`app/page.tsx`** — Server Component (wrapper)
   - Layout: centered, mobile-first, satu kolom
   - Judul: "FerryMail" dengan subtitle kontekstual
   - Render `EmailForm`
5. **Styling konsisten:**
   - Warna `blue-600` sebagai primary, `slate` sebagai netral
   - Font Geist teraplikasi
   - Tidak ada neon/glow/gradient pasaran

### Output yang bisa diverifikasi:
- Buka `localhost:3000`, lihat form
- Input email salah → muncul error inline
- Input email benar → redirect ke `/inbox/[email]` (halaman kosong dulu, dibuat di Fase 4)
- Tampilan mobile terlihat baik (cek di DevTools)

### Estimasi: 1 sesi coding

---

## FASE 4 — Halaman Inbox (Core Feature, Static)

**Tujuan:** Halaman `/inbox/[email]` yang menampilkan data email dari Supabase — tapi versi static dulu (tanpa realtime). Realtime ditambahkan di Fase 5.

### Yang dikerjakan:
1. **`components/EmptyState.tsx`**
   - Ilustrasi sederhana (ikon mail dari Lucide/Phosphor)
   - Teks: "Belum ada email masuk. Halaman ini akan update otomatis."
   - Tidak ada tombol "Refresh" — misinya realtime, bukan polling
2. **`components/ui/Badge.tsx`** — untuk label kategori/status email
3. **`components/EmailCard.tsx`**
   - Tampilkan: sender, subject, timestamp relatif, `otp_code` jika ada
   - OTP ditampilkan besar (`text-2xl font-mono`) dan jelas
   - Tombol "Salin Kode" — implementasi Clipboard API di Fase 5
   - `rounded-lg`, border halus, shadow-sm
   - Animasi masuk: `animate-fade-in` (custom Tailwind keyframe)
4. **`app/inbox/[email]/page.tsx`** — Server Component
   - Decode parameter email dari URL
   - Fetch initial data dari Supabase:
     ```typescript
     // Query WAJIB persis seperti ini — lihat PRD Bab 5.3
     .from('incoming_emails')
     .select('*')
     .eq('recipient_email', decodedEmail)
     .eq('visibility', 'buyer')   // WAJIB
     .order('received_at', { ascending: false })
     ```
   - Render `EmptyState` jika kosong
   - Render list `EmailCard` jika ada data
   - Pass data ke `InboxList` (Client Component, dibuat di Fase 5)

### Output yang bisa diverifikasi:
- Buka `/inbox/akun001@feryshop.com` (ganti dengan email yang ada di seed data)
- Data dari Supabase tampil sebagai kartu
- Data `admin_only` TIDAK muncul (verifikasi dengan seed data)
- Empty state muncul jika inbox kosong

### Estimasi: 1-2 sesi coding

---

## FASE 5 — Realtime Subscription + Copy OTP

**Tujuan:** Inbox berubah menjadi "hidup" — email baru muncul otomatis tanpa refresh, dan tombol salin OTP berfungsi penuh.

### Yang dikerjakan:
1. **`components/InboxList.tsx`** — Client Component (core realtime)
   ```typescript
   // Subscription dengan filter ketat — WAJIB seperti ini
   supabase
     .channel(`inbox-${email}`)
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'incoming_emails',
       filter: `recipient_email=eq.${email}` // filter 1
     }, (payload) => {
       // Filter 2 di sisi JS sebagai safety net
       if (payload.new.visibility !== 'buyer') return;
       setEmails(prev => [payload.new, ...prev]);
     })
     .subscribe();
   ```
   - Menerima `initialData` dari Server Component (Fase 4)
   - Auto re-subscribe saat tab kembali aktif (`visibilitychange` event)
2. **Clipboard API di `EmailCard.tsx`**
   - `navigator.clipboard.writeText(otp_code)`
   - State: tombol berubah ikon "centang" selama 2 detik setelah klik
   - Fallback jika Clipboard API tidak tersedia (deprecated `document.execCommand`)
3. **Toast notification sederhana**
   - "Berhasil disalin" muncul di pojok layar
   - Auto hilang setelah 2-3 detik
   - Tidak pakai library eksternal — custom CSS Tailwind cukup
4. **Indikator status koneksi realtime**
   - Dot kecil hijau (connected) / kuning/spinner (connecting/reconnecting)
   - Tampil subtle di pojok halaman inbox, tidak mengganggu

### Output yang bisa diverifikasi:
- Buka 2 tab: satu tab inbox, satu tab lain insert data manual ke Supabase
- Data baru muncul di tab inbox tanpa refresh
- Data `admin_only` tidak muncul di realtime
- Klik "Salin Kode" → ikon berubah → toast muncul → paste berhasil

### Estimasi: 1-2 sesi coding

---

## FASE 6 — Fitur Ganti Password Mailbox

**Tujuan:** Pembeli bisa mengganti password mailbox-nya sendiri, lewat verifikasi OTP — sepenuhnya aman via Supabase Edge Function.

### Yang dikerjakan:
1. **`components/ChangePasswordModal.tsx`** — Client Component
   - Trigger: tombol "Ganti Password Email" di halaman inbox
   - Tombol **disabled** + tooltip jika inbox belum pernah terima email (FR-14)
   - Form fields:
     - "Kode verifikasi" (input OTP yang tampil di inbox, sebagai bukti kepemilikan)
     - "Password baru" (min. 8 karakter, dengan show/hide toggle)
     - "Konfirmasi password baru"
   - State loading, error, sukses
   - Rate limiting state: tampilkan "Terlalu banyak percobaan, coba lagi dalam X menit" jika sudah 5x/jam
2. **Submit ke Supabase Edge Function**
   ```typescript
   const { data, error } = await supabase.functions.invoke('change-mailbox-password', {
     body: {
       recipient_email: email,
       otp_verification: otpInput,
       new_password: newPassword,
     }
   });
   ```
3. **Supabase Edge Function: `change-mailbox-password`**
   - Validasi payload
   - Query `incoming_emails` → cari `otp_code` terbaru untuk `recipient_email` tersebut (hanya `visibility = 'buyer'`, `category = 'login_otp'`)
   - Cocokkan dengan `otp_verification` dari payload
   - Jika tidak cocok → return error 400
   - Rate limiting: cek attempt count (bisa simpan di tabel sederhana atau pakai Supabase RLS trick)
   - Hash `new_password` (format yang kompatibel Dovecot)
   - `UPDATE mailbox_accounts SET password_hash = hash, updated_at = now() WHERE email = recipient_email`
   - Return success

> **Catatan:** Edge Function menggunakan `service_role_key` yang disimpan di Supabase Secrets (bukan di env frontend). Ini satu-satunya titik di seluruh ekosistem ini yang boleh mengakses tabel `mailbox_accounts`.

### Output yang bisa diverifikasi:
- Tombol "Ganti Password" disabled jika inbox kosong
- Masukkan OTP yang salah → error "Kode verifikasi tidak sesuai"
- Masukkan OTP yang benar → sukses → notifikasi "Password berhasil diubah"
- Coba >5x dalam 1 jam → rate limit aktif

### Estimasi: 2 sesi coding (karena ada Edge Function)

---

## FASE 7 — Polish, Edge Cases & Final Review

**Tujuan:** Semua edge case dari PRD Bab 4.3 ditangani, tampilan sudah konsisten di semua perangkat, dan kode bersih siap untuk review.

### Yang dikerjakan:
1. **Semua edge case PRD Bab 4.3:**
   - ✅ Inbox kosong → EmptyState (sudah di Fase 4)
   - ✅ Format email salah → validasi inline (sudah di Fase 3)
   - ✅ Realtime putus → reconnect indicator + `visibilitychange` (sudah di Fase 5)
   - ✅ Email >7 hari → otomatis tidak tampil (tidak perlu logic tambahan)
   - ✅ OTP verifikasi salah → error spesifik (sudah di Fase 6)
2. **Review mobile-first menyeluruh:**
   - Test di viewport 375px (iPhone SE), 390px (iPhone 14), 414px (Android umum)
   - Pastikan tombol bisa diklik dengan jari, teks cukup besar, form tidak overflow
3. **Konsistensi Design System:**
   - Audit semua komponen: warna, radius, shadow, tipografi sudah sesuai PRD Bab 3?
   - Tidak ada warna default Tailwind yang "lolos" tanpa konteks design system
   - Microcopy semua dalam Bahasa Indonesia yang kontekstual
4. **Timestamp relatif (FR-10 Nice to Have)**
   - Implementasi `formatRelativeTime` dari `lib/utils.ts` ke `EmailCard`
5. **Review keamanan akhir:**
   - Konfirmasi `visibility = 'buyer'` ada di SEMUA query dan realtime filter
   - Konfirmasi tidak ada `service_role_key` di kode frontend atau `.env.local`
   - Konfirmasi `localStorage`/`sessionStorage` tidak menyimpan data sensitif
6. **Cleanup kode:**
   - Hapus `console.log` debug yang tidak perlu
   - Komentar kode harus menjelaskan keputusan bisnis, bukan "helper function" generik

### Output final yang bisa diverifikasi:
- Jalankan semua skenario dari PRD Bab 4.3 secara manual
- Cek DevTools: tidak ada error di console, tidak ada data sensitif di storage
- Tampilan mobile dan desktop konsisten

### Estimasi: 1 sesi coding

---

## Ringkasan & Estimasi Total

| Fase | Deskripsi | Estimasi |
|------|-----------|----------|
| Fase 1 | Setup & Foundation | 1 sesi |
| Fase 2 | Types, DB & Utilities | 1 sesi |
| Fase 3 | Landing Page | 1 sesi |
| Fase 4 | Inbox Page (static) | 1-2 sesi |
| Fase 5 | Realtime + Copy OTP | 1-2 sesi |
| Fase 6 | Ganti Password | 2 sesi |
| Fase 7 | Polish & Final | 1 sesi |
| **Total** | | **~8-10 sesi** |

> **Catatan:** "Satu sesi" = satu percakapan AI (satu context window). Fase yang lebih besar bisa dipecah menjadi 2 sub-sesi jika diperlukan.

---

## Setelah Fase 7 Selesai: Lanjut ke VPS

Setelah `feryshop-webmail` selesai dan berfungsi dengan data seed, barulah kita masuk ke fase VPS:
- Setup Postfix + Dovecot di VPS klien
- Coding `imap-worker` (Node.js) sesuai `prd-imap-worker.md`
- Koneksi end-to-end: email masuk dari game → Dovecot → imap-worker → Supabase → FerryMail tampil real-time

Itu fase selanjutnya — **belum dimulai sekarang**.

---

**Akhir Dokumen**  
*Roadmap ini adalah instrumen kerja, bukan dokumen formal. Bisa direvisi kapan saja jika ada keputusan teknis baru — tapi perubahan scope yang menyentuh PRD tetap harus direvisi di `prd.md` terlebih dahulu.*
