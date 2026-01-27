
import { Subscription, BillingHistoryItem, User } from '../types';
import { authService } from './authService';
import { supabase } from './supabaseClient';

const SUBS_KEY = 'fairstream_subs_db';

// Helper interno para ler/gravar
const getSubs = (): Subscription[] => {
  try {
    return JSON.parse(localStorage.getItem(SUBS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveSubs = (subs: Subscription[]) => {
  localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
  // Dispara evento para atualizar UI em tempo real em todos os componentes
  window.dispatchEvent(new Event('subscription-update'));
};

// Função auxiliar para gerar CPF válido para testes Sandbox
const generateValidCpf = (): string => {
  const rnd = (n: number) => Math.round(Math.random() * n);
  const mod = (base: number, div: number) => Math.round(base - Math.floor(base / div) * div);
  const n = Array(9).fill(0).map(() => rnd(9));

  let d1 = n.reduce((total, val, i) => total + (val * (10 - i)), 0);
  d1 = 11 - mod(d1, 11);
  if (d1 >= 10) d1 = 0;

  let d2 = n.reduce((total, val, i) => total + (val * (11 - i)), 0) + (d1 * 2);
  d2 = 11 - mod(d2, 11);
  if (d2 >= 10) d2 = 0;

  return [...n, d1, d2].join('');
};

export const subscriptionService = {
  // --- LEITURA ---

  getAll: async (): Promise<Subscription[]> => {
    try {
      const { data, error } = await supabase.from('subscriptions').select('*');
      if (error) throw error;
      if (data) {
        // Mapeia para garantir tipos
        const remoteSubs: Subscription[] = data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          channelId: d.channel_id,
          type: d.type,
          price: d.price,
          status: d.status,
          startDate: d.start_date,
          paymentMethod: d.payment_method || 'credit_card',
          channelName: 'Carregando...' // Será preenchido na UI se necessário ou via join
        }));
        return remoteSubs;
      }
    } catch (e) {
      console.error("Erro ao buscar assinaturas do Supabase:", e);
    }
    return getSubs(); // Fallback local
  },

  getUserSubscriptions: async (userId: string): Promise<Subscription[]> => {
    // 1. Tenta Supabase
    try {
      const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
      if (error) throw error;
      if (data) {
        return data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          channelId: d.channel_id,
          type: d.type,
          price: d.price,
          status: d.status,
          startDate: d.start_date,
          paymentMethod: d.payment_method || 'credit_card',
          channelName: 'Carregando...' // Ajuste pontual se não fizer join
        }));
      }
    } catch (e) {
      console.error("Erro ao carregar subscriptions do usuário via Supabase:", e);
    }
    // 2. Fallback Storage
    const allSubs = getSubs();
    return allSubs.filter(sub => sub.userId === userId);
  },

  getMembersByCreator: async (creatorId: string): Promise<any[]> => {
    // 1. Tenta Supabase
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('channel_id', creatorId)
        .eq('type', 'channel');

      if (error) throw error;

      if (data) {
        // Precisa cruzar com Profiles para pegar nomes
        const allUsers = await authService.getAllUsers();

        return data.map((d: any) => {
          const subscriberUser = allUsers.find(u => u.id === d.user_id);
          return {
            id: d.id,
            userId: d.user_id,
            channelId: d.channel_id,
            type: d.type,
            price: d.price,
            status: d.status,
            startDate: d.start_date,
            paymentMethod: d.payment_method || 'credit_card',
            channelName: '',
            subscriberName: subscriberUser?.name || 'Usuário Desconhecido',
            subscriberAvatar: subscriberUser?.avatar || 'https://picsum.photos/50',
            subscriberEmail: subscriberUser?.email
          };
        }).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      }
    } catch (e) {
      console.error("Erro ao carregar membros via Supabase:", e);
    }

    // 2. Fallback Storage
    const allSubs = getSubs();
    const channelSubs = allSubs.filter(sub => sub.type === 'channel' && sub.channelId === creatorId);
    const allUsers = await authService.getAllUsers();

    return channelSubs.map(sub => {
      const subscriberUser = allUsers.find(u => u.id === sub.userId);
      return {
        ...sub,
        subscriberName: subscriberUser?.name || 'Usuário Desconhecido',
        subscriberAvatar: subscriberUser?.avatar || 'https://picsum.photos/50',
        subscriberEmail: subscriberUser?.email
      };
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },

  // --- ESCRITA / AÇÕES ---

  createSubscription: async (sub: Subscription) => {
    const all = getSubs();
    const exists = all.find(s =>
      s.userId === sub.userId &&
      s.type === sub.type &&
      s.channelId === sub.channelId &&
      s.status === 'active'
    );

    if (!exists) {
      // INTEGRAÇÃO REAL COM ASAAS
      try {
        if (sub.type === 'channel' && sub.channelId) {
          const creator = await authService.getUserById(sub.channelId);
          if (creator && creator.asaasWalletId) {
            console.log(`[Sub] Iniciando cobrança Asaas com Split para ${creator.name} (${creator.asaasWalletId})`);

            // Cria cliente Asaas dinamicamente para o assinante
            const subscriber = await authService.getUserById(sub.userId);
            let customerId = '';

            if (subscriber) {
              try {
                // Prepara dados do cliente novo com EMAIL ÚNICO
                const uniqueEmail = `test_${Date.now()}_${Math.floor(Math.random() * 9999)}@sandbox.asaas.com`;

                const newCustomerData = {
                  name: subscriber.name || 'Fã Teste',
                  cpfCnpj: generateValidCpf(), // GERA CPF VÁLIDO NOVO
                  email: uniqueEmail
                };

                const newCustomer = await import('./asaasService').then(m => m.asaasService.createCustomer(newCustomerData));

                if (newCustomer && newCustomer.id) {
                  customerId = newCustomer.id;
                  console.log("[Sub] Novo cliente Asaas criado:", customerId);
                } else {
                  throw new Error("API retornou sucesso mas sem ID.");
                }
              } catch (cErr: any) {
                console.error("[Sub] Falha ao criar cliente novo:", cErr);
                // Fallback para cliente existente
                try {
                  const customers = await import('./asaasService').then(m => m.asaasService.getCustomers(1));
                  if (customers && customers.length > 0) {
                    customerId = customers[0].id;
                    console.log("[Sub] Fallback: Usando cliente existente:", customerId);
                  } else {
                    throw cErr; // Se não tem cliente e falhou criar, explode com erro original
                  }
                } catch (fErr) {
                  throw cErr;
                }
              }
            }

            if (customerId) {
              const charge = await import('./asaasService').then(m => m.asaasService.createPayment({
                customer: customerId,
                billingType: 'PIX',
                value: sub.price,
                dueDate: new Date().toISOString().split('T')[0],
                description: `Membro do Canal: ${sub.channelName}`
              }, creator.asaasWalletId, 'membership'));

              console.log("[Sub] Cobrança criada no Asaas:", charge);
              all.unshift(sub);
              saveSubs(all);

              // SYNC TO SUPABASE (Hybrid)
              try {
                await supabase.from('subscriptions').insert({
                  id: sub.id,
                  user_id: sub.userId,
                  channel_id: sub.channelId,
                  type: sub.type,
                  price: sub.price,
                  status: sub.status,
                  start_date: sub.startDate,
                  payment_method: sub.paymentMethod
                });
              } catch (errSupabase) {
                console.error("Erro ao salvar assinatura no Supabase:", errSupabase);
              }

              return charge;
            } else {
              throw new Error("Falha Crítica: Não foi possível registrar o cliente no Asaas.");
            }
          } else {
            console.warn("[Sub] Criador não tem carteira Asaas configurada. Split não será processado no gateway.");
          }
        }
      } catch (err) {
        console.error("[Sub] Erro ao integrar com Asaas:", err);
        throw err; // Propaga erro para a UI (Watch.tsx)
      }

      all.unshift(sub);
      saveSubs(all);

      // SYNC TO SUPABASE (Hybrid fallback for non-Asaas path or failure but local success)
      try {
        await supabase.from('subscriptions').insert({
          id: sub.id,
          user_id: sub.userId,
          channel_id: sub.channelId,
          type: sub.type,
          price: sub.price,
          status: sub.status,
          start_date: sub.startDate,
          payment_method: sub.paymentMethod
        });
      } catch (errSupabase) {
        // Silencia erro de duplicate key se já inseriu acima
      }
      return null;
    }
  },

  // IMPLEMENTAÇÃO CORRIGIDA DO CANCELAMENTO
  cancelSubscription: (subId: string): boolean => {
    const all = getSubs();
    const cleanId = String(subId).trim();
    // Comparação robusta de ID
    const index = all.findIndex(s => String(s.id).trim() === cleanId);

    if (index !== -1) {
      if (all[index].status === 'cancelled') return true;
      all[index].status = 'cancelled';
      saveSubs(all);
      return true;
    }
    return false;
  },

  toggleStatus: (subId: string): 'active' | 'cancelled' | null => {
    const all = getSubs();
    const index = all.findIndex(s => s.id === subId);

    if (index !== -1) {
      const newStatus = all[index].status === 'active' ? 'cancelled' : 'active';
      all[index].status = newStatus;
      saveSubs(all);
      return newStatus;
    }
    return null;
  },

  // --- HISTÓRICO ---

  getBillingHistory: async (userId: string): Promise<BillingHistoryItem[]> => {
    const subs = await subscriptionService.getUserSubscriptions(userId);
    const history: BillingHistoryItem[] = [];

    subs.forEach(sub => {
      const startDate = new Date(sub.startDate);
      const today = new Date();
      const description = sub.type === 'global'
        ? 'Assinatura FairStream Premium (Global)'
        : `Membro do canal: ${sub.channelName || 'Canal'}`;

      let currentDate = new Date(startDate);

      // Simula histórico mensal até hoje
      while (currentDate <= today) {
        // Se cancelado, não gerar cobrança após a data atual (simplificação)
        if (sub.status === 'cancelled') {
          // Em um sistema real compararia data de cancelamento
        }

        history.push({
          id: `bill_${sub.id}_${currentDate.getTime()}`,
          date: currentDate.toISOString(),
          description: description,
          amount: sub.price,
          status: 'paid',
          paymentMethod: sub.paymentMethod === 'pix' ? 'Pix' : 'Cartão de Crédito'
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};
