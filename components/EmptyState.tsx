import { Mailbox } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Mailbox className="h-8 w-8" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-slate-900">Kotak Masuk Kosong</h3>
      <p className="max-w-sm text-sm text-slate-500">
        Belum ada email masuk. Halaman ini akan update otomatis saat email baru tiba.
      </p>
    </div>
  );
}
