// Offline-first IndexedDB store via Dexie. Source of truth on device.
// Every write is mirrored to an outbox row that the sync engine flushes to Cloud.
import Dexie, { type Table } from "dexie";

export type SyncState = "pending" | "synced" | "error";

export interface LocalDrug {
  id: string;
  institution_id: string;
  drug_name: string;
  category: string | null;
  price: number;
  stock_quantity: number;
  expiry_date: string | null;
  supplier: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  _sync: SyncState;
}

export interface LocalCustomer {
  id: string;
  institution_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  _sync: SyncState;
}

export interface LocalSale {
  id: string;
  institution_id: string;
  drug_id: string;
  drug_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  employee_id: string;
  employee_name: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  transaction_id: string;
  sold_at: string;
  created_at: string;
  _sync: SyncState;
}

export interface OutboxItem {
  id?: number;
  table: "drugs" | "customers" | "sales";
  op: "upsert" | "delete";
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
  last_error?: string;
}

export interface MetaRow {
  key: string;
  value: string;
}

class CCareDB extends Dexie {
  drugs!: Table<LocalDrug, string>;
  customers!: Table<LocalCustomer, string>;
  sales!: Table<LocalSale, string>;
  outbox!: Table<OutboxItem, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("ccare");
    this.version(1).stores({
      drugs: "id, institution_id, drug_name, updated_at, _sync",
      customers: "id, institution_id, phone, updated_at, _sync",
      sales: "id, institution_id, sold_at, employee_id, _sync",
      outbox: "++id, table, created_at",
      meta: "key",
    });
  }
}

export const db = new CCareDB();

export async function setMeta(key: string, value: string) {
  await db.meta.put({ key, value });
}
export async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.get(key);
  return row?.value ?? null;
}
