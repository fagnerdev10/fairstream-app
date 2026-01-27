-- === SOLUÇÃO V27: GARANTIA TOTAL DE COLUNAS DE PERFIL ===
-- COPIE ESTE CÓDIGO E RODE NO SQL EDITOR DO SUPABASE (https://supabase.com/dashboard/project/_/sql)
-- Este script garante que todas as colunas necessárias para o Dashboard do Criador existam.

-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA PROFILES (Se não existirem)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS channel_message TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_price NUMERIC DEFAULT 9.90;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key_type TEXT DEFAULT 'email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warnings INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_channels TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ignored_channels TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS live_id TEXT DEFAULT '';

-- 2. GARANTIR QUE OS TIPOS ESTEJAM CORRETOS (Caso já existissem com outro tipo)
-- (Opcional, mas recomendado se houver erros de tipo)
-- ALTER TABLE public.profiles ALTER COLUMN social_links SET DATA TYPE JSONB USING social_links::jsonb;

-- 3. RE-APLICAR RLS PARA GARANTIR PERMISSÕES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem editar próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem editar próprio perfil" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Perfis são públicos para leitura" ON public.profiles;
CREATE POLICY "Perfis são públicos para leitura" ON public.profiles
FOR SELECT USING (true);

-- 4. VERIFICAÇÃO FINAL:
-- Se o comando abaixo retornar erro, significa que o RLS está bloqueando algo.
-- Mas com a política acima vinculada ao auth.uid(), o criador deve conseguir salvar.

-- FIM DO SCRIPT V27
