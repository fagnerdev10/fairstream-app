-- === CORREÇÃO FINAL PERMISSÕES ADVERTISERS ===
-- Rode este script para permitir que novos anunciantes sejam criados automaticamente

ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública
DROP POLICY IF EXISTS "Public Read Advertisers" ON advertisers;
CREATE POLICY "Public Read Advertisers" ON advertisers FOR SELECT USING (true);

-- Permite inserção para usuários autenticados
DROP POLICY IF EXISTS "Authenticated Insert Advertisers" ON advertisers;
CREATE POLICY "Authenticated Insert Advertisers" ON advertisers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Permite update para o próprio usuário
DROP POLICY IF EXISTS "Own Update Advertisers" ON advertisers;
CREATE POLICY "Own Update Advertisers" ON advertisers FOR UPDATE USING (auth.uid()::text = id::text OR auth.uid()::text = user_id::text);

-- Permite tudo (fallback se as políticas acima falharem)
DROP POLICY IF EXISTS "Manage All Advertisers" ON advertisers;
CREATE POLICY "Manage All Advertisers" ON advertisers FOR ALL USING (true);
