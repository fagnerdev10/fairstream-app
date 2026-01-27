-- === GERADOR DE ANÚNCIO DE TESTE (FORÇA BRUTA) ===
-- RODE ESTE SCRIPT PARA CRIAR UM ANÚNCIO ATIVO
-- Se der erro "null value in column advertiser_id", cadastre um perfil primeiro.

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
SELECT 
  gen_random_uuid(), -- ID da Campanha
  id,                -- ID do primeiro usuário encontrado (Advertiser)
  'CAMPANHA TESTE SQL', 
  'active', 
  'home', 
  'banner', 
  'https://google.com', 
  5000, 
  'Descrição Teste Desktop', 
  'Descrição Teste Mobile', 
  ARRAY['Geral', 'Tecnologia'],
  'https://placehold.co/600x400',
  0, 0, 0
FROM profiles LIMIT 1;

-- Se o insert acima falhar, nenhuma linha será inserida.
-- Verifique a aba "Results" se aparece "Check 1 row affected" ou erro.
