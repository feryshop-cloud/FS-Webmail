import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { isMailboxAuthorized } from "../../actions/email";
import { logger } from "../../../lib/logger";
import InboxList from "../../../components/InboxList";
import ChangePasswordModal from "../../../components/ChangePasswordModal";

export default async function InboxPage({ params }: { params: Promise<{ email: string }> }) {
  const resolvedParams = await params;
  const email = decodeURIComponent(resolvedParams.email);

  // Enforce PIN authorization check
  const authorized = await isMailboxAuthorized(email);
  if (!authorized) {
    redirect("/?error=unauthorized");
  }

  const supabase = createSupabaseServerClient();

  logger.info("Fetching inbox", { email, context: "InboxPage" });
  const { data: initialEmails, error } = await supabase
    .from("incoming_emails")
    .select("*")
    .eq("recipient_email", email)
    .eq("visibility", "buyer")
    .order("received_at", { ascending: false })
    .limit(200);

  if (error) {
    logger.error("Error fetching inbox", { email, context: "InboxPage", err: error });
  } else {
    logger.info("Fetched inbox", {
      email,
      context: "InboxPage",
      count: initialEmails?.length || 0,
    });
  }

  const emails = initialEmails || [];
  const isInboxEmpty = emails.length === 0;

  // Check PIN protection status for this mailbox
  const { data: accountData } = await supabase
    .from("email_accounts")
    .select("is_pin_enabled")
    .eq("email", email)
    .maybeSingle();

  const initialPinEnabled =
    (accountData as { is_pin_enabled?: boolean | null } | null)?.is_pin_enabled !== false;

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
          <ChangePasswordModal
            recipientEmail={email}
            disabled={isInboxEmpty}
            initialPinEnabled={initialPinEnabled}
          />
        </div>

        <InboxList recipientEmail={email} initialEmails={emails} />
      </div>
    </div>
  );
}
