-- ============================================================================
-- SCRIPT DE LIBERAÇÃO TOTAL (V29) - FIM DAS TRAVAS DE SEGURANÇA
-- ============================================================================
-- RODE ESTE NO SQL EDITOR DO SUPABASE PARA GARANTIR QUE TODOS VEJAM TUDO.

-- 1. DESATIVA RLS (ROW LEVEL SECURITY) - ISSO É O QUE IMPEDE CELULARES DE VEREM OS VÍDEOS
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;

-- 2. GARANTE PERMISSÕES TOTAIS PARA QUALQUER NAVEGADOR (ANON)
GRANT ALL ON TABLE public.videos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.platform_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.campaigns TO anon, authenticated, service_role;

-- 3. GARANTE QUE AS SEQUÊNCIAS (SE HOUVER) TAMBÉM SEJAM ACESSÍVEIS
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. RE-GARANTE AS FUNÇÕES RPC
GRANT EXECUTE ON FUNCTION public.increment_video_views TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_video_ad_impressions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_impressions TO anon, authenticated, service_role;

-- FIM DO SCRIPT V29 - TUDO LIBERADO
