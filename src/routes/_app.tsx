import { Outlet, createFileRoute, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, History, Users, UserPlus,
  Settings, LogOut, Pill, Menu, X, Wifi, WifiOff, Bell, ScrollText,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-provider";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AppShell,
});

interface NavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sale", label: "New sale", icon: ShoppingCart },
  { to: "/sales", label: "Sales history", icon: History },
  { to: "/drugs", label: "Inventory", icon: Package },
  { to: "/customers", label: "Customers", icon: Users, adminOnly: true },
  { to: "/staff", label: "Staff", icon: Users, adminOnly: true },
  { to: "/join-requests", label: "Join requests", icon: UserPlus, adminOnly: true },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/audit", label: "Audit logs", icon: ScrollText, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

function AppShell() {
  const session = useSession();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // If signed in but no profile/institution yet → guide to create-shop
  useEffect(() => {
    if (!session.loading && session.userId && !session.institution) {
      void nav({ to: "/create-shop" });
    }
  }, [session, nav]);

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  const items = NAV.filter((n) => !n.adminOnly || session.role === "admin");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:relative lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-primary">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Pill className="h-3.5 w-3.5" />
            </span>
            C-Care
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-0.5 p-3">
          {items.map((it) => {
            const active = loc.pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-primary",
              )}>
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-3 bottom-3 rounded-lg border border-sidebar-border bg-sidebar-accent p-3 text-xs">
          <div className="font-medium text-sidebar-primary">{session.profile?.name ?? "—"}</div>
          <div className="text-sidebar-foreground/70">{session.institution?.name}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-sidebar-foreground/70">
            <span className="rounded bg-sidebar px-1.5 py-0.5 text-[10px] uppercase">{session.role}</span>
          </div>
          <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-sidebar px-2 py-1.5 text-sidebar-primary hover:opacity-90">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm font-medium lg:block">{session.institution?.name}</div>
          <div className="flex items-center gap-3 text-xs">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1",
              online ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground")}>
              {online ? <><Wifi className="h-3 w-3" /> Online</> : <><WifiOff className="h-3 w-3" /> Offline</>}
            </span>
            <ThemeToggle compact />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
