import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_app/staff")({
  head: () => ({ meta: [{ title: "Staff — C-Care" }] }),
  component: StaffPage,
});

interface Row { id: string; name: string; username: string; is_active: boolean; status: string }

function StaffPage() {
  const s = useSession();
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    if (!s.institution?.id) return;
    const { data } = await supabase.from("profiles").select("id,name,username,is_active,status").eq("institution_id", s.institution.id).order("name");
    setRows((data ?? []) as Row[]);
  }
  useEffect(() => { load(); }, [s.institution?.id]);

  async function toggle(r: Row) {
    const { error } = await supabase.from("profiles").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); load();
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Staff</h1>
      <p className="text-sm text-muted-foreground">{rows.length} member{rows.length === 1 ? "" : "s"}</p></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted-foreground">@{r.username}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${r.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{r.is_active ? "Active" : "Disabled"}</span></td>
                <td className="px-4 py-3 text-right"><button onClick={() => toggle(r)} className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent">{r.is_active ? "Disable" : "Enable"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
