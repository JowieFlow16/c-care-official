import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, inputCls, labelCls, btnCls } from "@/components/auth-shell";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — C-Care" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshSession();
      toast.success("Welcome back!");
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Sign in" subtitle="Use your email and password."
      footer={<>No shop yet? <Link to="/create-shop" className="text-foreground underline">Create one</Link> · Or <Link to="/register" className="text-foreground underline">join an existing shop</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelCls}>Email</label><input type="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className={labelCls}>Password</label><input type="password" className={inputCls} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button disabled={busy} className={btnCls}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthShell>
  );
}
