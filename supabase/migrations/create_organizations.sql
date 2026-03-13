-- Criar tabela organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna owner_id se não existir
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

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

-- Desabilitar RLS para organizations temporariamente para permitir criação
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS para organization_members temporariamente
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Políticas RLS para outras tabelas (exemplo para products)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see products from their organizations" ON products
--   FOR ALL USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members
--       WHERE user_id = auth.uid()
--     )
--   );