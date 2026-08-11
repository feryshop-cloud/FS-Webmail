"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { checkEmailAccountExists } from "./actions/email";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await checkEmailAccountExists(email);
      if (!result.exists) {
        setError(result.message || "Email tidak ditemukan di database Feryshop.");
        setIsLoading(false);
        return;
      }

      router.push(`/inbox/${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan sistem saat mengecek email.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="rounded-lg bg-blue-600 p-3">
            <Mail className="text-white" size={28} />
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">Cek Email FeryShop</h1>
        <p className="mb-8 text-center text-sm text-slate-500">
          Masukkan alamat email virtual Anda untuk melihat pesan masuk dan OTP secara real-time.
        </p>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Alamat Email
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="nama@feryshop.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:opacity-75"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-75"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Mengecek Database...
              </>
            ) : (
              "Buka Inbox"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
