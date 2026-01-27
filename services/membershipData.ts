
import { subscriptionService } from './subscriptionService';

export interface MembershipGrowthData {
  month: string;
  activeMembers: number;
  creatorRevenue: number;
  platformRevenue: number;
}

const CHANNEL_PRICE = 9.90;
const CREATOR_SHARE = 0.70; // 70%
const PLATFORM_SHARE = 0.30; // 30%

export const membershipData = {
  // Gera estatísticas REAIS baseadas no banco de dados local
  getCurrentStats: async (creatorId: string) => {
    // Busca lista real de membros (ativos e cancelados)
    const members = await subscriptionService.getMembersByCreator(creatorId);

    // Contagem de ativos
    const activeMembers = members.filter(m => m.status === 'active');
    const activeCount = activeMembers.length;

    // Receita mensal atual (Baseada apenas nos ativos agora)
    const grossMonthlyRevenue = activeCount * CHANNEL_PRICE;

    // --- CORREÇÃO: CÁLCULO REAL DE RECEITA ACUMULADA ---
    // Em vez de usar valor fixo, calculamos quanto cada membro já gerou desde que entrou
    let calculatedAccumulatedRevenue = 0;
    const today = new Date();

    members.forEach(member => {
      const startDate = new Date(member.startDate);

      // Calcula diferença em meses entre o início e hoje
      // Ex: Início 01/01, Hoje 01/03 = 2 meses passados + o mês atual = 3 cobranças
      let monthsActive = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth()) + 1;

      // Garante pelo menos 1 mês se acabou de assinar
      if (monthsActive < 1) monthsActive = 1;

      // Se fosse um sistema complexo, verificaríamos a data de cancelamento. 
      // Como simplificação, assumimos que pagou até o presente momento (ou até cancelar no ciclo atual).

      const memberTotalGross = monthsActive * member.price; // Usa o preço que ele pagou (pode variar se fosse promo)
      const memberCreatorShare = memberTotalGross * CREATOR_SHARE;

      calculatedAccumulatedRevenue += memberCreatorShare;
    });

    // Se não houver membros, zera.
    if (members.length === 0) {
      calculatedAccumulatedRevenue = 0;
    }

    return {
      activeCount,
      grossMonthlyRevenue, // Bruto Mensal Atual
      creatorMonthlyRevenue: grossMonthlyRevenue * CREATOR_SHARE, // Líquido Mensal Atual
      platformMonthlyRevenue: grossMonthlyRevenue * PLATFORM_SHARE, // Taxa Plataforma Atual
      accumulatedRevenue: calculatedAccumulatedRevenue, // Total Histórico Real
      memberList: members // Lista para tabela
    };
  },

  // Gera dados para o gráfico (simulado baseado no atual)
  getGrowthStats: (currentActive: number): MembershipGrowthData[] => {
    const history = [
      { month: 'Jul', members: Math.max(0, currentActive - 5) },
      { month: 'Ago', members: Math.max(0, currentActive - 4) },
      { month: 'Set', members: Math.max(0, currentActive - 3) },
      { month: 'Out', members: Math.max(0, currentActive - 2) },
      { month: 'Nov', members: Math.max(0, currentActive - 1) },
      { month: 'Dez', members: currentActive },
    ];

    return history.map(h => ({
      month: h.month,
      activeMembers: h.members,
      creatorRevenue: h.members * CHANNEL_PRICE * CREATOR_SHARE,
      platformRevenue: h.members * CHANNEL_PRICE * PLATFORM_SHARE
    }));
  }
};
