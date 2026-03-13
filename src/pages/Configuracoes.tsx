import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getStockItems } from '../data/initialData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserRole } from '../types';
import {
  MessageSquare,
  Bell,
  AlertTriangle,
  Send,
  Save,
  UserPlus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

function SectionCard({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left">
          {icon}
          <div>
            <div className="card-title">{title}</div>
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { settings, updateSettings, products, categories, movements, invitations, inviteUser } = useApp();
  const { showToast } = useToast();

  const [whatsapp, setWhatsapp] = useState(settings.alertConfig.whatsappNumber);
  const [alertEnabled, setAlertEnabled] = useState(settings.alertConfig.enabled);
  const [intervalHours, setIntervalHours] = useState(String(settings.alertConfig.minIntervalHours));

  // Convite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('operator');
  const [inviteLoading, setInviteLoading] = useState(false);

  const stockItems = getStockItems(products, categories, movements);
  const lowStockItems = stockItems.filter((s) => s.isLow);

  const saveAlertSettings = async () => {
    await updateSettings({
      alertConfig: {
        ...settings.alertConfig,
        whatsappNumber: whatsapp,
        enabled: alertEnabled,
        minIntervalHours: Number(intervalHours) || 24,
        lastAlertSent: settings.alertConfig.lastAlertSent,
      },
    });
    showToast('success', 'Configurações de alerta salvas!');
  };

  const sendTestMessage = () => {
    if (!whatsapp) {
      showToast('error', 'Informe um número de WhatsApp.');
      return;
    }
    const number = whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(
      `🔔 *Teste - Gestor de Estoque*\n\nEsta é uma mensagem de teste do sistema.\n\nProdutos com estoque baixo: ${lowStockItems.length}\n\n✅ Sistema funcionando corretamente!`
    );
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
    showToast('info', 'Abrindo WhatsApp para envio da mensagem de teste...');
  };

  const handleInvite = async () => {
    if (!inviteEmail) { showToast('error', 'Informe o e-mail do convidado.'); return; }
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) { showToast('error', 'E-mail inválido.'); return; }
    setInviteLoading(true);
    const result = await inviteUser(inviteEmail, inviteRole);
    setInviteLoading(false);
    if (result.success) {
      showToast('success', `Convite enviado para ${inviteEmail}!`);
      setInviteEmail('');
    } else {
      showToast('error', result.error ?? 'Erro ao enviar convite.');
    }
  };

  const roleLabels: Record<string, string> = {
    admin: '🔑 Administrador',
    operator: '📦 Operador de Estoque',
    viewer: '👁 Visualizador',
  };

  const pendingInvitations = invitations.filter((i) => !i.used && new Date(i.expiresAt) > new Date());
  const usedInvitations = invitations.filter((i) => i.used);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="page-title">Configurações</h2>
        <p className="page-desc">Gerencie alertas, WhatsApp e usuários do sistema</p>
      </div>

      {/* WhatsApp */}
      <SectionCard
        icon={<MessageSquare size={18} color="var(--success-600)" />}
        title="Configuração de WhatsApp"
        subtitle="Número para receber alertas automáticos de estoque"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Número de WhatsApp</label>
            <input
              className="form-input"
              placeholder="+244 912 345 678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '4px' }}>
              Incluindo código do país (ex: +244 para Angola, +55 para Brasil)
            </div>
          </div>

          <div className="toggle-wrapper">
            <label className="toggle">
              <input type="checkbox" checked={alertEnabled} onChange={(e) => setAlertEnabled(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-800)' }}>Alertas Ativados</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                {alertEnabled ? 'Alertas serão enviados automaticamente' : 'Alertas desativados'}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Intervalo mínimo entre alertas (horas)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              max="168"
              value={intervalHours}
              onChange={(e) => setIntervalHours(e.target.value)}
              style={{ maxWidth: '140px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={saveAlertSettings}>
              <Save size={16} /> Salvar Configurações
            </button>
            <button className="btn btn-success" onClick={sendTestMessage}>
              <Send size={16} /> Testar Mensagem
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Alertas */}
      <SectionCard
        icon={<Bell size={18} color="var(--warning-600)" />}
        title="Produtos em Alerta"
        subtitle={`${lowStockItems.length} produto(s) com estoque abaixo do mínimo`}
      >
        {lowStockItems.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '1.25rem', background: 'var(--success-50)', borderRadius: '10px',
            border: '1.5px solid var(--success-100)',
          }}>
            <CheckCircle size={24} color="var(--success-500)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--success-700)' }}>Tudo em ordem!</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--success-600)' }}>Nenhum produto com estoque abaixo do mínimo.</div>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Estoque Atual</th>
                  <th>Mínimo</th>
                  <th>Déficit</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(({ product, category, currentStock }) => (
                  <tr key={product.id} className="row-danger">
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} color="var(--danger-500)" />
                        {product.name}
                      </span>
                    </td>
                    <td><span className="badge badge-primary">{category?.name}</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--danger-600)' }}>{currentStock} {product.unit}</td>
                    <td style={{ color: 'var(--neutral-600)' }}>{product.minStock}</td>
                    <td>
                      <span className="badge badge-danger">-{product.minStock - currentStock} {product.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Convidar Usuário */}
      <SectionCard
        icon={<UserPlus size={18} color="var(--primary-600)" />}
        title="Convidar Usuário"
        subtitle="Envie um convite para adicionar um novo usuário ao sistema"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">E-mail do usuário <span>*</span></label>
              <input
                className="form-input"
                type="email"
                placeholder="usuario@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nível de acesso</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(['operator', 'admin', 'viewer'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInviteRole(r)}
                  className="btn btn-sm"
                  style={{
                    background: inviteRole === r ? 'var(--primary-600)' : 'var(--neutral-100)',
                    color: inviteRole === r ? 'white' : 'var(--neutral-600)',
                    border: 'none',
                  }}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '6px' }}>
              {inviteRole === 'admin' && '⚠️ Admin tem acesso total ao sistema incluindo configurações.'}
              {inviteRole === 'operator' && 'Pode registrar movimentações e visualizar estoque, mas não excluir produtos.'}
              {inviteRole === 'viewer' && 'Apenas leitura: visualiza dashboard e estoque sem poder fazer alterações.'}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleInvite} disabled={inviteLoading}>
            {inviteLoading ? <span className="spinner" /> : <UserPlus size={16} />}
            {inviteLoading ? 'Enviando convite...' : 'Enviar Convite'}
          </button>

          {/* Convites pendentes */}
          {invitations.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--neutral-700)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} /> Convites ({invitations.length})
              </div>
              {invitations.map((inv) => {
                const isPending = !inv.used && new Date(inv.expiresAt) > new Date();
                const isExpired = !inv.used && new Date(inv.expiresAt) <= new Date();
                return (
                  <div key={inv.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-200)',
                    marginBottom: '0.5rem',
                    background: isPending ? 'var(--primary-50)' : inv.used ? 'var(--success-50)' : 'var(--neutral-50)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span className={`badge ${
                          inv.role === 'admin' ? 'badge-danger' : inv.role === 'operator' ? 'badge-primary' : 'badge-neutral'
                        }`} style={{ fontSize: '0.65rem' }}>
                          {roleLabels[inv.role]}
                        </span>
                        <Clock size={10} />
                        Expira: {format(new Date(inv.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <div>
                      {inv.used && <span className="badge badge-success"><CheckCircle size={11} /> Aceito</span>}
                      {isPending && <span className="badge badge-warning"><Clock size={11} /> Pendente</span>}
                      {isExpired && <span className="badge badge-neutral"><XCircle size={11} /> Expirado</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
