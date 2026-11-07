import { BarChart3, CalendarDays, SlidersHorizontal, Sun, Users } from 'lucide-react';
import logo from '../logo.png';
import { navigate, type RouteName } from '../router';

export const APP_VERSION = `v${__APP_VERSION__}`;

export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <img src={logo} alt="" />
        <span className="brand-name">Sonit</span>
        <span className="ver" aria-label={`Versão ${__APP_VERSION__}`}>{APP_VERSION}</span>
      </div>
      <button className="icon-btn" aria-label="Ajustes" onClick={() => navigate('/ajustes')}>
        <SlidersHorizontal size={20} />
      </button>
    </header>
  );
}

const TABS: { name: RouteName; label: string; path: string; Icon: typeof Sun; sideOnly?: boolean }[] = [
  { name: 'orcamento', label: 'Orçamento', path: '/orcamento', Icon: Sun },
  { name: 'clientes', label: 'Clientes', path: '/clientes', Icon: Users },
  { name: 'agenda', label: 'Agenda', path: '/agenda', Icon: CalendarDays },
  { name: 'painel', label: 'Painel', path: '/painel', Icon: BarChart3 },
  { name: 'ajustes', label: 'Ajustes', path: '/ajustes', Icon: SlidersHorizontal, sideOnly: true },
];

/** Abas embaixo no celular, menu lateral no computador. Fora das abas, só aparece no computador. */
export function TabBar({ active, desktopOnly }: { active: RouteName; desktopOnly: boolean }) {
  const current = active === 'cliente' ? 'clientes' : active === 'kits' ? 'ajustes' : active;
  return (
    <nav className={`tabbar no-print${desktopOnly ? ' desktop-only' : ''}`} aria-label="Navegação principal">
      <div className="side-brand">
        <img src={logo} alt="" />
        <span className="brand-name">Sonit</span>
        <span className="ver">{APP_VERSION}</span>
      </div>
      {TABS.map(({ name, label, path, Icon, sideOnly }) => (
        <button
          key={name}
          className={`tab${sideOnly ? ' side-only' : ''}`}
          aria-current={current === name ? 'page' : undefined}
          onClick={() => current !== name && navigate(path, true)}
        >
          <span className="ico">
            <Icon size={22} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
