import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDMYUBMy7Z9MZ0dd_eVmtkz3sH8jyPqiCg";
const MODEL = "gemini-2.5-flash";

async function testGeminiGeneration() {
    console.log("🧪 Testando geração de metadata com Gemini...\n");

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `Você é um assistente especializado em criar metadata para vídeos. Analise o contexto abaixo e retorne um objeto JSON válido.

Contexto do vídeo: "Um documentário sobre a vida dos golfinhos no oceano Atlântico"

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

        console.log("⏳ Gerando metadata...\n");

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log("✅ SUCESSO! Resposta do Gemini:\n");
        console.log(text);

        const parsed = JSON.parse(text);
        console.log("\n📊 Metadata gerada:");
        console.log(`Título: ${parsed.title}`);
        console.log(`Descrição: ${parsed.description}`);
        console.log(`Tags: ${parsed.tags.join(', ')}`);
        console.log(`Capítulos: ${parsed.chapters.length}`);

    } catch (error) {
        console.error("❌ ERRO:", error.message);
    }
}

testGeminiGeneration();
