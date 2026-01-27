// Cole este código no Console do navegador (F12) para ver todas as campanhas

(async () => {
    // Importa o cliente Supabase
    const { supabase } = await import('/src/services/supabaseClient.ts');

    // Busca todas as campanhas
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, type, location, status')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log('=== TODAS AS CAMPANHAS ===');
    console.table(campaigns);

    // Filtra por home
    const homeCampaigns = campaigns.filter(c =>
        c.location?.toLowerCase() === 'home' &&
        c.status?.toLowerCase() === 'active'
    );

    console.log('=== CAMPANHAS HOME ATIVAS ===');
    console.table(homeCampaigns);

    const textCampaigns = homeCampaigns.filter(c => c.type === 'text');
    const imageCampaigns = homeCampaigns.filter(c => c.type === 'image' || c.type === 'banner');

    console.log(`TEXTO: ${textCampaigns.length}, IMAGEM: ${imageCampaigns.length}`);
})();
