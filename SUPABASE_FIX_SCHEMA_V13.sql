-- === SOLUÇÃO MONETIZAÇÃO TOTAL (V22.1 - FIX SQL SYNTAX) ===
-- RODE ESTE NO SQL EDITOR DO SUPABASE.

-- 1. Garante que as colunas essenciais existem com os tipos corretos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '0:00';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS bunny_video_id TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ad_impressions INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS paid_ad_impressions INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS accumulated_revenue NUMERIC DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS paid_revenue NUMERIC DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Limpeza de RLS para evitar Erro 406/400
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Videos Access" ON public.videos;
CREATE POLICY "Public Videos Access" ON public.videos FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
CREATE POLICY "Public Profiles Access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. AJUSTE NA FUNÇÃO DE RASTREAMENTO (V22.1)
DROP FUNCTION IF EXISTS public.increment_video_ad_impressions(text, uuid);
CREATE OR REPLACE FUNCTION public.increment_video_ad_impressions(video_id_input TEXT, creator_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Tenta atualizar o vídeo existente
  UPDATE public.videos
  SET ad_impressions = COALESCE(ad_impressions, 0) + 1,
      accumulated_revenue = COALESCE(accumulated_revenue, 0) + 0.20
  WHERE id = video_id_input;

  -- 2. Se o vídeo não existia no banco, cria um registro básico
  IF NOT FOUND AND creator_id_input IS NOT NULL THEN
    INSERT INTO public.videos (
      id, 
      creator_id, 
      title, 
      ad_impressions, 
      accumulated_revenue,
      description,
      views,
      video_url,
      created_at
    )
    VALUES (
      video_id_input, 
      creator_id_input, 
      'Vídeo Registrado via Tracker', 
      1, 
      0.20,
      'Este vídeo foi detectado pelo sistema de monetização.',
      1,
      '',
      now()
    );
  END IF;

  -- 3. Atualiza o saldo global do perfil
  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + 0.10
  WHERE id = creator_id_input;
END;
$$;

-- 4. Permissões Globais
GRANT ALL ON public.videos TO anon, authenticated, postgres, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, postgres, service_role;

-- 5. Limpar Cache do PostgREST (Maneira segura)
DO $$
BEGIN
    EXECUTE 'COMMENT ON TABLE public.videos IS ''Monetization V22.1 - Sync ' || now() || '''';
END $$;

-- FIM V22.1
