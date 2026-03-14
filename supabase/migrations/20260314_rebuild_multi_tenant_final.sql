-- RECONSTRUÇÃO TOTAL DO MULTI-TENANCY
-- Este script limpa dados antigos e recria as regras de isolamento

-- 1. Limpeza de Triggers e Funções Antigas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_user_organization_id(uuid);

-- 3. Função para obter a organização do usuário logado (usada nas políticas RLS)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Nova Função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  user_name text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Empresa');
  
  -- 1. Criar a Organização
  INSERT INTO public.organizations (name, owner_id)
  VALUES (user_name, NEW.id)
  RETURNING id INTO new_org_id;

  -- 2. Criar o Perfil vinculado
  INSERT INTO public.profiles (id, name, role, organization_id, status)
  VALUES (
    NEW.id,
    user_name,
    'admin',
    new_org_id,
    'active'
  );

  -- 3. Criar Settings padrão
  INSERT INTO public.settings (organization_id, alert_enabled, min_interval_hours)
  VALUES (new_org_id, false, 24);

  RETURN NEW;
END;
$$;

-- 5. Recriar Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Configuração de RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS
DROP POLICY IF EXISTS "Profiles isolation" ON public.profiles;
CREATE POLICY "Profiles isolation" ON public.profiles 
  FOR ALL USING (id = auth.uid() OR organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Categories isolation" ON public.categories;
CREATE POLICY "Categories isolation" ON public.categories 
  FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Products isolation" ON public.products;
CREATE POLICY "Products isolation" ON public.products 
  FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Movements isolation" ON public.movements;
CREATE POLICY "Movements isolation" ON public.movements 
  FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Settings isolation" ON public.settings;
CREATE POLICY "Settings isolation" ON public.settings 
  FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Invitations isolation" ON public.invitations;
CREATE POLICY "Invitations isolation" ON public.invitations 
  FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Organizations isolation" ON public.organizations;
CREATE POLICY "Organizations isolation" ON public.organizations 
  FOR ALL USING (id = get_my_org_id());
