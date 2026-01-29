-- ============================================================================
-- SCRIPT DE REPARAÇÃO MASTER (V27) - RPCs E ESTATÍSTICAS
-- ============================================================================
-- RODE ESTE NO SQL EDITOR DO SUPABASE PARA ELIMINAR O ERRO 400.

-- 1. INCREMENTO DE VIEWS (VÍDEO)
CREATE OR REPLACE FUNCTION public.increment_video_views(video_id_input TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.videos
    SET views = COALESCE(views, 0) + 1
    WHERE id = video_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. INCREMENTO DE IMPRESSÕES DE ANÚNCIO NO VÍDEO (RECURSO CARO)
-- Esta função registra que um anúncio foi visto DENTRO de um vídeo.
CREATE OR REPLACE FUNCTION public.increment_video_ad_impressions(video_id_input TEXT, creator_id_input UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    -- Incrementa no vídeo
    UPDATE public.videos
    SET ad_impressions = COALESCE(ad_impressions, 0) + 1,
        accumulated_revenue = COALESCE(accumulated_revenue, 0) + 0.20 -- 20 centavos por ad
    WHERE id = video_id_input;

    -- Se tiver creator_id, pode incrementar no perfil também se quiser (opcional)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. INCREMENTO DE IMPRESSÕES DA CAMPANHA (ANUNCIANTE)
CREATE OR REPLACE FUNCTION public.increment_campaign_impressions(campaign_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.campaigns
    SET impressions = COALESCE(impressions, 0) + 1,
        spent = COALESCE(spent, 0) + 0.10 -- Gasto do anunciante
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. INCREMENTO DE CLICKS DA CAMPANHA
CREATE OR REPLACE FUNCTION public.increment_campaign_clicks(campaign_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.campaigns
    SET clicks = COALESCE(clicks, 0) + 1
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PERMISSÕES
GRANT EXECUTE ON FUNCTION public.increment_video_views TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_video_ad_impressions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_impressions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_clicks TO anon, authenticated, service_role;

-- FIM DO SCRIPT V27
