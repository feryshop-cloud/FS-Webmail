# AI Coding Guardrails — Ekosistem Ferryshop

**Versi Dokumen:** 1.0
**Tujuan:** Dokumen ini dibaca AI **SEBELUM** menulis kode apa pun di repo ini. Tujuannya mencegah 2 jenis kegagalan paling umum saat AI vibe coding: (1) **Halusinasi** — AI mengarang struktur data, API, atau fitur yang tidak pernah didefinisikan; (2) **Genericness** — AI menghasilkan kode/desain "template SaaS pasaran" yang tidak mencerminkan konteks bisnis nyata project ini.

> **Cara pakai:** Salin file ini ke root setiap repo (`ferryshop-webmail`, `dashboard-admin`, `web-public`). Isi Bab 0 secara manual sesuai repo masing-masing — sisanya (Bab 1-7) **JANGAN DIUBAH**, berlaku sama persis di ketiga repo.

---

## 0. IDENTITAS REPO INI (WAJIB DIISI MANUAL — BERBEDA DI SETIAP REPO)

```
REPO_NAME        : [isi: ferryshop-webmail / ferryshop-dashboard-admin / ferryshop-web-public]
PRD_RUJUKAN      : [isi: nama file PRD yang ada di root repo ini, contoh prd.md]
PERAN_REPO_INI   : [isi 1 kalimat: deskripsi singkat tugas repo ini dalam ekosistem]
TECH_STACK_WAJIB : [isi: ringkas dari Bab 2 PRD repo ini — Next.js App Router / dst]
```

> **Instruksi untuk AI:** Sebelum membaca instruksi apa pun di bawah, baca dulu isi Bab 0 ini dan file PRD yang dirujuk (`PRD_RUJUKAN`). Jika Bab 0 belum diisi atau file PRD tidak ditemukan, **HENTIKAN dan tanyakan ke pengguna** sebelum menulis kode apa pun — jangan menebak konteks repo dari nama folder saja.

---

## 1. KONTEKS EKOSISTEM (UNIVERSAL — BERLAKU DI SEMUA REPO)

Repo ini adalah **satu bagian** dari ekosistem yang terdiri dari 3 repository terpisah, berbagi **1 Supabase Project yang sama** sebagai single source of truth:

```
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  ferryshop-webmail     │   │  dashboard-admin       │   │  web-public            │
│  (Vercel, publik,       │   │  (Vercel, private,      │   │  (Vercel, publik)        │
│   tanpa login)           │   │   wajib login)            │   │                          │
└──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                       ▼
                         ┌─────────────────────────┐
                         │   SUPABASE (1 PROJECT)     │
                         │   Database terpusat,         │
                         │   sumber kebenaran TUNGGAL    │
                         └─────────────────────────┘
                                       ▲
                                       │
                         ┌─────────────────────────┐
                         │   imap-worker (VPS)         │
                         │   Proses long-running,        │
                         │   menulis ke database          │
                         └─────────────────────────┘
```

**Implikasi penting bagi AI saat coding di repo manapun:**
- Tabel database **TIDAK dimiliki** oleh repo ini secara eksklusif — bisa jadi tabel yang sama dibaca/ditulis oleh repo lain. **JANGAN** mengubah struktur tabel (`ALTER TABLE`, ganti nama kolom) tanpa memastikan tidak merusak repo lain yang juga memakainya.
- Tidak ada "sinkronisasi data" antar repo yang perlu dibangun — karena 1 database yang sama, perubahan di satu repo otomatis "terlihat" oleh repo lain lewat query/Realtime biasa. **JANGAN** membuat mekanisme sinkronisasi/webhook custom antar repo kecuali eksplisit diminta.
- Setiap repo punya **hak akses berbeda** ke tabel yang sama, diatur lewat Row Level Security (RLS) — bukan lewat kode aplikasi. **JANGAN** mencoba "memperketat keamanan" dengan validasi manual di kode aplikasi sebagai pengganti RLS.

---

## 2. ATURAN ANTI-HALUSINASI (UNIVERSAL, MUTLAK)

