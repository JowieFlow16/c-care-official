import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useSession } from "@/lib/session";
import { formatMoney } from "@/lib/utils";
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { startOfDay } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — C-Care" }] }),
  component: Dashboard,
});

function Dashboard() {
  const s = useSession();
  const inst = s.institution?.id;
  const currency = s.institution?.currency ?? "UGX";

  const sales = useLiveQuery(
    async () => (inst ? db.sales.where("institution_id").equals(inst).toArray() : []),
    [inst],
  ) ?? [];
  const drugs = useLiveQuery(
    async () => (inst ? db.drugs.where("institution_id").equals(inst).filter((d) => !d.deleted_at).toArray() : []),
    [inst],
  ) ?? [];

  const today = startOfDay(new Date()).toISOString();
  const todaySales = sales.filter((s) => s.sold_at >= today);
  const todayRevenue = todaySales.reduce((acc, s) => acc + Number(s.total_price), 0);
  const todayUnits = todaySales.reduce((acc, s) => acc + s.quantity, 0);
  const lowStock = drugs.filter((d) => d.stock_quantity < 10);
  const topDrug = (() => {
    const m = new Map<string, number>();
    for (const s of todaySales) m.set(s.drug_name, (m.get(s.drug_name) ?? 0) + s.quantity);
    let best = "—", n = 0;
    for (const [k, v] of m) if (v > n) { best = k; n = v; }
    return best;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {s.profile?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Here's how {s.institution?.name} is doing today.</p>
        </div>
        <Link to="/sale" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <ShoppingCart className="h-4 w-4" /> New sale
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Today's revenue" value={formatMoney(todayRevenue, currency)} icon={<TrendingUp className="h-4 w-4" />} />
        <Kpi label="Units sold today" value={todayUnits.toString()} icon={<ShoppingCart className="h-4 w-4" />} />
        <Kpi label="Top drug today" value={topDrug} icon={<Package className="h-4 w-4" />} />
        <Kpi label="Low stock items" value={lowStock.length.toString()} icon={<AlertTriangle className="h-4 w-4" />} tone={lowStock.length ? "warn" : "ok"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Recent sales</h2>
          {sales.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No sales yet. <Link to="/sale" className="underline">Make the first one →</Link></div>
          ) : (
            <div className="divide-y divide-border text-sm">
              {[...sales].sort((a,b)=>b.sold_at.localeCompare(a.sold_at)).slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-medium">{s.drug_name} × {s.quantity}</div>
                    <div className="text-xs text-muted-foreground">{s.employee_name} · {new Date(s.sold_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMoney(Number(s.total_price), currency)}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{s._sync}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Low stock</h2>
          {lowStock.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">All good. Nothing below 10 units.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {lowStock.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md bg-accent/60 px-3 py-2">
                  <span>{d.drug_name}</span>
                  <span className="rounded bg-warning/20 px-2 py-0.5 text-xs text-warning-foreground">{d.stock_quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, tone = "ok" }: { label: string; value: string; icon: React.ReactNode; tone?: "ok"|"warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={`grid h-7 w-7 place-items-center rounded-md ${tone==="warn"?"bg-warning/20 text-warning-foreground":"bg-accent"}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
