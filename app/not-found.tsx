import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <SearchX className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Halaman Tidak Ditemukan
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan. Pastikan alamat URL yang
          dimasukkan benar.
        </p>
        <Link href="/">
          <Button>Kembali ke Beranda</Button>
        </Link>
      </div>
    </main>
  );
}
