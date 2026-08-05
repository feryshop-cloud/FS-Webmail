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
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Terjadi Kesalahan</h2>
        <p className="mb-4 text-sm text-slate-500">
          Maaf, terjadi masalah pada sistem kami saat memproses permintaan Anda. Silakan coba lagi
          beberapa saat lagi.
        </p>
        <Button onClick={() => reset()} variant="secondary">
          Coba Lagi
        </Button>
      </div>
    </main>
  );
}
