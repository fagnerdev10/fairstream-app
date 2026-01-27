// DEPURAÇÃO DE CAMPANHAS - Cole no console (F12)

console.log('🔍 VERIFICANDO SISTEMA DE ALTERNÂNCIA');

// 1. Verifica localStorage
const lastType = localStorage.getItem('fairstream_smart_queue_v3_last_type_v2');
console.log('📌 Último tipo exibido:', lastType);

// 2. Limpa cache
localStorage.removeItem('fairstream_smart_queue_v3_last_type_v2');
localStorage.removeItem('fairstream_smart_queue_v3_last_type');
localStorage.removeItem('fairstream_smart_queue_v3');
console.log('✅ Cache limpo!');

// 3. Verifica campanhas ativas
(async () => {
    const { supabase } = await import('./services/supabaseClient');
    const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('location', 'video');

    console.log('📊 CAMPANHAS NO BANCO (location=video):');
    const active = data.filter(c => c.status.toLowerCase() === 'active');

    const images = active.filter(c => c.type === 'image');
    const texts = active.filter(c => c.type === 'text');

    console.log(`🖼️ IMAGENS: ${images.length}`);
    images.forEach(c => console.log(`  - ${c.title}`));

    console.log(`📝 TEXTOS: ${texts.length}`);
    texts.forEach(c => console.log(`  - ${c.title}`));

    if (images.length === 0) {
        console.error('❌ SEM CAMPANHAS DE IMAGEM ATIVAS!');
    }
    if (texts.length === 0) {
        console.error('❌ SEM CAMPANHAS DE TEXTO ATIVAS!');
    }

    console.log('\n📌 PRÓXIMO PASSO: Recarregue a página (F5) e abra um vídeo');
})();
