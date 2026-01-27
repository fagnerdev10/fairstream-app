import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pervmfsykzpyztvfoiir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcnZtZnN5a3pweXp0dmZvaWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODczNzQsImV4cCI6MjA4NDE2MzM3NH0.U3e47h2CUg8mBtA-ZSD-dufYG5uD2l-cI8FRalfYOaE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log("🔍 Diagnosticando Storage do Supabase...");
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error("❌ Erro ao listar buckets:", error.message);
        } else {
            console.log("✅ Buckets encontrados:", buckets?.map(b => b.name) || "Nenhum");
        }
    } catch (e: any) {
        console.error("❌ Erro fatal:", e.message);
    }
}

diagnose();
