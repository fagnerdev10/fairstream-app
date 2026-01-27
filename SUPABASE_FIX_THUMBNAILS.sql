-- === SOLUÇÃO THUMBNAILS & IMAGENS (V23.1) ===
-- RODE ESTE NO SQL EDITOR DO SUPABASE PARA CORRIGIR O BLOQUEIO DE PERSISTÊNCIA.

-- 1. Adiciona a coluna de controle de fonte da capa (VÍDEOS)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_source TEXT DEFAULT 'random';

-- 2. Garante que os anúncios tenham as colunas necessárias (CAMPANHAS)
-- Caso queira persistir a fonte do banner também no futuro:
-- ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS banner_source TEXT DEFAULT 'random';

-- 3. Garante permissões totais para as tabelas principais
GRANT ALL ON public.videos TO anon, authenticated, postgres, service_role;
GRANT ALL ON public.campaigns TO anon, authenticated, postgres, service_role;
GRANT ALL ON public.platform_campaigns TO anon, authenticated, postgres, service_role;

-- 4. Notifica o sistema sobre a alteração do schema para limpar cache interno do Supabase
DO $$
BEGIN
    EXECUTE 'COMMENT ON TABLE public.videos IS ''Thumbnail logic V23.1 - ' || now() || '''';
END $$;

-- FIM V23.1
