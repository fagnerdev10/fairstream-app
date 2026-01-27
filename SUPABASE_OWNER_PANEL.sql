-- ============================================================================
-- SCRIPT DE PREPARAÇÃO DO PAINEL DO DONO (ADMIN)
-- Execute este script no Editor SQL do Supabase para habilitar todas as funções.
-- ============================================================================

-- 1. TABELA DE DENÚNCIAS (Reports)
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reason TEXT,
    video_id TEXT,
    video_title TEXT,
    reporter_id TEXT,
    reporter_name TEXT,
    status TEXT DEFAULT 'pending', -- 'pending' ou 'reviewed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE AVISOS GLOBAIS (Broadcasts)
CREATE TABLE IF NOT EXISTS broadcasts (
    id TEXT PRIMARY KEY,
    content TEXT,
    target_role TEXT, -- 'all', 'creator', 'advertiser', 'viewer'
    style TEXT,       -- 'info', 'warning', 'alert', 'success'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE MENSAGENS / SUPORTE (Messages)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_id TEXT,    -- ID do remetente
    to_id TEXT,      -- ID do destinatário (ou 'admin')
    from_name TEXT,
    subject TEXT,
    body TEXT,
    type TEXT,       -- 'chat', 'warning', 'system'
    from_role TEXT,
    to_role TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABELAS FINANCEIRAS FALTANTES (Garantia)
CREATE TABLE IF NOT EXISTS advertising_transactions (
    id TEXT PRIMARY KEY,
    advertiser_id TEXT,
    date TIMESTAMP WITH TIME ZONE,
    amount NUMERIC,
    type TEXT,
    method TEXT,
    status TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. POLÍTICAS DE SEGURANÇA (RLS) - Permitem leitura/escrita pública por enquanto
--    (Idealmente, restringiríamos no futuro, mas para o Admin funcionar rápido, deixamos aberto)

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Reports Access" ON reports;
CREATE POLICY "Public Reports Access" ON reports FOR ALL USING (true);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Broadcasts Access" ON broadcasts;
CREATE POLICY "Public Broadcasts Access" ON broadcasts FOR ALL USING (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Messages Access" ON messages;
CREATE POLICY "Public Messages Access" ON messages FOR ALL USING (true);

ALTER TABLE advertising_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Ad Transactions Access" ON advertising_transactions;
CREATE POLICY "Public Ad Transactions Access" ON advertising_transactions FOR ALL USING (true);

-- 6. RPC para Incrementar Impressões de Anúncios em Vídeos (Atomicamente)
CREATE OR REPLACE FUNCTION increment_video_ad_impressions(video_id_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE videos
  SET ad_impressions = COALESCE(ad_impressions, 0) + 1
  WHERE id = video_id_input;
END;
$$;

-- FIM DO SCRIPT
