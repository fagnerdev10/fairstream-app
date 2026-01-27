// SCRIPT DE RESET - Cole no Console do Navegador (F12)

// 1. Limpa cache de alternância de anúncios
localStorage.removeItem('fairstream_smart_queue_v3_last_type');
localStorage.removeItem('fairstream_smart_queue_v3_last_type_v2');
localStorage.removeItem('fairstream_smart_queue_v3');

console.log('✅ Cache de alternância de anúncios resetado!');

// 2. Verifica campanhas ativas
(async () => {
    const { supabase } = await import('./services/supabaseClient');
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('location', 'video');

    console.log('📊 Campanhas ATIVAS para vídeos:', campaigns?.length || 0);

    campaigns?.forEach(c => {
        console.log(`- ${c.type === 'image' ? '🖼️' : '📝'} ${c.title} (${c.type})`);
    });
})();

// 3. Instrução
console.log(`
📌 PRÓXIMOS PASSOS:
1. Recarregue a página (F5)
2. Abra um vídeo
3. Aguarde 1 segundo
4. Veja o console para confirmar:
   - "📝 FORÇANDO TEXTO" ou "🖼️ FORÇANDO IMAGEM"
5. Recarregue o vídeo novamente para ver o OUTRO tipo
`);
