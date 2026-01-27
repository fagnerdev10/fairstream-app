-- === CORREÇÃO CRÍTICA: MENSAGENS ERRO 400 (V26) ===
-- O erro 400 acontece quando enviamos um texto (ex: 'admin' ou '666') para uma coluna que o banco acha que é UUID.

-- 1. DROP E CREATE (A MANEIRA MAIS SEGURA DE RESETAR O ESQUEMA)
DROP TABLE IF EXISTS public.messages;

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_id TEXT NOT NULL, -- USAMOS TEXT PARA SUPORTAR 'admin' e IDs customizados
    to_id TEXT NOT NULL,   -- USAMOS TEXT PARA SUPORTAR 'admin' e IDs customizados
    from_name TEXT,
    subject TEXT DEFAULT 'Sem Assunto',
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'chat',
    from_role TEXT DEFAULT 'viewer',
    to_role TEXT DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DESABILITAR RLS PARA TESTE (GARANTE QUE NÃO SEJA PERMISSÃO)
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 3. PERMISSÕES TOTAIS
GRANT ALL ON public.messages TO anon, authenticated, postgres, service_role;

-- 4. ÍNDICES DE BUSCA
CREATE INDEX idx_messages_from_id ON public.messages(from_id);
CREATE INDEX idx_messages_to_id ON public.messages(to_id);

-- FIM V26
