import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Movimentacoes from './pages/Movimentacoes';
import Estoque from './pages/Estoque';
import Configuracoes from './pages/Configuracoes';

function PrivateRoute({ element, adminOnly = false, operatorOrAdmin = false }: {
  element: React.ReactNode;
  adminOnly?: boolean;
  operatorOrAdmin?: boolean;
}) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && currentUser.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (operatorOrAdmin && currentUser.role === 'viewer') return <Navigate to="/dashboard" replace />;
  return <>{element}</>;
}

function AppRoutes() {
  const { currentUser } = useApp();

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute element={<DashboardLayout />} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="produtos" element={<PrivateRoute element={<Produtos />} adminOnly />} />
        <Route path="movimentacoes" element={<PrivateRoute element={<Movimentacoes />} operatorOrAdmin />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="configuracoes" element={<PrivateRoute element={<Configuracoes />} adminOnly />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
