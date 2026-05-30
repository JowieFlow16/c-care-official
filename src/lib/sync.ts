// Sync engine: pull cloud → local, then flush outbox local → cloud.
// Runs on auth, on online, and on an interval. All UI reads from Dexie.
import { supabase } from "@/integrations/supabase/client";
import { db, getMeta, setMeta, type OutboxItem } from "./db";

const PULL_KEY = (inst: string, table: string) => `last_pull:${inst}:${table}`;

async function pullTable(institutionId: string, table: "drugs" | "customers" | "sales") {
  const since = (await getMeta(PULL_KEY(institutionId, table))) ?? "1970-01-01T00:00:00Z";
  const col = table === "sales" ? "created_at" : "updated_at";
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("institution_id", institutionId)
    .gt(col, since)
    .order(col, { ascending: true })
    .limit(1000);
  if (error) throw error;
  if (!data || data.length === 0) return 0;
  await db.transaction("rw", db[table], async () => {
    for (const row of data) {
      const local = { ...row, _sync: "synced" as const };
      // never overwrite a pending local change
      const existing = await db[table].get(row.id);
      if (existing && existing._sync === "pending") continue;
      await db[table].put(local as never);
    }
  });
  const last = data[data.length - 1] as Record<string, string>;
  await setMeta(PULL_KEY(institutionId, table), last[col]);
  return data.length;
}

async function flushOutbox() {
  const items = await db.outbox.orderBy("id").limit(50).toArray();
  for (const item of items) {
    try {
      await sendOne(item);
      // mark local as synced
      const id = (item.payload as { id: string }).id;
      if (id && item.table !== "sales") {
        const row = await db[item.table].get(id);
        if (row) await db[item.table].update(id, { _sync: "synced" } as never);
      } else if (id && item.table === "sales") {
        const row = await db.sales.get(id);
        if (row) await db.sales.update(id, { _sync: "synced" });
      }
      await db.outbox.delete(item.id!);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await db.outbox.update(item.id!, {
        attempts: (item.attempts ?? 0) + 1,
        last_error: msg,
      });
      // stop on first error to avoid hammering
      break;
    }
  }
}

async function sendOne(item: OutboxItem) {
  if (item.op === "upsert") {
    const { error } = await supabase.from(item.table).upsert(item.payload as never);
    if (error) throw error;
  } else if (item.op === "delete") {
    const id = (item.payload as { id: string }).id;
    const { error } = await supabase.from(item.table).delete().eq("id", id);
    if (error) throw error;
  }
}

let running = false;
let timer: number | null = null;

export async function syncNow(institutionId: string | null) {
  if (running || !institutionId) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  running = true;
  try {
    await flushOutbox();
    await Promise.all([
      pullTable(institutionId, "drugs"),
      pullTable(institutionId, "customers"),
      pullTable(institutionId, "sales"),
    ]);
  } catch (e) {
    console.warn("[sync] failed", e);
  } finally {
    running = false;
  }
}

export function startSync(getInstitution: () => string | null) {
  if (typeof window === "undefined") return () => {};
  const tick = () => syncNow(getInstitution());
  void tick();
  timer = window.setInterval(tick, 30_000);
  window.addEventListener("online", tick);
  return () => {
    if (timer) clearInterval(timer);
    window.removeEventListener("online", tick);
  };
}

// Helpers for components to queue writes
export async function queueUpsert(
  table: "drugs" | "customers" | "sales",
  payload: Record<string, unknown>,
) {
  await db.outbox.add({
    table,
    op: "upsert",
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  });
}

export async function queueDelete(
  table: "drugs" | "customers" | "sales",
  id: string,
) {
  await db.outbox.add({
    table,
    op: "delete",
    payload: { id },
    created_at: new Date().toISOString(),
    attempts: 0,
  });
}
