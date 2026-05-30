import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatMoney(n: number, currency = "UGX") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

// Lightweight PIN hash for client-side check. Uses SubtleCrypto SHA-256.
// Note: PIN doubles as a *second* factor on top of Supabase auth — never
// the only credential, so a client-side hash is acceptable.
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`ccare:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newId() {
  return crypto.randomUUID();
}

export function txnId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TXN-${ts}-${rnd}`;
}
