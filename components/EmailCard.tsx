"use client";

import { Email } from '../types/email';
import { Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

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
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-slate-800">{email.subject}</h4>
          <p className="text-sm text-slate-500">{email.sender_email}</p>
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap">
          {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
        </div>
      </div>
      
      {email.raw_body_snippet && (
        <p className="text-slate-600 text-sm mb-4 line-clamp-3">
          {email.raw_body_snippet}
        </p>
      )}

      {email.otp_code && (
        <div className="mt-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-md border border-slate-100">
          <span className="text-3xl font-bold text-blue-600 tracking-widest mb-3">
            {email.otp_code}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
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
