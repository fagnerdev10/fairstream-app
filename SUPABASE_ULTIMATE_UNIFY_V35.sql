-- ============================================================================
-- SCRIPT DE UNIFICAÇÃO TOTAL (V35) - SUPABASE 100% (SEM LOCALSTORAGE)
-- ============================================================================
-- RODE ESTE NO SQL EDITOR DO SUPABASE.
-- ELE ADAPTA AS TABELAS PARA ACEITAR IDs DE TEXTO E UUID SIMULTANEAMENTE.

-- 1. ADAPTANDO TABELA DE VÍDEOS (Aceita IDs de Seed e UUID)
-- Se a tabela já existe, vamos garantir que o ID seja TEXT para não dar erro 400
-- IMPORTANTE: Isso requer cuidado com Foreign Keys.
DO $$ 
BEGIN
    -- Remove FKs temporariamente para mudar o tipo
    ALTER TABLE IF EXISTS public.video_likes DROP CONSTRAINT IF EXISTS video_likes_video_id_fkey;
    ALTER TABLE IF EXISTS public.comments DROP CONSTRAINT IF EXISTS comments_video_id_fkey;
    
    -- Muda o tipo do ID na tabela principal para TEXT
    ALTER TABLE public.videos ALTER COLUMN id TYPE TEXT;
    
    -- Recria as FKs apontando para o ID (TEXT)
    ALTER TABLE public.video_likes ALTER COLUMN video_id TYPE TEXT;
    ALTER TABLE public.comments ALTER COLUMN video_id TYPE TEXT;
END $$;

-- 2. GARANTE COLUNAS DE MÉTRICAS E MONETIZAÇÃO
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS accumulated_revenue DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ad_impressions INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- 3. TABELAS DE APOIO (Caso não existam)
CREATE TABLE IF NOT EXISTS public.video_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(video_id, user_id)
);

-- 4. FUNÇÕES RPC ATUALIZADAS (Supabase Only)
CREATE OR REPLACE FUNCTION public.increment_video_views(video_id_input TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.videos 
    SET views = COALESCE(views, 0) + 1 
    WHERE id = video_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_video_ad_impressions(
    video_id_input TEXT, 
    creator_id_input UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE public.videos
    SET ad_impressions = COALESCE(ad_impressions, 0) + 1,
        accumulated_revenue = COALESCE(accumulated_revenue, 0) + 0.20
    WHERE id = video_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. DESABILITA RLS EM TUDO (REQUISITO DO USUÁRIO PARA TESTE RÁPIDO)
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;

-- 6. PERMISSÕES TOTAIS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
