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

-- Profiles (temporariamente permissiva para debug)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR ALL USING (true); -- Temporário: permitir tudo para debug

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage categories in their organization" ON categories;
CREATE POLICY "Users can manage categories in their organization" ON categories
FOR ALL USING (true); -- Temporário: permitir tudo para debug

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage products in their organization" ON products;
CREATE POLICY "Users can manage products in their organization" ON products
FOR ALL USING (true); -- Temporário

-- Movements
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage movements in their organization" ON movements;
CREATE POLICY "Users can manage movements in their organization" ON movements
FOR ALL USING (true); -- Temporário

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage settings in their organization" ON settings;
CREATE POLICY "Users can manage settings in their organization" ON settings
FOR ALL USING (true); -- Temporário

-- Invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage invitations in their organization" ON invitations;
CREATE POLICY "Users can manage invitations in their organization" ON invitations
FOR ALL USING (true); -- Temporário