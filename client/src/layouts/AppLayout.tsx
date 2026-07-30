import { useEffect, useId, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Compass,
  Gamepad2,
  Heart,
  Home,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';

const navItems = [
  { to: '/', label: 'Inicio', icon: Home, end: true as const },
  { to: '/discover', label: 'Descubrir', icon: Compass },
  { to: '/releases', label: 'Lanzamientos', icon: Gamepad2 },
  { to: '/calendar', label: 'Calendario', icon: CalendarDays },
  { to: '/reservations', label: 'Reservas', icon: ShoppingBag },
  { to: '/budget', label: 'Presupuesto', icon: Wallet },
  { to: '/interest', label: 'Interés', icon: Heart },
  { to: '/games/new', label: 'Añadir juego', icon: Gamepad2 },
  { to: '/settings', label: 'Ajustes', icon: Settings },
];

const primaryMobile = [
  navItems[0]!,
  navItems[2]!,
  navItems[3]!,
  navItems[4]!,
  navItems[5]!,
];

const moreMobile = [navItems[1]!, navItems[6]!, navItems[7]!, navItems[8]!];

function linkClass(isActive: boolean, compact = false) {
  return [
    compact
      ? 'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[10px] sm:text-[11px]'
      : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
    isActive ? 'bg-accent/15 text-accent' : 'text-ink-muted hover:bg-white/5 hover:text-ink',
  ].join(' ');
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTitleId = useId();

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const moreActive = moreMobile.some(
    (item) =>
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface-elevated focus:px-3 focus:py-2 focus:text-sm focus:text-accent"
      >
        Saltar al contenido
      </a>
      <aside className="hidden border-r border-white/5 bg-surface-elevated/80 p-4 lg:flex lg:flex-col">
        <div className="mb-8 px-2">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Biblioteca</p>
          <h1 className="mt-1 text-lg font-semibold text-accent">Game Release Calendar</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
          {navItems
            .filter((item) => item.to !== '/games/new')
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => linkClass(isActive)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="truncate px-2 text-xs text-ink-muted" title={user?.email}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-white/5 hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-surface/90 px-3 py-3 backdrop-blur safe-top md:px-5 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-accent sm:text-base">
                Game Release Calendar
              </h1>
              <p className="truncate text-[11px] text-ink-muted sm:text-xs">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-white/5"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 pb-28 sm:px-5 md:px-6 md:py-6 lg:max-w-none lg:px-8 lg:pb-8"
        >
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-surface-elevated/95 backdrop-blur safe-bottom lg:hidden"
          aria-label="Navegación móvil"
        >
          <ul className="grid grid-cols-6 gap-0.5 px-1 py-1.5 sm:gap-1">
            {primaryMobile.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => linkClass(isActive, true)}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="max-w-full truncate">{label}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={`${linkClass(moreOpen || moreActive, true)} w-full`}
                aria-expanded={moreOpen}
                aria-controls={moreTitleId}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <Menu className="size-4" aria-hidden />
                <span>Más</span>
              </button>
            </li>
          </ul>
        </nav>

        {moreOpen ? (
          <div className="fixed inset-0 z-30 lg:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              aria-label="Cerrar menú"
              onClick={() => setMoreOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={moreTitleId}
              className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-2xl border border-white/10 bg-surface-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id={moreTitleId} className="text-base font-semibold">
                  Más opciones
                </h2>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/5"
                  aria-label="Cerrar"
                  onClick={() => setMoreOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <nav className="grid gap-1" aria-label="Secundaria">
                {moreMobile.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => linkClass(isActive)}
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
