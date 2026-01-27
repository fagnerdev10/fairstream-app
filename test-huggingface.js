// Teste da API do Hugging Face
async function testHuggingFace() {
    console.log("🤗 Testando Hugging Face API...\n");

    const prompt = `Analise este contexto de vídeo e retorne APENAS um objeto JSON válido:
Contexto: "Vídeo sobre culinária brasileira mostrando receitas tradicionais"

Formato:
{
  "title": "título chamativo",
  "description": "descrição detalhada",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "summary": "resumo em uma frase",
  "chapters": [
    {"timestamp": "00:00", "title": "Introdução"},
    {"timestamp": "02:30", "title": "Desenvolvimento"},
    {"timestamp": "05:00", "title": "Conclusão"}
  ]
}`;

    try {
        console.log("📡 Enviando requisição...");

        const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 500,
                        temperature: 0.7,
                        return_full_text: false
                    }
                })
            }
        );

        console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

        const data = await response.json();

        if (response.ok) {
            console.log("✅ RESPOSTA RECEBIDA:");
            console.log(JSON.stringify(data, null, 2));

            let generatedText = "";
            if (Array.isArray(data) && data[0]?.generated_text) {
                generatedText = data[0].generated_text;
            } else if (data.generated_text) {
                generatedText = data.generated_text;
            }

            console.log("\n💬 TEXTO GERADO:");
            console.log(generatedText);

            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log("\n✅ JSON EXTRAÍDO:");
                const parsed = JSON.parse(jsonMatch[0]);
                console.log(JSON.stringify(parsed, null, 2));
            }
        } else {
            console.log("❌ ERRO:");
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("\n❌ ERRO:");
        console.error(error.message);
    }
}

testHuggingFace();
