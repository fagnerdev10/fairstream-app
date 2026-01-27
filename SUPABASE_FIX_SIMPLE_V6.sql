-- === SOLUÇÃO V6 (SEM BLOCOS COMPLEXOS) ===
-- COPIE ESTE CÓDIGO E RODE NO SQL EDITOR
-- SE DER ERRO, ENVIE O PRINT DO ERRO ESPECÍFICO

-- 1. Limpeza de Políticas Antigas (Campanhas)
DROP POLICY IF EXISTS "Public Read Campaigns" ON campaigns;
DROP POLICY IF EXISTS "Advertiser Manage Campaigns" ON campaigns;
DROP POLICY IF EXISTS "Enable read access for all users" ON campaigns;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON campaigns;
DROP POLICY IF EXISTS "Enable update for users based on email" ON campaigns;

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- 2. Criação das Políticas de Campanhas (Com Correção de Tipo)
CREATE POLICY "Public Read Campaigns" ON campaigns 
FOR SELECT USING (true);

CREATE POLICY "Advertiser Manage Campaigns" ON campaigns 
FOR ALL 
USING (
    -- Converte ambos para texto para evitar erro uuid=text
    (auth.uid())::text = (advertiser_id)::text
);

-- 3. Limpeza e Correção de Subscriptions
DROP POLICY IF EXISTS "Public Access Subs" ON subscriptions;
DROP POLICY IF EXISTS "Enable read access for all users" ON subscriptions;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access Subs" ON subscriptions 
FOR ALL 
USING (true);

-- 4. Correção Bruta de Colunas (Se der erro aqui, ignore, significa que já existem)
-- Tenta criar colunas caso faltem
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status text DEFAULT 'paused';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS impressions numeric DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicks numeric DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spent numeric DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS location text;

-- 5. Profiles (Garantia)
DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);
