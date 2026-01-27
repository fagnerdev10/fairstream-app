import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDMYUBMy7Z9MZ0dd_eVmtkz3sH8jyPqiCg";

async function testApiKey() {
    console.log("🔑 Testando chave de API do Gemini...\n");
    console.log(`Chave: ${API_KEY.substring(0, 15)}...${API_KEY.substring(API_KEY.length - 5)}`);
    console.log(`Tamanho: ${API_KEY.length} caracteres\n`);

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        // Tentar o modelo mais simples e antigo
        console.log("🧪 Tentando modelo: gemini-pro");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log("⏳ Enviando requisição simples...");
        const result = await model.generateContent("Diga apenas 'teste ok'");
        const response = result.response;
        const text = response.text();

        console.log("\n✅ SUCESSO! A API está funcionando!");
        console.log(`Resposta: ${text}`);

    } catch (error) {
        console.error("\n❌ ERRO DETALHADO:");
        console.error(`Tipo: ${error.constructor.name}`);
        console.error(`Mensagem: ${error.message}`);
        console.error(`Status: ${error.status}`);
        console.error(`StatusText: ${error.statusText}`);

        if (error.status === 404) {
            console.log("\n💡 SOLUÇÃO:");
            console.log("O modelo não foi encontrado. Isso pode significar:");
            console.log("1. A chave de API não tem acesso aos modelos Gemini");
            console.log("2. A chave de API está incorreta ou expirada");
            console.log("3. Você precisa ativar a API do Gemini no Google Cloud Console");
            console.log("\n📝 Passos para resolver:");
            console.log("1. Acesse: https://aistudio.google.com/app/apikey");
            console.log("2. Crie uma nova chave de API");
            console.log("3. Substitua a chave no arquivo .env.local");
        } else if (error.status === 403) {
            console.log("\n💡 SOLUÇÃO:");
            console.log("Acesso negado. Verifique:");
            console.log("1. Se a chave de API está ativa");
            console.log("2. Se você tem cota disponível");
            console.log("3. Se a API está habilitada no projeto");
        } else if (error.status === 429) {
            console.log("\n💡 SOLUÇÃO:");
            console.log("Limite de requisições excedido. Aguarde alguns minutos.");
        }
    }
}

testApiKey();
