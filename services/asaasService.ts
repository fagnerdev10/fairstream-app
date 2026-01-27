import { ASAAS_CONFIG } from './asaasConfig';

const ASAAS_API_URL_SANDBOX = 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_URL_PROD = 'https://www.asaas.com/api/v3';

// ✅ PRODUÇÃO ATIVADA
const IS_PRODUCTION = true;

const BASE_URL = '/api/asaas'; // Uses Vite Proxy to avoid CORS

// Chave de API (Prioridade: LocalStorage > Config Hardcoded)
export const getApiKey = () => {
    const stored = localStorage.getItem('fairstream_asaas_key');
    if (stored) return stored;

    // Fallback para config hardcoded
    return ASAAS_CONFIG.API_KEY || '';
};

// Wallet ID da Plataforma (Prioridade: LocalStorage > Config Hardcoded)
export const getPlatformWalletId = () => {
    const stored = localStorage.getItem('fairstream_asaas_wallet_id');
    if (stored) return stored;

    // Fallback para config hardcoded
    return ASAAS_CONFIG.WALLET_ID || '';
};

export interface AsaasCustomer {
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    postalCode?: string;
}

export interface AsaasSplit {
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
}

export interface AsaasPayment {
    customer: string; // ID do cliente no Asaas
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    split?: AsaasSplit[];
}

