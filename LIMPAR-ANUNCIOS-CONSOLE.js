// COLE ESTE CÓDIGO NO CONSOLE DO NAVEGADOR (F12)
// Vá em http://localhost:3000/#/admin, aperte F12, cole tudo e aperte ENTER

(function () {
    console.clear();
    console.log('🔥 LIMPEZA DEFINITIVA DE ANÚNCIOS DUPLICADOS\n');

    // Pega todos os anúncios
    const key = 'fairstream_cmp_db';
    const ads = JSON.parse(localStorage.getItem(key) || '[]');

    console.log(`📊 Total de anúncios encontrados: ${ads.length}\n`);

    if (ads.length === 0) {
        console.log('❌ Nenhum anúncio encontrado!');
        return;
    }

    // Mostra todos
    console.log('📋 Lista atual:');
    ads.forEach((ad, i) => {
        console.log(`  ${i + 1}. "${ad.title}" (ID: ${ad.id}, Status: ${ad.status})`);
    });

    // Remove duplicados por título
    const unique = [];
    const seen = new Set();

    ads.forEach(ad => {
        const key = ad.title.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(ad);
            console.log(`✅ MANTIDO: "${ad.title}"`);
        } else {
            console.log(`❌ REMOVIDO (duplicado): "${ad.title}"`);
        }
    });

    console.log(`\n📊 Resultado:`);
    console.log(`   Antes: ${ads.length} anúncios`);
    console.log(`   Depois: ${unique.length} anúncios`);
    console.log(`   Removidos: ${ads.length - unique.length} duplicados\n`);

    if (unique.length < ads.length) {
        // Salva
        localStorage.setItem('fairstream_cmp_db', JSON.stringify(unique));
        console.log('💾 Salvo no localStorage!');
        console.log('🔄 Recarregando página em 2 segundos...\n');

        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        console.log('✅ Não há duplicados! Tudo limpo.');
    }
})();