1. **Dilarang mengarang nama tabel, kolom, atau tipe data** yang tidak tercantum di PRD repo ini. Jika butuh data yang skemanya tidak ada di PRD, **berhenti dan tanya** — jangan asumsikan nama kolom "yang masuk akal".
2. **Dilarang mengarang endpoint API, nama Edge Function, atau parameter** yang tidak disebutkan di PRD. Jika PRD menyebut "Supabase Edge Function `change-mailbox-password`", gunakan nama itu persis — jangan improvisasi jadi `updatePassword` atau nama lain.
3. **Dilarang mengganti library/framework** yang sudah ditentukan di Bab 2 (Tech Stack) PRD repo ini, bahkan jika menurut AI ada alternatif "lebih baik". Jika ingin mengusulkan alternatif, **sampaikan sebagai saran ke pengguna**, jangan langsung diimplementasikan.
4. **Dilarang menebak versi library.** Selalu cek `package.json` yang sudah ada di repo sebelum menambah dependency baru. Jika belum ada `package.json`, gunakan versi stabil terbaru saat ini dan sebutkan versi yang dipasang.
5. **Dilarang menambah fitur yang tidak ada di PRD**, meski "kelihatannya berguna" atau "biasanya ada di aplikasi serupa". Contoh: jangan tambahkan fitur "lupa password" custom dengan email reset jika PRD sudah eksplisit menentukan mekanisme verifikasi yang berbeda.
6. **Jika PRD dan permintaan pengguna di chat saat ini bertentangan**, prioritaskan **konfirmasi ke pengguna** dibanding menebak mana yang benar. Jangan diam-diam memilih salah satu.
7. **Dilarang berasumsi soal isi tabel di repo lain** yang tidak dijelaskan di PRD repo ini. Misal, jika sedang coding di `ferryshop-webmail` dan butuh tahu detail tabel yang dikelola `dashboard-admin`, rujuk ke bagian "Database Structure" yang relevan di PRD ini — jika tidak disebutkan, tanyakan, jangan mengarang struktur tabel tersebut.

---

## 3. ATURAN ANTI-GENERIK (UNIVERSAL)

Tujuan bagian ini: mencegah hasil kode/desain terasa seperti "template AI generik" yang tidak mencerminkan konteks bisnis nyata Ferryshop.

1. **Dilarang memakai data dummy generik** seperti `John Doe`, `test@example.com`, `Lorem Ipsum`. Gunakan konteks bisnis nyata: `akun001@ferryshop.com`, "Mobile Legends", "Kode OTP", dst — sesuai domain project ini.
2. **Dilarang memakai palet warna default Tailwind/shadcn tanpa modifikasi** (`bg-blue-500` polos, gradient ungu-pink bawaan template SaaS). Selalu rujuk Design System spesifik yang ada di Bab 3 PRD repo ini (palet warna, border radius, ikon).
3. **Dilarang menambahkan komentar kode generik** yang tidak menjelaskan apa-apa (`// helper function`, `// main logic`). Komentar harus menjelaskan **keputusan bisnis/teknis spesifik**, contoh: `// Filter visibility='buyer' wajib di sini agar email admin_only tidak pernah terkirim ke browser pembeli`.
4. **Dilarang membuat struktur folder "default create-next-app"** tanpa menyesuaikan ke Folder Structure yang sudah ditentukan di PRD repo ini (lihat Bab 8/9 PRD masing-masing).
5. **Dilarang menambahkan fitur "placeholder" yang umum di template** (misal halaman "About Us" generik, footer dengan link sosial media dummy) kecuali eksplisit diminta.
6. **Setiap microcopy/teks UI harus dalam Bahasa Indonesia** yang natural dan sesuai konteks bisnis Ferryshop, bukan terjemahan harfiah dari template berbahasa Inggris.

---

## 4. ATURAN KEAMANAN LINTAS REPO (UNIVERSAL, MUTLAK)

