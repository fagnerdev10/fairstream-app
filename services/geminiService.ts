
import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
};


const getModel = () => {
  return (import.meta as any).env?.VITE_GEMINI_MODEL || "gemini-2.5-flash";
};

export const isApiKeyAvailable = (): boolean => {
  return !!getApiKey();
};

/**
 * Generates optimized metadata (title, description, tags, chapters) for a video based on raw input.
 */
export const generateVideoMetadata = async (rawInput: string) => {
  if (!rawInput || rawInput.trim().length < 3) {
    return {
      title: "Novo Vídeo",
      description: "Adicione uma descrição para o seu vídeo.",
      tags: ["Vídeo", "Novo", "Conteúdo"],
      summary: "Novo vídeo",
      chapters: [
        { timestamp: "00:00", title: "Introdução" },
        { timestamp: "02:30", title: "Desenvolvimento" },
        { timestamp: "05:00", title: "Conclusão" }
      ]
    };
  }

  const apiKey = getApiKey();
  const modelName = getModel();

  try {
    console.log("🤖 Usando Google Gemini API...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `Você é um assistente especializado em criar metadata para vídeos. Analise o contexto abaixo e retorne um objeto JSON válido.

Contexto do vídeo: "${rawInput}"

Retorne exatamente este formato JSON:
{
  "title": "um título chamativo, criativo e SEO-friendly (máximo 60 caracteres)",
  "description": "uma descrição detalhada e atraente do vídeo (máximo 250 caracteres)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "summary": "um resumo em uma frase curta",
  "chapters": [
    {"timestamp": "00:00", "title": "título do primeiro capítulo"},
    {"timestamp": "03:00", "title": "título do segundo capítulo"},
    {"timestamp": "06:00", "title": "título do terceiro capítulo"}
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const parsed = JSON.parse(text);
    console.log("✅ Metadata gerada com sucesso pelo Gemini!");
    return parsed;

  } catch (error: any) {
    console.error("❌ Erro ao gerar metadata:", error.message);

    // Fallback inteligente
    const words = rawInput.trim().split(' ');
    const capitalizedWords = words.map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    const title = capitalizedWords.slice(0, 8).join(' ');

    const commonWords = ['o', 'a', 'de', 'da', 'do', 'para', 'com', 'em', 'um', 'uma', 'sobre', 'como', 'que', 'e'];
    const tags = words
      .filter(word => word.length > 3 && !commonWords.includes(word.toLowerCase()))
      .slice(0, 5)
      .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());

    const defaultTags = ['Conteúdo', 'Vídeo', 'Novo', 'Interessante', 'Viral'];
    while (tags.length < 5) {
      const randomTag = defaultTags[Math.floor(Math.random() * defaultTags.length)];
      if (!tags.includes(randomTag)) tags.push(randomTag);
    }

    return {
      title: title || "Novo Vídeo",
      description: `${rawInput}\n\n📌 Conteúdo gerado automaticamente.`,
      tags: tags,
      summary: rawInput.substring(0, 100) + (rawInput.length > 100 ? '...' : ''),
      chapters: [
        { timestamp: "00:00", title: "Introdução" },
        { timestamp: "02:30", title: "Desenvolvimento" },
        { timestamp: "05:00", title: "Conclusão" }
      ]
    };
  }
};

/**
 * Generates automatic chapters based on the description/context.
 */
export const generateChapters = async (description: string) => {
  if (!description || description.trim().length < 3) {
    return [
      { timestamp: "00:00", title: "Início" },
      { timestamp: "03:00", title: "Desenvolvimento" },
      { timestamp: "06:00", title: "Conclusão" }
    ];
  }

  const apiKey = getApiKey();
  const modelName = getModel();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `Crie capítulos para um vídeo de 10-15 minutos baseado neste contexto: "${description}".

Retorne exatamente este formato JSON:
{
  "chapters": [
    {"timestamp": "00:00", "title": "título interessante"},
    {"timestamp": "03:00", "title": "outro título"},
    {"timestamp": "06:00", "title": "mais um título"}
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return parsed.chapters || [];
  } catch (error) {
    console.warn("Erro ao gerar capítulos:", error);
    return [
      { timestamp: "00:00", title: "Início" },
      { timestamp: "03:00", title: "Desenvolvimento" },
      { timestamp: "06:00", title: "Conclusão" }
    ];
  }
};

/**
 * Explains why a video was recommended to a specific user profile.
 */
export const explainRecommendation = async (videoTitle: string, userInterests: string[]) => {
  return `Recomendado com base nos seus interesses: ${userInterests.slice(0, 3).join(', ')}`;
};

/**
 * Simulates analyzing comment sentiment for the "Community Score".
 */
export const analyzeCommunitySentiment = async (comments: string[]) => {
  return {
    score: 75 + Math.floor(Math.random() * 20),
    summary: "Engajamento positivo da comunidade."
  };
};
