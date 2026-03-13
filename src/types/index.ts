// Tipos globais da aplicação

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  invitedBy?: string;
  status: 'active' | 'pending' | 'blocked';
  failedLoginAttempts: number;
  blockedUntil?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  minStock: number;
  unit: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export type MovementType = 'entrada' | 'saida' | 'ajuste';

export interface Movement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  observation?: string;
  createdAt: string;
  createdBy: string;
}

export interface StockItem {
  product: Product;
  category: Category;
  currentStock: number;
  isLow: boolean;
}

export interface AlertConfig {
  enabled: boolean;
  whatsappNumber: string;
  minIntervalHours: number;
  lastAlertSent: Record<string, string>; // productId -> ISO date
}

export interface Settings {
  alertConfig: AlertConfig;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}
