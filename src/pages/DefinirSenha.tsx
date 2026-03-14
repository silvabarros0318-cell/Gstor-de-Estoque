import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Package, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';

export default function DefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updatePassword, currentUser } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Redireciona de volta ao dashboard se não for mais "pending"
  if (currentUser && currentUser.status !== 'pending') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('error', 'As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      showToast('error', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.success) {
      showToast('success', 'Senha definida com sucesso! Bem-vindo(a).');
      navigate('/dashboard', { replace: true });
    } else {
      showToast('error', result.error || 'Erro ao definir a senha.');
    }
  };

  return (
    <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="login-logo" style={{ display: 'inline-flex', marginBottom: '1rem' }}>
            <Package size={40} color="var(--primary-500)" />
          </div>
          <h1 className="login-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Definir Senha</h1>
          <p className="login-subtitle" style={{ fontSize: '0.9rem', color: 'var(--neutral-500)', marginTop: '0.5rem' }}>
            Bem-vindo(a) ao Gestor de Estoque! Como este é seu primeiro acesso, por favor crie uma senha segura para sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} /> Nova Senha
            </label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> Confirmar Senha
            </label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', paddingRight: '40px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !password || !confirmPassword}
            style={{ marginTop: '0.5rem', width: '100%', padding: '0.875rem' }}
          >
            {loading ? <span className="spinner" /> : 'Salvar e Acessar o Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
