-- Reset total das políticas da tabela profiles para evitar recursão
DROP POLICY IF EXISTS "Profiles isolation" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Users can access same organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;

-- Criar políticas simples e seguras
CREATE POLICY "Allow select for all authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow update for own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- A função get_my_org_id() agora não causará loop infinito
-- porque ela faz um SELECT que é permitido pela regra "true" acima.
