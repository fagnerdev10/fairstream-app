// Teste com diferentes versões da API
const API_KEY = "AIzaSyDMYUBMy7Z9MZ0dd_eVmtkz3sH8jyPqiCg";

async function testVersion(version, model) {
    console.log(`\n🧪 Testando: ${version} com modelo ${model}`);

    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${API_KEY}`;

    const body = {
        contents: [{
            parts: [{
                text: "Diga apenas 'OK'"
            }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ FUNCIONA! ${version}/${model}`);
            if (data.candidates && data.candidates[0]) {
                const text = data.candidates[0].content.parts[0].text;
                console.log(`   Resposta: ${text}`);
            }
            return true;
        } else {
            console.log(`❌ Erro ${response.status}: ${data.error?.message?.substring(0, 80)}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        return false;
    }
}

async function findWorkingModel() {
    console.log("🔍 Procurando modelo que funciona...\n");

    const combinations = [
        { version: 'v1', model: 'gemini-pro' },
        { version: 'v1', model: 'gemini-1.5-pro' },
        { version: 'v1', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-pro' },
        { version: 'v1beta', model: 'gemini-1.5-pro' },
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-flash-latest' },
    ];

    for (const combo of combinations) {
        const works = await testVersion(combo.version, combo.model);
        if (works) {
            console.log(`\n🎉 ENCONTRADO! Use: ${combo.version}/${combo.model}`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay entre requisições
    }
}

findWorkingModel();
