import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getStockItems } from '../data/initialData';
import { AlertTriangle, CheckCircle, Search, Warehouse } from 'lucide-react';

export default function EstoquePage() {
  const { products, categories, movements } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const stockItems = getStockItems(products, categories, movements);

  const filtered = useMemo(() => {
    return stockItems.filter((item) => {
      const matchSearch = item.product.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'baixo' ? item.isLow : filterStatus === 'normal' ? !item.isLow : true;
      return matchSearch && matchStatus;
    });
  }, [stockItems, search, filterStatus]);

  const lowCount = stockItems.filter((s) => s.isLow).length;
  const okCount = stockItems.length - lowCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="page-title">Estoque Atual</h2>
        <p className="page-desc">Situação em tempo real de todos os produtos</p>
      </div>

      {/* Resumo rápido */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div
          onClick={() => setFilterStatus('')}
          style={{
            flex: 1, minWidth: '140px',
            background: 'white', border: '1.5px solid var(--neutral-200)', borderRadius: '12px',
            padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.2s',
            borderColor: filterStatus === '' ? 'var(--primary-400)' : 'var(--neutral-200)',
            boxShadow: filterStatus === '' ? '0 0 0 3px rgba(49,88,196,0.1)' : 'none',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--neutral-900)' }}>{stockItems.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Total</div>
        </div>
        <div
          onClick={() => setFilterStatus('normal')}
          style={{
            flex: 1, minWidth: '140px',
            background: 'var(--success-50)', border: '1.5px solid', borderRadius: '12px',
            padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.2s',
            borderColor: filterStatus === 'normal' ? 'var(--success-500)' : 'var(--success-100)',
            boxShadow: filterStatus === 'normal' ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-600)' }}>{okCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success-700)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Normal</div>
        </div>
        <div
          onClick={() => setFilterStatus('baixo')}
          style={{
            flex: 1, minWidth: '140px',
            background: 'var(--danger-50)', border: '1.5px solid', borderRadius: '12px',
            padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.2s',
            borderColor: filterStatus === 'baixo' ? 'var(--danger-500)' : 'var(--danger-100)',
            boxShadow: filterStatus === 'baixo' ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger-600)' }}>{lowCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--danger-700)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Estoque Baixo</div>
        </div>
      </div>

      {/* Filtro */}
      <div className="search-bar">
        <span className="search-bar-icon"><Search size={16} /></span>
        <input placeholder="Buscar produto ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Estoque Atual</th>
                <th>Mínimo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state"><Warehouse size={40} /><div className="empty-state-text">Nenhum produto encontrado</div></div>
                </td></tr>
              ) : (
                filtered.map(({ product, category, currentStock, isLow }) => (
                  <tr key={product.id} className={isLow ? 'row-danger' : ''}>
                    <td style={{ fontWeight: 600 }}>{product.name}</td>
                    <td><span className="badge badge-primary">{category?.name ?? '—'}</span></td>
                    <td style={{ color: 'var(--neutral-500)' }}>{product.unit}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 800, fontSize: '1.1rem',
                          color: isLow ? 'var(--danger-600)' : 'var(--success-600)',
                        }}>
                          {currentStock}
                        </span>
                        {/* Mini progress bar */}
                        <div style={{ width: '80px', height: '6px', background: 'var(--neutral-200)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (currentStock / Math.max(product.minStock * 2, 1)) * 100)}%`,
                            background: isLow ? 'var(--danger-500)' : 'var(--success-500)',
                            borderRadius: '99px',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--neutral-500)', fontWeight: 500 }}>{product.minStock}</td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-danger">
                          <AlertTriangle size={11} /> Estoque Baixo
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          <CheckCircle size={11} /> Normal
                        </span>
                      )}
                    </td>
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
