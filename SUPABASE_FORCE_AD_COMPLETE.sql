-- === SOLUÇÃO COMPLETA: CRIA ANUNCIANTE + CAMPANHA ===
-- Este script cria um Anunciante com saldo e uma Campanha ativa vinculada a ele.

-- 1. Cria a tabela de anunciantes se não existir
CREATE TABLE IF NOT EXISTS advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  company_name TEXT,
  homepage_impressions NUMERIC DEFAULT 1000,
  standard_impressions NUMERIC DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insere um Anunciante de Teste COM SALDO
INSERT INTO advertisers (id, user_id, company_name, homepage_impressions, standard_impressions)
VALUES (
  '11111111-1111-1111-1111-111111111111', -- ID fixo para referência
  (SELECT id FROM profiles LIMIT 1),
  'Anunciante Teste SQL',
  5000, -- Saldo para Home
  5000  -- Saldo para Vídeos
)
ON CONFLICT (id) DO UPDATE SET 
  homepage_impressions = 5000, 
  standard_impressions = 5000;

-- 3. Cria a Campanha vinculada ao Anunciante acima
INSERT INTO campaigns (
  id,
  advertiser_id,
  title,
  status,
  location,
  type,
  target_url,
  budget,
  desktop_description,
  mobile_description,
  target_categories,
  banner_image,
  impressions,
  clicks,
  spent
)
VALUES (
  '22222222-2222-2222-2222-222222222222', -- ID fixo
  '11111111-1111-1111-1111-111111111111', -- Referencia o Anunciante criado acima
  'CAMPANHA TESTE COMPLETA',
  'active',
  'home',
  'banner',
  'https://google.com',
  10000,
  'Descricao Desktop Teste',
  'Descricao Mobile Teste',
  ARRAY['Geral', 'Tecnologia'],
  'https://placehold.co/728x90',
  0, 0, 0
)
ON CONFLICT (id) DO UPDATE SET 
  status = 'active',
  advertiser_id = '11111111-1111-1111-1111-111111111111';

-- Pronto! Após rodar, recarregue o site.
