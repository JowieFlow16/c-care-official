import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession, useSession } from "@/lib/session";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — C-Care" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useSession();
  const [f, setF] = useState({ name: "", address: "", phone: "", currency: "UGX" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (s.institution) setF({
      name: s.institution.name, address: s.institution.address ?? "",
      phone: s.institution.phone ?? "", currency: s.institution.currency,
    });
  }, [s.institution?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s.institution?.id) return;
    setBusy(true);
    const { error } = await supabase.from("institutions").update({
      name: f.name, address: f.address || null, phone: f.phone || null, currency: f.currency,
    }).eq("id", s.institution.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshSession();
    toast.success("Saved");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Shop settings</h1>
      <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <Field label="Shop name"><input required className={inp} value={f.name} onChange={(e)=>setF({...f, name: e.target.value})} /></Field>
        <Field label="Address"><input className={inp} value={f.address} onChange={(e)=>setF({...f, address: e.target.value})} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className={inp} value={f.phone} onChange={(e)=>setF({...f, phone: e.target.value})} /></Field>
          <Field label="Currency">
            <select className={inp} value={f.currency} onChange={(e)=>setF({...f, currency: e.target.value})}>
              <option>UGX</option><option>USD</option><option>KES</option><option>TZS</option><option>RWF</option><option>NGN</option><option>EUR</option><option>GBP</option>
            </select>
          </Field>
        </div>
        <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
      </form>
    </div>
  );
}
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>{children}</label>;
}
