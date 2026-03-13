-- Criar tabela organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela organization_members
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Adicionar coluna organization_id à profiles se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Desabilitar RLS para profiles (já feito anteriormente)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Função para criar organização e membro no registro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar organização
  INSERT INTO organizations (name, owner_id)
  VALUES (NEW.raw_user_meta_data->>'name' || '''s Organization', NEW.id);

  -- Criar ou atualizar profile
  INSERT INTO profiles (id, name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    'admin',
    (SELECT id FROM organizations WHERE owner_id = NEW.id LIMIT 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id;

  -- Adicionar membro
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (NEW.id, (SELECT id FROM organizations WHERE owner_id = NEW.id LIMIT 1), 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar na criação de usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Políticas RLS para organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Políticas RLS para organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert members to their organizations" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para outras tabelas (exemplo para products)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see products from their organizations" ON products
--   FOR ALL USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members
--       WHERE user_id = auth.uid()
--     )
--   );