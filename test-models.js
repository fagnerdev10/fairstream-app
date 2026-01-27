import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDMYUBMy7Z9MZ0dd_eVmtkz3sH8jyPqiCg";

async function listModels() {
    console.log("🔍 Listando modelos disponíveis...\n");

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        // Testar modelos comuns
        const modelsToTest = [
            "gemini-pro",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-2.0-flash-exp"
        ];

        for (const modelName of modelsToTest) {
            try {
                console.log(`\n🧪 Testando: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Diga apenas 'OK'");
                const text = result.response.text();
                console.log(`✅ ${modelName} - FUNCIONA! Resposta: ${text.substring(0, 50)}`);
            } catch (error) {
                console.log(`❌ ${modelName} - ERRO: ${error.message.substring(0, 100)}`);
            }
        }

    } catch (error) {
        console.error("\n❌ ERRO GERAL:");
        console.error(error.message);
    }
}

listModels();
