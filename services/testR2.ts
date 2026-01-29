import { r2Service } from './r2Service';

/**
 * Script de Teste V17 - Execute isto para ver se o Cloudflare está ok.
 */
export const testR2Connection = async () => {
    console.log("🚀 [TestR2] Iniciando teste de conexão...");
    const testBlob = new Blob(["FairStream R2 Test"], { type: 'text/plain' });
    try {
        const url = await r2Service.uploadFile(testBlob, 'system_test', `test_${Date.now()}.txt`);
        console.log("✅ [TestR2] SUCESSO! Arquivo enviado:", url);
        return true;
    } catch (error: any) {
        console.error("❌ [TestR2] FALHA NO TESTE:", error.message);
        if (error.message.includes("403")) console.error("DICA: Suas chaves (Access Key / Secret) estão erradas ou sem permissão.");
        if (error.message.includes("CORS")) console.error("DICA: Você NÃO aplicou o arquivo CORS_PARA_CLOUDFLARE.json no painel da Cloudflare.");
        return false;
    }
};
