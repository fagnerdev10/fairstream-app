-- === SYNC LIKES (REPAIR V3) ===
-- RODE ESTE NO SQL EDITOR DO SUPABASE PARA ATUALIZAR O CONTADOR DE LIKES DE TODOS OS VÍDEOS.

UPDATE public.videos v
SET likes = (
  SELECT count(*)
  FROM public.video_likes vl
  WHERE vl.video_id::text = v.id::text
);

-- Usando format() para evitar erros de aspas simples
DO $$
BEGIN
    EXECUTE format('COMMENT ON TABLE public.videos IS %L', 'Monetization V23.3 - Sync ' || now());
END $$;
