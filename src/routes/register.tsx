import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, inputCls, labelCls, btnCls } from "@/components/auth-shell";
import { hashPin } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Join a shop — C-Care" }] }),
  component: Register,
});

interface Inst { id: string; name: string; address: string | null }

function Register() {
  const [shops, setShops] = useState<Inst[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    institution_id: "", name: "", username: "", email: "", pin: "",
  });
  const u = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    supabase.from("institutions").select("id,name,address").order("name").then(({ data }) => setShops((data ?? []) as Inst[]));
  }, []);
  const filtered = q ? shops.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) : shops;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.institution_id) return toast.error("Pick a shop");
    if (form.pin.length < 4) return toast.error("PIN too short");
    setBusy(true);
    try {
      const pin_hash = await hashPin(form.pin);
      const { error } = await supabase.from("join_requests").insert({
        institution_id: form.institution_id,
        email: form.email, name: form.name,
        username: form.username.toLowerCase(), pin_hash,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  if (sent) {
    return (
      <AuthShell title="Request sent" subtitle="An admin at the shop will review your request. You'll be able to sign in once approved.">
        <Link to="/login" className={btnCls}>Back to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Join a shop" subtitle="Submit a join request — an admin will approve it."
      footer={<>Have an account? <Link to="/login" className="text-foreground underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={labelCls}>Search shops</label>
          <input className={inputCls} placeholder="Type a shop name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Choose shop</label>
          <select className={inputCls} required value={form.institution_id} onChange={u("institution_id")}>
            <option value="">— select —</option>
            {filtered.map((s) => <option key={s.id} value={s.id}>{s.name}{s.address ? ` — ${s.address}` : ""}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Your name</label><input className={inputCls} required value={form.name} onChange={u("name")} /></div>
        <div><label className={labelCls}>Username</label><input className={inputCls} required value={form.username} onChange={u("username")} pattern="[a-zA-Z0-9_]+" /></div>
        <div><label className={labelCls}>Email</label><input type="email" className={inputCls} required value={form.email} onChange={u("email")} /></div>
        <div><label className={labelCls}>PIN (4+ digits)</label><input type="password" inputMode="numeric" minLength={4} maxLength={8} className={inputCls} required value={form.pin} onChange={u("pin")} /></div>
        <button disabled={busy} className={btnCls}>{busy ? "Sending…" : "Submit request"}</button>
      </form>
    </AuthShell>
  );
}
