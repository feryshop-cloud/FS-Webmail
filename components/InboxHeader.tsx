"use client";

import ChangePasswordModal from "./ChangePasswordModal";

export function InboxHeader({ email, disabled }: { email: string; disabled: boolean }) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Kotak Masuk</h1>
        <p className="mt-1 text-sm text-slate-500">
          Menerima pesan untuk{" "}
          <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium text-slate-900">
            {email}
          </span>
        </p>
      </div>

      <ChangePasswordModal recipientEmail={email} disabled={disabled} />
    </header>
  );
}
