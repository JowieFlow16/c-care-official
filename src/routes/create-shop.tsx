import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, inputCls, labelCls, btnCls } from "@/components/auth-shell";
import { hashPin, slugify } from "@/lib/utils";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/create-shop")({
  head: () => ({ meta: [{ title: "Set up your shop — C-Care" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/signup" });
  },
  component: CreateShop,
});

function CreateShop() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    shopName: "", address: "", phone: "", currency: "UGX",
    adminName: "", adminUsername: "", pin: "",
  });
  const u = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.pin.length < 4) return toast.error("PIN must be at least 4 digits");
    setBusy(true);
    try {
      const { data: u, error: eu } = await supabase.auth.getUser();
      if (eu || !u.user) throw new Error("Not signed in");
      const userId = u.user.id;

      const { data: inst, error: e2 } = await supabase
        .from("institutions")
        .insert({
          name: form.shopName,
          slug: slugify(form.shopName) + "-" + Math.random().toString(36).slice(2, 6),
          address: form.address || null,
          phone: form.phone || null,
          currency: form.currency,
        })
        .select().single();
      if (e2) throw e2;

      const pinHash = await hashPin(form.pin);
      const { error: e3 } = await supabase.from("profiles").insert({
        id: userId, institution_id: inst.id,
        name: form.adminName, username: form.adminUsername.toLowerCase(),
        pin_hash: pinHash, status: "active",
      });
      if (e3) throw e3;

      const { error: e4 } = await supabase.from("user_roles").insert({
        user_id: userId, institution_id: inst.id, role: "admin",
      });
      if (e4) throw e4;

      await refreshSession();
      toast.success("Shop created!");
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Set up your shop" subtitle="Tell us about your drug shop. This only takes a minute."
      footer={<>Wrong account? <Link to="/login" className="text-foreground underline">Sign in as someone else</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop</div>
          <div className="space-y-3">
            <div><label className={labelCls}>Shop name</label><input className={inputCls} required value={form.shopName} onChange={u("shopName")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Phone</label><input className={inputCls} value={form.phone} onChange={u("phone")} /></div>
              <div><label className={labelCls}>Currency</label>
                <select className={inputCls} value={form.currency} onChange={u("currency")}>
                  <option>UGX</option><option>USD</option><option>KES</option><option>TZS</option><option>RWF</option><option>NGN</option><option>EUR</option><option>GBP</option>
                </select>
              </div>
            </div>
            <div><label className={labelCls}>Address</label><input className={inputCls} value={form.address} onChange={u("address")} /></div>
          </div>
        </div>
        <div className="pt-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin profile</div>
          <div className="space-y-3">
            <div><label className={labelCls}>Your name</label><input className={inputCls} required value={form.adminName} onChange={u("adminName")} /></div>
            <div><label className={labelCls}>Username</label><input className={inputCls} required value={form.adminUsername} onChange={u("adminUsername")} pattern="[a-zA-Z0-9_]+" /></div>
            <div><label className={labelCls}>Transaction PIN (4+ digits)</label><input type="password" inputMode="numeric" minLength={4} maxLength={8} className={inputCls} required value={form.pin} onChange={u("pin")} /></div>
          </div>
        </div>
        <button disabled={busy} className={btnCls}>{busy ? "Creating…" : "Create shop"}</button>
      </form>
    </AuthShell>
  );
}
