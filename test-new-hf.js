// Teste com novo endpoint do Hugging Face
async function testNewEndpoint() {
    console.log("🤗 Testando NOVO endpoint do Hugging Face...\n");

    const prompt = "Diga apenas 'OK' se você está funcionando";

    try {
        console.log("📡 Enviando requisição...");

        const response = await fetch(
            "https://router.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 50,
                        temperature: 0.7
                    }
                })
            }
        );

        console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

        const data = await response.json();
        console.log("📦 Resposta:");
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("\n❌ ERRO:");
        console.error(error.message);
    }
}

testNewEndpoint();
