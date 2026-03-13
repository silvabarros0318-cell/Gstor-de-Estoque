import type { Category, Movement, Product, Settings, User, Invitation, StockItem } from '../types';

// ===== USUÁRIOS INICIAIS =====
export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-001',
    name: 'Administrador',
    email: 'admin@gmail.com',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    failedLoginAttempts: 0,
  },
  {
    id: 'user-demo-002',
    name: 'Demo Operador',
    email: 'demo@gmail.com',
    role: 'operator',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    failedLoginAttempts: 0,
  },
];

// Senhas em "hash" simplificado (em produção seria bcrypt)
export const USER_PASSWORDS: Record<string, string> = {
  'admin@gmail.com': 'admin',
  'demo@gmail.com': 'demo',
};

// ===== CATEGORIAS INICIAIS =====
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-001', name: 'Alimentos', description: 'Produtos alimentícios e perecíveis', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-002', name: 'Bebidas', description: 'Bebidas em geral', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-003', name: 'Limpeza', description: 'Produtos de higiene e limpeza', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-004', name: 'Eletrônicos', description: 'Equipamentos e eletrônicos', createdAt: '2026-01-01T00:00:00.000Z' },
];

// ===== PRODUTOS INICIAIS =====
export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-001', name: 'Arroz 5kg', categoryId: 'cat-001', minStock: 20, unit: 'Pacotes', createdAt: '2026-01-15T10:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'prod-002', name: 'Cerveja Long Neck', categoryId: 'cat-002', minStock: 10, unit: 'Unid.', createdAt: '2026-01-15T10:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'prod-003', name: 'Papel Toalha', categoryId: 'cat-003', minStock: 20, unit: 'Rolos', createdAt: '2026-01-15T10:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'prod-004', name: 'Feijão Preto 1kg', categoryId: 'cat-001', minStock: 15, unit: 'Pacotes', createdAt: '2026-02-01T08:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'prod-005', name: 'Macarrão Espaguete', categoryId: 'cat-001', minStock: 25, unit: 'Pacotes', createdAt: '2026-02-01T08:00:00.000Z', createdBy: 'user-admin-001' },
];

// ===== MOVIMENTAÇÕES INICIAIS =====
export const INITIAL_MOVEMENTS: Movement[] = [
  { id: 'mov-001', productId: 'prod-001', type: 'entrada', quantity: 100, observation: 'Entrada inicial', createdAt: '2026-01-20T09:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'mov-002', productId: 'prod-002', type: 'entrada', quantity: 60, observation: 'Entrada inicial', createdAt: '2026-01-20T09:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'mov-003', productId: 'prod-003', type: 'entrada', quantity: 120, observation: 'Entrada inicial', createdAt: '2026-01-20T09:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'mov-004', productId: 'prod-004', type: 'entrada', quantity: 80, observation: 'Entrada inicial', createdAt: '2026-02-05T10:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'mov-005', productId: 'prod-005', type: 'entrada', quantity: 50, observation: 'Entrada inicial', createdAt: '2026-02-05T10:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'mov-006', productId: 'prod-001', type: 'saida', quantity: 85, observation: 'Venda ao cliente A', createdAt: '2026-02-10T14:00:00.000Z', createdBy: 'user-demo-002' },
  { id: 'mov-007', productId: 'prod-002', type: 'saida', quantity: 10, observation: 'Venda ao cliente B', createdAt: '2026-03-11T11:00:00.000Z', createdBy: 'user-demo-002' },
  { id: 'mov-008', productId: 'prod-001', type: 'entrada', quantity: 50, observation: 'Reposição urgente', createdAt: '2026-03-12T08:00:00.000Z', createdBy: 'user-admin-001' },
  { id: 'mov-009', productId: 'prod-003', type: 'saida', quantity: 30, observation: 'Distribuição interna', createdAt: '2026-03-12T09:00:00.000Z', createdBy: 'user-demo-002' },
  { id: 'mov-010', productId: 'prod-004', type: 'saida', quantity: 72, observation: 'Venda grande lote', createdAt: '2026-03-12T16:00:00.000Z', createdBy: 'user-demo-002' },
];

// ===== SETTINGS INICIAIS =====
export const INITIAL_SETTINGS: Settings = {
  alertConfig: {
    enabled: true,
    whatsappNumber: '+244 912 345 678',
    minIntervalHours: 24,
    lastAlertSent: '',
  },
};

// ===== CONVITES =====
export const INITIAL_INVITATIONS: Invitation[] = [];

// ===== UTILITÁRIO: Calcula estoque atual =====
export function calculateStock(productId: string, movements: Movement[]): number {
  return movements
    .filter((m) => m.productId === productId)
    .reduce((total, m) => {
      if (m.type === 'entrada') return total + m.quantity;
      if (m.type === 'saida') return total - m.quantity;
      return total; // ajuste: depende do contexto
    }, 0);
}

export function getStockItems(
  products: Product[],
  categories: Category[],
  movements: Movement[]
): StockItem[] {
  return products.map((product) => {
    const category = categories.find((c) => c.id === product.categoryId)!;
    const currentStock = calculateStock(product.id, movements);
    return {
      product,
      category,
      currentStock,
      isLow: currentStock <= product.minStock,
    };
  });
}
