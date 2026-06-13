import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Download,
  UtensilsCrossed,
  Settings as SettingsIcon,
  LogOut,
  Menu as MenuIcon,
  X,
  PauseCircle,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useOrderingStatus } from "../lib/data";
import { cn } from "../lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/exports", label: "Exports", icon: Download },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--color-gold)]/15 text-[var(--color-gold-soft)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-gold)] text-sm font-bold text-white">
        FF
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Food Fort</p>
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
          Admin
        </p>
      </div>
    </div>
  );
}

export function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: ordering } = useOrderingStatus();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:flex">
        <Brand />
        <div className="mt-6 flex-1">
          <NavItems />
        </div>
        <div className="border-t border-[var(--color-border)] pt-3">
          <p className="truncate px-3 pb-2 text-xs text-[var(--color-muted)]">
            {user?.email}
          </p>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-[var(--color-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-[var(--color-border)] pt-3">
              <p className="truncate px-3 pb-2 text-xs text-[var(--color-muted)]">
                {user?.email}
              </p>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1 text-[var(--color-fg)]"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <Brand />
          <div className="w-8" />
        </header>

        {ordering.paused && (
          <div className="flex items-center gap-2 bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-white">
            <PauseCircle className="h-4 w-4 shrink-0" />
            <span>
              Online ordering is paused
              {ordering.reason ? ` — ${ordering.reason}` : ""}.
            </span>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:px-6 md:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
