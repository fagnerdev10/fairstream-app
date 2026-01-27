// 🔧 SCRIPT DE CORREÇÃO - LIMPAR FILAS E FORÇAR RECONSTRUÇÃO
// Cole este código no Console do navegador (F12) e pressione ENTER

console.log('🔧 Iniciando limpeza e reconstrução de filas...');

// 1. Limpa as filas antigas (que podem estar com cache ruim)
localStorage.removeItem('fairstream_ad_queues_v2');
console.log('✅ Filas antigas removidas');

// 2. Verifica se a campanha "Teste Pagina Principal" existe
const campaigns = JSON.parse(localStorage.getItem('fairstream_cmp_db') || '[]');
const testeCampanha = campaigns.find(c => c.title.includes('Teste Pagina Principal'));

if (testeCampanha) {
    console.log('✅ Campanha encontrada:', {
        titulo: testeCampanha.title,
        tipo: testeCampanha.type,
        local: testeCampanha.location,
        status: testeCampanha.status
    });

    // Garante que está ativa e configurada corretamente
    testeCampanha.status = 'active';
    testeCampanha.location = 'home';
    testeCampanha.type = 'text';

    // Salva as alterações
    const index = campaigns.findIndex(c => c.id === testeCampanha.id);
    campaigns[index] = testeCampanha;
    localStorage.setItem('fairstream_cmp_db', JSON.stringify(campaigns));
    console.log('✅ Campanha atualizada e garantida como ATIVA');
} else {
    console.warn('⚠️ Campanha "Teste Pagina Principal" não encontrada!');
}

// 3. Garante que o anunciante tem saldo
const advertisers = JSON.parse(localStorage.getItem('fairstream_ads_db') || '[]');
if (advertisers.length > 0) {
    advertisers[0].homepageImpressions = 1000;
    advertisers[0].standardImpressions = 1000;
    localStorage.setItem('fairstream_ads_db', JSON.stringify(advertisers));
    console.log('✅ Saldo do anunciante garantido: 1000 impressões');
}

// 4. Força evento de atualização
window.dispatchEvent(new Event('ad-update'));

console.log('✅ CONCLUÍDO! Recarregue a página (F5) agora.');
console.log('📊 A campanha de texto deve aparecer na Home.');
