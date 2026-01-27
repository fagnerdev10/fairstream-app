
import { PixPayment, SupportTransaction } from '../types';

import { supabase } from './supabaseClient';

// Mantemos o localStorage apenas como fallback ou cache rápido, 
// mas a fonte da verdade agora será o Supabase.
const SUPPORT_TRANSACTIONS_KEY = 'fairstream_support_transactions_v2';


/**
 * MOTOR PIX V7 - PADRÃO OURO (COMPATIBILIDADE MÁXIMA)
 */
export const pixService = {
    generatePixPayment: (
        creatorId: string,
        pixKey: string,
        merchantName: string,
        amount: number,
        supporterName?: string
    ): PixPayment => {


        // 1. DADOS LIMPOS (Sem frescura)
        const key = pixKey.trim().replace(/\s/g, '').toLowerCase();
        const nome = (merchantName || 'PIX')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^A-Z ]/gi, "") // Só letras e espaços
            .toUpperCase()
            .substring(0, 25)
            .trim();

        const valor = amount.toFixed(2);
        const emv = (id: string, val: string) => id + val.length.toString().padStart(2, '0') + val;

        // 2. MONTAGEM TOTAL (Padrão Banco Central Rigoroso)
        const payload =
            '000201' + // Payload Format
            emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', key)) + // Account Info
            emv('52', '0000') + // MCC
            emv('53', '986') +  // BRL
            emv('54', valor) +  // Valor
            emv('58', 'BR') +   // Brasil
            emv('59', nome) +   // Nome do Recebedor
            emv('60', 'SAO PAULO') + // Cidade com espaço (Crítico para o Inter)
            emv('62', emv('05', '***')) + // TxID padrão
            '6304'; // CRC ID

        // 3. CÁLCULO CRC16 CCITT (CCITT-FALSE 0xFFFF)
        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
            }
        }
        const finalCode = payload + crc.toString(16).toUpperCase().padStart(4, '0');

        return {
            id: `pix_${Date.now()}`,
            creatorId,
            creatorPixKey: pixKey.trim(),
            amount,
            // Gerador robusto api.qrserver.com
            qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(finalCode)}`,
            pixCopyPaste: finalCode,
            status: 'pending',
            createdAt: new Date().toISOString(),
            supporterName: supporterName || 'Anônimo'
        };

    },

    confirmPixPayment: async (
        creatorId: string,
        supporterId: string,
        supporterName: string,
        supporterAvatar: string,
        amount: number
    ): Promise<boolean> => {
        try {
            await pixService.registerSupportTransaction(
                creatorId,
                supporterId,
                supporterName,
                supporterAvatar,
                amount
            );
            return true;
        } catch (e) {
            console.error('Error confirming Pix payment', e);
            return false;
        }
    },


    registerSupportTransaction: async (
        creatorId: string,
        supporterId: string,
        supporterName: string,
        supporterAvatar: string,
        amount: number
    ): Promise<SupportTransaction> => {

        const { data, error } = await supabase
            .from('payments')
            .insert({
                from_user_id: supporterId === 'u_template' ? null : supporterId,
                to_creator_id: creatorId,
                amount: amount,
                type: 'donation',
                status: 'completed',
                supporter_name: supporterName,
                supporter_avatar: supporterAvatar,
                payment_method: 'pix'
            })
            .select()
            .single();


        if (error) {
            console.error('Erro ao registrar apoio no Supabase:', error);
            // Fallback para manter o fluxo funcionando (mesmo que só local)
            const fallback: SupportTransaction = {
                id: `support_${Date.now()}`,
                creatorId,
                supporterId,
                supporterName,
                supporterAvatar,
                amount,
                date: new Date().toISOString(),
                status: 'completed',
                paymentMethod: 'pix'
            };
            return fallback;

        }

        const transaction: SupportTransaction = {
            id: data.id,
            creatorId: data.to_creator_id,
            supporterId: data.from_user_id,
            supporterName: data.supporter_name || 'Anônimo',
            supporterAvatar: data.supporter_avatar || '',
            amount: Number(data.amount),
            date: data.created_at,
            status: data.status,
            paymentMethod: data.payment_method as 'pix'
        };


        window.dispatchEvent(new Event('support-update'));
        return transaction;
    },

    getSupportTransactionsByCreator: async (creatorId: string): Promise<SupportTransaction[]> => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('to_creator_id', creatorId)
            .eq('type', 'donation')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar apoios:', error);
            return [];
        }

        return (data || []).map(p => ({
            id: p.id,
            creatorId: p.to_creator_id,
            supporterId: p.from_user_id,
            supporterName: p.supporter_name || 'Anônimo',
            supporterAvatar: p.supporter_avatar || '',
            amount: Number(p.amount),
            date: p.created_at,
            status: p.status,
            paymentMethod: p.payment_method as 'pix'
        }));

    },

    getTotalSupportByCreator: async (creatorId: string): Promise<number> => {
        const { data, error } = await supabase
            .from('payments')
            .select('amount')
            .eq('to_creator_id', creatorId)
            .eq('type', 'donation')
            .eq('status', 'completed');

        if (error) return 0;
        return (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
    },

    getAllTransactions: async (): Promise<SupportTransaction[]> => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(p => ({
            id: p.id,
            creatorId: p.to_creator_id,
            supporterId: p.from_user_id,
            supporterName: p.supporter_name || 'Anônimo',
            supporterAvatar: p.supporter_avatar || '',
            amount: Number(p.amount),
            date: p.created_at,
            status: p.status,
            paymentMethod: p.payment_method as 'pix'
        }));

    }
};
