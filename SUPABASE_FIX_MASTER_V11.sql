-- === SOLUÇÃO DEFINITIVA MASTER (V11) ===
-- COPIE ESTE CÓDIGO INTEIRO E RODE NO SQL EDITOR DO SUPABASE
-- Este script resolve erros de colunas faltantes, RPCs (funções) e desmembro de tabelas.

-- 1. CORREÇÃO DA TABELA PROFILES (Metadados e Configurações)
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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS standard_impressions INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS homepage_impressions INTEGER DEFAULT 0;

-- Garante que perfis são públicos para visualização
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- 2. CORREÇÃO DA TABELA SUBSCRIPTIONS (Mapeamento para o Código)
-- Garante que as colunas usadas pelo SubscriptionService existam
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'channel';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix';

-- 3. CORREÇÃO DA TABELA CAMPAIGNS (Anúncios)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spent NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'home';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS desktop_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mobile_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_url TEXT;

-- 3b. GARANTIA DA TABELA DE VÍDEOS (Metadados para estatísticas)
-- Usamos TEXT no ID para suportar IDs de sementes ("1", "2") e UUIDs reais.
CREATE TABLE IF NOT EXISTS public.videos (
    id TEXT PRIMARY KEY,
    creator_id UUID REFERENCES public.profiles(id),
    title TEXT,
    views INTEGER DEFAULT 0,
    ad_impressions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Videos Master" ON public.videos;
CREATE POLICY "Public Access Videos Master" ON public.videos FOR ALL USING (true);

-- 4. CRIAÇÃO DE FUNÇÕES RPC (Correção de Erros 400/404 no Console)

-- Função para Visualizações de Vídeo
DROP FUNCTION IF EXISTS increment_video_views(text);
CREATE OR REPLACE FUNCTION increment_video_views(video_id_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE videos
  SET views = COALESCE(views, 0) + 1
  WHERE id::text = video_id_input;
END;
$$;

-- Função para Impressões de Campanha
DROP FUNCTION IF EXISTS increment_campaign_impressions(uuid);
CREATE OR REPLACE FUNCTION increment_campaign_impressions(campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET impressions = COALESCE(impressions, 0) + 1
  WHERE id = campaign_id;
END;
$$;

-- Função para Impressões de Anúncios em Vídeos
DROP FUNCTION IF EXISTS increment_video_ad_impressions(text);
CREATE OR REPLACE FUNCTION increment_video_ad_impressions(video_id_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE videos
  SET ad_impressions = COALESCE(ad_impressions, 0) + 1
  WHERE id::text = video_id_input;
END;
$$;

-- 5. POLÍTICAS DE ACESSO (RLS - Permissivas para Desenvolvimento)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Subscriptions" ON subscriptions;
CREATE POLICY "Public Access Subscriptions" ON subscriptions FOR ALL USING (true);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Campaigns" ON campaigns;
CREATE POLICY "Public Access Campaigns" ON campaigns FOR ALL USING (true);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Videos" ON videos;
CREATE POLICY "Public Access Videos" ON videos FOR ALL USING (true);

-- FIM DO SCRIPT
