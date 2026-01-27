// Teste direto da API do Gemini com a chave fornecida
const API_KEY = "AIzaSyDMYUBMy7Z9MZ0dd_eVmtkz3sH8jyPqiCg";

async function testDirect() {
    console.log("🧪 Testando API do Gemini diretamente...\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const body = {
        contents: [{
            parts: [{
                text: "Diga apenas 'OK' se você está funcionando"
            }]
        }]
    };

    try {
        console.log("📡 Enviando requisição para:", url.substring(0, 80) + "...");

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        console.log(`\n📊 Status: ${response.status} ${response.statusText}`);

        const data = await response.json();

        if (response.ok) {
            console.log("\n✅ SUCESSO! Resposta:");
            console.log(JSON.stringify(data, null, 2));

            if (data.candidates && data.candidates[0]) {
                const text = data.candidates[0].content.parts[0].text;
                console.log(`\n💬 Texto gerado: ${text}`);
            }
        } else {
            console.log("\n❌ ERRO! Resposta:");
            console.log(JSON.stringify(data, null, 2));

            if (data.error) {
                console.log(`\n🔴 Mensagem de erro: ${data.error.message}`);
                console.log(`🔴 Status: ${data.error.status}`);
            }
        }

    } catch (error) {
        console.error("\n❌ ERRO na requisição:");
        console.error(error.message);
    }
}

testDirect();
