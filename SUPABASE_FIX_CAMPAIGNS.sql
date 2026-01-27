-- ADICIONAR COLUNAS FALTANTES NA TABELA CAMPAIGNS
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS desktop_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mobile_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_categories TEXT[] DEFAULT '{}';

-- Atualizar permissões (garantir que todos podem ler/escrever por enquanto)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON campaigns;
CREATE POLICY "Enable all access for all users" ON campaigns FOR ALL USING (true);
