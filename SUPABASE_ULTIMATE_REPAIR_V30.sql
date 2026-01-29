-- ============================================================================
-- SCRIPT DE REPARO SUPREMO (V30) - FIM DOS ERROS 400/406 E LIKES
-- ============================================================================
-- RODE ESTE NO SQL EDITOR DO SUPABASE PARA RESOLVER TUDO DE UMA VEZ.

-- 1. CRIAÇÃO DA TABELA DE LIKES (Resolve Erro 400 em /video_likes)
CREATE TABLE IF NOT EXISTS public.video_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(video_id, user_id)
);

-- 2. GARANTE COLUNAS DE DINHEIRO (Resolve Erro 400 em RPCs)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS accumulated_revenue DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ad_impressions INTEGER DEFAULT 0;

-- 3. RE-CRIAÇÃO DAS FUNÇÕES RPC (Garante que os nomes e tipos estejam certos)
-- Limpeza ABSOLUTA de todas as variações para evitar erro 'is not unique'
DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN (
        SELECT proname, oid, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname IN ('increment_video_views', 'increment_video_ad_impressions')
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.increment_video_views(video_id_input TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.videos SET views = COALESCE(views, 0) + 1 WHERE id = video_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_video_ad_impressions(video_id_input TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.videos
    SET ad_impressions = COALESCE(ad_impressions, 0) + 1,
        accumulated_revenue = COALESCE(accumulated_revenue, 0) + 0.20
    WHERE id = video_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_video_ad_impressions(video_id_input TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.videos
    SET ad_impressions = COALESCE(ad_impressions, 0) + 1,
        accumulated_revenue = COALESCE(accumulated_revenue, 0) + 0.20
    WHERE id = video_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. LIBERAÇÃO TOTAL (DISABLE RLS) - Garante visibilidade no celular
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;

-- 5. PERMISSÕES PARA O FRONT-END (ANON)
GRANT ALL ON TABLE public.videos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.video_likes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.platform_settings TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_video_views TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_video_ad_impressions TO anon, authenticated, service_role;

-- FIM DO SCRIPT V30
