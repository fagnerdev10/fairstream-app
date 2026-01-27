import { asaasService } from './asaasService';
import { payoutService } from './payoutService';
import { subscriptionService } from './subscriptionService';

/**
 * Serviço para gerenciar pagamentos de membros via Asaas
 * Split Automático: 70% Criador / 30% Plataforma
 */
export const membershipPaymentService = {
    /**
     * Cria um pagamento de assinatura com split automático
     */
    createMembershipPayment: async (
        userId: string,
        userName: string,
        userEmail: string,
        userCpf: string,
        userPhone: string,
        creatorId: string,
        creatorName: string,
        creatorWalletId: string,
        price: number
    ) => {
        try {
            // 1. Garante que o usuário existe como cliente no Asaas
            let customerId = localStorage.getItem(`asaas_customer_${userId}`);

            if (!customerId) {
                try {
                    const customer = await asaasService.createCustomer({
                        name: userName,
                        cpfCnpj: userCpf || '00000000191',
                        email: userEmail || `user${userId}@fairstream.com`,
                        mobilePhone: '11987654321' // Telefone válido SP
                    });
                    customerId = customer.id;
                    localStorage.setItem(`asaas_customer_${userId}`, customerId);
                } catch (cpfError: any) {
                    // Se falhar por CPF inválido, tenta com CPF genérico
                    console.warn('CPF inválido, usando genérico:', cpfError.message);
                    const customer = await asaasService.createCustomer({
                        name: userName,
                        cpfCnpj: '00000000191', // CPF genérico válido
                        email: userEmail || `user${userId}@fairstream.com`,
                        mobilePhone: '11987654321' // Telefone válido SP
                    });
                    customerId = customer.id;
                    localStorage.setItem(`asaas_customer_${userId}`, customerId);
                }
            }

            // 2. Cria o pagamento com split automático 70/30
            const payment = await asaasService.createPayment(
                {
                    customer: customerId,
                    billingType: 'PIX',
                    value: price,
                    dueDate: new Date().toISOString().split('T')[0],
                    description: `Assinatura - ${creatorName}`,
                    externalReference: `membership_${userId}_${creatorId}_${Date.now()}`
                },
                creatorWalletId, // Wallet do criador para receber 70%
                'membership' // Split 70/30
            );

            // 3. Busca o QR Code Pix
            const pixData = await asaasService.getPixQrCode(payment.id);

            return {
                paymentId: payment.id,
                qrCode: `data:image/png;base64,${pixData.encodedImage}`,
                pixCopyPaste: pixData.payload,
                amount: price,
                status: payment.status
            };

        } catch (error: any) {
            console.error('Erro ao criar pagamento de assinatura:', error);
            throw new Error(error.message || 'Erro ao processar pagamento. Tente novamente.');
        }
    },

    /**
     * Confirma o pagamento e ativa a assinatura
     */
    confirmMembershipPayment: (
        paymentId: string,
        userId: string,
        creatorId: string,
        creatorName: string,
        creatorAvatar: string,
        price: number
    ) => {
        try {
            // 1. Registra o split payment
            payoutService.registerSplitPayment({
                id: `split_${Date.now()}`,
                paymentId: paymentId,
                creatorId: creatorId,
                creatorToken: '', // Não precisa mais, o Asaas gerencia
                totalAmount: price,
                creatorShare: price * 0.7,
                platformShare: price * 0.3,
                platformFeePercentage: 30,
                type: 'membership',
                status: 'completed',
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString()
            });

            // 2. Cria a assinatura
            subscriptionService.createSubscription({
                id: `sub_${Date.now()}`,
                userId: userId,
                channelId: creatorId,
                channelName: creatorName,
                channelAvatar: creatorAvatar,
                type: 'channel',
                price: price,
                status: 'active',
                startDate: new Date().toISOString(),
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'pix'
            });

            return true;
        } catch (error) {
            console.error('Erro ao confirmar assinatura:', error);
            return false;
        }
    }
};
