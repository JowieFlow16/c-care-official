# C-Care Rebuild — Build Plan

## What C-Care Is
A pharmacy / drug-shop point-of-sale and management system for small-to-medium drug shops. Multi-institution (each shop's data is isolated), role-based (Admin vs Employee), PIN-based auth, with inventory, sales, customers, audit logs, analytics, and PDF receipts.

## Architecture (key change from original)

**Offline-first, online-sync.** Every action writes to the local device first (IndexedDB via Dexie), then syncs to Lovable Cloud (Postgres) automatically when online. Other devices pull updates on their next sync. No data loss if the user loses connection mid-sale.

```text
  ┌─────────────────────────┐
  │  React UI (TanStack)    │
  └──────────┬──────────────┘
             │  always reads/writes here first
  ┌──────────▼──────────────┐
  │  IndexedDB (Dexie)      │  ◄── source of truth on device
  │  + outbox queue         │
  └──────────┬──────────────┘
             │  background sync when online
  ┌──────────▼──────────────┐
  │  Lovable Cloud (Postgres│
  │  + RLS + Auth)          │  ◄── shared across devices
  └─────────────────────────┘
```

GitHub is dropped as a "database" (not viable in a browser app — needs tokens, has rate limits, no concurrent-write safety). Lovable Cloud gives you the same "data shared across devices when online" outcome, securely. The code itself ships to your GitHub via Lovable's GitHub integration in Settings.

## Screens (15)

**Public:** Landing · Login · Register (employee join request) · Create Shop · First-run Setup

**Employee:** Dashboard (in-stock + quick sell) · Process Sale · My Sales History

**Admin:** Dashboard (KPIs, low-stock, revenue chart) · Drug Inventory + Add/Edit · All Sales · Staff Management · Join Requests · Customers (auto-CRM) · Notifications · Audit Logs · Reports (charts + CSV export) · Settings

## Data Model (8 tables, all scoped by institution_id)

institutions · users (linked to Lovable Cloud auth) · join_requests · drugs · customers · sales · notifications · audit_logs

## Auth
- Lovable Cloud Auth for the underlying account (email/password — required for secure multi-device sync)
- App-level **PIN** for quick day-to-day login on a shared device + per-sale transaction authorization (matches original UX)
- Role table (`user_roles`) separate from profiles — Admin / Employee
- RLS policies scope everything by `institution_id`

## Business Logic Preserved
- Sale flow: select drug → quantity → PIN auth → optional customer → receipt + PDF
- Customer auto-dedup by phone number
- Low-stock alert when `stock < 10`
- Revenue charts (7/30/90 day), top drugs, employee performance
- Audit log on every sensitive action

## Improvements Over Original
1. **Offline-first** — works fully without internet, syncs when back online
2. Modern UI — restrained dark sidebar + light content (keeps original aesthetic) but with proper design tokens, smooth animations, better mobile layout
3. PWA-installable on phones (replaces Capacitor APK workflow)
4. Type-safe end-to-end (TypeScript + generated DB types)
5. Proper RLS so multi-tenant isolation is enforced at the DB, not just the app

## Tech
- TanStack Start (already scaffolded) + React 19 + TypeScript
- Tailwind v4 + shadcn (themed to match C-Care monochrome aesthetic, Inter font)
- Dexie for IndexedDB
- Lovable Cloud (Postgres + Auth + RLS)
- Recharts for analytics
- jsPDF for client-side receipt PDFs (works offline)
- TanStack Query for server state

## Build Order
1. Enable Lovable Cloud, create schema + RLS + roles
2. Design system (tokens, Inter font, sidebar/topbar shell)
3. Auth flow: Setup → Create Shop → Login → Register/Join
4. Dexie schema + sync engine (outbox + pull)
5. Drugs CRUD
6. Sale flow + receipt PDF
7. Customers (auto) + Sales history
8. Staff, Join Requests, Notifications, Audit Logs
9. Admin Dashboard + Reports (charts + CSV)
10. Settings, polish, PWA manifest

## Heads-up
- This is a large rebuild — I'll ship it in focused turns, not one giant message. After you approve I'll start with steps 1–3 (Cloud + schema + shell + auth) and check in before moving on.
- For the code to land in `altra-co/c-care`, you'll need to connect that repo in **Lovable → Settings → GitHub** (you must have write access to that org). Then every change here auto-pushes.
- I'll keep currency as a configurable shop setting (UGX default, switchable) so it's not hardcoded.

Approve and I'll start with the foundation.