import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit logs — C-Care" }] }),
  component: AuditPage,
});

interface Row { id: string; action: string; details: string | null; user_name: string | null; created_at: string }

function AuditPage() {
  const s = useSession();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!s.institution?.id) return;
    supabase.from("audit_logs").select("*")
      .eq("institution_id", s.institution.id)
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [s.institution?.id]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
      <div className="rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No activity recorded yet.</div>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="font-medium">{r.action}</div>
                  {r.details && <div className="text-xs text-muted-foreground">{r.details}</div>}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>{r.user_name ?? "—"}</div>
                  <div>{new Date(r.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
