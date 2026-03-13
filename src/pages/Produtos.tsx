import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getStockItems } from '../data/initialData';
import type { Category, Product } from '../types';
import {
  Plus, Search, Edit2, Trash2, X, Tag, Package, AlertTriangle, ChevronRight,
} from 'lucide-react';

// Modal reutilizável
function Modal({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Dialog de confirmação
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="confirm-body">
          <div className="confirm-icon"><AlertTriangle size={28} /></div>
          <div className="confirm-title">Confirmar exclusão</div>
          <div className="confirm-message">{message}</div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

export default function ProdutosPage() {
  const { products, categories, movements, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, getProductStock } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', categoryId: '', minStock: '', unit: 'Unidade', description: '' });
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);

  const stockItems = getStockItems(products, categories, movements);

  const filteredProducts = useMemo(() => {
    return stockItems.filter((s) => {
      const matchName = s.product.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat ? s.product.categoryId === filterCat : true;
      return matchName && matchCat;
    });
  }, [stockItems, search, filterCat]);

  // Product handlers
  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', categoryId: categories[0]?.id ?? '', minStock: '', unit: 'Unidade', description: '' });
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, categoryId: p.categoryId, minStock: String(p.minStock), unit: p.unit, description: p.description ?? '' });
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!productForm.name.trim() || !productForm.categoryId || !productForm.minStock) {
      showToast('error', 'Preencha todos os campos obrigatórios.');
      return;
    }
    const data = {
      name: productForm.name.trim(),
      categoryId: productForm.categoryId,
      minStock: Number(productForm.minStock),
      unit: productForm.unit,
      description: productForm.description,
    };
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
      showToast('success', 'Produto atualizado com sucesso!');
    } else {
      await addProduct(data);
      showToast('success', 'Produto criado com sucesso!');
    }
    setShowProductModal(false);
  };

  const doDeleteProduct = async (p: Product) => {
    const result = await deleteProduct(p.id);
    if (result.success) {
      showToast('success', 'Produto excluído.');
    } else {
      showToast('error', result.error ?? 'Erro ao excluir produto.');
    }
    setConfirmDeleteProduct(null);
  };

  // Category handlers
  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', description: '' });
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({ name: c.name, description: c.description });
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) {
      showToast('error', 'Informe o nome da categoria.');
      return;
    }
    if (editingCat) {
      await updateCategory(editingCat.id, { name: catForm.name, description: catForm.description });
      showToast('success', 'Categoria atualizada!');
    } else {
      await addCategory({ name: catForm.name, description: catForm.description });
      showToast('success', 'Categoria criada!');
    }
    setEditingCat(null);
    setCatForm({ name: '', description: '' });
  };

  const doDeleteCat = async (c: Category) => {
    const result = await deleteCategory(c.id);
    if (result.success) {
      showToast('success', 'Categoria excluída.');
    } else {
      showToast('error', result.error ?? 'Erro ao excluir categoria.');
    }
    setConfirmDeleteCat(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h2 className="page-title">Produtos & Categorias</h2>
          <p className="page-desc">Gerencie todos os produtos e categorias do estoque</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setShowCatModal(true)}>
            <Tag size={16} /> Gerenciar Categorias
          </button>
          <button className="btn btn-success" onClick={openNewProduct}>
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <span className="search-bar-icon"><Search size={16} /></span>
          <input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: '180px' }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Tabela de produtos */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Estoque Atual / Mínimo</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Package size={40} /><div className="empty-state-text">Nenhum produto encontrado</div></div></td></tr>
              ) : (
                filteredProducts.map(({ product, category, currentStock, isLow }) => (
                  <tr key={product.id} className={isLow ? 'row-danger' : ''}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{product.name}</div>
                      {product.description && <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{product.description}</div>}
                    </td>
                    <td><span className="badge badge-primary">{category?.name ?? '—'}</span></td>
                    <td style={{ color: 'var(--neutral-500)' }}>{product.unit}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: isLow ? 'var(--danger-600)' : 'var(--success-600)' }}>{currentStock}</span>
                      <span style={{ color: 'var(--neutral-400)' }}> / {product.minStock}</span>
                    </td>
                    <td>
                      {isLow
                        ? <span className="badge badge-danger"><AlertTriangle size={11} /> Baixo</span>
                        : <span className="badge badge-success">✓ Normal</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEditProduct(product)} title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setConfirmDeleteProduct(product)} title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Produto */}
      {showProductModal && (
        <Modal
          title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
          onClose={() => setShowProductModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowProductModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveProduct}>
                {editingProduct ? 'Salvar alterações' : 'Criar produto'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nome do Produto <span>*</span></label>
            <input className="form-input" placeholder="Ex: Arroz 5kg" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoria <span>*</span></label>
              <select className="form-select" value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
                <option value="">Selecione...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unidade de Medida <span>*</span></label>
              <select 
                className="form-select" 
                value={productForm.unit} 
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
              >
                <option value="Unidade">Unidade</option>
                <option value="Kg">Kg</option>
                <option value="Litros">Litros</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Estoque Mínimo <span>*</span></label>
            <input className="form-input" type="number" min="0" placeholder="Ex: 20" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" placeholder="Descrição opcional" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* Modal de Categorias */}
      {showCatModal && (
        <Modal title="Gerenciar Categorias" onClose={() => { setShowCatModal(false); setEditingCat(null); }}>
          {/* Form nova/editar cat */}
          <div style={{ background: 'var(--neutral-50)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--neutral-700)' }}>
              {editingCat ? '✏️ Editar categoria' : '+ Nova categoria'}
            </div>
            <input className="form-input" placeholder="Nome da categoria *" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            <input className="form-input" placeholder="Descrição (opcional)" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={saveCat}>
                {editingCat ? 'Salvar' : 'Criar'}
              </button>
              {editingCat && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingCat(null); setCatForm({ name: '', description: '' }); }}>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Lista */}
          {categories.length === 0 ? (
            <div className="empty-state"><Tag size={32} /><div className="empty-state-text">Nenhuma categoria criada</div></div>
          ) : (
            categories.map((c) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', borderRadius: '8px',
                border: '1px solid var(--neutral-200)',
                marginBottom: '0.5rem',
                background: editingCat?.id === c.id ? 'var(--primary-50)' : 'white',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{c.description || 'Sem descrição'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEditCat(c)}><Edit2 size={13} /></button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => setConfirmDeleteCat(c)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))
          )}
        </Modal>
      )}

      {/* Confirm dialogs */}
      {confirmDeleteProduct && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir o produto "${confirmDeleteProduct.name}"? Esta ação não poderá ser desfeita.`}
          onConfirm={() => doDeleteProduct(confirmDeleteProduct)}
          onCancel={() => setConfirmDeleteProduct(null)}
        />
      )}
      {confirmDeleteCat && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir a categoria "${confirmDeleteCat.name}"? Categorias com produtos vinculados não podem ser excluídas.`}
          onConfirm={() => doDeleteCat(confirmDeleteCat)}
          onCancel={() => setConfirmDeleteCat(null)}
        />
      )}
    </div>
  );
}
