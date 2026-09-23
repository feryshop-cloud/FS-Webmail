"use client";

import { Email } from "../types/email";
import { Copy, Check, ChevronDown, ChevronUp, Mail, KeyRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { EmailBodyViewer } from "./EmailBodyViewer";
import { stripHtmlToSnippet } from "../lib/utils";

interface EmailCardProps {
  email: Email;
}

export default function EmailCard({ email }: EmailCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (email.otp_code) {
      navigator.clipboard.writeText(email.otp_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-sm"
    >
      {/* Header bar / Summary Row */}
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Mail size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-slate-900">{email.subject || "(Tanpa Subjek)"}</h4>
              {email.otp_code && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <KeyRound size={12} />
                  OTP: {email.otp_code}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="text-slate-400">Dari:</span> {email.sender_email}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 whitespace-nowrap">
          <span className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
            {isExpanded ? (
              <>
                Tutup <ChevronUp size={14} />
              </>
            ) : (
              <>
                Buka Pesan <ChevronDown size={14} />
              </>
            )}
          </span>
        </div>
      </div>

      {/* Snippet preview if collapsed */}
      {!isExpanded && email.raw_body_snippet && (
        <div className="px-5 pb-4 pt-0">
          <p className="line-clamp-2 text-xs text-slate-500">
            {stripHtmlToSnippet(email.raw_body_snippet)}
          </p>
        </div>
      )}

      {/* Expanded Email Reader View (Selayaknya webmail standar) */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="cursor-default border-t border-slate-100 bg-slate-50/50 p-5"
        >
          {/* Email Metadata Details */}
          <div className="shadow-2xs mb-4 space-y-1.5 rounded-lg border border-slate-200/80 bg-white p-3.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <p>
                <strong className="text-slate-700">Pengirim:</strong> {email.sender_email}
              </p>
              <span className="text-slate-400">
                {new Date(email.received_at).toLocaleString("id-ID", {
                  dateStyle: "full",
                  timeStyle: "medium",
                })}
              </span>
            </div>
            <p>
              <strong className="text-slate-700">Penerima:</strong> {email.recipient_email}
            </p>
            <p>
              <strong className="text-slate-700">Subjek:</strong> {email.subject || "-"}
            </p>
          </div>

          {/* Quick OTP Copy action bar if exists */}
          {email.otp_code && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-900">Kode Keamanan / OTP:</span>
                <span className="font-mono text-base font-bold text-blue-700">
                  {email.otp_code}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Salin
                  </>
                )}
              </button>
            </div>
          )}

          {/* Full Email Body Text / HTML */}
          <EmailBodyViewer content={email.raw_body_snippet || ""} />
        </div>
      )}
    </div>
  );
}
