import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import {
  Home,
  Archive,
  Package,
  CheckSquare,
  BookOpen,
  Book,
  Gauge,
  AlertTriangle,
  FileText,
  History as HistoryIcon,
  Settings,
  Sailboat,
  type LucideIcon,
} from '@/components/ui/icons';
import { useAuth } from '@/auth/AuthProvider';
import { useSync } from '@/sync/SyncProvider';
import { t } from '@/text';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

// Pestanyes de la barra inferior (mòbil). Es mantenen idèntiques a la versió mòbil original.
const tabs: NavItem[] = [
  { to: '/', label: t.nav.home, icon: Home, end: true },
  { to: '/locations', label: t.nav.locations, icon: Archive },
  { to: '/objects', label: t.nav.objects, icon: Package },
  { to: '/recipes', label: t.nav.recipes, icon: BookOpen },
  { to: '/checklists', label: t.nav.checklists, icon: CheckSquare },
];

// Accessos secundaris de la sidebar (només en pantalla gran). Són les seccions que al mòbil
// viuen a la Home o estan amagades; en gran hi ha espai vertical de sobres per a totes.
const secondaryTabs: NavItem[] = [
  { to: '/guide', label: t.home.guide, icon: Book },
  { to: '/measure', label: t.home.measure, icon: Gauge },
  { to: '/faults', label: t.home.faults, icon: AlertTriangle },
  { to: '/documents', label: t.home.documents, icon: FileText },
  { to: '/history', label: t.nav.history, icon: HistoryIcon },
  { to: '/settings', label: t.nav.settings, icon: Settings },
];

/** Enllaç de la sidebar (pantalla gran). */
function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-boat-100 font-semibold text-boat-900'
            : 'text-boat-600 hover:bg-boat-100/60'
        }`
      }
    >
      <Icon size={20} />
      {item.label}
    </NavLink>
  );
}

/**
 * Layout principal. Responsive:
 *  - Mòbil (< lg): capçalera amb sync + contingut + barra de navegació inferior (com sempre).
 *  - Gran (≥ lg): sidebar lateral esquerra amb tota la navegació + contingut centrat amb
 *    amplada màxima. La capçalera superior i la barra inferior s'amaguen.
 */
export function Layout() {
  const { userName } = useAuth();
  const { online, pendingCount, status } = useSync();
  const location = useLocation();
  const navigate = useNavigate();
  const showOfflineBanner =
    status !== 'not-configured' && (!online || status === 'offline');
  return (
    <div className="flex min-h-full flex-col bg-boat-50 text-boat-900 lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden">
      {/* Sidebar (només pantalla gran). Fixa: ocupa tota l'alçada del viewport i no fa
          scroll amb el contingut (l'scroll viu al `main`); el `<nav>` intern fa scroll propi
          si la llista no hi cap. */}
      <aside className="hidden lg:flex lg:h-full lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-boat-100 lg:bg-white">
        <button
          onClick={() => navigate('/settings')}
          aria-label={t.nav.settingsAria}
          className="flex items-center gap-2 px-4 py-4 text-left text-sm font-semibold active:scale-[0.98]"
        >
          <Sailboat size={20} className="text-boat-700" />
          {userName}
        </button>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {tabs.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
          <div className="my-2 border-t border-boat-100" />
          <span className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-boat-400">
            {t.nav.more}
          </span>
          {secondaryTabs.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t border-boat-100 px-4 py-3">
          <SyncIndicator />
        </div>
      </aside>

      {/* Columna de contingut */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:min-h-0">
        {/* Capçalera (només mòbil) */}
        <header className="flex items-center justify-between px-4 py-2 lg:hidden">
          <button
            onClick={() => navigate('/settings')}
            aria-label={t.nav.settingsAria}
            className="flex items-center gap-1.5 text-sm font-semibold active:scale-95"
          >
            <Sailboat size={18} className="text-boat-700" />
            {userName}
            <Settings size={16} className="text-boat-400" />
          </button>
          <SyncIndicator />
        </header>

        {showOfflineBanner && (
          <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
            {t.nav.offlineBanner(pendingCount)}
          </div>
        )}

        <main className="flex flex-1 flex-col overflow-y-auto px-4 pb-24 pt-2 lg:px-8 lg:pb-8 lg:pt-8">
          {/* `key` per ruta → cada navegació refà el fade d'entrada. El wrapper creix amb
              flex-1 (no amb height:%) perquè les pàgines puguin ancorar contingut a baix amb
              un fill `flex-1` + `mt-auto` (p.ex. el botó del Mode compra). En gran es centra
              amb amplada màxima perquè el contingut no s'estiri d'extrem a extrem. */}
          <div
            key={location.pathname}
            className="flex flex-1 flex-col animate-fade-in lg:mx-auto lg:w-full lg:max-w-5xl"
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Barra de navegació inferior (només mòbil) */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-boat-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? 'text-boat-700 font-semibold' : 'text-boat-500'
                }`
              }
            >
              <Icon size={22} />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
