-- === FIX VIDEO CHAPTERS (V23) ===
-- RODE ESTE NO SQL EDITOR DO SUPABASE.

-- 1. Adiciona a coluna de capítulos se não existir
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS chapters JSONB DEFAULT '[]';

-- 2. Adiciona a coluna de sumário IA se não existir
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- 3. Atualiza o comentário da tabela para forçar o PostgREST a recarregar o schema
DO $$
BEGIN
    EXECUTE 'COMMENT ON TABLE public.videos IS ''Monetization V23 - Chapters Fix ' || now() || '''';
END $$;

-- 4. Garante que as permissões continuam corretas
GRANT ALL ON public.videos TO anon, authenticated, postgres, service_role;
