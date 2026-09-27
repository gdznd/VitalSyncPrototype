import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/summary', label: 'Summary' },
  { to: '/goals', label: 'Goals' },
  { to: '/messages', label: 'Messages' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
];

export function AppShell({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand-pill">
          <div className="brand-mark">VS</div>
          <div className="brand-copy">
            <p className="eyebrow">VitalSync Patient Portal</p>
            <h1>Patient Experience</h1>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet context={{ onLogout }} />
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
