import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession, useSession } from "@/lib/session";
import { hashPin } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — C-Care" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useSession();
  const { theme, setTheme } = useTheme();
  const isAdmin = s.role === "admin";

  const [f, setF] = useState({ name: "", address: "", phone: "", currency: "UGX" });
  const [busy, setBusy] = useState(false);

  const [prof, setProf] = useState({ name: "", username: "" });
  const [profBusy, setProfBusy] = useState(false);

  const [pin, setPin] = useState({ next: "", confirm: "" });
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    if (s.institution) setF({
      name: s.institution.name, address: s.institution.address ?? "",
      phone: s.institution.phone ?? "", currency: s.institution.currency,
    });
    if (s.profile) setProf({ name: s.profile.name, username: s.profile.username });
  }, [s.institution?.id, s.profile?.id]);

  async function saveShop(e: React.FormEvent) {
    e.preventDefault();
    if (!s.institution?.id) return;
    setBusy(true);
    const { error } = await supabase.from("institutions").update({
      name: f.name, address: f.address || null, phone: f.phone || null, currency: f.currency,
    }).eq("id", s.institution.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshSession();
    toast.success("Shop updated");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!s.userId) return;
    setProfBusy(true);
    const { error } = await supabase.from("profiles").update({
      name: prof.name, username: prof.username.toLowerCase(),
    }).eq("id", s.userId);
    setProfBusy(false);
    if (error) return toast.error(error.message);
    await refreshSession();
    toast.success("Profile updated");
  }

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    if (!s.userId) return;
    if (pin.next.length < 4) return toast.error("PIN too short");
    if (pin.next !== pin.confirm) return toast.error("PINs don't match");
    setPinBusy(true);
    const pin_hash = await hashPin(pin.next);
    const { error } = await supabase.from("profiles").update({ pin_hash }).eq("id", s.userId);
    setPinBusy(false);
    if (error) return toast.error(error.message);
    setPin({ next: "", confirm: "" });
    toast.success("PIN changed");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Section title="Appearance" subtitle="Choose how C-Care looks on this device.">
        <div className="flex flex-wrap gap-2">
          {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([val, Icon]) => (
            <button key={val} type="button" onClick={() => setTheme(val)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                theme === val ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
              }`}>
              <Icon className="h-4 w-4" /> <span className="capitalize">{val}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Profile" subtitle="Your display name and username.">
        <form onSubmit={saveProfile} className="space-y-3">
          <Field label="Name"><input required className={inp} value={prof.name} onChange={(e)=>setProf({...prof, name: e.target.value})} /></Field>
          <Field label="Username"><input required pattern="[a-zA-Z0-9_]+" className={inp} value={prof.username} onChange={(e)=>setProf({...prof, username: e.target.value})} /></Field>
          <button disabled={profBusy} className={btn}>{profBusy ? "Saving…" : "Save profile"}</button>
        </form>
      </Section>

      <Section title="Transaction PIN" subtitle="Used to authorize each sale.">
        <form onSubmit={changePin} className="space-y-3">
          <Field label="New PIN"><input type="password" inputMode="numeric" minLength={4} maxLength={8} required className={inp} value={pin.next} onChange={(e)=>setPin({...pin, next: e.target.value})} /></Field>
          <Field label="Confirm PIN"><input type="password" inputMode="numeric" minLength={4} maxLength={8} required className={inp} value={pin.confirm} onChange={(e)=>setPin({...pin, confirm: e.target.value})} /></Field>
          <button disabled={pinBusy} className={btn}>{pinBusy ? "Updating…" : "Change PIN"}</button>
        </form>
      </Section>

      {isAdmin && (
        <Section title="Shop" subtitle="Settings for everyone in this shop.">
          <form onSubmit={saveShop} className="space-y-3">
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
            <button disabled={busy} className={btn}>{busy ? "Saving…" : "Save shop"}</button>
          </form>
        </Section>
      )}
    </div>
  );
}

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
const btn = "rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>{children}</label>;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
