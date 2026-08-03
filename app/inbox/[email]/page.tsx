import { createSupabaseServerClient } from '../../../lib/supabase/server';
import InboxList from '../../../components/InboxList';
import ChangePasswordModal from '../../../components/ChangePasswordModal';

export default async function InboxPage({ params }: { params: Promise<{ email: string }> }) {
  const resolvedParams = await params;
  const email = decodeURIComponent(resolvedParams.email);
  const supabase = createSupabaseServerClient();

  const { data: initialEmails, error } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('recipient_email', email)
    .eq('visibility', 'buyer')
    .order('received_at', { ascending: false })
    .limit(30);

  const emails = initialEmails || [];
  const isInboxEmpty = emails.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
              Inbox Untuk
            </h2>
            <h1 className="text-2xl font-bold text-slate-900 break-all">
              {email}
            </h1>
          </div>
          <ChangePasswordModal recipientEmail={email} disabled={isInboxEmpty} />
        </div>
        
        <InboxList recipientEmail={email} initialEmails={emails} />
      </div>
    </div>
  );
}
