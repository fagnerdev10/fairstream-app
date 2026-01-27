// SCRIPT DE RESET - EXECUTE NO CONSOLE DO NAVEGADOR (F12)

// 1. Limpar visualizações antigas
localStorage.removeItem('fairstream_videos_db_v8');

// 2. Limpar cache de clientes Asaas
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('asaas_customer_')) {
        localStorage.removeItem(key);
    }
});

// 3. Limpar cache de pagamentos Pix
localStorage.removeItem('fairstream_pix_payments');

console.log('✅ Cache limpo! Recarregue a página (F5)');
