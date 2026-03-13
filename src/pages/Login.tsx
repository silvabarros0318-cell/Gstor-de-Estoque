import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { BoxesIcon, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot_password';

export default function LoginPage() {
  const { login } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState<AuthView>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (view === 'login') {
      if (!email || !password) {
        setError('Preencha todos os campos.');
        return;
      }
      setLoading(true);
      setError('');
      const result = await login(email, password);
      setLoading(false);

      if (result.success) {
        showToast('success', 'Login realizado com sucesso!');
        navigate('/dashboard');
      } else {
        setError(result.error ?? 'Erro ao realizar login.');
      }
    } else if (view === 'register') {
      if (!name || !email || !password) {
        setError('Preencha todos os campos.');
        return;
      }
      setLoading(true);
      setError('');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      // Try to create profile if needed, or rely on triggers if any
      setLoading(false);

      if (signUpError) {
        setError(signUpError.message);
      } else {
        showToast('success', 'Conta criada com sucesso! Faça login para continuar.');
        setView('login');
        setPassword('');
      }
    } else if (view === 'forgot_password') {
      if (!email) {
        setError('Preencha seu e-mail.');
        return;
      }
      setLoading(true);
      setError('');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);

      if (resetError) {
        setError(resetError.message);
      } else {
        showToast('success', 'Instruções de recuperação enviadas para o seu e-mail!');
        setView('login');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1a52 0%, #1e3a8a 50%, #1a5276 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            top: `${10 + i * 15}%`,
            left: `${i % 2 === 0 ? 5 + i * 10 : 50 + i * 5}%`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px', height: '72px', background: 'linear-gradient(135deg, #4a70d8, #10b981)',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <BoxesIcon size={36} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Gestor de Estoque
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
            Controle inteligente do seu inventário
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '1.5rem' }}>
            {view === 'login' && 'Entrar no sistema'}
            {view === 'register' && 'Criar sua conta'}
            {view === 'forgot_password' && 'Recuperar senha'}
          </h2>

          {error && (
            <div style={{
              background: 'var(--danger-50)', border: '1.5px solid var(--danger-200)', borderRadius: '10px',
              padding: '0.75rem 1rem', marginBottom: '1.25rem', color: 'var(--danger-700)', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {view === 'register' && (
              <div className="form-group">
                <label className="form-label">Nome Completo <span>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }}>
                    <User size={16} />
                  </span>
                  <input
                    type="text" className="form-input" style={{ paddingLeft: '42px' }}
                    placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">E-mail <span>*</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }}>
                  <Mail size={16} />
                </span>
                <input
                  type="email" className="form-input" style={{ paddingLeft: '42px' }}
                  placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  autoFocus={view === 'login' || view === 'forgot_password'}
                />
              </div>
            </div>

            {view !== 'forgot_password' && (
              <div className="form-group">
                <label className="form-label">Senha <span>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }}>
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'} className="form-input"
                    style={{ paddingLeft: '42px', paddingRight: '42px' }}
                    placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button" onClick={() => setShowPass((s) => !s)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', display: 'flex' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <span className="spinner" /> : null}
              {view === 'login' && (loading ? 'Entrando...' : 'Entrar')}
              {view === 'register' && (loading ? 'Criando conta...' : 'Criar Conta')}
              {view === 'forgot_password' && (loading ? 'Enviando...' : 'Enviar de recuperação')}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            {view === 'login' ? (
              <>
                <button type="button" onClick={() => { setView('forgot_password'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', fontWeight: 500 }}>
                  Esqueci minha senha
                </button>
                <button type="button" onClick={() => { setView('register'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--neutral-600)', cursor: 'pointer', fontWeight: 500 }}>
                  Não tem uma conta? <span style={{ color: 'var(--primary-600)' }}>Cadastre-se</span>
                </button>
              </>
            ) : (
              <button type="button" onClick={() => { setView('login'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', fontWeight: 500 }}>
                Voltar para o Login
              </button>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            <strong style={{ color: 'var(--neutral-700)' }}>Credenciais de teste:</strong><br />
            Admin: admin@gmail.com / admin<br />
            Demo: demo@gmail.com / demo
          </div>
        </div>
      </div>
    </div>
  );
}
