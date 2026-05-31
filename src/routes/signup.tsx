import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, inputCls, labelCls, btnCls } from "@/components/auth-shell";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — C-Care" }] }),
  component: SignupPage,
});

function SignupPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/create-shop` },
      });
      if (error) throw error;
      setSent(form.email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email"
        subtitle={`We sent a verification link to ${sent}. Click it to confirm your account, then sign in to set up your shop.`}>
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-6">
          <Mail className="h-10 w-10 text-muted-foreground" />
        </div>
        <Link to="/login" className={btnCls + " mt-4"}>Back to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Start with your email — you'll set up your shop next."
      footer={<>Already have an account? <Link to="/login" className="text-foreground underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelCls}>Email</label>
          <input type="email" className={inputCls} required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className={labelCls}>Password (6+ characters)</label>
          <input type="password" minLength={6} className={inputCls} required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <button disabled={busy} className={btnCls}>{busy ? "Sending…" : "Create account"}</button>
      </form>
    </AuthShell>
  );
}
