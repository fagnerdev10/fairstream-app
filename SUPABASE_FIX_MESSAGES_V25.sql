-- === SUPABASE FIX MESSAGES (V25) ===
-- Garante que a tabela de mensagens suporte conversas entre usuários e suporte

-- 1. CRIAÇÃO/ATUALIZAÇÃO DA TABELA
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

-- 2. POLÍTICAS DE ACESSO (PERMISSIVAS PARA DESENVOLVIMENTO)
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mensagens Publicas" ON public.messages;
CREATE POLICY "Mensagens Publicas" ON public.messages FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. PERMISSÕES
GRANT ALL ON public.messages TO anon, authenticated, postgres, service_role;

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_messages_from_id ON public.messages(from_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_id ON public.messages(to_id);
CREATE INDEX IF NOT EXISTS idx_messages_combined ON public.messages(from_id, to_id);

-- FIM V25
