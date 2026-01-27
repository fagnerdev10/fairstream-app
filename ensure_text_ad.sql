
-- Adicionando uma campanha de plataforma do tipo TEXTO (sem imagem) para a Home
-- Isso forçará o sistema a ter pelo menos um item 'text' para o rodízio
INSERT INTO platform_campaigns (title, desktop_description, mobile_description, target_url, location, is_active)
VALUES (
  'Anuncie no FairStream!',
  'Destaque sua marca para milhares de criadores e espectadores. Planos a partir de R$ 0,10 por mil impressões.',
  'Anuncie hoje mesmo no FairStream! Planos flexíveis.',
  'https://fairstream.com.br/anunciar',
  'home',
  true
);

-- Corrigindo qualquer campanha ativa que deveria ser de texto mas pode estar sendo mal interpretada
UPDATE campaigns 
SET type = 'text', banner_image = NULL 
WHERE title ILIKE '%texto%' OR title ILIKE '%anuncie%';
