
import { Video } from '../types';

// Stop Words (Palavras ignoradas)
const STOP_WORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'para', 'com', 'sem', 'que', 'se', 'é', 'está', 'foi',
  'meu', 'minha', 'seu', 'sua', 'como', 'onde', 'quando', 'porque',
  'estou', 'estava', 'tem', 'ter', 'pra', 'pro'
]);

// Mapa Expandido de Sinônimos e Contextos
const SEMANTIC_MAP: Record<string, string[]> = {
  // Viagem e Turismo
  'viajar': ['viagem', 'turismo', 'ferias', 'trip', 'travel', 'voar', 'conhecer', 'explorar', 'mundo', 'estrada', 'roteiro', 'destino', 'passeio', 'aventura'],
  'viagem': ['viajar', 'turismo', 'ferias', 'trip', 'travel', 'voar', 'conhecer', 'explorar', 'mundo', 'estrada', 'roteiro', 'destino', 'passeio', 'aventura'],
  'portugal': ['europa', 'lisboa', 'porto', 'algarve', 'europeu'],
  'brasil': ['br', 'nacional', 'sul', 'rio', 'sp', 'floresta'],

  // Tecnologia
  'celular': ['smartphone', 'iphone', 'android', 'samsung', 'motorola', 'xiaomi', 'telefone', 'mobile', 'aparelho'],
  'tela': ['display', 'visor', 'screen', 'monitor', 'painel', 'lcd', 'oled', 'amoled'],
  'defeito': ['problema', 'erro', 'bug', 'falha', 'quebrado', 'ruim', 'travando', 'issue', 'vicio', 'estragado'],
  'consertar': ['arrumar', 'reparar', 'fix', 'solução', 'resolver', 'tutorial', 'trocar', 'manutenção'],
  'samsung': ['galaxy', 'android', 'note', 'ultra'],

  // Design e Dev
  'design': ['ux', 'ui', 'interface', 'figma', 'adobe', 'criativo', 'arte', 'web'],
  'programacao': ['code', 'dev', 'react', 'javascript', 'ts', 'css', 'html', 'frontend', 'backend', 'fullstack'],

  // Geral
  'receita': ['cozinhar', 'culinaria', 'comida', 'bolo', 'preparo', 'chef'],
  'dinheiro': ['finanças', 'investimento', 'bolsa', 'economia', 'renda', 'lucro']
};

export const searchEngine = {

  processQuery: (query: string): { original: string, tokens: string[], expanded: Set<string> } => {
    const clean = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Tokens limpos
    const tokens = clean.split(/[\s,.;:!?]+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));

    // Expansão Semântica (Set para evitar duplicatas)
    const expanded = new Set<string>();

    tokens.forEach(token => {
      expanded.add(token); // Adiciona a palavra original

      // 1. Busca Sinônimos diretos
      for (const [key, synonyms] of Object.entries(SEMANTIC_MAP)) {
        if (key === token) synonyms.forEach(s => expanded.add(s));
        if (synonyms.includes(token)) {
          expanded.add(key);
          synonyms.forEach(s => expanded.add(s));
        }
      }

      // 2. Stemming simples (Adiciona radical para pegar "viaj" de "viajar")
      if (token.length > 4) {
        expanded.add(token.slice(0, -1)); // remove última letra (plural simples)
        expanded.add(token.slice(0, -2)); // remove sufixo verbal comum
      }
    });

    return { original: clean, tokens, expanded };
  },

  /**
   * Verifica se uma palavra está contida na outra (Fuzzy matching leve)
   */
  isFuzzyMatch: (source: string, target: string): boolean => {
    if (source.includes(target)) return true;
    if (target.includes(source)) return true;
    // Levenshtein simplificado para erros de digitação leves poderia entrar aqui
    return false;
  },

  calculateScore: (video: Video, queryData: { original: string, tokens: string[], expanded: Set<string> }): number => {
    let score = 0;
    const expandedArray = Array.from(queryData.expanded);

    // Prepara textos do vídeo
    const vTitle = video.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const vDesc = video.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const vTags = video.tags.map(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const vTrans = (video.transcription || '').toLowerCase();
    // ADICIONA NOME DO CANAL NA BUSCA
    const vChannel = (video.creator?.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 0. BÔNUS MEGA: Se TODOS os tokens aparecem no nome do canal (busca exata por canal)
    const allTokensInChannel = queryData.tokens.length > 0 && queryData.tokens.every(token => vChannel.includes(token));
    if (allTokensInChannel) {
      score += 200; // Prioridade máxima para match completo no canal
    }

    // 1. MATCH EXATO DE FRASE (Peso Máximo)
    if (vTitle.includes(queryData.original)) score += 100;
    else if (vChannel.includes(queryData.original)) score += 150; // Canal com match exato de frase
    else if (vDesc.includes(queryData.original)) score += 40;

    // 2. MATCH POR TOKENS (Soma pontos, não penaliza)
    let matchedTokensCount = 0;

    queryData.tokens.forEach(token => {
      let tokenScore = 0;

      // Título
      if (vTitle.includes(token)) tokenScore += 30;
      // Nome do Canal
      else if (vChannel.includes(token)) tokenScore += 25;
      // Tags
      else if (vTags.some(t => t.includes(token))) tokenScore += 20;
      // Descrição
      else if (vDesc.includes(token)) tokenScore += 10;
      // Transcrição
      else if (vTrans.includes(token)) tokenScore += 5;

      if (tokenScore > 0) {
        score += tokenScore;
        matchedTokensCount++;
      }
    });

    // 3. MATCH SEMÂNTICO / SINÔNIMOS (Peso Médio)
    expandedArray.forEach(word => {
      // Evita somar duas vezes se a palavra já for um token original
      if (queryData.tokens.includes(word)) return;

      if (vTitle.includes(word)) score += 15;
      if (vChannel.includes(word)) score += 12; // Canal com sinônimo
      if (vTags.some(t => t.includes(word))) score += 10;
      if (vDesc.includes(word)) score += 5;
    });

    // 4. BÔNUS DE DENSIDADE
    // Se encontrou pelo menos uma palavra forte, mas não todas
    if (queryData.tokens.length > 1 && matchedTokensCount > 0) {
      // Se encontrou metade ou mais dos termos, boost
      if (matchedTokensCount >= queryData.tokens.length / 2) {
        score += 20;
      }
    }

    // 5. CORREÇÃO DE CONTEXTO VAZIO
    // Se a busca é "Viajar Portugal" e só acha "Viajar" (score alto) e nada de "Portugal"
    // O score ainda será positivo (ex: 30 pts do 'viajar').
    // Não aplicamos penalidade de divisão.

    return score;
  },

  search: (query: string, videos: Video[]): Video[] => {
    if (!query || !query.trim()) return videos;

    const queryData = searchEngine.processQuery(query);

    const scoredVideos = videos.map(video => {
      const score = searchEngine.calculateScore(video, queryData);
      return { ...video, relevanceScore: score };
    });

    // Filtra resultados irrelevantes (Score > 0)
    // Se a query for complexa, aceita scores parciais.
    // Ex: "Viajar Portugal" -> Vídeo "Viagem Patagônia" ganha pontos por "Viagem".
    // Score esperado: ~30-40.
    const results = scoredVideos.filter(v => (v.relevanceScore || 0) > 2);

    return results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }
};
