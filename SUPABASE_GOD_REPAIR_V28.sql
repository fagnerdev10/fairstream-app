-- ============================================================================
-- SCRIPT DE REPARAÇÃO DEFINITIVA (V28) - O "DEUS" DO SUPABASE
-- ============================================================================
-- ESTE SCRIPT CONSITA TUDO: ERRO 400, 406 E BLOBS.
-- RODE ESTE NO SQL EDITOR DO SUPABASE.

-- 1. REPARAÇÃO DA TABELA DE CONFIGURAÇÕES (FIM DO ERRO 406)
DROP TABLE IF EXISTS public.platform_settings CASCADE;
CREATE TABLE public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_settings',
    asaas_key TEXT DEFAULT '',
    asaas_wallet_id TEXT DEFAULT '',
    is_maintenance_mode BOOLEAN DEFAULT false,
    max_warnings INTEGER DEFAULT 3,
    allow_registrations BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insere o registro único necessário
INSERT INTO public.platform_settings (id, asaas_key, asaas_wallet_id) 
VALUES ('global_settings', '', '')
ON CONFLICT (id) DO NOTHING;

-- 2. FUNÇÕES DE ESTATÍSTICAS (FIM DO ERRO 400)
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

CREATE OR REPLACE FUNCTION public.increment_campaign_impressions(campaign_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.campaigns
    SET impressions = COALESCE(impressions, 0) + 1,
        spent = COALESCE(spent, 0) + 0.10
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. LIMPEZA DE BLOBS (SEGURANÇA EXTRA)
-- Deleta vídeos que por acaso tenham ficado com links de blob no banco
DELETE FROM public.videos 
WHERE video_url LIKE 'blob:%' 
   OR thumbnail_url LIKE 'blob:%'
   OR video_url LIKE 'data:video%';

-- 4. PERMISSÕES PARA O FRONT-END
GRANT ALL ON TABLE public.platform_settings TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_video_views TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_video_ad_impressions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_impressions TO anon, authenticated, service_role;

-- FIM DO SCRIPT V28
