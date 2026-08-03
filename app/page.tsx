"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    router.push(`/inbox/${encodeURIComponent(email)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-lg">
            <Mail className="text-white" size={28} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
          Cek Email FerryShop
        </h1>
        <p className="text-slate-500 text-center mb-8 text-sm">
          Masukkan alamat email virtual Anda untuk melihat pesan masuk dan OTP secara real-time.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Alamat Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@ferryshop.com"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Buka Inbox
          </button>
        </form>
      </div>
    </div>
  );
}
