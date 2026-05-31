import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — C-Care" }] }),
  component: NotificationsPage,
});

interface N { id: string; title: string; message: string; type: string; is_read: boolean; created_at: string }

function NotificationsPage() {
  const s = useSession();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!s.institution?.id) return;
    setLoading(true);
    const { data } = await supabase.from("notifications")
      .select("*").eq("institution_id", s.institution.id)
      .order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as N[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [s.institution?.id]);

  async function markAllRead() {
    if (!s.institution?.id) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("institution_id", s.institution.id).eq("is_read", false);
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <button onClick={markAllRead} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 opacity-40" />
            You're all caught up.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className={`flex gap-3 p-4 ${n.is_read ? "" : "bg-accent/30"}`}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-muted-foreground/40" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
