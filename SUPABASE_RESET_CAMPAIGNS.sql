-- =========================================================
-- RESET DA TABELA DE CAMPANHAS (CORREÇÃO DEFINITIVA)
-- =========================================================
-- ATENÇÃO: Isso apagará todas as campanhas existentes para corrigir o erro de estrutura.

DROP TABLE IF EXISTS campaigns;

CREATE TABLE campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertiser_id TEXT,
    type TEXT,
    location TEXT, -- Agora garantido como TEXTO simples
    title TEXT,
    desktop_description TEXT,
    mobile_description TEXT,
    target_url TEXT,
    banner_image TEXT,
    status TEXT,
    budget NUMERIC,
    spent NUMERIC DEFAULT 0,
    impressions NUMERIC DEFAULT 0,
    clicks NUMERIC DEFAULT 0,
    target_categories TEXT[] DEFAULT '{}', -- Array de texto correto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar acesso público para testes
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON campaigns FOR ALL USING (true);

-- =========================================================
