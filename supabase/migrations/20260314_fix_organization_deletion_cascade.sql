-- Habilitar CASCADE para a exclusão de organizações
-- Isso garante que ao excluir um usuário (dono da org), todos os dados da empresa sejam apagados também

-- 1. Categorias
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_organization_id_fkey;
ALTER TABLE public.categories ADD CONSTRAINT categories_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Produtos
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_organization_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 3. Movimentações
ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_organization_id_fkey;
ALTER TABLE public.movements ADD CONSTRAINT movements_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Configurações
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_organization_id_fkey;
ALTER TABLE public.settings ADD CONSTRAINT settings_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Convites
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_organization_id_fkey;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
