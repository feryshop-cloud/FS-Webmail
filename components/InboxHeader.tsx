"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { ChangePasswordModal } from "./ChangePasswordModal";

export function InboxHeader({ email, disabled }: { email: string; disabled: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Kotak Masuk</h1>
        <p className="text-sm text-slate-500 mt-1">
          Menerima pesan untuk <span className="font-medium text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">{email}</span>
        </p>
      </div>
      <Button 
        variant="secondary" 
        className="shrink-0" 
        disabled={disabled}
        onClick={() => setIsModalOpen(true)}
      >
        Ganti Password Email
      </Button>

      <ChangePasswordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        email={email} 
      />
    </header>
  );
}
