import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import {
  BuildingIcon,
  DashboardIcon,
  ListIcon,
  LogoutIcon,
  PeopleIcon,
  SparkleIcon,
  TrendIcon,
  WalletIcon,
} from '../components/icons';

const ROLE_LABELS: Record<string, string> = {
  inspecteur: 'Inspecteur',
  enseignant: 'Enseignant',
  chef_etablissement: "Chef d'établissement",
  ige_admin: 'IGE',
  super_admin: 'Super administrateur',
};

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', icon: DashboardIcon, end: true },
  { to: '/inspections', label: 'Inspections', icon: ListIcon, end: false },
  { to: '/etablissements', label: 'Établissements', icon: BuildingIcon, end: false },
  { to: '/inspecteurs', label: 'Inspecteurs', icon: PeopleIcon, end: false },
  { to: '/assistant-ia', label: 'Assistant IA', icon: SparkleIcon, end: false },
];

/** Pages IGE — voir PROMPT 7 (Abonnements) et PROMPT 8, point 2 (Analyse IA). */
const ADMIN_NAV_ITEMS = [
  { to: '/abonnements', label: 'Abonnements', icon: WalletIcon, end: false },
  { to: '/analyse-ia', label: 'Analyse IA', icon: TrendIcon, end: false },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navItems =
    user?.role === 'ige_admin' || user?.role === 'super_admin' ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-brand-primary text-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
          IGE
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">c3-digital</div>
          <div className="text-[11px] leading-tight text-white/60">Inspection Générale</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white text-brand-primary' : 'text-white/85 hover:bg-white/10'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3 text-xs">
            <div className="truncate font-semibold">{user.fullName}</div>
            <div className="text-white/60">{ROLE_LABELS[user.role] ?? user.role}</div>
            {user.zone && <div className="text-white/60">Zone : {user.zone}</div>}
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <LogoutIcon className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </aside>
  );
}
