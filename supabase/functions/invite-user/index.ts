import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: 'Variáveis de ambiente não configuradas na Edge Function.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Cliente admin (ignora RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    console.log("Body recebido:", JSON.stringify(body));

    const { email, role, organizationId } = body;

    if (!email || !role || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'email, role e organizationId são obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se já existe um usuário com esse e-mail
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Erro ao listar usuários:", listError);
      return new Response(
        JSON.stringify({ error: 'Erro interno ao verificar usuários existentes.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const existingUser = existingUsers.users.find((u: any) => u.email === email);

    if (existingUser) {
      // Usuário já existe — apenas verificar se já está na organização
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', existingUser.id)
        .single();

      if (existingProfile?.organization_id === organizationId) {
        return new Response(
          JSON.stringify({ error: 'Este usuário já pertence à sua organização.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Vincular à organização do convidante (atualizar perfil existente)
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ organization_id: organizationId, role, status: 'active' })
        .eq('id', existingUser.id);

      if (updateErr) {
        console.error("Erro ao atualizar perfil:", updateErr);
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ message: `Usuário ${email} vinculado à organização com sucesso.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Usuário novo — enviar convite por e-mail
    // O metadata invited_org_id é usado pelo trigger para NÃO criar nova organização
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        organization_id: organizationId,
        invited_org_id: organizationId,  // flag para o trigger
      },
      redirectTo: 'https://gstor-de-estoque.vercel.app/',
    });

    if (error) {
      console.error("Erro no convite Supabase Auth:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Pré-criar o perfil já vinculado à organização correta
    // (o trigger vai tentar criar também, mas o UPSERT evita duplicatas)
    if (data?.user) {
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: email.split('@')[0], // nome temporário até o usuário definir
          role,
          status: 'pending',
          organization_id: organizationId,
        }, { onConflict: 'id' });

      if (profileErr) {
        console.warn("Aviso ao criar perfil antecipado:", profileErr.message);
      }
    }

    return new Response(
      JSON.stringify({ message: `Convite enviado para ${email}`, userId: data?.user?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno na Edge Function.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
