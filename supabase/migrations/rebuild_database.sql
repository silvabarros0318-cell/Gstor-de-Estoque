-- ============================================================
-- REBUILD COMPLETO DO BANCO DE DADOS — GESTOR DE ESTOQUE
-- Execute este script inteiro no SQL Editor do Supabase
-- ATENÇÃO: Apaga e recria tudo do zero
-- ============================================================

-- ============================================================
-- 1. LIMPAR TUDO (ordem correta para evitar erros de FK)
-- ============================================================

-- Remover triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover funções
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_org_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_organization_id(uuid) CASCADE;

-- Remover tabelas (ordem inversa de dependência)
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.movements CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Remover views
DROP VIEW IF EXISTS public.stock_current CASCADE;

-- ============================================================
-- 2. CRIAR TABELAS
-- ============================================================

-- 2.1 Organizations
CREATE TABLE public.organizations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Profiles (espelho do auth.users, vinculado a uma organização)
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Usuário',
  role            TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'operator', 'viewer')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Categories
CREATE TABLE public.categories (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Products
CREATE TABLE public.products (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  min_stock       INTEGER NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'Unid.',
  description     TEXT DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Movements
CREATE TABLE public.movements (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id      UUID REFERENCES public.products(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste')),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  observation     TEXT DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Settings (uma linha por organização)
CREATE TABLE public.settings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id     UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_enabled       BOOLEAN DEFAULT FALSE,
  whatsapp_number     TEXT DEFAULT '',
  min_interval_hours  INTEGER DEFAULT 24,
  last_alert_sent     TIMESTAMPTZ,
  updated_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Invitations
CREATE TABLE public.invitations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  token           TEXT DEFAULT gen_random_uuid()::TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used            BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. VIEW DE ESTOQUE ATUAL
-- ============================================================
CREATE OR REPLACE VIEW public.stock_current AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.organization_id,
  COALESCE(
    SUM(
      CASE
        WHEN m.type = 'entrada' THEN m.quantity
        WHEN m.type = 'saida' THEN -m.quantity
        WHEN m.type = 'ajuste' THEN m.quantity
        ELSE 0
      END
    ), 0
  ) AS current_stock
FROM public.products p
LEFT JOIN public.movements m ON m.product_id = p.id
GROUP BY p.id, p.name, p.organization_id;

-- ============================================================
-- 4. FUNÇÃO get_my_org_id() — sem recursão, SECURITY DEFINER
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- 5. FUNÇÃO handle_new_user() — trigger de criação automática
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_name  TEXT;
BEGIN
  -- Extrair o nome do metadata do usuário (ou usar e-mail como fallback)
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Minha Empresa'
  );

  -- 1. Criar a organização
  INSERT INTO public.organizations (name, owner_id)
  VALUES (user_name, NEW.id)
  RETURNING id INTO new_org_id;

  -- 2. Criar o perfil do usuário como admin
  INSERT INTO public.profiles (id, name, role, status, organization_id)
  VALUES (NEW.id, user_name, 'admin', 'active', new_org_id);

  -- 3. Criar configurações padrão para a organização
  INSERT INTO public.settings (organization_id, alert_enabled, min_interval_hours)
  VALUES (new_org_id, FALSE, 24);

  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. TRIGGER — dispara handle_new_user ao criar usuário
-- ============================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. HABILITAR RLS
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. POLÍTICAS RLS
-- ============================================================

-- 8.1 Profiles — SELECT livre (sem recursão), UPDATE apenas o próprio
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- 8.2 Organizations — usuário vê somente a sua
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = get_my_org_id());

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = get_my_org_id());

-- 8.3 Categories
DROP POLICY IF EXISTS "categories_all" ON public.categories;
CREATE POLICY "categories_all" ON public.categories
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- 8.4 Products
DROP POLICY IF EXISTS "products_all" ON public.products;
CREATE POLICY "products_all" ON public.products
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- 8.5 Movements
DROP POLICY IF EXISTS "movements_all" ON public.movements;
CREATE POLICY "movements_all" ON public.movements
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- 8.6 Settings
DROP POLICY IF EXISTS "settings_all" ON public.settings;
CREATE POLICY "settings_all" ON public.settings
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- 8.7 Invitations
DROP POLICY IF EXISTS "invitations_all" ON public.invitations;
CREATE POLICY "invitations_all" ON public.invitations
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- CONCLUÍDO!
-- Depois de executar este script:
-- 1. Crie um novo usuário pelo painel Supabase (Authentication > Users > Add user)
--    ou pelo formulário de cadastro do app
-- 2. Uma organização + perfil + settings serão criados automaticamente
-- ============================================================
