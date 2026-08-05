"use client";

import { Email } from "../types/email";
import { Copy, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface EmailCardProps {
  email: Email;
}

export default function EmailCard({ email }: EmailCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (email.otp_code) {
      navigator.clipboard.writeText(email.otp_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-slate-800">{email.subject}</h4>
          <p className="text-sm text-slate-500">{email.sender_email}</p>
        </div>
        <div className="whitespace-nowrap text-xs text-slate-400">
          {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
        </div>
      </div>

      {email.raw_body_snippet && (
        <p className="mb-4 line-clamp-3 text-sm text-slate-600">{email.raw_body_snippet}</p>
      )}

      {email.otp_code && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-slate-100 bg-slate-50 p-4">
          <span className="mb-3 text-3xl font-bold tracking-widest text-blue-600">
            {email.otp_code}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            {copied ? (
              <>
                <Check size={16} />
                Tersalin!
              </>
            ) : (
              <>
                <Copy size={16} />
                Salin Kode
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
