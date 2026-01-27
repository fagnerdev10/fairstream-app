import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDMYUBMy7Z9MZ0dd_eVmtkz3sH8jyPqiCg";
const MODEL = "gemini-1.5-flash";

async function testGemini() {
    console.log("🧪 Testando API do Gemini...");
    console.log(`📌 Modelo: ${MODEL}`);
    console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `
      Analyze the following video context and generate optimized metadata for a video platform.
      Context: "Um vídeo sobre culinária brasileira, mostrando receitas tradicionais"
      
      Return a JSON object with this EXACT structure:
      {
        "title": "string",
        "description": "string (max 300 chars)",
        "tags": ["string", "string", "string", "string", "string"],
        "summary": "string (one sentence)",
        "chapters": [
          {"timestamp": "00:00", "title": "string"},
          {"timestamp": "02:30", "title": "string"},
          {"timestamp": "05:00", "title": "string"}
        ]
      }
    `;

        console.log("\n⏳ Enviando requisição...");
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log("\n✅ Resposta recebida:");
        console.log(text);

        const parsed = JSON.parse(text);
        console.log("\n✅ JSON parseado com sucesso:");
        console.log(JSON.stringify(parsed, null, 2));

    } catch (error) {
        console.error("\n❌ ERRO:");
        console.error(error.message);
        console.error(error);
    }
}

testGemini();
