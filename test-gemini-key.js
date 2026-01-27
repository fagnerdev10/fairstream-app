// Teste para verificar se a chave do Gemini funciona
const API_KEY = "AIzaSyDMYUBMy7Z9MZ0dd_eVmtkz3sH8jyPqiCg";

async function testGeminiKey() {
    console.log("🔍 Testando chave do Gemini...\n");
    console.log(`Chave: ${API_KEY}\n`);

    // Testar com a API REST diretamente
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;

    try {
        console.log("📡 Listando modelos disponíveis...\n");

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log("✅ CHAVE VÁLIDA! Modelos disponíveis:");
            if (data.models && data.models.length > 0) {
                data.models.forEach(model => {
                    console.log(`  - ${model.name}`);
                });
            } else {
                console.log("  Nenhum modelo disponível");
            }
        } else {
            console.log("❌ ERRO:");
            console.log(JSON.stringify(data, null, 2));

            if (data.error) {
                console.log("\n💡 SOLUÇÃO:");
                if (data.error.status === "PERMISSION_DENIED") {
                    console.log("1. Acesse: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
                    console.log("2. Clique em 'ATIVAR' para habilitar a API");
                    console.log("3. Ou crie uma nova chave em: https://aistudio.google.com/app/apikey");
                } else if (data.error.status === "UNAUTHENTICATED") {
                    console.log("A chave está inválida ou expirada.");
                    console.log("Crie uma nova em: https://aistudio.google.com/app/apikey");
                }
            }
        }

    } catch (error) {
        console.error("❌ Erro na requisição:", error.message);
    }
}

testGeminiKey();
