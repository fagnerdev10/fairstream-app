-- === SOLUÇÃO DEFINITIVA (V3) ===
-- COPIE TUDO E COLE NO SQL EDITOR DO SUPABASE
-- DEPOIS CLIQUE EM "RUN"

BEGIN;

-- 1. CORREÇÃO DA TABELA SUBSCRIPTIONS (Renomeia colunas para o padrão)
-- Se der erro dizendo que não existe, o bloco ignorará.
DO $$
BEGIN
  -- Renomear userId -> user_id
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='subscriptions' and column_name='userId') THEN
      ALTER TABLE subscriptions RENAME COLUMN "userId" TO user_id;
  END IF;
  
  -- Renomear channelId -> channel_id
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='subscriptions' and column_name='channelId') THEN
      ALTER TABLE subscriptions RENAME COLUMN "channelId" TO channel_id;
  END IF;

  -- Renomear paymentMethod -> payment_method
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='subscriptions' and column_name='paymentMethod') THEN
      ALTER TABLE subscriptions RENAME COLUMN "paymentMethod" TO payment_method;
  END IF;
  
  -- Renomear startDate -> start_date
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='subscriptions' and column_name='startDate') THEN
      ALTER TABLE subscriptions RENAME COLUMN "startDate" TO start_date;
  END IF;
END $$;

-- 2. GARANTIR QUE AS COLUNAS EXISTEM
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- 3. PERMISSÕES PARA SUBSCRIPTIONS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Subs" ON subscriptions;
CREATE POLICY "Public Access Subs" ON subscriptions FOR ALL USING (true);


-- 4. PERMISSÕES PARA CAMPAIGNS (CORRIGIDO PROBLEMA DE UUID ERROR)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Campaigns" ON campaigns;
CREATE POLICY "Public Read Campaigns" ON campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Advertiser Manage Campaigns" ON campaigns;
-- AQUI ESTÁ A CORREÇÃO MÁGICA (::text)
CREATE POLICY "Advertiser Manage Campaigns" ON campaigns 
FOR ALL 
USING (auth.uid()::text = advertiser_id::text);


-- 5. PERMISSÕES PARA PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);

COMMIT;
