/**
 * ===================================================================
 * SERVIÇO DE PAGAMENTO MENSAL AUTOMÁTICO - MODO HÍBRIDO (SUPABASE)
 * ===================================================================
 * 
 * Responsável por processar pagamentos de MONETIZAÇÃO (50/50) no dia 05
 * de cada mês de forma automática com transferências reais via Asaas.
 * 
 * FLUXO:
 * 1. Views/Impressões acumulam na tabela 'videos' do Supabase
 * 2. No dia 05, sistema calcula 50% para criador
 * 3. Transfere via Asaas AUTOMATICAMENTE (createTransfer)
 * 4. Atualiza 'paid_ad_impressions' na tabela videos
 * 5. Registra pagamento na tabela 'payouts'
 */

import { asaasService } from './asaasService';
import { supabase } from './supabaseClient';

interface MonthlyPayoutData {
    creatorId: string;
    creatorName: string;
    creatorEmail: string;
    creatorWalletId: string;
    totalViews: number; // Impressões
    totalRevenue: number; // 50% do valor bruto (parte do criador)
    platformRevenue: number; // 50% do valor bruto (parte da plataforma)
    month: string;
    year: number;
}

interface PayoutResult {
    success: boolean;
    creatorId: string;
    creatorName: string;
    amount: number;
    asaasPaymentId?: string;
    error?: string;
}

