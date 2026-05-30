import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useSession } from "@/lib/session";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "Customers — C-Care" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const s = useSession();
  const inst = s.institution?.id;

  const data = useLiveQuery(async () => {
    if (!inst) return [];
    const [customers, sales] = await Promise.all([
      db.customers.where("institution_id").equals(inst).toArray(),
      db.sales.where("institution_id").equals(inst).toArray(),
    ]);
    const agg = new Map<string, { count: number; total: number }>();
    for (const sa of sales) {
      if (!sa.customer_id) continue;
      const a = agg.get(sa.customer_id) ?? { count: 0, total: 0 };
      a.count++; a.total += Number(sa.total_price);
      agg.set(sa.customer_id, a);
    }
    return customers.map((c) => ({ ...c, ...agg.get(c.id) ?? { count: 0, total: 0 } }));
  }, [inst]) ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Customers</h1>
      <p className="text-sm text-muted-foreground">Auto-built from sales · {data.length} total</p></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Visits</th><th className="px-4 py-3 text-right">Lifetime spend</th></tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No customers yet.</td></tr>
            ) : data.sort((a,b)=>b.total-a.total).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                <td className="px-4 py-3">{c.count}</td>
                <td className="px-4 py-3 text-right font-medium">{formatMoney(c.total, s.institution?.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
