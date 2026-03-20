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
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShoppingCart
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
import { useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { generateClosingPdf } from '../lib/generateClosingPdf';

export default function Dashboard() {
  const { products, categories, movements, currentUser, closeDay } = useApp();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [closingDay, setClosingDay] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const stockItems = getStockItems(products, categories, movements);
  const lowStockItems = stockItems.filter((s) => s.isLow);

  const todayDate = new Date();
  todayDate.setMinutes(todayDate.getMinutes() - todayDate.getTimezoneOffset());
  const todayStr = todayDate.toISOString().split('T')[0];

  const dayMovements = movements.filter((m) => {
    const md = new Date(m.createdAt);
    md.setMinutes(md.getMinutes() - md.getTimezoneOffset());
    return md.toISOString().split('T')[0] === todayStr;
  });

  const daySales = dayMovements.filter((m) => m.type === 'saida' && !m.closed);

  const revenueDay = daySales.reduce((acc, current) => acc + (current.totalRevenue || 0), 0);
  const costDay = daySales.reduce((acc, current) => acc + (current.totalCost || 0), 0);
  const profitDay = daySales.reduce((acc, current) => acc + (current.profit || 0), 0);
  const productsSoldDay = daySales.reduce((acc, current) => acc + current.quantity, 0);

  const stockValue = stockItems.reduce((acc, item) => acc + (item.currentStock * (item.product.costPrice || 0)), 0);

  const handleCloseDay = async () => {
    setClosingDay(true);
    const result = await closeDay();
    setClosingDay(false);
    
    if (result.success && result.closing) {
      showToast('success', 'Fechamento realizado com sucesso!');
      setShowConfirmClose(false);
      generateClosingPdf(result.closing, daySales, products.map(p => ({...p, costPrice: p.costPrice || 0, salePrice: p.salePrice || 0})));
    } else {
      showToast('error', result.error || 'Erro ao fechar o dia.');
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-desc">Visão geral do seu estoque em tempo real</p>
        </div>
        {isOperatorOrAdmin && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowConfirmClose(true)}
            disabled={daySales.length === 0}
            title={daySales.length === 0 ? "Nenhuma venda aberta para fechar hoje" : ""}
          >
            <FileText size={18} />
            Fechar Dia
          </button>
        )}
      </div>

      {/* Financeiro Cards */}
      {isOperatorOrAdmin && (
        <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card green">
            <div className="stat-card-icon green"><DollarSign size={24} /></div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
                {revenueDay.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
              </div>
              <div className="stat-card-label">Receita do Dia</div>
            </div>
          </div>
          <div className="stat-card red">
            <div className="stat-card-icon red"><TrendingDown size={24} /></div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
                {costDay.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
              </div>
              <div className="stat-card-label">Custo do Dia</div>
            </div>
          </div>
          <div className="stat-card blue">
            <div className="stat-card-icon blue"><TrendingUp size={24} /></div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
                {profitDay.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
              </div>
              <div className="stat-card-label">Lucro do Dia</div>
            </div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-card-icon yellow"><ShoppingCart size={24} /></div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>{productsSoldDay}</div>
              <div className="stat-card-label">Produtos Vendidos</div>
            </div>
          </div>
          <div className="stat-card blue">
            <div className="stat-card-icon blue"><Package size={24} /></div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
                {stockValue.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
              </div>
              <div className="stat-card-label">Valor em Estoque</div>
            </div>
          </div>
        </div>
      )}

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
              <div className="stat-card-value">{dayMovements.filter(m => !m.closed).length}</div>
              <div className="stat-card-label">Movimentações Ativas Hoje</div>
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
      {/* Modal Confirmar Fechamento */}
      {showConfirmClose && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="confirm-body">
              <div className="confirm-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary-600)', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <FileText size={28} />
              </div>
              <div className="confirm-title" style={{ textAlign: 'center', fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Fechar o Dia?</div>
              <div className="confirm-message" style={{ textAlign: 'center', color: 'var(--neutral-500)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Tem certeza que deseja fechar o dia de hoje? Isso irá consolidar {productsSoldDay} produtos vendidos e gerar o relatório financeiro em PDF.
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowConfirmClose(false)} disabled={closingDay}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCloseDay} disabled={closingDay}>
                {closingDay ? <span className="spinner" /> : null}
                {closingDay ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
