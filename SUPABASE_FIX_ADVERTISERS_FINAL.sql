-- === CORREÇÃO FINAL PARA ANÚNCIOS ===
-- Este script garante que a tabela advertisers tenha as permissões corretas
-- e que os dados existam.

-- 1. Permissões RLS para tabela advertisers
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Advertisers" ON advertisers;
CREATE POLICY "Public Read Advertisers" ON advertisers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Own Advertiser" ON advertisers;
CREATE POLICY "Manage Own Advertiser" ON advertisers FOR ALL USING (true);

-- 2. Garante que o Anunciante de Teste existe com saldo
INSERT INTO advertisers (id, user_id, company_name, homepage_impressions, standard_impressions)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM profiles LIMIT 1),
  'Anunciante Teste',
  9999, 9999
)
ON CONFLICT (id) DO UPDATE SET 
  homepage_impressions = 9999, 
  standard_impressions = 9999;

-- 3. Garante que a Campanha de Vídeo está vinculada corretamente
UPDATE campaigns 
SET advertiser_id = '11111111-1111-1111-1111-111111111111'
WHERE advertiser_id IS NULL OR advertiser_id NOT IN (SELECT id FROM advertisers);

-- 4. Cria campanhas de teste se não existirem
INSERT INTO campaigns (id, advertiser_id, title, status, location, type, target_url, budget, desktop_description, mobile_description, target_categories, banner_image, impressions, clicks, spent)
VALUES 
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'CAMPANHA HOME TESTE', 'active', 'home', 'banner', 'https://google.com', 10000, 'Desc', 'Desc', ARRAY['Geral'], 'https://placehold.co/728x90', 0, 0, 0),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'CAMPANHA VIDEO TESTE', 'active', 'video', 'banner', 'https://google.com', 10000, 'Desc', 'Desc', ARRAY['Geral'], 'https://placehold.co/728x90', 0, 0, 0)
ON CONFLICT (id) DO UPDATE SET 
  status = 'active', 
  advertiser_id = '11111111-1111-1111-1111-111111111111';
