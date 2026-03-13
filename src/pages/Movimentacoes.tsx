import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, Search, Filter, Plus } from 'lucide-react';
import type { MovementType } from '../types';

export default function MovimentacoesPage() {
  const { products, movements, addMovement, currentUser, getProductStock } = useApp();
  const { showToast } = useToast();

  const [form, setForm] = useState<{ productId: string; type: MovementType; quantity: string; observation: string }>({
    productId: products[0]?.id ?? '',
    type: 'entrada',
    quantity: '',
    observation: '',
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.productId || !form.quantity || Number(form.quantity) <= 0) {
      setFormError('Selecione um produto e informe uma quantidade válida.');
      return;
    }
    setLoading(true);
    const result = await addMovement({
      productId: form.productId,
      type: form.type,
      quantity: Number(form.quantity),
      observation: form.observation,
    });
    setLoading(false);
    if (result.success) {
      showToast('success', `Movimentação de ${form.type} registrada com sucesso!`);
      setForm({ productId: form.productId, type: form.type, quantity: '', observation: '' });
    } else {
      setFormError(result.error ?? 'Erro ao registrar movimentação.');
      showToast('error', result.error ?? 'Erro ao registrar movimentação.');
    }
  };

  const selectedProduct = products.find((p) => p.id === form.productId);
  const currentStock = form.productId ? getProductStock(form.productId) : 0;

  const filteredMovements = useMemo(() => {
    return [...movements]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((m) => {
        const productName = products.find((p) => p.id === m.productId)?.name ?? '';
        const matchSearch = productName.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType ? m.type === filterType : true;
        return matchSearch && matchType;
      });
  }, [movements, products, search, filterType]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? '—';
  const getProductUnit = (id: string) => products.find((p) => p.id === id)?.unit ?? '';

  const canRegister = currentUser?.role === 'admin' || currentUser?.role === 'operator';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="page-title">Movimentações</h2>
        <p className="page-desc">Registre entradas e saídas e visualize o histórico completo</p>
      </div>

      {/* Formulário */}
      {canRegister && (
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <Plus size={18} color="var(--primary-600)" />
              <div className="card-title">Registrar Movimentação</div>
            </div>
          </div>
          <div className="card-body">
            {formError && (
              <div style={{ background: 'var(--danger-50)', border: '1.5px solid var(--danger-200)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--danger-700)', fontSize: '0.875rem' }}>
                ⚠️ {formError}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Produto <span>*</span></label>
                  <select className="form-select" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '4px' }}>
                      Estoque atual: <strong style={{ color: currentStock > 0 ? 'var(--success-600)' : 'var(--danger-600)' }}>{currentStock} {selectedProduct.unit}</strong>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo <span>*</span></label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {(['entrada', 'saida'] as MovementType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, type: t })}
                        className={`btn btn-sm`}
                        style={{
                          flex: 1,
                          background: form.type === t
                            ? t === 'entrada' ? 'var(--success-500)' : 'var(--danger-500)'
                            : 'var(--neutral-100)',
                          color: form.type === t ? 'white' : 'var(--neutral-600)',
                          border: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                      >
                        {t === 'entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantidade <span>*</span></label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Observação</label>
                  <input
                    className="form-input"
                    placeholder="Opcional"
                    value={form.observation}
                    onChange={(e) => setForm({ ...form, observation: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : <Plus size={16} />}
                {loading ? 'Registrando...' : 'Registrar Movimentação'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <Filter size={18} color="var(--primary-600)" />
            <div>
              <div className="card-title">Histórico de Movimentações</div>
              <div className="card-subtitle">{filteredMovements.length} registros encontrados</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="search-bar">
              <span className="search-bar-icon"><Search size={16} /></span>
              <input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: '140px' }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Usuário</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-text">Nenhuma movimentação encontrada</div></div></td></tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--neutral-500)', fontSize: '0.8125rem' }}>
                      {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{getProductName(m.productId)}</td>
                    <td>
                      <span className={`badge ${m.type === 'entrada' ? 'badge-success' : m.type === 'saida' ? 'badge-danger' : 'badge-warning'}`}>
                        {m.type === 'entrada' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      <span style={{ color: m.type === 'entrada' ? 'var(--success-600)' : 'var(--danger-600)' }}>
                        {m.type === 'saida' ? '-' : '+'}{m.quantity}
                      </span>
                      {' '}<span style={{ color: 'var(--neutral-400)', fontSize: '0.75rem' }}>{getProductUnit(m.productId)}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>
                      {users.find(u => u.id === m.createdBy)?.name || 'Sistema'}
                    </td>
                    <td style={{ color: 'var(--neutral-500)' }}>{m.observation || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
