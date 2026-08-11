"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    router.push(`/inbox/${encodeURIComponent(email)}`);
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Alamat Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@feryshop.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Buka Inbox
          </button>
        </form>
      </div>
    </div>
  );
}
