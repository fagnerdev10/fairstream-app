-- === INTEGRAÇÃO COMPLETA: VÍDEOS E MENSAGENS (V12) ===
-- Este script garante que todos os metadados de vídeos e mensagens fiquem salvos no Supabase.

-- 1. ATUALIZAÇÃO DA TABELA DE VÍDEOS
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '0:00';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS paid_ad_impressions INTEGER DEFAULT 0;

-- 2. CRIAÇÃO/ATUALIZAÇÃO DA TABELA DE MENSAGENS (CHATS)
-- Usamos TEXT nos IDs para suportar o 'admin' e possíveis seeds, mantendo referências.
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    from_name TEXT,
    subject TEXT DEFAULT 'Sem Assunto',
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'chat',
    from_role TEXT DEFAULT 'viewer',
    to_role TEXT DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. POLÍTICAS DE ACESSO (RLS - Permissivas para Desenvolvimento)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Messages" ON public.messages;
CREATE POLICY "Public Access Messages" ON public.messages FOR ALL USING (true);

-- 4. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_messages_to_id ON public.messages(to_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_id ON public.messages(from_id);
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON public.videos(creator_id);
