import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { db } from "@/lib/db";
import { useSession } from "@/lib/session";
import { formatMoney, hashPin, newId, txnId } from "@/lib/utils";
import { queueUpsert, syncNow } from "@/lib/sync";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/sale")({
  head: () => ({ meta: [{ title: "New sale — C-Care" }] }),
  component: SalePage,
});

function SalePage() {
  const s = useSession();
  const nav = useNavigate();
  const inst = s.institution?.id;
  const currency = s.institution?.currency ?? "UGX";

  const drugs = useLiveQuery(
    async () => (inst ? db.drugs.where("institution_id").equals(inst).filter((d) => !d.deleted_at && d.stock_quantity > 0).toArray() : []),
    [inst],
  ) ?? [];

  const [drugId, setDrugId] = useState("");
  const [qty, setQty] = useState("1");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const drug = drugs.find((d) => d.id === drugId);
  const total = drug ? Number(drug.price) * (parseInt(qty) || 0) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!drug || !inst || !s.userId || !s.profile) return;
    const q = parseInt(qty);
    if (q <= 0) return toast.error("Quantity must be > 0");
    if (q > drug.stock_quantity) return toast.error(`Only ${drug.stock_quantity} in stock`);
    if (!pin || pin.length < 4) return toast.error("Enter your PIN");

    // verify PIN against profile
    const pinHash = await hashPin(pin);
    if (pinHash !== s.profile.pin_hash) return toast.error("Wrong PIN");

    setBusy(true);
    try {
      // Find/create customer (only if phone given)
      let customer_id: string | null = null;
      if (custPhone.trim()) {
        const existing = await db.customers.where({ institution_id: inst, phone: custPhone.trim() }).first();
        if (existing) {
          customer_id = existing.id;
        } else {
          customer_id = newId();
          const c = {
            id: customer_id, institution_id: inst,
            name: custName.trim() || "Customer", phone: custPhone.trim(),
            email: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          };
          await db.customers.put({ ...c, _sync: "pending" });
          await queueUpsert("customers", c);
        }
      }

      // Create sale + decrement stock locally
      const now = new Date().toISOString();
      const sale = {
        id: newId(), institution_id: inst, drug_id: drug.id,
        drug_name: drug.drug_name, unit_price: Number(drug.price),
        quantity: q, total_price: Number(drug.price) * q,
        employee_id: s.userId, employee_name: s.profile.name,
        customer_id, customer_name: custName.trim() || null, customer_phone: custPhone.trim() || null,
        transaction_id: txnId(), sold_at: now, created_at: now,
      };
      await db.sales.put({ ...sale, _sync: "pending" });
      await queueUpsert("sales", sale);

      // decrement stock locally + push updated drug
      const newStock = drug.stock_quantity - q;
      await db.drugs.update(drug.id, { stock_quantity: newStock, updated_at: now, _sync: "pending" });
      const updatedDrug = { ...drug, stock_quantity: newStock, updated_at: now };
      delete (updatedDrug as Record<string, unknown>)._sync;
      await queueUpsert("drugs", updatedDrug);

      // Low-stock notification
      if (newStock < 10) {
        void supabase.from("notifications").insert({
          institution_id: inst, type: "low_stock",
          title: "Low stock alert",
          message: `${drug.drug_name} now at ${newStock} units`,
        });
      }

      // PDF receipt
      makeReceiptPdf({
        shop: s.institution?.name ?? "C-Care", currency,
        txn: sale.transaction_id, when: now,
        items: [{ name: drug.drug_name, qty: q, price: Number(drug.price), total: sale.total_price }],
        cashier: s.profile.name, customer: custName,
      });

      void syncNow(inst);
      toast.success("Sale recorded");
      nav({ to: "/sales" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New sale</h1>
        <p className="text-sm text-muted-foreground">Saved locally first, synced to cloud automatically.</p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium">Drug</label>
          <select required value={drugId} onChange={(e) => setDrugId(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
            <option value="">— select —</option>
            {drugs.map((d) => <option key={d.id} value={d.id}>{d.drug_name} — {formatMoney(Number(d.price), currency)} · stock {d.stock_quantity}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-xs font-medium">Quantity</label>
            <input type="number" min="1" required value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></div>
          <div className="flex flex-col"><label className="mb-1.5 block text-xs font-medium">Total</label>
            <div className="flex-1 rounded-lg border border-input bg-accent/30 px-3 py-2.5 text-sm font-semibold">{formatMoney(total, currency)}</div></div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer (optional)</div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={custName} onChange={(e) => setCustName(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            <input placeholder="Phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <label className="mb-1.5 block text-xs font-medium">Your PIN to authorize</label>
          <input type="password" inputMode="numeric" required value={pin} onChange={(e) => setPin(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
        </div>

        <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? "Saving…" : `Complete sale · ${formatMoney(total, currency)}`}
        </button>
      </form>
    </div>
  );
}

function makeReceiptPdf(r: { shop: string; currency: string; txn: string; when: string; items: { name: string; qty: number; price: number; total: number }[]; cashier: string; customer?: string }) {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });
  let y = 8;
  doc.setFontSize(12); doc.text(r.shop, 40, y, { align: "center" }); y += 5;
  doc.setFontSize(8); doc.text("RECEIPT", 40, y, { align: "center" }); y += 6;
  doc.text(`Txn: ${r.txn}`, 4, y); y += 4;
  doc.text(`When: ${new Date(r.when).toLocaleString()}`, 4, y); y += 4;
  doc.text(`Cashier: ${r.cashier}`, 4, y); y += 4;
  if (r.customer) { doc.text(`Customer: ${r.customer}`, 4, y); y += 4; }
  y += 2; doc.line(4, y, 76, y); y += 5;
  let grand = 0;
  for (const it of r.items) {
    doc.text(`${it.name}`, 4, y); y += 4;
    doc.text(`${it.qty} × ${it.price.toLocaleString()} = ${it.total.toLocaleString()} ${r.currency}`, 4, y); y += 5;
    grand += it.total;
  }
  doc.line(4, y, 76, y); y += 5;
  doc.setFontSize(11); doc.text(`Total: ${grand.toLocaleString()} ${r.currency}`, 4, y); y += 8;
  doc.setFontSize(8); doc.text("Thank you!", 40, y, { align: "center" });
  doc.save(`receipt-${r.txn}.pdf`);
}
