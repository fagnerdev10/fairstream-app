
import { Balance } from '../types';
import { supabase } from './supabaseClient';
import { monthlyPayoutService } from './monthlyPayoutService';

const IS_PRODUCTION = false;
const MINIMUM_PAYOUT = 1.00;

export const payoutService = {
    getPayoutConfig: () => ({
        minAmount: MINIMUM_PAYOUT,
        isTestMode: !IS_PRODUCTION
    }),

    getMonthName: (dateStr?: string) => {
        const date = dateStr ? new Date(dateStr) : new Date();
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        return months[date.getMonth()] || "Janeiro";
    },

    getShortMonthName: (dateStr?: string) => {
        const date = dateStr ? new Date(dateStr) : new Date();
        const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        return months[date.getMonth()] || "JAN";
    },

    getNextPayoutDate: () => {
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        if (day === 5) {
            return "Hoje: repasse disponível";
        }

        let targetMonth = month;
        let targetYear = year;

        if (day > 5) {
            targetMonth++;
            if (targetMonth > 12) {
                targetMonth = 1;
                targetYear++;
            }
        }

        return `${String(5).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}/${targetYear}`;
    },

    /**
     * Obtém o saldo do criador diretamente do Supabase
     * - Pending: Lido diretamente de accumulated_revenue (valor TRAVADO no momento da impressão)
     * - Paid: Histórico da tabela payouts
     */
    getCreatorBalance: async (creatorId: string): Promise<Balance> => {
        try {
            // 1. Buscar receita acumulada TRAVADA (accumulated_revenue - paid_revenue)
            const { data: videos } = await supabase
                .from('videos')
                .select('ad_impressions, paid_ad_impressions, accumulated_revenue, paid_revenue')
                .eq('creator_id', creatorId);

            let pendingRevenue = 0;
            let totalImpressions = 0;

            if (videos) {
                // Busca o CPV (0.20 é o padrão)
                const cpv = 0.20;

                videos.forEach(v => {
                    // Usa accumulated_revenue se existir, senão calcula do jeito antigo como fallback
                    let accRevenue = Number(v.accumulated_revenue) || 0;
                    const adImpressions = Number(v.ad_impressions) || 0;

                    // Fallback: se tiver impressões mas a receita estiver zerada, calcula na hora para o dashboard
                    if (accRevenue === 0 && adImpressions > 0) {
                        accRevenue = adImpressions * cpv;
                    }

                    const paidRevenue = Number(v.paid_revenue) || 0;
                    const unpaidRevenue = accRevenue - paidRevenue;

                    if (unpaidRevenue > 0) {
                        pendingRevenue += unpaidRevenue;
                    }

                    const unpaidImpressions = (v.ad_impressions || 0) - (v.paid_ad_impressions || 0);
                    if (unpaidImpressions > 0) totalImpressions += unpaidImpressions;
                });
            }

            pendingRevenue = Number(pendingRevenue.toFixed(2));

            // 2. Calcular Saldo Pago (Histórico) do Supabase
            const { data: history } = await supabase
                .from('payouts')
                .select('amount')
                .eq('creator_id', creatorId)
                .eq('status', 'completed');

            const paidTotal = history
                ? history.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
                : 0;

            const membershipTotal = 0;

            return {
                available: paidTotal,
                pending: pendingRevenue,
                totalEarned: Number((paidTotal + pendingRevenue).toFixed(2)),
                totalWithdrawn: 0,
                monetizationTotal: pendingRevenue,
                membershipTotal: membershipTotal,
                viewsCount: totalImpressions,
                membershipCount: 0
            };

        } catch (e) {
            console.error("Error in getCreatorBalance (Supabase):", e);
            return { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0, monetizationTotal: 0, membershipTotal: 0, viewsCount: 0, membershipCount: 0 };
        }
    },

    getPendingMonthlyPayouts: async () => {
        // Redireciona para o serviço centralizado que já faz a query correta no Supabase
        // Adicionando um mapeamento para manter compatibilidade com quem chama esperando { total, brutoTotal... }
        const payouts = await monthlyPayoutService.getPendingMonetizationPayouts();

        return payouts.map(p => ({
            creatorId: p.creatorId,
            name: p.creatorName,
            email: p.creatorEmail,
            total: p.totalRevenue, // Valor líquido a receber (50%)
            brutoTotal: p.totalRevenue * 2, // Estimativa do bruto
            monetizationTotal: p.totalRevenue,
            viewsCount: p.totalViews, // Impressões
            count: 1
        }));
    },

    getPaidMonthlyPayouts: async () => {
        const history = await monthlyPayoutService.getPayoutHistory();
        return history.map(h => ({
            creatorId: h.creatorId,
            total: h.amount,
            paidAt: h.processedAt,
            count: 1 // Simplificação
        }));
    },

    // Métodos legados de Split (LocalStorage) - Mantidos para não quebrar outras partes se houver
    // Métodos legados e novos para Split (Híbrido: Supabase + LocalStorage)
    getSplitPaymentsByCreator: (creatorId: string) => {
        try {
            const stored = localStorage.getItem('fairstream_splits');
            const allSplits = stored ? JSON.parse(stored) : [];
            return Array.isArray(allSplits) ? allSplits.filter((s: any) => s.creatorId === creatorId) : [];
        } catch { return []; }
    },

    /**
     * Busca doações/splits do Supabase
     */
    /**
     * Busca doações/splits do Supabase (Versão Unificada)
     */
    // getSplitsFromSupabase removido daqui para evitar duplicação. Veja abaixo.

    registerSplitPayment: async (record: any) => {
        // 1. LocalStorage (Compatibilidade/Backup - Instantâneo)
        try {
            const stored = localStorage.getItem('fairstream_splits');
            const allSplits = stored ? JSON.parse(stored) : [];
            allSplits.push(record);
            localStorage.setItem('fairstream_splits', JSON.stringify(allSplits));
        } catch (e) {
            console.error("Erro ao salvar split no LocalStorage:", e);
        }

        // 2. Supabase (Persistência Real - Async)
        try {
            const now = new Date();
            const monthStr = `${now.getDate() < 5 ? (now.getMonth() === 0 ? 12 : now.getMonth()) : (now.getMonth() + 1)}/${now.getFullYear()}`;

            await supabase.from('payouts').insert({
                creator_id: record.creatorId,
                amount: record.totalAmount,
                status: 'completed',
                wallet_id: 'SPLIT_DIRECT', // Marcador de pagamento direto
                reference_month: monthStr,
                type: record.type || 'donation',
                transaction_id: record.paymentId
            });
        } catch (e) {
            console.error("Erro ao salvar split no Supabase:", e);
        }
    },

    // --- LEITURA DE SPLITS (PAINEL FISCAL) ---
    getSplitsFromSupabase: async () => {
        try {
            const { data, error } = await supabase
                .from('payouts')
                .select('*')
                .eq('wallet_id', 'SPLIT_DIRECT');

            if (error) throw error;

            return (data || []).map((d: any) => ({
                id: d.id,
                creatorId: d.creator_id,
                totalAmount: d.amount,
                createdAt: d.paid_at || d.created_at,
                paymentId: d.transaction_id,
                type: d.type || 'donation'
            }));
        } catch (e) {
            console.error("Erro ao buscar splits do Supabase:", e);
            return [];
        }
    },

    // Função unificada para processar todos os pagamentos pendentes
    markAllAsPaid: async () => {
        return await monthlyPayoutService.processAllMonthlyPayouts();
    },

    // Utilities
    exportMonthlyCsv: (data: any[]) => {
        try {
            const nextDate = payoutService.getNextPayoutDate();
            const monthName = payoutService.getMonthName();

            const header = ['CPF', 'Nome', 'Valor', 'Descrição', 'Email'];
            const rows = data.map(item => {
                const cleanCpf = String(item.cpf || '').replace(/\D/g, '').substring(0, 11).padStart(11, '0');
                const valor = Number(item.total || 0).toFixed(2);
                const nome = String(item.name || 'Criador').replace(/"/g, '').trim();
                const descricao = `Pagamento ${monthName}`;
                const email = String(item.email || '');
                return [cleanCpf, nome, valor, descricao, email];
            });

            const allLines = [header, ...rows];
            const csvContent = allLines.map(line => line.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'application/octet-stream;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'criadores_repasses.csv');
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 200);
        } catch (error) {
            console.error("Erro ao exportar CSV:", error);
            alert("Erro ao gerar arquivo CSV. Verifique o console.");
        }
    }
};

