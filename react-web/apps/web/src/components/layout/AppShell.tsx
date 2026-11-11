import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Bell, Menu, Search, X, ChevronsUpDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSession } from '@/auth/session';
import { NAVIGATION, PORTAL_LABELS } from '@/app/navigation';
import type { Portal } from '@/types/domain';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-900 text-sm font-bold text-white">
        CP
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold text-ink-900">CrediPlataforma</div>
        <div className="text-[11px] text-ink-400">Préstamos y recaudo</div>
      </div>
    </div>
  );
}

function PortalSwitcher() {
  const { portal, switchPortal } = useSession();
  const [open, setOpen] = useState(false);
  const portals: Portal[] = ['admin', 'collector', 'customer'];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
      >
        <span>Vista: {PORTAL_LABELS[portal]}</span>
        <ChevronsUpDown className="h-4 w-4 text-ink-400" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card-lg">
          {portals.map((p) => (
            <button
              key={p}
              onClick={() => {
                switchPortal(p);
                setOpen(false);
              }}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm hover:bg-ink-50',
                p === portal ? 'font-semibold text-brand-700' : 'text-ink-600',
              )}
            >
              {PORTAL_LABELS[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { portal } = useSession();
  const items = NAVIGATION[portal];
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Logo />
      <PortalSwitcher />
      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-lg bg-brand-900 p-4 text-white">
        <p className="text-xs font-medium text-brand-100">Ambiente de demostración</p>
        <p className="mt-1 text-xs text-brand-200">
          Datos de ejemplo. La autorización real la aplica el backend.
        </p>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, signOut } = useSession();
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-ink-200 bg-white/80 px-4 backdrop-blur lg:px-8">
      <button onClick={onMenu} className="btn-ghost -ml-2 p-2 lg:hidden" aria-label="Abrir menú">
        <Menu className="h-5 w-5" />
      </button>
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9" placeholder="Buscar cliente, préstamo o referencia..." />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="btn-ghost relative p-2" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500" />
        </button>
        <div className="flex items-center gap-3 border-l border-ink-200 pl-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold text-ink-900">{user?.name}</div>
            <div className="text-xs text-ink-400">{user?.role}</div>
          </div>
          <button onClick={signOut} className="btn-ghost p-2" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-ink-50">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-ink-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white">
            <button
              onClick={() => setMobileOpen(false)}
              className="btn-ghost absolute right-2 top-2 p-2"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
