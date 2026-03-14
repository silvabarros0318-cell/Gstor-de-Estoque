-- Atualiza o trigger handle_new_user para suportar usuários convidados.
-- Quando um usuário vem de um convite, o metadata "invited_org_id" estará presente
-- e o trigger NÃO cria nova organização — apenas vincula o perfil à existente.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id   UUID;
  user_name    TEXT;
  invited_org  UUID;
BEGIN
  -- Extrair dados do metadata
  user_name   := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Usuário'
  );
  invited_org := (NEW.raw_user_meta_data->>'invited_org_id')::UUID;

  -- Verificar se já existe um perfil para este usuário (criado pela Edge Function via upsert)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Perfil já criado pela Edge Function — não fazer nada
    RETURN NEW;
  END IF;

  IF invited_org IS NOT NULL THEN
    -- ✅ Usuário convidado: vincular à organização existente
    INSERT INTO public.profiles (id, name, role, status, organization_id)
    VALUES (
      NEW.id,
      user_name,
      COALESCE(NEW.raw_user_meta_data->>'role', 'operator'),
      'active',
      invited_org
    )
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          role = EXCLUDED.role,
          status = 'active';

  ELSE
    -- ✅ Usuário novo: criar organização própria
    INSERT INTO public.organizations (name, owner_id)
    VALUES (user_name, NEW.id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, name, role, status, organization_id)
    VALUES (NEW.id, user_name, 'admin', 'active', new_org_id)
    ON CONFLICT (id) DO NOTHING;

    -- Settings padrão
    INSERT INTO public.settings (organization_id, alert_enabled, min_interval_hours)
    VALUES (new_org_id, FALSE, 24)
    ON CONFLICT (organization_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
