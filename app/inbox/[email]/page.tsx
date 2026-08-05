import { createSupabaseServerClient } from "../../../lib/supabase/server";
import InboxList from "../../../components/InboxList";
import ChangePasswordModal from "../../../components/ChangePasswordModal";

export default async function InboxPage({ params }: { params: Promise<{ email: string }> }) {
  const resolvedParams = await params;
  const email = decodeURIComponent(resolvedParams.email);
  const supabase = createSupabaseServerClient();

  const { data: initialEmails, error } = await supabase
    .from("incoming_emails")
    .select("*")
    .eq("recipient_email", email)
    .eq("visibility", "buyer")
    .order("received_at", { ascending: false })
    .limit(30);

  const emails = initialEmails || [];
  const isInboxEmpty = emails.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500">
              Inbox Untuk
            </h2>
            <h1 className="break-all text-2xl font-bold text-slate-900">{email}</h1>
          </div>
          <ChangePasswordModal recipientEmail={email} disabled={isInboxEmpty} />
        </div>

        <InboxList recipientEmail={email} initialEmails={emails} />
      </div>
    </div>
  );
}
