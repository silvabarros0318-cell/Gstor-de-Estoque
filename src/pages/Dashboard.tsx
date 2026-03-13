import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getStockItems } from '../data/initialData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package,
  Tag,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Warehouse,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMemo } from 'react';

export default function Dashboard() {
  const { products, categories, movements, currentUser } = useApp();
  const navigate = useNavigate();

  const stockItems = getStockItems(products, categories, movements);
  const lowStockItems = stockItems.filter((s) => s.isLow);

  // Últimas 8 movimentações
  const lastMovements = [...movements]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // Gráfico: entradas e saídas dos últimos 7 dias
  const chartData = useMemo(() => {
    const days: { date: string; entradas: number; saidas: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'dd/MM', { locale: ptBR });
      const dayMovements = movements.filter((m) => {
        const md = new Date(m.createdAt);
        return md.toDateString() === d.toDateString();
      });
      days.push({
        date: dateStr,
        entradas: dayMovements.filter((m) => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
        saidas: dayMovements.filter((m) => m.type === 'saida').reduce((s, m) => s + m.quantity, 0),
      });
    }
    return days;
  }, [movements]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? '—';
  const isAdmin = currentUser?.role === 'admin';
  const isOperatorOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'operator';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho */}
      <div>
        <h2 className="page-title">Dashboard</h2>
        <p className="page-desc">Visão geral do seu estoque em tempo real</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card blue">
          <div className="stat-card-icon blue">
            <Package size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value">{products.length}</div>
            <div className="stat-card-label">Total de Produtos</div>
          </div>
        </div>

        {isAdmin && (
          <div className="stat-card green">
            <div className="stat-card-icon green">
              <Tag size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value">{categories.length}</div>
              <div className="stat-card-label">Categorias</div>
            </div>
          </div>
        )}

        <div className="stat-card red" style={{ cursor: 'pointer' }} onClick={() => navigate('/estoque')}>
          <div className="stat-card-icon red">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value">{lowStockItems.length}</div>
            <div className="stat-card-label">Estoque Baixo</div>
          </div>
        </div>

        {isOperatorOrAdmin && (
          <div className="stat-card yellow">
            <div className="stat-card-icon yellow">
              <ArrowLeftRight size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value">{movements.length}</div>
              <div className="stat-card-label">Movimentações</div>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: lowStockItems.length > 0 ? '1fr 360px' : '1fr', gap: '1.5rem' }}>
        {/* Gráfico */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <ArrowLeftRight size={18} color="var(--primary-600)" />
              <div>
                <div className="card-title">Entradas & Saídas</div>
                <div className="card-subtitle">Últimos 7 dias</div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--neutral-500)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--neutral-500)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid var(--neutral-200)',
                    borderRadius: '10px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke="var(--success-500)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke="var(--danger-500)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas de estoque baixo */}
        {lowStockItems.length > 0 && (
          <div className="card" style={{ borderTop: '3px solid var(--danger-500)' }}>
            <div className="card-header">
              <div className="card-header-left">
                <AlertTriangle size={18} color="var(--danger-500)" />
                <div>
                  <div className="card-title" style={{ color: 'var(--danger-600)' }}>Estoque Crítico</div>
                  <div className="card-subtitle">{lowStockItems.length} produto(s) em alerta</div>
                </div>
              </div>
            </div>
            <div className="card-body" style={{ padding: '0.75rem' }}>
              {lowStockItems.map((item) => (
                <div key={item.product.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', borderRadius: '8px',
                  background: 'var(--danger-50)',
                  marginBottom: '0.5rem',
                  border: '1px solid var(--danger-100)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--neutral-800)' }}>{item.product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{item.category?.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--danger-600)' }}>{item.currentStock}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--neutral-400)' }}>Mín: {item.product.minStock}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Últimas movimentações */}
      {isOperatorOrAdmin && (
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <Warehouse size={18} color="var(--primary-600)" />
              <div>
                <div className="card-title">Últimas Movimentações</div>
                <div className="card-subtitle">Histórico recente de entrada e saída</div>
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/movimentacoes')}>
              Ver todas
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Data</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {lastMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state-text">Nenhuma movimentação registrada</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lastMovements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{getProductName(m.productId)}</td>
                      <td>
                        <span className={`badge ${m.type === 'entrada' ? 'badge-success' : m.type === 'saida' ? 'badge-danger' : 'badge-warning'}`}>
                          {m.type === 'entrada' ? <ArrowUpRight size={12} /> : m.type === 'saida' ? <ArrowDownRight size={12} /> : null}
                          {m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.quantity} {products.find(p => p.id === m.productId)?.unit}</td>
                      <td style={{ color: 'var(--neutral-500)' }}>
                        {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td style={{ color: 'var(--neutral-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.observation || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
