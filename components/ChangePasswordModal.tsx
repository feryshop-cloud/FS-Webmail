"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase/client";
import { Key } from "lucide-react";

interface ChangePasswordModalProps {
  recipientEmail: string;
  disabled: boolean;
}

export default function ChangePasswordModal({
  recipientEmail,
  disabled,
}: ChangePasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!/^\d{6}$/.test(oldPin) || !/^\d{6}$/.test(newPin)) {
      setError("PIN harus 6 digit angka.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "change-mailbox-password",
        {
          body: {
            recipient_email: recipientEmail,
            old_pin: oldPin,
            new_pin: newPin,
          },
        },
      );

      if (invokeError) {
        throw new Error(invokeError.message || "Gagal mengubah pin. Silakan coba lagi.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess("Pin berhasil diubah!");
      setOldPin("");
      setNewPin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
    setOldPin("");
    setNewPin("");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Key size={16} />
        Ganti Pin
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Ganti Pin Mailbox</h2>

            {success ? (
              <div className="text-center">
                <p className="mb-6 font-medium text-emerald-600">{success}</p>
                <button
                  onClick={closeModal}
                  className="w-full rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">PIN Lama</label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="PIN 6 digit saat ini"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">PIN Baru</label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="6 digit angka"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-blue-400"
                  >
                    {loading ? "Memproses..." : "Ganti Pin"}
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
