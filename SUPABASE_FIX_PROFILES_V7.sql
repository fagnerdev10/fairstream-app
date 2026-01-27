-- === SOLUÇÃO V7: CORREÇÃO DEFINITIVA DA TABELA PROFILES ===
-- COPIE ESTE CÓDIGO E RODE NO SQL EDITOR DO SUPABASE
-- Este script adiciona as colunas faltantes que estão impedindo o salvamento das configurações do canal.

-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS channel_message TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_price NUMERIC DEFAULT 5.00;
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

-- 2. GARANTIR QUE AS POLÍTICAS DE RLS PERMITAM O UPDATE DESSAS COLUNAS
DROP POLICY IF EXISTS "Usuários podem editar próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem editar próprio perfil" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 3. VERIFICAR SE O TIPO DO ID É UUID (Padrão do Supabase Auth)
-- Se houver erro de mismatch de tipo (UUID vs TEXT) em outras tabelas, rodar os casts necessários.

-- 4. ATUALIZAR TABELA DE VÍDEOS (Garantir colunas de monetização se necessário)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ad_impressions INTEGER DEFAULT 0;

-- FIM DO SCRIPT
