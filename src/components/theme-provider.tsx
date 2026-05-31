import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Theme: ${theme ?? "system"} — click for ${next}`}
      className={
        compact
          ? "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          : "inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
      }
    >
      <Icon className="h-4 w-4" />
      {!compact && <span className="capitalize">{theme ?? "system"}</span>}
    </button>
  );
}
