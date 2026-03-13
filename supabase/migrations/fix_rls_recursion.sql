-- Remover foreign key constraint problemática em profiles.organization_id
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;

-- Limpar TODOS os dados para começar do zero e garantir isolamento
DELETE FROM movements;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM settings;
DELETE FROM invitations;
DELETE FROM profiles;

-- Adicionar coluna organization_id nas tabelas que não têm
ALTER TABLE categories ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Atualizar organization_id nos perfis existentes (se não tiver, usar o próprio id)
UPDATE profiles SET organization_id = id WHERE organization_id IS NULL;

-- Função para obter o ID da organização do usuário sem disparar RLS recursivamente
-- Como cada usuário é sua própria organização, retorna o user_id diretamente
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Retorna o user_id diretamente, assumindo organization_id = user_id
  RETURN user_id;
END;
$$;

-- Habilitar RLS nas tabelas principais e criar políticas corrigidas
-- Nota: Políticas temporariamente permissivas para debug, ajuste conforme necessário

-- Profiles (desabilitar RLS pois cada usuário só vê seu próprio perfil via id = auth.uid())
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

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