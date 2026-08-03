import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
          <SearchX className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500 mb-4">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan. Pastikan alamat URL yang dimasukkan benar.
        </p>
        <Link href="/">
          <Button>Kembali ke Beranda</Button>
        </Link>
      </div>
    </main>
  );
}
