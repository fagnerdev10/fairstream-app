-- === SOLUÇÃO DEFINITIVA (V4) - COPIE E RODE TUDO ===

-- 1. CORREÇÃO DA TABELA SUBSCRIPTIONS
-- Tenta renomear se existirem as colunas antigas
DO $$
BEGIN
  BEGIN
    ALTER TABLE subscriptions RENAME COLUMN "userId" TO user_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  
  BEGIN
    ALTER TABLE subscriptions RENAME COLUMN "channelId" TO channel_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER TABLE subscriptions RENAME COLUMN "paymentMethod" TO payment_method;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  
  BEGIN
    ALTER TABLE subscriptions RENAME COLUMN "startDate" TO start_date;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Garante que as colunas certas existem
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT;


-- 2. CORREÇÃO DA TABELA CAMPAIGNS (Garante que todas colunas existem)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS advertiser_id UUID; -- ou Text, o RLS vai lidar
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS desktop_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mobile_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget NUMERIC;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spent NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS impressions NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicks NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_categories TEXT[]; 


-- 3. PERMISSÕES DE SEGURANÇA (RLS) - CORREÇÃO DE UUID/TEXT
-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Subs" ON subscriptions;
CREATE POLICY "Public Access Subs" ON subscriptions FOR ALL USING (true);

-- Campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Campaigns" ON campaigns;
CREATE POLICY "Public Read Campaigns" ON campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Advertiser Manage Campaigns" ON campaigns;

-- AQUI O SEGREDO: CAST PARA TEXTO DOS DOIS LADOS PARA EVITAR ERROS
CREATE POLICY "Advertiser Manage Campaigns" ON campaigns 
FOR ALL 
USING (
  (auth.uid())::text = (advertiser_id)::text
);

-- Profiles (por garantia)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);
