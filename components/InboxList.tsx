"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { Email } from "../types/email";
import { ChevronLeft, ChevronRight, Mail, Search } from "lucide-react";
import EmailCard from "./EmailCard";

interface InboxListProps {
  recipientEmail: string;
  initialEmails: Email[];
}

const PAGE_SIZE = 10;

type Filter = "all" | "otp" | "unread";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "otp", label: "Berisi OTP" },
  { value: "unread", label: "Belum Dibaca" },
];

export default function InboxList({ recipientEmail, initialEmails }: InboxListProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incoming_emails",
          filter: `recipient_email=eq.${recipientEmail}`,
        },
        (payload) => {
          const newEmail = payload.new as Email;
          if (newEmail.visibility === "buyer") {
            setEmails((prev) => [newEmail, ...prev]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientEmail]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emails.filter((e) => {
      if (filter === "otp" && !e.otp_code) return false;
      if (filter === "unread" && e.is_read) return false;
      if (!q) return true;
      return (
        (e.subject || "").toLowerCase().includes(q) ||
        (e.sender_email || "").toLowerCase().includes(q) ||
        (e.otp_code || "").toLowerCase().includes(q) ||
        (e.raw_body_snippet || "").toLowerCase().includes(q)
      );
    });
  }, [emails, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-16 text-center shadow-sm">
        <div className="mb-4 rounded-full bg-blue-50 p-4">
          <Mail className="text-blue-500" size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-800">Belum ada email masuk</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Halaman ini update otomatis. Pesan baru akan segera muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari subjek, pengirim, atau OTP..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                filter === opt.value
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-16 text-center shadow-sm">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Search className="text-slate-400" size={28} />
          </div>
          <h3 className="text-lg font-medium text-slate-800">Tidak ada hasil</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Coba ubah kata kunci pencarian atau filter yang dipilih.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {pageItems.map((email) => (
              <EmailCard key={email.id} email={email} />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan {startIndex + 1}
              {filtered.length > 1
                ? `–${Math.min(startIndex + PAGE_SIZE, filtered.length)}`
                : ""}{" "}
              dari {filtered.length} pesan
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Sebelumnya
              </button>
              <span className="min-w-[64px] text-center text-sm font-medium text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
