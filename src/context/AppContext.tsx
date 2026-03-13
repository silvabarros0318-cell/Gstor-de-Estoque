import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Category,
  Invitation,
  Movement,
  MovementType,
  Product,
  Settings,
  User,
  UserRole,
} from '../types';

interface AppState {
  isInitializing: boolean;
  currentUser: User | null;
  users: User[];
  categories: Category[];
  products: Product[];
  movements: Movement[];
  settings: Settings;
  invitations: Invitation[];
}

interface AppContextValue extends AppState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  addProduct: (data: Omit<Product, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  addMovement: (data: {
    productId: string;
    type: MovementType;
    quantity: number;
    observation?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
  inviteUser: (email: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  acceptInvitation: (token: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
  getProductStock: (productId: string) => number;
  deleteInvitation: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_SETTINGS: Settings = {
  alertConfig: {
    enabled: false,
    whatsappNumber: '',
    minIntervalHours: 24,
    lastAlertSent: '',
  }
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    isInitializing: true,
    currentUser: null,
    users: [],
    categories: [],
    products: [],
    movements: [],
    settings: DEFAULT_SETTINGS,
    invitations: [],
  });

  const set = (updater: (prev: AppState) => AppState) => {
    setState((prev) => updater(prev));
  };

  const loadAllData = async (userEmail: string) => {
    try {
      const [
        { data: profData },
        { data: catData },
        { data: prodData },
        { data: movData },
        { data: setData },
        { data: invData },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('products').select('*'),
        supabase.from('movements').select('*'),
        supabase.from('settings').select('*').limit(1).maybeSingle(),
        supabase.from('invitations').select('*'),
      ]);

      const me = profData?.find(p => p.id === (supabase.auth.getSession().then(s => s.data.session?.user.id)));
      
      const mappedProfiles: User[] = (profData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.id === me?.id ? userEmail : `user-${p.id.substring(0,4)}@mail.com`, // We don't have access to auth.users email easily except for ourselves
        role: p.role,
        status: p.status,
        createdAt: p.created_at,
        failedLoginAttempts: 0,
      }));

      // Achar o email real do auth current_user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const mappedCurrentUser = authUser && mappedProfiles.find(u => u.id === authUser.id)
        ? { ...mappedProfiles.find(u => u.id === authUser.id)!, email: authUser.email || userEmail }
        : null;

      const mappedCategories: Category[] = (catData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        createdAt: c.created_at,
      }));

      const mappedProducts: Product[] = (prodData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        categoryId: p.category_id,
        minStock: p.min_stock,
        unit: p.unit,
        description: p.description,
        createdAt: p.created_at,
        createdBy: p.created_by,
      }));

      const mappedMovements: Movement[] = (movData || []).map((m: any) => ({
        id: m.id,
        productId: m.product_id,
        type: m.type,
        quantity: m.quantity,
        observation: m.observation,
        createdAt: m.created_at,
        createdBy: m.created_by,
      }));

      let mappedSettings = DEFAULT_SETTINGS;
      if (setData) {
        mappedSettings = {
          alertConfig: {
            enabled: setData.alert_enabled,
            whatsappNumber: setData.whatsapp_number || '',
            minIntervalHours: setData.min_interval_hours,
            lastAlertSent: setData.last_alert_sent || ''
          }
        };
      }

      const mappedInvitations: Invitation[] = (invData || []).map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        invitedBy: i.invited_by,
        createdAt: i.created_at,
        expiresAt: i.expires_at,
        used: i.used,
      }));

      set(prev => ({
        ...prev,
        currentUser: mappedCurrentUser,
        users: mappedProfiles,
        categories: mappedCategories,
        products: mappedProducts,
        movements: mappedMovements,
        settings: mappedSettings,
        invitations: mappedInvitations,
        isInitializing: false,
      }));

    } catch (e) {
      console.error('Error loading data:', e);
      set(prev => ({ ...prev, isInitializing: false }));
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        loadAllData(session.user.email || '');
      } else {
        set(prev => ({ ...prev, isInitializing: false }));
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadAllData(session.user.email || '');
      } else {
        set(prev => ({
          ...prev, currentUser: null, isInitializing: false,
          categories: [], products: [], movements: [], invitations: [], users: []
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const addCategory = async (data: Omit<Category, 'id' | 'createdAt'>) => {
    const { data: newCat, error } = await supabase.from('categories').insert({
      name: data.name,
      description: data.description,
    }).select().single();
    
    if (newCat) {
      set(prev => ({
        ...prev, categories: [...prev.categories, {
          id: newCat.id, name: newCat.name, description: newCat.description || '', createdAt: newCat.created_at
        }]
      }));
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    await supabase.from('categories').update({
      name: data.name, description: data.description
    }).eq('id', id);
    set(prev => ({
      ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...data } : c)
    }));
  };

  const deleteCategory = async (id: string) => {
    const hasProducts = state.products.some(p => p.categoryId === id);
    if (hasProducts) return { success: false, error: 'Categoria possui produtos vinculados e não pode ser excluída.' };
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    set(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
    return { success: true };
  };

  const addProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'createdBy'>) => {
    const { data: newProd } = await supabase.from('products').insert({
      name: data.name,
      category_id: data.categoryId,
      min_stock: data.minStock,
      unit: data.unit,
      description: data.description,
    }).select().single();

    if (newProd) {
      set(prev => ({
        ...prev, products: [...prev.products, {
          id: newProd.id, name: newProd.name, categoryId: newProd.category_id,
          minStock: newProd.min_stock, unit: newProd.unit, description: newProd.description,
          createdAt: newProd.created_at, createdBy: newProd.created_by
        }]
      }));
    }
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    await supabase.from('products').update({
      name: data.name,
      category_id: data.categoryId,
      min_stock: data.minStock,
      unit: data.unit,
      description: data.description,
    }).eq('id', id);
    set(prev => ({
      ...prev, products: prev.products.map(p => p.id === id ? { ...p, ...data } : p)
    }));
  };

  const deleteProduct = async (id: string) => {
    const hasMovements = state.movements.some(m => m.productId === id);
    if (hasMovements) return { success: false, error: 'Produto possui movimentações e não pode ser excluído. Registre um ajuste de estoque se necessário.' };
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const addMovement = async ({ productId, type, quantity, observation }: any) => {
    if (type === 'saida') {
      const { data: stockView } = await supabase.from('stock_current').select('current_stock').eq('product_id', productId).single();
      const currentStock = stockView?.current_stock || 0;
      if (quantity > currentStock) {
        return { success: false, error: `Estoque insuficiente. Disponível: ${currentStock} unidades.` };
      }
    }

    const { data: newMov, error } = await supabase.from('movements').insert({
      product_id: productId, 
      type, 
      quantity, 
      observation,
      created_by: state.currentUser?.id
    }).select().single();

    if (error) return { success: false, error: error.message };
    
    set(prev => ({
      ...prev, movements: [...prev.movements, {
        id: newMov.id, productId: newMov.product_id, type: newMov.type as any, quantity: newMov.quantity,
        observation: newMov.observation, createdAt: newMov.created_at, createdBy: newMov.created_by
      }]
    }));
    return { success: true };
  };

  const updateSettings = async (data: Partial<Settings>) => {
    const updates: any = {};
    if (data.alertConfig) {
      if (data.alertConfig.enabled !== undefined) updates.alert_enabled = data.alertConfig.enabled;
      if (data.alertConfig.whatsappNumber !== undefined) updates.whatsapp_number = data.alertConfig.whatsappNumber;
      if (data.alertConfig.minIntervalHours !== undefined) updates.min_interval_hours = data.alertConfig.minIntervalHours;
      if (data.alertConfig.lastAlertSent !== undefined) updates.last_alert_sent = data.alertConfig.lastAlertSent;
    }
    await supabase.from('settings').update(updates).eq('id', '00000000-0000-0000-0000-000000000001');
    set(prev => ({
      ...prev, settings: { alertConfig: { ...prev.settings.alertConfig, ...(data.alertConfig || {}) } }
    }));
  };

  const inviteUser = async (email: string, role: UserRole) => {
    // Chamando a Edge Function para enviar o e-mail oficial
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role }
    });

    if (error) {
      console.error('Edge Function Error:', error);
      // Tentamos extrair a mensagem de erro que vem no JSON da função
      let errorMessage = error.message;
      try {
        const errJson = await error.context?.json();
        if (errJson && errJson.error) errorMessage = errJson.error;
      } catch (e) {
        // Fallback para a mensagem original
      }
      return { success: false, error: errorMessage };
    }

    // Também inserimos na nossa tabela local para rastreamento no dashboard
    await supabase.from('invitations').insert({ email, role });

    // Recarregar convites
    const { data: invData } = await supabase.from('invitations').select('*');
    if (invData) {
      set(prev => ({
        ...prev, invitations: invData.map((i: any) => ({
          id: i.id, email: i.email, role: i.role, token: i.token, invitedBy: i.invited_by,
          createdAt: i.created_at, expiresAt: i.expires_at, used: i.used
        }))
      }));
    }
    return { success: true };
  };

  const deleteInvitation = async (id: string) => {
    const { error } = await supabase.from('invitations').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    set(prev => ({ ...prev, invitations: prev.invitations.filter(i => i.id !== id) }));
    return { success: true };
  };

  const acceptInvitation = async (token: string, name: string, password: string) => {
    return { success: false, error: 'Ação não implementada no MVP via Auth API.' };
  };

  const updateUserStatus = async (userId: string, status: User['status']) => {
    await supabase.from('profiles').update({ status }).eq('id', userId);
    set(prev => ({
      ...prev, users: prev.users.map(u => u.id === userId ? { ...u, status } : u)
    }));
  };

  const getProductStock = (productId: string) => {
    return state.movements
      .filter((m) => m.productId === productId)
      .reduce((acc, curr) => (curr.type === 'entrada' ? acc + curr.quantity : acc - curr.quantity), 0);
  };

  if (state.isInitializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', borderColor: 'var(--primary-600) transparent var(--primary-600) transparent', marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--neutral-800)', fontFamily: 'Inter', fontWeight: 600 }}>Carregando sistema...</h2>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        ...state, login, logout, addCategory, updateCategory, deleteCategory, addProduct, updateProduct,
        deleteProduct, addMovement, updateSettings, inviteUser, acceptInvitation, updateUserStatus, getProductStock,
        deleteInvitation
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
