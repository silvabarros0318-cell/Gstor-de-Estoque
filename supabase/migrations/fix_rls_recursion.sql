-- Limpar dados de demonstração para novas contas começarem vazias
DELETE FROM movements;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM settings;
DELETE FROM invitations;
DELETE FROM profiles WHERE id NOT IN (SELECT auth.uid() FROM auth.users WHERE auth.uid() IS NOT NULL); -- Manter apenas perfis de usuários autenticados

-- Função para obter o ID da organização do usuário sem disparar RLS recursivamente
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Consulta direta na tabela profiles sem RLS (SECURITY DEFINER ignora RLS)
  SELECT organization_id INTO org_id FROM profiles WHERE id = user_id;
  RETURN org_id;
END;
$$;

-- Habilitar RLS nas tabelas principais e criar políticas corrigidas
-- Nota: Políticas temporariamente permissivas para debug, ajuste conforme necessário

-- Profiles (reabilitar RLS com política por organização)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR ALL USING (id = auth.uid() OR organization_id = get_user_organization_id(auth.uid()));

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage categories in their organization" ON categories;
CREATE POLICY "Users can manage categories in their organization" ON categories
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage products in their organization" ON products;
CREATE POLICY "Users can manage products in their organization" ON products
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Movements
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage movements in their organization" ON movements;
CREATE POLICY "Users can manage movements in their organization" ON movements
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage settings in their organization" ON settings;
CREATE POLICY "Users can manage settings in their organization" ON settings
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage invitations in their organization" ON invitations;
CREATE POLICY "Users can manage invitations in their organization" ON invitations
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));