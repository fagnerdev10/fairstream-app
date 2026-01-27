
import { authService } from './authService';
import { payoutService } from './payoutService';

// Credenciais do Dono da Plataforma ( FairStream )
export const MP_CONFIG = {
  clientId: "1816534017966802",
  clientSecret: "sPC2g3zjaz85OpRDMXg4Q9e1TTVxR18v",
  publicKey: "APP_USR-50a9006b-ab9d-4406-ba28-e5002e14bd14",
  platformAccessToken: "APP_USR-1816534017966802-123020-7ddfccc1944e45fef38bcb26647ae32f-3102834096",
  // No Vite dev, window.location.origin pode mudar se usar ngrok
  redirectUri: window.location.origin + "/callback.html",
};

export const mercadoPagoService = {
  // Passo 1: Gerar URL de conexão para o criador
  getConnectUrl: (creatorId: string) => {
    const scopes = encodeURIComponent('read,write,payments,offline_access');
    const redirectUri = encodeURIComponent(MP_CONFIG.redirectUri);
    // Removido platform_id=mp para evitar Erro 500 em algumas contas e usar o fluxo padrão
    return `https://auth.mercadopago.com.br/authorization?client_id=${MP_CONFIG.clientId}&response_type=code&redirect_uri=${redirectUri}&state=${creatorId}&scope=${scopes}`;
  },

  // Passo 2: Trocar o código pelo token real do criador via BACKEND
  exchangeCodeForToken: async (code: string, creatorId: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/mp/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: MP_CONFIG.redirectUri,
        }),
      });

      const data = await response.json();

      if (!data.access_token) {
        throw new Error(data.message || 'Falha ao obter token do Mercado Pago');
      }

      // Salva os dados de conexão no usuário
      const users = await authService.getAllUsers();
      const userIndex = users.findIndex(u => u.id === creatorId);

      if (userIndex !== -1) {
        users[userIndex].mercadoPago = {
          connected: true,
          accessToken: data.access_token,
          publicKey: data.public_key,
          userId: data.user_id,
          refreshToken: data.refresh_token,
          connectedAt: new Date().toISOString()
        };
        localStorage.setItem('fairstream_users', JSON.stringify(users));
      }

      return data;
    } catch (error) {
      console.error('Erro no OAuth Mercado Pago:', error);
      throw error;
    }
  },

  // Desconectar conta do criador
  disconnectAccount: async (creatorId: string) => {
    const users = await authService.getAllUsers();
    const userIndex = users.findIndex(u => u.id === creatorId);

    if (userIndex !== -1) {
      delete users[userIndex].mercadoPago;
      localStorage.setItem('fairstream_users', JSON.stringify(users));
      console.log('🔌 Conta Mercado Pago desconectada para:', creatorId);
    }
  },

  // Passo 3: Criar pagamento com Split Real (70% Criador / 30% Plataforma)
  createSplitPayment: async (amount: number, creatorId: string, description: string, type: 'membership' | 'donation' = 'membership') => {
    const creator = (await authService.getAllUsers()).find(u => u.id === creatorId);

    // Se o criador não estiver conectado, usamos o ID do dono da plataforma para teste
    const creatorAccountId = (creator && creator.mercadoPago?.connected)
      ? creator.mercadoPago.userId
      : MP_CONFIG.clientId;

    console.log(`🚀 Iniciando criação de pagamento Split (${type}). Criador: ${creatorId}, Destino: ${creatorAccountId}`);

    try {
      const response = await fetch('http://localhost:5000/api/mp/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          creatorId,
          description,
          creatorAccountId,
          type
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Erro no Servidor Local (5000):", errText);
        throw new Error(`Servidor de Pagamento: ${errText || 'Erro desconhecido'}`);
      }

      const payment = await response.json();
      console.log("✅ Pagamento criado com sucesso:", payment);

      if (!payment.id) {
        throw new Error(payment.message || "Erro ao criar pagamento no Mercado Pago");
      }

      // Registra a transação como PENDENTE
      // O valor só cairá no 'Realizado' após a confirmação do Pix
      payoutService.registerSplitPayment({
        id: `split_${Date.now()}`,
        paymentId: payment.id,
        creatorId: creatorId,
        creatorToken: (creator && creator.mercadoPago?.accessToken) || '',
        totalAmount: amount,
        creatorShare: type === 'donation' ? amount : Number((amount * 0.70).toFixed(2)),
        platformShare: type === 'donation' ? 0 : Number((amount * 0.30).toFixed(2)),
        platformFeePercentage: type === 'donation' ? 0 : 30,
        status: 'pending', // COMEÇA COMO PENDENTE
        type: type,
        origin: type === 'donation' ? 'Apoio via Pix' : 'Assinante FairStream',
        createdAt: new Date().toISOString()
      });

      return payment;
    } catch (error: any) {
      console.error("🚨 Erro fatal no fetch de pagamento:", error);
      throw new Error(`Falha de Conexão: Verifique se o comando 'node server.js' está rodando no terminal. (${error.message})`);
    }
  },

  // NOVO MÉTODO: DEPÓSITO DE SALDO ANUNCIANTE (PIX PLATAFORMA)
  createDepositPayment: async (amount: number, advertiserId: string) => {
    console.log(`🚀 Iniciando Depósito Pix para Anunciante: ${advertiserId}, Valor: ${amount}`);

    try {
      const response = await fetch('http://localhost:5000/api/mp/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          creatorId: advertiserId,
          description: `Recarga de Saldo - Anunciante ${advertiserId}`,
          creatorAccountId: MP_CONFIG.clientId,
          type: 'deposit'
        })
      });

      if (!response.ok) throw new Error('Falha na conexão com servidor');

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Erro ao gerar Pix');
      }
      return data;
    } catch (error: any) {
      console.warn('Backend indisponível ou erro de rede. Usando MOCK de Simulação.', error);

      // FALLBACK DE SIMULAÇÃO (Para quando não rodar o node server.js)
      return {
        success: true,
        id: `sim_pix_${Date.now()}`,
        status: 'pending',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAYAAAB1PADUAAAAAklEQVR4AewaftIAAAT8SURBVO3BQY4cSRIEQdNA/f/L3gO05sxF5EbmJmZ/H/j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+F9+f39/f/v7+/vX19fXv//++9/iI/8hP/2J//z8/Pz6+vr6z8/P/y0+8h/y05/42E9/4mM//YmP/fQnPvbTn/jYT3/iYz/9ib/9f4uP/If89Cc+9tOf+NhPf+JjP/2Jj/30Jz7205/42E9/4mM//YmP/fQnPvbT//j4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4',
        pixCopyPaste: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-42661417400052040000530398654041.005802BR5913Cicero Fagner6008BRASILIA62070503***6304E2CA'
      };
    }
  },

  // NOVO MÉTODO: VERIFICAR STATUS DO PAGAMENTO
  // NOVO MÉTODO: VERIFICAR STATUS DO PAGAMENTO
  getPayment: async (paymentId: string) => {
    // SUPORTE A SIMULAÇÃO: Se for um ID simulado, aprova imediatamente
    if (paymentId.startsWith('sim_pix_')) {
      console.log('✅ Simulando aprovação de pagamento Pix:', paymentId);
      return {
        id: paymentId,
        status: 'approved',
        status_detail: 'accredited',
        date_approved: new Date().toISOString()
      };
    }

    try {
      const response = await fetch(`http://localhost:5000/api/mp/payment/${paymentId}`);
      if (!response.ok) throw new Error('Erro ao verificar pagamento');
      return await response.json();
    } catch (error) {
      console.error('Erro ao consultar status:', error);
      return null;
    }
  },

  // Passo 4: Realizar Saque Real via BACKEND
  sendPayoutPix: async (amount: number, pixKey: string, description: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/mp/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, pixKey, description })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro no Payout Pix:', error);
      return { success: false, message: 'Erro ao conectar ao servidor backend (Rode node server.js)' };
    }
  }
};
