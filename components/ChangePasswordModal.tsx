"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase/client";
import { Key, Shield, ShieldOff, Loader2 } from "lucide-react";

interface ChangePasswordModalProps {
  recipientEmail: string;
  disabled: boolean;
  initialPinEnabled?: boolean;
}

export default function ChangePasswordModal({
  recipientEmail,
  disabled,
  initialPinEnabled = true,
}: ChangePasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(initialPinEnabled);
  const [tab, setTab] = useState<"change" | "disable" | "enable">("change");

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setIsPinEnabled(initialPinEnabled);
    setTab(initialPinEnabled ? "change" : "enable");
  }, [initialPinEnabled]);

  const handleAction = async (action: "change_pin" | "disable_pin" | "enable_pin") => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const pinRegex = /^\d{6}$/;

    if (action === "change_pin") {
      if (!pinRegex.test(oldPin) || !pinRegex.test(newPin)) {
        setError("PIN lama dan baru harus berupa 6 digit angka.");
        setLoading(false);
        return;
      }
    } else if (action === "disable_pin") {
      if (!pinRegex.test(oldPin)) {
        setError("Masukkan PIN saat ini (6 digit angka) untuk menonaktifkan proteksi.");
        setLoading(false);
        return;
      }
    } else if (action === "enable_pin") {
      if (newPin && !pinRegex.test(newPin)) {
        setError("PIN baru harus berupa 6 digit angka (atau kosongkan untuk default 123456).");
        setLoading(false);
        return;
      }
    }

    try {
      const payload: Record<string, string> = {
        action,
        recipient_email: recipientEmail,
      };

      if (action === "change_pin") {
        payload.old_pin = oldPin;
        payload.new_pin = newPin;
      } else if (action === "disable_pin") {
        payload.old_pin = oldPin;
      } else if (action === "enable_pin") {
        payload.new_pin = newPin.trim() || "123456";
      }

      const { data, error: invokeError } = await supabase.functions.invoke(
        "change-mailbox-password",
        { body: payload },
      );

      if (invokeError) {
        throw new Error(invokeError.message || "Gagal memproses permintaan. Silakan coba lagi.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (action === "disable_pin") {
        setIsPinEnabled(false);
        setTab("enable");
        setSuccess(
          "Proteksi PIN berhasil dinonaktifkan manual! Inbox ini kini dapat dibuka tanpa sandi.",
        );
      } else if (action === "enable_pin") {
        setIsPinEnabled(true);
        setTab("change");
        setSuccess(`Proteksi PIN berhasil diaktifkan dengan PIN: ${payload.new_pin}`);
      } else {
        setSuccess("PIN Mailbox berhasil diperbarui!");
      }

      setOldPin("");
      setNewPin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
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
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setSuccess(null);
          setTab(isPinEnabled ? "change" : "enable");
        }}
        disabled={disabled}
        className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Key size={16} />
        Opsi Sandi
      </button>

      {isOpen && (
        <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            {/* Modal Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Opsi Sandi Mailbox</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isPinEnabled
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {isPinEnabled ? (
                    <>
                      <Shield size={12} /> PIN Aktif
                    </>
                  ) : (
                    <>
                      <ShieldOff size={12} /> PIN Nonaktif
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Email:{" "}
                <span className="font-mono font-medium text-slate-700">{recipientEmail}</span>
              </p>
            </div>

            {/* Tab Navigation */}
            {isPinEnabled ? (
              <div className="mb-5 flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTab("change");
                    setError(null);
                  }}
                  className={`flex-1 rounded-md py-1.5 transition-all ${
                    tab === "change"
                      ? "shadow-xs bg-white text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Ganti PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("disable");
                    setError(null);
                  }}
                  className={`flex-1 rounded-md py-1.5 transition-all ${
                    tab === "disable"
                      ? "shadow-xs bg-white text-rose-600"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Nonaktifkan PIN
                </button>
              </div>
            ) : (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
                Proteksi PIN saat ini <strong>dinonaktifkan</strong>. Siapa saja yang mengetahui
                alamat email ini dapat membaca pesan tanpa memasukkan sandi.
              </div>
            )}

            {/* Success Message Banner */}
            {success && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium leading-relaxed text-emerald-800">{success}</p>
                <button
                  onClick={closeModal}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Error Message Banner */}
            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            {!success && isPinEnabled && tab === "change" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAction("change_pin");
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    PIN Lama
                  </label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="PIN 6 digit saat ini"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    PIN Baru
                  </label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="6 digit angka"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {loading ? "Menyimpan..." : "Simpan PIN Baru"}
                  </button>
                </div>
              </form>
            )}

            {!success && isPinEnabled && tab === "disable" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAction("disable_pin");
                }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs leading-relaxed text-rose-800">
                  <p className="font-semibold text-rose-900">Konfirmasi Nonaktifkan PIN:</p>
                  Setelah dinonaktifkan, membuka inbox email ini tidak akan memerlukan PIN sandi
                  lagi.
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Masukkan PIN Saat Ini untuk Konfirmasi
                  </label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="PIN 6 digit saat ini"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {loading ? "Memproses..." : "Nonaktifkan PIN Manual"}
                  </button>
                </div>
              </form>
            )}

            {!success && !isPinEnabled && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAction("enable_pin");
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    PIN Baru (Opsional, Default: 123456)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Kosongkan untuk PIN default 123456"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Jika dikosongkan, PIN akan otomatis diaktifkan dengan nilai default{" "}
                    <strong>123456</strong>.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {loading ? "Mengaktifkan..." : "Aktifkan Proteksi PIN"}
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
