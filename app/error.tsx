"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Terjadi Kesalahan</h2>
        <p className="text-sm text-slate-500 mb-4">
          Maaf, terjadi masalah pada sistem kami saat memproses permintaan Anda. Silakan coba lagi beberapa saat lagi.
        </p>
        <Button onClick={() => reset()} variant="secondary">
          Coba Lagi
        </Button>
      </div>
    </main>
  );
}
