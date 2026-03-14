-- Corrigir constraints para permitir a exclusão de usuários (auth.users)
-- Ao excluir um usuário, as referências ao seu perfil serão configuradas para NULL ou CASCADE

-- 1. Referências na tabela profiles (auto-referência)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_invited_by_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_invited_by_fkey 
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Referências em categorias
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_created_by_fkey;
ALTER TABLE public.categories ADD CONSTRAINT categories_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Referências em produtos
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_created_by_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Referências em movimentações
ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_created_by_fkey;
ALTER TABLE public.movements ADD CONSTRAINT movements_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. Referências em configurações
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_updated_by_fkey;
ALTER TABLE public.settings ADD CONSTRAINT settings_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Referências em convites
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_invited_by_fkey 
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_used_by_fkey;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_used_by_fkey 
  FOREIGN KEY (used_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