export const monthlyPayoutService = {
    /**
     * Verifica se hoje é dia de pagamento (dia 05)
     */
    isTodayPayoutDay: (): boolean => {
        const now = new Date();
        const day = now.getDate();
        return day === 5;
    },

    /**
     * Retorna a data do próximo pagamento (dia 05)
     */
    getNextPayoutDate: (): string => {
        const now = new Date();
        const currentDay = now.getDate();

        let payoutDate: Date;

        // Se ainda não é dia 05 deste mês, próximo pagamento é dia 05 deste mês
        if (currentDay < 5) {
            payoutDate = new Date(now.getFullYear(), now.getMonth(), 5);
        } else {
            // Caso contrário, próximo pagamento é dia 05 do próximo mês
            payoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
        }

        // Retorna formatado (ex: "05/02/2026")
        return payoutDate.toLocaleDateString('pt-BR');
    },

    /**
     * Calcula o CPV (Custo Por View) atual
     * Busca do Supabase ou Cache Local
     */
    getCurrentCPV: async (): Promise<number> => {
        try {
            // Tenta Supabase - busca a coluna cpm_100k da tabela ad_pricing
            const { data, error } = await supabase.from('ad_pricing').select('cpm_100k').single();
            if (!error && data && data.cpm_100k) {
                console.log('[CPV] Valor do Supabase:', data.cpm_100k);
                return data.cpm_100k;
            }

            // Fallback Local
            const pricingStr = localStorage.getItem('fairstream_pricing_db');
            if (pricingStr) {
                const pricing = JSON.parse(pricingStr);
                return pricing.p100k || 0.20;
            }
        } catch (e) {
            console.error("Erro ao ler CPV:", e);
        }
        return 0.20; // Default
    },

    /**
     * Coleta todos os criadores com monetização pendente
     */
    getPendingMonetizationPayouts: async (): Promise<MonthlyPayoutData[]> => {
        const results: MonthlyPayoutData[] = [];
        const cpv = await monthlyPayoutService.getCurrentCPV();
        const now = new Date();
        const month = now.toLocaleDateString('pt-BR', { month: 'long' });
        const year = now.getFullYear();

        try {
            // 1. Buscar vídeos com impressões não pagas
            // Precisa ter ad_impressions > paid_ad_impressions
            // Como Supabase não suporta comparação de colunas no select simples facilmente sem RPC,
            // vamos buscar vídeos onde ad_impressions > 0 e filtrar no cliente por enquanto (ou usar RPC futuramente)
            const { data: videos, error } = await supabase
                .from('videos')
                .select(`
                    id, 
                    creator_id, 
                    ad_impressions, 
                    paid_ad_impressions
                `)
                .gt('ad_impressions', 0); // Otimização simples

            if (error || !videos) {
                console.error("Erro ao buscar videos para payout:", error);
                return [];
            }

            // 2. Agrupar por criador
            const creatorMap = new Map<string, {
                totalUnpaidImpressions: number;
                videoIds: string[];
            }>();

            videos.forEach((video: any) => {
                const unpaid = (video.ad_impressions || 0) - (video.paid_ad_impressions || 0);
                if (unpaid <= 0) return;

                if (!creatorMap.has(video.creator_id)) {
                    creatorMap.set(video.creator_id, {
                        totalUnpaidImpressions: 0,
                        videoIds: []
                    });
                }

                const entry = creatorMap.get(video.creator_id)!;
                entry.totalUnpaidImpressions += unpaid;
                entry.videoIds.push(video.id);
            });

            // 3. Buscar detalhes dos criadores (Wallet ID)
            const creatorIds = Array.from(creatorMap.keys());
            if (creatorIds.length === 0) return [];

            const { data: creators, error: creatorError } = await supabase
                .from('profiles')
                .select('id, name, email, asaas_customer_id')
                .in('id', creatorIds);

            if (creatorError) console.error("Erro ao buscar criadores:", creatorError);
            const creatorsList = creators || [];

            // 4. Montar Payload
            for (const creator of creatorsList) {
                const entry = creatorMap.get(creator.id);
                const walletId = creator.asaas_customer_id;

                if (!entry || !walletId) continue;

                const totalBruto = entry.totalUnpaidImpressions * cpv;
                const creatorRevenue = totalBruto * 0.50;
                const platformRevenue = totalBruto * 0.50;

                results.push({
                    creatorId: creator.id,
                    creatorName: creator.name || 'Criador',
                    creatorEmail: creator.email || '',
                    creatorWalletId: creator.asaas_customer_id,
                    totalViews: entry.totalUnpaidImpressions,
                    totalRevenue: Number(creatorRevenue.toFixed(2)),
                    platformRevenue: Number(platformRevenue.toFixed(2)),
                    month,
                    year
                });
            }

            return results;
        } catch (error) {
            console.error("Erro ao coletar pagamentos pendentes:", error);
            return results;
        }
    },

    /**
     * Processa um único pagamento para um criador
     */
    processCreatorPayout: async (payout: MonthlyPayoutData): Promise<PayoutResult> => {
        try {
            console.log(`[Monthly Payout] Processando pagamento para ${payout.creatorName}...`);
            const paymentDescription = `Monetização ${payout.month}/${payout.year} - ${payout.totalViews} views`;

            // ✅ TRANSFERÊNCIA REAL VIA ASAAS API
            let transferId = `DEMO_${Date.now()}`;
            try {
                const transfer = await asaasService.createTransfer(
                    payout.creatorWalletId,
                    payout.totalRevenue,
                    paymentDescription
                );
                transferId = transfer.id;
            } catch (asaasError: any) {
                console.error(`[Monthly Payout] ❌ Erro na transferência Asaas:`, asaasError);
                throw new Error(`Falha na transferência: ${asaasError.message}`);
            }

            // Marcar views como pagas (Update Supabase)
            await monthlyPayoutService.markViewsAsPaid(payout.creatorId);

            // Registrar no histórico (Insert Payout)
            await monthlyPayoutService.recordPayout(payout, transferId);

            return {
                success: true,
                creatorId: payout.creatorId,
                creatorName: payout.creatorName,
                amount: payout.totalRevenue,
                asaasPaymentId: transferId
            };

        } catch (error: any) {
            console.error(`[Monthly Payout] ❌ Erro ao processar:`, error);
            return {
                success: false,
                creatorId: payout.creatorId,
                creatorName: payout.creatorName,
                amount: payout.totalRevenue,
                error: error.message || 'Erro desconhecido'
            };
        }
    },

    /**
     * Marca todas as views de um criador como pagas no Supabase
     */
    markViewsAsPaid: async (creatorId: string) => {
        try {
            // Em SQL puro seria: SET paid_ad_impressions = ad_impressions WHERE creator_id = X
            // Como Supabase JS não permite setar coluna = outra_coluna diretamente no update sem RPC,
            // vamos buscar e atualizar em lote ou usar RPC se tivéssemos.
            // Solução segura: Ler ID e Current AdImpressions, e Atualizar.

            const { data: videos } = await supabase
                .from('videos')
                .select('id, ad_impressions')
                .eq('creator_id', creatorId);

            if (!videos) return;

            // Idealmente faríamos um RPC, mas loop com Promises é aceitável para volume baixo/médio
            const updates = videos.map(v =>
                supabase.from('videos')
                    .update({ paid_ad_impressions: v.ad_impressions })
                    .eq('id', v.id)
            );

            await Promise.all(updates);

            // Backup Local para UI não quebrar se ainda usar localStorage em outro lugar
            monthlyPayoutService.syncLocalVideosAsPaid(creatorId);

        } catch (error) {
            console.error("Erro ao marcar views como pagas:", error);
        }
    },

    syncLocalVideosAsPaid: (creatorId: string) => {
        try {
            const videosStr = localStorage.getItem('fairstream_videos_db_v8');
            if (!videosStr) return;
            const videos = JSON.parse(videosStr);
            const updated = videos.map((v: any) => {
                if (v.creator?.id === creatorId) {
                    return { ...v, paidViews: v.views, paidAdImpressions: v.adImpressions || 0 };
                }
                return v;
            });
            localStorage.setItem('fairstream_videos_db_v8', JSON.stringify(updated));
        } catch { }
    },

    /**
     * Registra o pagamento no histórico (Supabase 'payouts')
     */
    recordPayout: async (payout: MonthlyPayoutData, transferId?: string) => {
        try {
            // Insert Supabase
            const { error } = await supabase.from('payouts').insert({
                creator_id: payout.creatorId,
                amount: payout.totalRevenue,
                status: 'completed',
                wallet_id: payout.creatorWalletId,
                reference_month: `${payout.month}/${payout.year}`,
                type: 'monetization',
                transaction_id: transferId
            });

            if (error) console.error("Erro ao gravar payout Supabase:", error);

        } catch (error) {
            console.error("Erro ao registrar pagamento:", error);
        }
    },

    /**
     * Processa TODOS os pagamentos mensais
     */
    processAllMonthlyPayouts: async (): Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: PayoutResult[];
    }> => {
        console.log("🚀 INICIANDO PROCESSAMENTO (Supabase)...");

        const pending = await monthlyPayoutService.getPendingMonetizationPayouts();

        if (pending.length === 0) return { total: 0, succeeded: 0, failed: 0, results: [] };

        const results: PayoutResult[] = [];
        let succeeded = 0;
        let failed = 0;

        for (const payout of pending) {
            const result = await monthlyPayoutService.processCreatorPayout(payout);
            results.push(result);
            if (result.success) succeeded++;
            else failed++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        window.dispatchEvent(new Event('payout-processed'));

        return { total: pending.length, succeeded, failed, results };
    },

    /**
     * Obtém histórico (Supabase)
     */
    getPayoutHistory: async () => {
        try {
            // Precisamos fazer join com profiles para pegar o nome
            const { data, error } = await supabase
                .from('payouts')
                .select(`
                    *,
                    profiles:creator_id (name)
                 `)
                .eq('type', 'monetization')
                .order('created_at', { ascending: false });

            if (error || !data) return [];

            return data.map((p: any) => ({
                id: p.id,
                creatorId: p.creator_id,
                creatorName: p.profiles?.name || 'Desconhecido',
                amount: p.amount,
                platformAmount: p.amount, // Estimado (50/50)
                views: 0, // Histórico simples não guarda views exatas no schema atual, mas ok
                month: p.reference_month?.split('/')[0],
                year: p.reference_month?.split('/')[1],
                processedAt: p.created_at,
                asaasTransferId: p.transaction_id
            }));

        } catch (error) {
            console.error("Erro ao buscar histórico:", error);
            return [];
        }
    },

    scheduleAutomaticPayout: () => {
        // Implementação simplificada para não poluir
        // Pode chamar os métodos e logar
    }
};
