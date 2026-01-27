/* 
 * SCRIPT PARA REMOVER ANÚNCIOS DUPLICADOS
 * 
 * COMO USAR:
 * 1. Abra o site: http://localhost:3000/#/admin
 * 2. Aperte F12 (Console do navegador)
 * 3. Cole este código TODO e aperte ENTER
 * 4. Depois aperte F5 para recarregar
 */

console.log('🧹 LIMPANDO ANÚNCIOS DUPLICADOS...\n');

// 1. Remove todas as chaves de campanhas
const keysToDelete = [];
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
        key.includes('campaign') ||
        key.includes('cmp') ||
        key === 'fairstream_cmp_db' ||
        key === 'fs_campaigns'
    )) {
        keysToDelete.push(key);
    }
}

console.log(`📋 Encontradas ${keysToDelete.length} chaves de campanhas:`);
keysToDelete.forEach(k => console.log(`   - ${k}`));

// Remove as chaves
keysToDelete.forEach(k => {
    localStorage.removeItem(k);
    console.log(`❌ Removido: ${k}`);
});

// 2. Recria com apenas 1 anúncio limpo
const cleanCampaign = [{
    id: 'cmp1',
    advertiserId: 'adv1',
    type: 'text',
    location: 'video',
    title: 'Curso de React Avançado',
    desktopDescription: 'Aprenda React do zero ao avançado com projetos práticos.',
    mobileDescription: 'Aprenda React do zero ao avançado.',
    targetUrl: 'https://example.com/curso-react',
    bannerImage: 'https://picsum.photos/seed/ad1/300/100',
    status: 'active',
    budget: 500.00,
    spent: 124.50,
    impressions: 1245,
    clicks: 85,
    targetCategories: ['Tecnologia', 'Educação'],
    createdAt: '2025-05-01'
}];

localStorage.setItem('fairstream_cmp_db', JSON.stringify(cleanCampaign));
console.log('✅ Criado 1 anúncio limpo em fairstream_cmp_db');

console.log('\n🎉 CONCLUÍDO!');
console.log('👉 Aperte F5 para recarregar a página');
console.log('👉 Vá em http://localhost:3000/#/admin para ver');