1. **`SUPABASE_SERVICE_ROLE_KEY` DILARANG KERAS** ada di environment variable, kode, atau bundle frontend repo `ferryshop-webmail`, `dashboard-admin`, maupun `web-public`. Key ini **HANYA** boleh hidup di: (a) Supabase Edge Function, (b) `imap-worker` di VPS.
2. **Setiap operasi mutasi sensitif** (ganti password, approve/withhold email, ubah lifecycle akun) **WAJIB** lewat Supabase Edge Function — tidak pernah langsung dari Supabase Client SDK di kode frontend, meski user sudah login sebagai admin.
3. **Jangan pernah menonaktifkan RLS** pada tabel manapun "untuk mempermudah development" — jika RLS menyebabkan query gagal saat development, perbaiki policy-nya, jangan nonaktifkan tabelnya.
4. **Setiap query yang menyentuh data milik pengguna lain** (misal `incoming_emails` berdasar `recipient_email`) wajib disertai filter eksplisit yang sesuai PRD (`visibility = 'buyer'`, dst) — tidak ada "ambil semua dulu, filter belakangan di frontend".

---

## 5. PROTOKOL SAAT PRD TIDAK MENJAWAB / AMBIGU

Jika instruksi dari pengguna di chat tidak tercakup jelas di PRD repo ini, ikuti urutan ini:

1. **Cek dulu** apakah ini benar-benar di luar PRD, atau hanya istilah berbeda dari sesuatu yang sudah ada (misal pengguna minta "tombol logout" padahal repo ini memang tidak ada sistem login — re-cek Bab 1 Overview PRD).
2. Jika benar-benar di luar PRD dan **berdampak kecil** (styling minor, microcopy) — boleh dikerjakan dengan asumsi wajar, sebutkan asumsi yang diambil.
3. Jika **berdampak besar** (struktur data baru, fitur baru, perubahan arsitektur) — **JANGAN langsung coding**. Tanyakan ke pengguna dan tunggu konfirmasi, atau sarankan agar PRD direvisi dulu sebelum implementasi.
4. **Tidak pernah** mengasumsikan pengguna "pasti maksudnya begini" untuk hal yang berdampak ke keamanan atau struktur database.

---

## 6. CHECKLIST PRA-CODING (WAJIB DIJALANKAN TIAP SESI BARU)

Sebelum menulis baris kode pertama di sesi manapun, AI wajib mengonfirmasi ke diri sendiri (dan ke pengguna jika ragu):

- [ ] Sudah baca Bab 0 dokumen ini (identitas repo)?
- [ ] Sudah baca PRD lengkap yang dirujuk di Bab 0?
- [ ] Permintaan pengguna saat ini sesuai dengan scope PRD, atau perlu konfirmasi dulu?
- [ ] Jika menyentuh database: apakah struktur tabel yang akan dipakai sudah ada persis di PRD, atau saya akan mengarang?
- [ ] Jika menyentuh UI: apakah sudah merujuk Design System (warna, bentuk, ikon) di PRD, bukan default framework?
- [ ] Jika menyentuh keamanan/kredensial: apakah ini melanggar salah satu Larangan Mutlak di Bab 4?

---

## 7. LARANGAN MUTLAK (RINGKASAN CEPAT)

| # | Larangan |
|---|---|
| 1 | Mengarang struktur tabel/kolom yang tidak ada di PRD |
| 2 | Mengganti tech stack yang sudah ditentukan tanpa konfirmasi |
| 3 | Menaruh `service_role_key` di kode/env frontend manapun |
| 4 | Menonaktifkan RLS untuk "mempermudah" development |
| 5 | Menambah fitur di luar PRD tanpa konfirmasi pengguna |
| 6 | Memakai palet warna/komponen default template tanpa menyesuaikan Design System |
| 7 | Membuat mekanisme sinkronisasi data custom antar repo (tidak perlu — 1 database yang sama) |
| 8 | Menebak struktur tabel milik repo lain yang tidak dijelaskan di PRD repo ini |

---

**Akhir Dokumen.**
*File ini hidup berdampingan dengan PRD di setiap repo, bukan pengganti PRD. PRD menjawab "apa yang dibangun", dokumen ini menjawab "bagaimana cara AI tidak melenceng saat membangunnya".*
