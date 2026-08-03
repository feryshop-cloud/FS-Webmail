"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { Key } from 'lucide-react';

interface ChangePasswordModalProps {
  recipientEmail: string;
  disabled: boolean;
}

export default function ChangePasswordModal({ recipientEmail, disabled }: ChangePasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('change-mailbox-password', {
        body: { recipient_email: recipientEmail, otp_verification: otp, new_password: newPassword }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Gagal mengubah password. Silakan coba lagi.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess('Password berhasil diubah!');
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
    setOtp('');
    setNewPassword('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-lg transition-colors text-sm font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border border-blue-100"
      >
        <Key size={16} />
        Ganti Password
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Ganti Password Mailbox</h2>
            
            {success ? (
              <div className="text-center">
                <p className="text-emerald-600 mb-6 font-medium">{success}</p>
                <button
                  onClick={closeModal}
                  className="w-full py-2 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kode OTP Terakhir
                  </label>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    placeholder="Masukkan OTP dari email terakhir"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    placeholder="Minimal 8 karakter"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="py-2 px-4 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
                  >
                    {loading ? 'Memproses...' : 'Ganti Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
