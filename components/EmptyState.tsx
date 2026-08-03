import { Mailbox } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200 border-dashed">
      <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
        <Mailbox className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-1">Kotak Masuk Kosong</h3>
      <p className="text-sm text-slate-500 max-w-sm">
        Belum ada email masuk. Halaman ini akan update otomatis saat email baru tiba.
      </p>
    </div>
  );
}
