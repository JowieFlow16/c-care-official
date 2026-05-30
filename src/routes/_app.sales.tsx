import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useSession } from "@/lib/session";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({ meta: [{ title: "Sales history — C-Care" }] }),
  component: SalesPage,
});

function SalesPage() {
  const s = useSession();
  const inst = s.institution?.id;
  const isAdmin = s.role === "admin";

  const sales = useLiveQuery(async () => {
    if (!inst) return [];
    let q = db.sales.where("institution_id").equals(inst);
    if (!isAdmin && s.userId) q = q.filter((x) => x.employee_id === s.userId);
    const list = await q.toArray();
    return list.sort((a, b) => b.sold_at.localeCompare(a.sold_at));
  }, [inst, isAdmin, s.userId]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{isAdmin ? "All sales" : "My sales"}</h1>
        <p className="text-sm text-muted-foreground">{sales.length} transaction{sales.length === 1 ? "" : "s"}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Txn</th><th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Drug</th>
                {isAdmin && <th className="px-4 py-3">Employee</th>}
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Qty</th><th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Sync</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-muted-foreground">No sales yet.</td></tr>
              ) : sales.map((s2) => (
                <tr key={s2.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{s2.transaction_id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s2.sold_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{s2.drug_name}</td>
                  {isAdmin && <td className="px-4 py-3 text-muted-foreground">{s2.employee_name}</td>}
                  <td className="px-4 py-3 text-muted-foreground">{s2.customer_name ?? "—"}</td>
                  <td className="px-4 py-3">{s2.quantity}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(Number(s2.total_price), s.institution?.currency)}</td>
                  <td className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">{s2._sync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
