-- === CORREÇÃO FORÇADA PARA CAMPANHAS EXISTENTES ===
-- Este script vincula TODAS as campanhas a um anunciante válido com saldo

-- 1. Garante que existe um anunciante com saldo
INSERT INTO advertisers (id, user_id, company_name, homepage_impressions, standard_impressions)
SELECT 
  id,
  id,
  name || ' Ads',
  9999,
  9999
FROM profiles 
LIMIT 1
ON CONFLICT (id) DO UPDATE SET 
  homepage_impressions = 9999, 
  standard_impressions = 9999;

-- 2. Atualiza TODAS as campanhas para usar o primeiro anunciante disponível
UPDATE campaigns 
SET advertiser_id = (SELECT id FROM advertisers LIMIT 1)
WHERE advertiser_id IS NULL 
   OR advertiser_id NOT IN (SELECT id FROM advertisers);

-- 3. Verifica o resultado
SELECT 
  c.id,
  c.title,
  c.status,
  c.location,
  c.advertiser_id,
  a.company_name,
  a.homepage_impressions,
  a.standard_impressions
FROM campaigns c
LEFT JOIN advertisers a ON c.advertiser_id = a.id
WHERE c.status = 'active';
