/**
 * 🔧 SCRIPT DE CONSOLE: Adicionar Impressões aos Anunciantes
 * 
 * Use este script no Console do Navegador (F12) para adicionar impressões
 * aos anunciantes que têm campanhas ativas mas sem saldo.
 * 
 * COMO USAR:
 * 1. Abra o Console (F12)
 * 2. Cole este código TODO e aperte ENTER
 * 3. As campanhas vão aparecer imediatamente na Home
 */

(() => {
    console.log("🔧 ADICIONAR IMPRESSÕES AOS ANUNCIANTES");
    console.log("=".repeat(60));

    // Busca anunciantes
    const advertisersStr = localStorage.getItem('fairstream_ads_db');
    if (!advertisersStr) {
        console.error("❌ Nenhum anunciante encontrado!");
        return;
    }

    const advertisers = JSON.parse(advertisersStr);
    console.log(`📊 Total de anunciantes: ${advertisers.length}`);

    // Adiciona impressões para todos os anunciantes
    const updated = advertisers.map(advertiser => {
        const oldHome = advertiser.homepageImpressions || 0;
        const oldStandard = advertiser.standardImpressions || 0;

        // Adiciona 5000 impressões para Home e 10000 para Vídeos
        const newAdvertiser = {
            ...advertiser,
            homepageImpressions: oldHome + 5000,
            standardImpressions: oldStandard + 10000
        };

        console.log(`✅ ${advertiser.name || advertiser.id}:`);
        console.log(`   Home: ${oldHome} → ${newAdvertiser.homepageImpressions}`);
        console.log(`   Vídeo: ${oldStandard} → ${newAdvertiser.standardImpressions}`);

        return newAdvertiser;
    });

    // Salva
    localStorage.setItem('fairstream_ads_db', JSON.stringify(updated));

    console.log("=".repeat(60));
    console.log("✅ IMPRESSÕES ADICIONADAS COM SUCESSO!");
    console.log("🔄 Recarregue a página para ver as campanhas na Home");
    console.log("=".repeat(60));

    // Dispara evento para atualizar a UI
    window.dispatchEvent(new Event('ad-update'));

    alert("✅ Impressões adicionadas! Recarregue a página (F5) para ver as campanhas.");
})();
