import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Warehouse,
  Settings,
  LogOut,
  Menu,
  X,
  BoxesIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getStockItems } from '../data/initialData';

export default function DashboardLayout() {
  const { currentUser, logout, products, categories, movements } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const stockItems = getStockItems(products, categories, movements);
  const lowStockCount = stockItems.filter((s) => s.isLow).length;

  const isAdmin = currentUser?.role === 'admin';
  const isOperatorOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'operator';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    operator: 'Operador',
    viewer: 'Visualizador',
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', show: true },
    { to: '/produtos', icon: <Package size={20} />, label: 'Produtos', show: isAdmin },
    { to: '/movimentacoes', icon: <ArrowLeftRight size={20} />, label: 'Movimentações', show: isOperatorOrAdmin },
    { to: '/estoque', icon: <Warehouse size={20} />, label: 'Estoque', show: true, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { to: '/configuracoes', icon: <Settings size={20} />, label: 'Configurações', show: isAdmin },
  ];

  const sidebarClass = `sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`;

  return (
    <div className="app-shell">
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={sidebarClass}>
        <div className="sidebar-logo" onClick={() => setCollapsed((c) => !c)} title="Recolher menu">
          <div className="sidebar-logo-icon">
            <BoxesIcon size={20} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h1>Gestor Estoque</h1>
            <span>Sistema v1.0</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-title">Menu</div>
            {navItems.filter((n) => n.show).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={item.label}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.badge && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{currentUser?.name}</div>
            <div className="sidebar-user-role">{roleLabel[currentUser?.role ?? '']}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        <header className="topbar">
          <button
            className="topbar-hamburger"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileOpen((o) => !o);
              } else {
                setCollapsed((c) => !c);
              }
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ flex: 1 }}>
            <div className="topbar-title">Gestor de Estoque</div>
          </div>
          <div className="topbar-actions">
            {lowStockCount > 0 && (
              <button className="topbar-icon-btn" onClick={() => navigate('/estoque')} title={`${lowStockCount} produto(s) com estoque baixo`}>
                <Warehouse size={20} />
                <span className="topbar-badge" />
              </button>
            )}
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
