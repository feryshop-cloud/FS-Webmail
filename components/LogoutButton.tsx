"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { revokeMailboxAccess } from "../app/actions/email";

interface LogoutButtonProps {
  recipientEmail: string;
}

export default function LogoutButton({ recipientEmail }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await revokeMailboxAccess(recipientEmail);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Failed to logout:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-red-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      title="Keluar dari Mailbox"
    >
      {loading ? <Loader2 size={16} className="animate-spin text-slate-500" /> : <LogOut size={16} />}
      <span>Keluar</span>
    </button>
  );
}
