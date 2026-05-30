import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { db, type LocalDrug } from "@/lib/db";
import { queueDelete, queueUpsert, syncNow } from "@/lib/sync";
import { useSession } from "@/lib/session";
import { formatMoney, newId } from "@/lib/utils";

export const Route = createFileRoute("/_app/drugs")({
  head: () => ({ meta: [{ title: "Inventory — C-Care" }] }),
  component: DrugsPage,
});

function DrugsPage() {
  const s = useSession();
  const inst = s.institution?.id;
  const isAdmin = s.role === "admin";
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<LocalDrug | null>(null);
  const [showNew, setShowNew] = useState(false);

  const drugs = useLiveQuery(
    async () => (inst ? db.drugs.where("institution_id").equals(inst).filter((d) => !d.deleted_at).toArray() : []),
    [inst],
  ) ?? [];

  const filtered = q ? drugs.filter((d) => d.drug_name.toLowerCase().includes(q.toLowerCase())) : drugs;

  async function remove(id: string) {
    if (!confirm("Delete this drug?")) return;
    await db.drugs.update(id, { deleted_at: new Date().toISOString(), _sync: "pending" });
    await queueDelete("drugs", id);
    void syncNow(inst ?? null);
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{drugs.length} drug{drugs.length === 1 ? "" : "s"} in stock</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add drug
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search drugs…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Drug</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No drugs yet.</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{d.drug_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.category ?? "—"}</td>
                  <td className="px-4 py-3">{formatMoney(Number(d.price), s.institution?.currency)}</td>
                  <td className="px-4 py-3"><span className={d.stock_quantity < 10 ? "rounded bg-warning/20 px-2 py-0.5 text-warning-foreground" : ""}>{d.stock_quantity}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{d.expiry_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(d)} className="rounded p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                      {isAdmin && <button onClick={() => remove(d.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showNew || editing) && (
        <DrugForm
          drug={editing}
          institutionId={inst!}
          onClose={() => { setShowNew(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function DrugForm({ drug, institutionId, onClose }: { drug: LocalDrug | null; institutionId: string; onClose: () => void }) {
  const [f, setF] = useState({
    drug_name: drug?.drug_name ?? "",
    category: drug?.category ?? "",
    price: drug?.price?.toString() ?? "",
    stock_quantity: drug?.stock_quantity?.toString() ?? "",
    expiry_date: drug?.expiry_date ?? "",
    supplier: drug?.supplier ?? "",
    description: drug?.description ?? "",
  });
  const u = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const payload = {
      id: drug?.id ?? newId(),
      institution_id: institutionId,
      drug_name: f.drug_name.trim(),
      category: f.category || null,
      price: Number(f.price) || 0,
      stock_quantity: parseInt(f.stock_quantity) || 0,
      expiry_date: f.expiry_date || null,
      supplier: f.supplier || null,
      description: f.description || null,
      created_at: drug?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await db.drugs.put({ ...payload, _sync: "pending" });
    await queueUpsert("drugs", payload);
    void syncNow(institutionId);
    toast.success(drug ? "Updated" : "Added");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">{drug ? "Edit drug" : "New drug"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2"><input required className={inp} value={f.drug_name} onChange={u("drug_name")} /></Field>
          <Field label="Category"><input className={inp} value={f.category} onChange={u("category")} /></Field>
          <Field label="Supplier"><input className={inp} value={f.supplier} onChange={u("supplier")} /></Field>
          <Field label="Price"><input required type="number" step="0.01" min="0" className={inp} value={f.price} onChange={u("price")} /></Field>
          <Field label="Stock qty"><input required type="number" min="0" className={inp} value={f.stock_quantity} onChange={u("stock_quantity")} /></Field>
          <Field label="Expiry date" className="sm:col-span-2"><input type="date" className={inp} value={f.expiry_date ?? ""} onChange={u("expiry_date")} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea rows={2} className={inp} value={f.description} onChange={u("description")} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className ?? ""}`}><div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>{children}</label>;
}
