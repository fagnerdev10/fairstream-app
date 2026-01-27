-- CORREÇÃO DA TABELA SUBSCRIPTIONS
-- Padronizando para snake_case para evitar erros no código

-- 1. Se existir como camelCase, renomeia. Se não, ignora erro.
DO $$
BEGIN
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='subscriptions' and column_name='userId')
  THEN
      ALTER TABLE subscriptions RENAME COLUMN "userId" TO user_id;
  END IF;

  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='subscriptions' and column_name='channelId')
  THEN
      ALTER TABLE subscriptions RENAME COLUMN "channelId" TO channel_id;
  END IF;
      IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='subscriptions' and column_name='paymentMethod')
  THEN
      ALTER TABLE subscriptions RENAME COLUMN "paymentMethod" TO payment_method;
  END IF;
      IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='subscriptions' and column_name='startDate')
  THEN
      ALTER TABLE subscriptions RENAME COLUMN "startDate" TO start_date;
  END IF;
END $$;

-- 2. Garante que as colunas existem (se a tabela foi criada vazia ou incompleta)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 3. Atualiza Policies (Liberar geral para leitura por enquanto)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Subs" ON subscriptions;
CREATE POLICY "Public Access Subs" ON subscriptions FOR ALL USING (true);
