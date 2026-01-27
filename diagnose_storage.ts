import { supabase } from './services/supabaseClient';

async function diagnose() {
    console.log("🔍 Diagnosticando Storage do Supabase...");
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error("❌ Erro ao listar buckets:", error.message);
        } else {
            console.log("✅ Buckets encontrados:", buckets?.map(b => b.name) || []);
        }
    } catch (e: any) {
        console.error("❌ Erro fatal:", e.message);
    }
}

diagnose();
