
/**
 * Gera um avatar no estilo "Avataaars" (Flat, Vetorial, Expressivo).
 * Utiliza a API pública e gratuita do DiceBear para garantir o estilo exato solicitado.
 * Converte para Base64 para persistência local.
 */
export async function generateAvatarSvgBase64(seed: string, category: string): Promise<string> {
  // Combina nome e categoria para variar a seed
  const finalSeed = `${seed}-${category}`.trim().replace(/\s+/g, '');
  
  // URL do estilo exato (Avataaars)
  // Adicionamos parâmetros para garantir fundo colorido e boa aparência
  const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(finalSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc&radius=50`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao gerar avatar');
    
    const svgText = await response.text();
    
    // Codificação Base64 segura para SVG (tratando caracteres unicode)
    const base64 = btoa(unescape(encodeURIComponent(svgText)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error("Erro ao gerar avatar estilo Avataaars:", error);
    // Fallback local simples caso a API falhe (sem internet)
    return generateFallbackLocal(seed);
  }
}

/**
 * Gera múltiplas variações de avatar para o usuário escolher.
 */
export async function generateAvatarVariations(seed: string, category: string, count: number = 6): Promise<string[]> {
  const promises = [];
  for (let i = 0; i < count; i++) {
    // Adiciona entropia à seed para garantir variações diferentes
    const variationSeed = `${seed}-${category}-${i}-${Math.random()}`;
    promises.push(generateAvatarSvgBase64(variationSeed, ''));
  }
  return Promise.all(promises);
}

function generateFallbackLocal(str: string): string {
  // Fallback de emergência (apenas cores e inicial) se estiver offline
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color = `hsl(${hue}, 70%, 50%)`;
  
  const svg = `
  <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="${color}" rx="128" ry="128"/>
    <text x="50%" y="50%" dy=".3em" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="120">
      ${str.charAt(0).toUpperCase()}
    </text>
  </svg>`.trim();
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
