import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { format } from 'date-fns';
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
  DailyClosing,
} from '../types';

interface AppState {
  sessionLoading: boolean; // aguardando verificação inicial de sessão
  loading: boolean;        // aguardando carregamento dos dados do usuário
  currentUser: User | null;
  session: Session | null;
  users: User[];
  categories: Category[];
  products: Product[];
  movements: Movement[];
  settings: Settings;
  invitations: Invitation[];
  dailyClosings: DailyClosing[];
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
  acceptInvitation: (token: string, newPassword?: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
  getProductStock: (productId: string) => number;
  deleteInvitation: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  closeDay: () => Promise<{ success: boolean; error?: string; closing?: DailyClosing }>;
  cancelMovement: (id: string) => Promise<{ success: boolean; error?: string }>;
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

const INITIAL_STATE: AppState = {
  sessionLoading: true,
  loading: false,
  currentUser: null,
  session: null,
  users: [],
  categories: [],
  products: [],
  movements: [],
  settings: DEFAULT_SETTINGS,
  invitations: [],
  dailyClosings: [],
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  const set = (updater: (prev: AppState) => AppState) => {
    setState((prev) => updater(prev));
  };

  const loadAllData = async (session: Session) => {
    const userId = session.user.id;
    try {
      set(prev => ({ ...prev, loading: true, session }));
      console.log('[Auth] Carregando dados para:', session.user.email);

      // Carregar perfil do usuário logado
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error('[Auth] Erro ao carregar perfil:', profileError?.message);
        set(prev => ({ ...prev, loading: false, sessionLoading: false }));
        return;
      }

      const orgId = userProfile.organization_id;
      console.log('[Auth] Organization ID:', orgId);

      // Carregar todos os dados da organização em paralelo
      const [
        { data: profData },
        { data: catData },
        { data: prodData },
        { data: movData },
        { data: setData },
        { data: invData },
        { data: closingData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('organization_id', orgId),
        supabase.from('categories').select('*').eq('organization_id', orgId),
        supabase.from('products').select('*').eq('organization_id', orgId),
        supabase.from('movements').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('organization_id', orgId).single(),
        supabase.from('invitations').select('*').eq('organization_id', orgId),
        supabase.from('daily_closings').select('*').eq('organization_id', orgId).order('date', { ascending: false }),
      ]);

      // Mapear current user
      const mappedCurrentUser: User = {
        id: userProfile.id,
        name: userProfile.name,
        email: session.user.email || '',
        role: userProfile.role,
        status: userProfile.status,
        createdAt: userProfile.created_at,
        failedLoginAttempts: 0,
        organizationId: userProfile.organization_id,
      };

      // Mapear todos os profiles da organização
      const mappedUsers: User[] = (profData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.id === userId ? session.user.email || '' : `user@${p.id.substring(0, 4)}.com`,
        role: p.role,
        status: p.status,
        createdAt: p.created_at,
        failedLoginAttempts: 0,
        organizationId: p.organization_id,
      }));

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
        costPrice: p.cost_price ? Number(p.cost_price) : 0,
        salePrice: p.sale_price ? Number(p.sale_price) : 0,
        createdAt: p.created_at,
        createdBy: p.created_by,
      }));

      const mappedMovements: Movement[] = (movData || []).map((m: any) => ({
        id: m.id,
        productId: m.product_id,
        type: m.type as MovementType,
        quantity: m.quantity,
        observation: m.observation,
        unitCost: m.unit_cost ? Number(m.unit_cost) : 0,
        unitPrice: m.unit_price ? Number(m.unit_price) : 0,
        totalCost: m.total_cost ? Number(m.total_cost) : 0,
        totalRevenue: m.total_revenue ? Number(m.total_revenue) : 0,
        profit: m.profit ? Number(m.profit) : 0,
        closed: !!m.closed,
        createdAt: m.created_at,
        createdBy: m.created_by,
      }));

      let mappedSettings = DEFAULT_SETTINGS;
      if (setData) {
        mappedSettings = {
          alertConfig: {
            enabled: !!setData.alert_enabled,
            whatsappNumber: setData.whatsapp_number || '',
            minIntervalHours: Number(setData.min_interval_hours) || 24,
            lastAlertSent: setData.last_alert_sent || '',
          }
        };
      }

      const mappedInvitations: Invitation[] = (invData || []).map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role as UserRole,
        token: i.token,
        invitedBy: i.invited_by,
        createdAt: i.created_at,
        expiresAt: i.expires_at,
        used: !!i.used,
      }));

      const mappedDailyClosings: DailyClosing[] = (closingData || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        date: c.date,
        totalRevenue: Number(c.total_revenue),
        totalCost: Number(c.total_cost),
        totalProfit: Number(c.total_profit),
        totalProductsSold: Number(c.total_products_sold),
        createdAt: c.created_at,
      }));

      set(prev => ({
        ...prev,
        sessionLoading: false,
        loading: false,
        currentUser: mappedCurrentUser,
        users: mappedUsers,
        categories: mappedCategories,
        products: mappedProducts,
        movements: mappedMovements,
        settings: mappedSettings,
        invitations: mappedInvitations,
        dailyClosings: mappedDailyClosings,
      }));

      console.log('[Auth] Dados carregados com sucesso!');
    } catch (e) {
      console.error('[Auth] Erro em loadAllData:', e);
      set(prev => ({ ...prev, sessionLoading: false, loading: false }));
    }
  };

  useEffect(() => {
    // Verificar sessão existente ao inicializar
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await loadAllData(session);
        } else {
          // Sem sessão: liberar sessionLoading para que as rotas possam redirecionar
          set(prev => ({ ...prev, sessionLoading: false, loading: false }));
        }
      } catch (e) {
        console.error('[Auth] Erro ao inicializar sessão:', e);
        set(prev => ({ ...prev, sessionLoading: false, loading: false }));
      }
    };

    initAuth();

    // Listener para mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Evento:', event);
      if (event === 'SIGNED_IN' && session) {
        // Dados já carregados pelo login() — não recarregar desnecessariamente
        // exceto se currentUser não estiver definido (ex: reload da página)
        if (!session) return;
      } else if (event === 'SIGNED_OUT') {
        set(() => ({
          ...INITIAL_STATE,
          sessionLoading: false,
          loading: false,
        }));
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Apenas atualizar a sessão sem recarregar todos os dados
        set(prev => ({ ...prev, session }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      set(prev => ({ ...prev, loading: true }));
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        set(prev => ({ ...prev, loading: false }));
        return { success: false, error: error.message };
      }

      if (!data.session) {
        set(prev => ({ ...prev, loading: false }));
        return { success: false, error: 'Sessão não iniciada. Tente novamente.' };
      }

      // Carregar todos os dados antes de sinalizar sucesso
      await loadAllData(data.session);
      return { success: true };
    } catch (err: any) {
      set(prev => ({ ...prev, loading: false }));
      return { success: false, error: err.message || 'Erro ao realizar login.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    set(() => ({
      ...INITIAL_STATE,
      sessionLoading: false,
      loading: false,
    }));
  };

  const addCategory = async (data: Omit<Category, 'id' | 'createdAt'>) => {
    const { data: newCat } = await supabase.from('categories').insert({
      name: data.name,
      description: data.description,
      organization_id: state.currentUser?.organizationId,
      created_by: state.currentUser?.id,
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
      cost_price: data.costPrice,
      sale_price: data.salePrice,
      organization_id: state.currentUser?.organizationId,
      created_by: state.currentUser?.id,
    }).select().single();

    if (newProd) {
      set(prev => ({
        ...prev, products: [...prev.products, {
          id: newProd.id, name: newProd.name, categoryId: newProd.category_id,
          minStock: newProd.min_stock, unit: newProd.unit, description: newProd.description,
          costPrice: newProd.cost_price ? Number(newProd.cost_price) : 0,
          salePrice: newProd.sale_price ? Number(newProd.sale_price) : 0,
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
      cost_price: data.costPrice,
      sale_price: data.salePrice,
    }).eq('id', id);
    set(prev => ({
      ...prev, products: prev.products.map(p => p.id === id ? { ...p, ...data } : p)
    }));
  };

  const deleteProduct = async (id: string) => {
    const hasMovements = state.movements.some(m => m.productId === id);
    if (hasMovements) return { success: false, error: 'Produto possui movimentações e não pode ser excluído.' };
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    set(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
    return { success: true };
  };

  const addMovement = async ({ productId, type, quantity, observation }: any) => {
    if (type === 'saida') {
      const { data: stockView } = await supabase
        .from('stock_current')
        .select('current_stock')
        .eq('product_id', productId)
        .single();
      const currentStock = stockView?.current_stock || 0;
      if (quantity > currentStock) {
        return { success: false, error: `Estoque insuficiente. Disponível: ${currentStock} unidades.` };
      }
    }

    let unitCost, unitPrice, totalCost, totalRevenue, profit;
    
    if (type === 'saida') {
      const prod = state.products.find(p => p.id === productId);
      unitCost = prod?.costPrice || 0;
      unitPrice = prod?.salePrice || 0;
      totalCost = unitCost * quantity;
      totalRevenue = unitPrice * quantity;
      profit = totalRevenue - totalCost;
    }

    const { data: newMov, error } = await supabase.from('movements').insert({
      product_id: productId,
      type,
      quantity,
      observation,
      unit_cost: unitCost,
      unit_price: unitPrice,
      total_cost: totalCost,
      total_revenue: totalRevenue,
      profit,
      created_by: state.currentUser?.id,
      organization_id: state.currentUser?.organizationId,
    }).select().single();

    if (error) return { success: false, error: error.message };

    set(prev => ({
      ...prev, movements: [{
        id: newMov.id, productId: newMov.product_id, type: newMov.type as MovementType,
        quantity: newMov.quantity, observation: newMov.observation,
        unitCost: newMov.unit_cost ? Number(newMov.unit_cost) : 0,
        unitPrice: newMov.unit_price ? Number(newMov.unit_price) : 0,
        totalCost: newMov.total_cost ? Number(newMov.total_cost) : 0,
        totalRevenue: newMov.total_revenue ? Number(newMov.total_revenue) : 0,
        profit: newMov.profit ? Number(newMov.profit) : 0,
        closed: !!newMov.closed,
        createdAt: newMov.created_at, createdBy: newMov.created_by
      }, ...prev.movements]
    }));
    return { success: true };
  };

  const updateSettings = async (data: Partial<Settings>) => {
    const updates: any = { organization_id: state.currentUser?.organizationId };
    if (data.alertConfig) {
      if (data.alertConfig.enabled !== undefined) updates.alert_enabled = data.alertConfig.enabled;
      if (data.alertConfig.whatsappNumber !== undefined) updates.whatsapp_number = data.alertConfig.whatsappNumber;
      if (data.alertConfig.minIntervalHours !== undefined) updates.min_interval_hours = data.alertConfig.minIntervalHours;
      if (data.alertConfig.lastAlertSent !== undefined) updates.last_alert_sent = data.alertConfig.lastAlertSent;
    }
    await supabase.from('settings').upsert(updates, { onConflict: 'organization_id' });
    set(prev => ({
      ...prev, settings: { alertConfig: { ...prev.settings.alertConfig, ...(data.alertConfig || {}) } }
    }));
  };

  const inviteUser = async (email: string, role: UserRole) => {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email,
        role,
        organizationId: state.currentUser?.organizationId
      }
    });

    if (error) {
      let errorMessage = error.message;
      try {
        const errJson = await error.context?.json();
        if (errJson?.error) errorMessage = errJson.error;
      } catch (e) { /* fallback */ }
      return { success: false, error: errorMessage };
    }

    await supabase.from('invitations').insert({
      email,
      role,
      organization_id: state.currentUser?.organizationId,
      invited_by: state.currentUser?.id,
    });

    const { data: invData } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', state.currentUser?.organizationId);

    if (invData) {
      set(prev => ({
        ...prev, invitations: invData.map((i: any) => ({
          id: i.id, email: i.email, role: i.role, token: i.token,
          invitedBy: i.invited_by, createdAt: i.created_at, expiresAt: i.expires_at, used: !!i.used
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

  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      set(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao deletar usuário.' };
    }
  };

  const acceptInvitation = async (_token: string, _newPassword?: string) => {
    return { success: false, error: 'Funcionalidade disponível na versão completa.' };
  };

  const updatePassword = async (password: string) => {
    try {
      const { data: authData, error: authErr } = await supabase.auth.updateUser({ password });
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Usuário não encontrado.');

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      // Update local state
      setState(prev => prev.currentUser ? {
        ...prev,
        currentUser: { ...prev.currentUser, status: 'active' }
      } : prev);

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao definir senha:', error);
      return { success: false, error: error.message };
    }
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

  const closeDay = async (): Promise<{ success: boolean; error?: string; closing?: DailyClosing }> => {
    try {
      const todayDate = new Date();
      // Ajuste de fuso horário local para garantir a data correta no string ISO
      todayDate.setMinutes(todayDate.getMinutes() - todayDate.getTimezoneOffset());
      const today = todayDate.toISOString().split('T')[0];

      const isAlreadyClosed = state.dailyClosings.some(c => c.date === today);
      if (isAlreadyClosed) {
        return { success: false, error: `O caixa do dia ${format(new Date(), 'dd/MM/yyyy')} já foi fechado.` };
      }

      const movementsOfDay = state.movements.filter(m => {
        if (m.closed) return false;
        
        const movDate = new Date(m.createdAt);
        movDate.setMinutes(movDate.getMinutes() - movDate.getTimezoneOffset());
        const dateStr = movDate.toISOString().split('T')[0];
        
        return dateStr === today;
      });

      const salesToClose = movementsOfDay.filter(m => m.type === 'saida');

      if (salesToClose.length === 0) {
        return { success: false, error: 'Não há vendas abertas registradas hoje para fechar o caixa.' };
      }

      const totalRevenue = salesToClose.reduce((acc, current) => acc + (current.totalRevenue || 0), 0);
      const totalCost = salesToClose.reduce((acc, current) => acc + (current.totalCost || 0), 0);
      const totalProfit = salesToClose.reduce((acc, current) => acc + (current.profit || 0), 0);
      const totalProductsSold = salesToClose.reduce((acc, current) => acc + current.quantity, 0);

      const { data: closingData, error: closingError } = await supabase.from('daily_closings').insert({
        organization_id: state.currentUser?.organizationId,
        date: today,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        total_products_sold: totalProductsSold
      }).select().single();

      if (closingError) throw closingError;

      const movementIds = movementsOfDay.map(m => m.id);
      
      const { error: updateError } = await supabase.from('movements')
        .update({ closed: true })
        .in('id', movementIds);
      
      if (updateError) throw updateError;

      const newClosing: DailyClosing = {
        id: closingData.id,
        organizationId: closingData.organization_id,
        date: closingData.date,
        totalRevenue: Number(closingData.total_revenue),
        totalCost: Number(closingData.total_cost),
        totalProfit: Number(closingData.total_profit),
        totalProductsSold: Number(closingData.total_products_sold),
        createdAt: closingData.created_at,
      };

      set(prev => ({
        ...prev,
        dailyClosings: [newClosing, ...prev.dailyClosings],
        movements: prev.movements.map(m => movementIds.includes(m.id) ? { ...m, closed: true } : m)
      }));

      return { success: true, closing: newClosing };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao fechar o dia.' };
    }
  };

  const cancelMovement = async (id: string) => {
    try {
      const movement = state.movements.find((m) => m.id === id);
      if (!movement) return { success: false, error: 'Movimentação não encontrada.' };

      if (movement.closed) {
        return { success: false, error: 'Esta movimentação já foi incluída em um fechamento e não pode ser cancelada.' };
      }

      const todayDate = new Date();
      todayDate.setMinutes(todayDate.getMinutes() - todayDate.getTimezoneOffset());
      const today = todayDate.toISOString().split('T')[0];

      const movDate = new Date(movement.createdAt);
      movDate.setMinutes(movDate.getMinutes() - movDate.getTimezoneOffset());
      const movDay = movDate.toISOString().split('T')[0];

      if (today !== movDay) {
        return { success: false, error: 'Só é permitido cancelar movimentações do dia atual.' };
      }

      const isOwner = movement.createdBy === state.currentUser?.id;
      const isAdmin = state.currentUser?.role === 'admin';

      if (!isAdmin && !isOwner) {
        return { success: false, error: 'Você só pode cancelar suas próprias movimentações.' };
      }

      const { error } = await supabase.from('movements').delete().eq('id', id);
      if (error) throw error;

      set(prev => ({ ...prev, movements: prev.movements.filter(m => m.id !== id) }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao cancelar movimentação.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        ...state, login, logout, addCategory, updateCategory, deleteCategory,
        addProduct, updateProduct, deleteProduct, addMovement, updateSettings,
        inviteUser, acceptInvitation, updatePassword, updateUserStatus, getProductStock,
        deleteInvitation, deleteUser, closeDay, cancelMovement
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
