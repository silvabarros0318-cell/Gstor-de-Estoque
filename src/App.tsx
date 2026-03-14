import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import DefinirSenha from './pages/DefinirSenha';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Movimentacoes from './pages/Movimentacoes';
import Estoque from './pages/Estoque';
import Configuracoes from './pages/Configuracoes';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f1a52 0%, #090e27 100%)',
      fontFamily: 'Inter, sans-serif',
      color: 'white'
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#4a70d8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '1.25rem'
      }} />
      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
        CARREGANDO...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * Rota protegida — redireciona para /login se não autenticado.
 * Aguarda sessionLoading antes de tomar qualquer decisão.
 */
function PrivateRoute({
  element,
  adminOnly = false,
  operatorOrAdmin = false,
}: {
  element: React.ReactNode;
  adminOnly?: boolean;
  operatorOrAdmin?: boolean;
}) {
  const { currentUser, sessionLoading, loading } = useApp();
  const location = useLocation();

  // Aguardar: verificação de sessão OU carregamento de dados
  if (sessionLoading || loading) {
    return <LoadingScreen />;
  }

  // Sem usuário logado → redireciona para login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Usuário convidado precisando definir senha
  if (currentUser.status === 'pending' && location.pathname !== '/definir-senha') {
    return <Navigate to="/definir-senha" replace />;
  }

  // Permissão insuficiente
  if (adminOnly && currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (operatorOrAdmin && currentUser.role === 'viewer') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{element}</>;
}

/**
 * Rotas principais do app.
 * Aguarda sessionLoading antes de qualquer decisão de rota.
 */
function AppRoutes() {
  const { currentUser, sessionLoading, loading } = useApp();

  // Enquanto verifica sessão inicial, mostrar loading
  if (sessionLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Rota de login: se já autenticado, redireciona para dashboard */}
      <Route
        path="/login"
        element={
          currentUser && !loading
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />

      <Route 
        path="/definir-senha" 
        element={
          currentUser && !loading
            ? (currentUser.status === 'pending' ? <DefinirSenha /> : <Navigate to="/dashboard" replace />)
            : <Navigate to="/login" replace />
        } 
      />

      {/* Rotas protegidas dentro do DashboardLayout */}
      <Route path="/" element={<PrivateRoute element={<DashboardLayout />} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="estoque" element={<Estoque />} />
        <Route
          path="produtos"
          element={<PrivateRoute element={<Produtos />} adminOnly />}
        />
        <Route
          path="movimentacoes"
          element={<PrivateRoute element={<Movimentacoes />} operatorOrAdmin />}
        />
        <Route
          path="configuracoes"
          element={<PrivateRoute element={<Configuracoes />} adminOnly />}
        />
      </Route>

      {/* Qualquer rota desconhecida → dashboard (ou login se não autenticado) */}
      <Route
        path="*"
        element={
          currentUser
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
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
