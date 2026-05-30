import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_app/join-requests")({
  head: () => ({ meta: [{ title: "Join requests — C-Care" }] }),
  component: JoinRequestsPage,
});

interface Req { id: string; name: string; username: string; email: string; pin_hash: string; status: string; created_at: string }

function JoinRequestsPage() {
  const s = useSession();
  const [rows, setRows] = useState<Req[]>([]);

  async function load() {
    if (!s.institution?.id) return;
    const { data } = await supabase.from("join_requests")
      .select("id,name,username,email,pin_hash,status,created_at")
      .eq("institution_id", s.institution.id).order("created_at", { ascending: false });
    setRows((data ?? []) as Req[]);
  }
  useEffect(() => { load(); }, [s.institution?.id]);

  async function decide(r: Req, approve: boolean) {
    if (!s.institution?.id) return;
    if (approve) {
      // Ask admin to send the employee a magic link / they sign up themselves; here we just mark approved.
      // Tell admin to invite the employee to sign up with that email — once they sign up, profile insert links them.
      // We pre-create a placeholder profile when the user signs in: handled in /create-shop equivalent isn't covered for invited employees in this v1.
      // For now: mark approved; the user can sign up and we accept their email match.
      const { error } = await supabase.from("join_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", r.id);
      if (error) return toast.error(error.message);
      toast.success("Approved. Ask the employee to sign up with " + r.email);
    } else {
      const { error } = await supabase.from("join_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", r.id);
      if (error) return toast.error(error.message);
      toast.success("Rejected");
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Join requests</h1><p className="text-sm text-muted-foreground">{rows.length} total</p></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No requests.</td></tr> :
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">@{r.username}</td>
                  <td className="px-4 py-3"><span className="rounded bg-accent px-2 py-0.5 text-xs">{r.status}</span></td>
                  <td className="px-4 py-3">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => decide(r, false)} className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent">Reject</button>
                        <button onClick={() => decide(r, true)} className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90">Approve</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
