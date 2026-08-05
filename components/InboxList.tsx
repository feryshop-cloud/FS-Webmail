"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { Email } from "../types/email";
import { Mail } from "lucide-react";
import EmailCard from "./EmailCard";

interface InboxListProps {
  recipientEmail: string;
  initialEmails: Email[];
}

export default function InboxList({ recipientEmail, initialEmails }: InboxListProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);

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
      {emails.map((email) => (
        <EmailCard key={email.id} email={email} />
      ))}
    </div>
  );
}
