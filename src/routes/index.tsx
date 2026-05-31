import { createFileRoute, Link } from "@tanstack/react-router";
import { Pill, Wifi, WifiOff, ShieldCheck, BarChart3, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "C-Care — Drug Shop POS that works offline" },
      { name: "description", content: "Run your pharmacy without worrying about the internet. C-Care saves every sale on the device and syncs to the cloud automatically." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Pill className="h-4 w-4" />
            </span>
            C-Care
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/login" className="rounded-md px-3 py-2 hover:bg-accent">Sign in</Link>
            <Link to="/signup" className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Offline-first · syncs automatically
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              The pharmacy POS that <span className="text-muted-foreground">never goes down</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              C-Care saves every sale on the device first, then syncs to the cloud the moment you're back online. Built for small drug shops, not by accident.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Create your shop <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="inline-flex items-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent">
                Sign in
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8 text-sm">
              <div><div className="text-2xl font-semibold">100%</div><div className="text-muted-foreground">Works offline</div></div>
              <div><div className="text-2xl font-semibold">Auto</div><div className="text-muted-foreground">Cloud sync</div></div>
              <div><div className="text-2xl font-semibold">Multi</div><div className="text-muted-foreground">Staff & shops</div></div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-2xl">
              <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" /> Today</span>
                  <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Synced</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat label="Units sold" value="142" />
                  <Stat label="Revenue" value="UGX 1.2M" />
                  <Stat label="Top drug" value="Panadol" />
                  <Stat label="Low stock" value="3 items" />
                </div>
                <div className="mt-4 rounded-lg bg-sidebar-accent p-4 text-xs">
                  <div className="mb-2 text-sidebar-foreground/70">Recent sales</div>
                  {["Panadol × 2", "Amoxil × 1", "Ventolin × 1"].map((s) => (
                    <div key={s} className="flex justify-between border-t border-sidebar-border py-2 last:border-b">
                      <span>{s}</span><span className="text-sidebar-foreground/60">just now</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-3">
          <Feature icon={<WifiOff className="h-5 w-5" />} title="Offline-first by design"
            body="Every sale, every drug, every customer saves to the device instantly. No spinning loaders. When you're back online, everything syncs in the background." />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="PIN-secured transactions"
            body="Staff log in with PINs, and every sale requires a second PIN entry. Multi-tenant isolation enforced at the database." />
          <Feature icon={<BarChart3 className="h-5 w-5" />} title="Real analytics"
            body="Revenue charts, top drugs, employee performance, low-stock alerts. Built in, not bolted on." />
          <Feature icon={<Users className="h-5 w-5" />} title="Built for teams"
            body="Admins approve staff join requests. Each shop is fully isolated. Roles enforce who can do what." />
          <Feature icon={<Pill className="h-5 w-5" />} title="Drug-shop native"
            body="Categories, suppliers, expiry tracking, auto customer CRM from sales. Designed for pharmacies, not generic retail." />
          <Feature icon={<Wifi className="h-5 w-5" />} title="Works anywhere"
            body="Install as a PWA on Android or use it from any browser. Same experience, same data, syncs across devices." />
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} C-Care · Offline-first pharmacy management
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-sidebar-accent p-3">
      <div className="text-xs text-sidebar-foreground/60">{label}</div>
      <div className="mt-1 text-lg font-semibold text-sidebar-primary">{value}</div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