export const asaasService = {
    /**
     * Define o cabeçalho de autenticação padrão
     */
    getHeaders: () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            console.error("❌ API Key do Asaas não encontrada! Configure VITE_ASAAS_API_KEY no .env.local");
        }
        return {
            'Content-Type': 'application/json',
            'access_token': apiKey
        };
    },

    /**
     * Cria um novo cliente no Asaas
     */
    createCustomer: async (customerData: AsaasCustomer) => {
        try {
            const response = await fetch(`${BASE_URL}/customers`, {
                method: 'POST',
                headers: asaasService.getHeaders(),
                body: JSON.stringify(customerData)
            });
            const data = await response.json();
            if (data.errors) {
                const errorMsg = data.errors.map((e: any) => e.description).join(', ');
                throw new Error(errorMsg);
            }
            return data; // Retorna o objeto cliente criado (com o ID)
        } catch (error) {
            console.error("Erro ao criar cliente Asaas:", error);
            throw error;
        }
    },

    /**
     * Busca um cliente pelo CPF/CNPJ
     */
    getCustomerByCpfCnpj: async (cpfCnpj: string) => {
        try {
            const response = await fetch(`${BASE_URL}/customers?cpfCnpj=${cpfCnpj}`, {
                method: 'GET',
                headers: asaasService.getHeaders()
            });
            const data = await response.json();
            return data.data && data.data.length > 0 ? data.data[0] : null;
        } catch (error) {
            console.error("Erro ao buscar cliente Asaas:", error);
            return null;
        }
    },

    getCustomers: async (limit = 1) => {
        try {
            const response = await fetch(`${BASE_URL}/customers?limit=${limit}`, {
                method: 'GET',
                headers: asaasService.getHeaders()
            });
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            return [];
        }
    },

    /**
     * Cria uma cobrança (Pagamento) com suporte a Split
     */
    createPayment: async (paymentData: AsaasPayment, creatorWalletId?: string, splitType: 'membership' | 'monetization' | 'donation' = 'membership') => {
        try {
            const payload = { ...paymentData };

            // Lógica de Split Automático
            if (creatorWalletId) {
                const platformWalletId = getPlatformWalletId();

                if (!platformWalletId) {
                    console.warn("⚠️ Wallet ID da Plataforma não configurado! O Split pode falhar.");
                }

                if (splitType === 'membership') {
                    // 70% Criador, 30% Plataforma
                    payload.split = [
                        {
                            walletId: creatorWalletId,
                            percentualValue: 70
                        }
                    ];
                } else if (splitType === 'monetization') {
                    // 50% Criador, 50% Plataforma
                    payload.split = [
                        {
                            walletId: creatorWalletId,
                            percentualValue: 50
                        }
                    ];
                } else if (splitType === 'donation') {
                    // 100% Criador (Doação Direta) - VALIDAÇÃO CRÍTICA
                    if (creatorWalletId === platformWalletId) {
                        console.warn("⚠️ Tentativa de doar para a própria carteira da plataforma. Split ignorado.");
                    } else {
                        payload.split = [
                            {
                                walletId: creatorWalletId,
                                percentualValue: 100
                            }
                        ];
                    }
                }
            } else if (splitType === 'donation') {
                throw new Error("Erro Crítico: ID da Carteira do Criador é obrigatório para doações diretas.");
            }

            const response = await fetch(`${BASE_URL}/payments`, {
                method: 'POST',
                headers: asaasService.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.errors) {
                const errorMsg = data.errors.map((e: any) => e.description).join(', ');
                throw new Error(errorMsg);
            }
            return data;
        } catch (error) {
            console.error("Erro ao criar pagamento Asaas:", error);
            throw error;
        }
    },

    /**
     * Recupera o QR Code e o Copia e Cola para pagamentos via PIX
     */
    getPixQrCode: async (paymentId: string) => {
        try {
            const response = await fetch(`${BASE_URL}/payments/${paymentId}/pixQrCode`, {
                method: 'GET',
                headers: asaasService.getHeaders()
            });
            const data = await response.json();
            if (data.errors) {
                const errorMsg = data.errors.map((e: any) => e.description).join(', ');
                throw new Error(errorMsg);
            }
            return data; // { encodedImage, payload }
        } catch (error) {
            console.error("Erro ao obter QR Code Pix:", error);
            throw error;
        }
    },

    /**
     * Cria uma subconta (Conta Filha) para um criador receber splits
     * Isso permite que o criador tenha seu próprio painel Asaas ou apenas receba os valores.
     */
    createSubAccount: async (creatorData: any) => {
        try {
            // Nota: Criar subconta é um processo mais burocrático que exige validação.
            // Para simplificar, podemos apenas usar o WalletId se o criador já tiver conta Asaas,
            // ou criar uma conta básica.
            // Função auxiliar para limpar caracteres especiais (apenas números)
            const sanitize = (str: string | undefined) => str ? str.replace(/\D/g, '') : '';

            // Garante que o telefone seja válido para o Asaas (DDD + 9 + 8 digitos)
            let rawPhone = sanitize(creatorData.phone);
            let validMobile = rawPhone;

            // Se o telefone não tiver 11 dígitos, não tiver o 9 na frente ou for o dummy antigo inválido
            if (rawPhone.length !== 11 || rawPhone[2] !== '9' || rawPhone.startsWith('119999999')) {
                validMobile = '47988888888'; // Novo Fallback Sandbox (SC) Aceito
            }

            // DEBUG (Removido)
            // alert(`Telefone Enviado: ${validMobile} (Original: ${rawPhone})`);

            const payload = {
                name: creatorData.name,
                email: creatorData.email,
                loginEmail: creatorData.email,
                cpfCnpj: sanitize(creatorData.cpf || creatorData.cnpj),
                birthDate: creatorData.birthDate || '1995-05-15',
                mobilePhone: validMobile,
                // phone: validMobile, // Removido para evitar conflito de validação (fixo/celular)
                incomeValue: 1000, // Valor simbólico exigido pelo Asaas
                address: creatorData.address || "Av. Paulista",
                addressNumber: creatorData.addressNumber || "1500",
                province: creatorData.province || "Bela Vista",
                postalCode: sanitize(creatorData.postalCode || "01310-930")
            };

            const response = await fetch(`${BASE_URL}/accounts`, {
                method: 'POST',
                headers: asaasService.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.errors) {
                const errorMsg = data.errors.map((e: any) => e.description).join(' ');

                // SE O EMAIL JÁ EXISTE, TENTAMOS RECUPERAR A CONTA EM VEZ DE FALHAR
                if (errorMsg.includes('email') && (errorMsg.includes('uso') || errorMsg.includes('exists'))) {
                    console.log("⚠️ Email já existe no Asaas. Tentando recuperar conta...");
                    const searchRes = await fetch(`${BASE_URL}/accounts?email=${creatorData.email}`, {
                        method: 'GET',
                        headers: asaasService.getHeaders()
                    });
                    const searchData = await searchRes.json();
                    if (searchData.data && searchData.data.length > 0) {
                        return searchData.data[0]; // Retorna a conta existente
                    }
                }

                console.error("Erros do Asaas:", data.errors);
                throw new Error(errorMsg);
            }
            return data;
        } catch (error) {
            console.error("Erro ao criar subconta Asaas:", error);
            throw error;
        }
    },

    getPaymentStatus: async (id: string) => {
        try {
            const response = await fetch(`${BASE_URL}/payments/${id}`, {
                method: 'GET',
                headers: asaasService.getHeaders()
            });
            const data = await response.json();
            return data.status; // 'PENDING', 'RECEIVED', 'CONFIRMED', etc.
        } catch (error) {
            console.error("Erro ao verificar status:", error);
            return null;
        }
    },

    /**
     * Cria uma transferência para a carteira de um criador
     * Usado para pagamentos mensais de monetização (50/50)
     * 
     * @param walletId - ID da carteira do criador (asaasWalletId)
     * @param value - Valor a transferir (já calculado: 50% do total)
     * @param description - Descrição da transferência
     */
    createTransfer: async (walletId: string, value: number, description: string) => {
        try {
            console.log(`[Asaas Transfer] Criando transferência de R$ ${value} para ${walletId}`);

            const payload = {
                walletId: walletId,
                value: value,
                description: description
            };

            const response = await fetch(`${BASE_URL}/transfers`, {
                method: 'POST',
                headers: asaasService.getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.errors) {
                const errorMsg = data.errors.map((e: any) => e.description).join(', ');
                throw new Error(errorMsg);
            }

            console.log(`[Asaas Transfer] ✅ Transferência criada:`, data);
            return data;
        } catch (error) {
            console.error("Erro ao criar transferência:", error);
            throw error;
        }
    }
};
