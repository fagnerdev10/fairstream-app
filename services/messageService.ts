import { Message, UserRole } from '../types';
import { supabase } from './supabaseClient';

const MSG_KEY = 'fairstream_messages';

const mapDbToMessage = (m: any): Message => ({
  id: m.id,
  fromId: m.from_id,
  toId: m.to_id,
  subject: m.subject || 'Sem Assunto',
  body: m.content || '',
  fromName: m.from_name || 'Usuário',
  read: m.is_read,
  type: m.type || 'chat',
  fromRole: m.from_role as UserRole,
  toRole: m.to_role as UserRole,
  createdAt: m.created_at
});

const sanitizeRole = (role: string | undefined): UserRole => {
  if (role === 'creator' || role === 'advertiser' || role === 'viewer' || role === 'owner') return role;
  return 'viewer';
};

export const messageService = {
  // Retorna mensagens RECEBIDAS pelo usuário
  getMessages: async (userId: string): Promise<Message[]> => {
    try {
      console.log(`[MessageService] Buscando mensagens recebidas para: ${userId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('to_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapDbToMessage);
    } catch (e) {
      console.error('[MessageService] Erro ao buscar mensagens:', e);
      return [];
    }
  },

  // Retorna TODAS as mensagens do usuário (enviadas e recebidas)
  getAllUserMessages: async (userId: string): Promise<Message[]> => {
    try {
      console.log(`[MessageService] Buscando histórico completo para: ${userId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`from_id.eq.${userId},to_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbToMessage);
    } catch (e) {
      console.error('[MessageService] Erro ao buscar histórico:', e);
      return [];
    }
  },

  getConversationPartners: async (userId: string): Promise<{ id: string, name: string, role: UserRole, unread: boolean }[]> => {
    const msgs = await messageService.getAllUserMessages(userId);
    const partnersMap = new Map<string, { id: string, name: string, role: UserRole, unread: boolean }>();

    msgs.forEach(msg => {
      const partnerId = msg.fromId === userId ? msg.toId : msg.fromId;
      const isUnread = msg.toId === userId && !msg.read;

      const existing = partnersMap.get(partnerId);
      if (!existing) {
        partnersMap.set(partnerId, {
          id: partnerId,
          name: msg.fromId === userId ? 'Usuário' : (msg.fromName || 'Usuário'),
          role: sanitizeRole(msg.fromId === userId ? msg.toRole : msg.fromRole),
          unread: isUnread
        });
      } else if (isUnread) {
        existing.unread = true;
        partnersMap.set(partnerId, existing);
      }
    });

    return Array.from(partnersMap.values());
  },

  getConversation: async (myId: string, otherId: string) => {
    try {
      console.log(`[MessageService] Buscando conversa: ${myId} <-> ${otherId}`);
      // Usando uma query mais simples e segura
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(from_id.eq.${myId},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${myId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbToMessage);
    } catch (e) {
      console.error('[MessageService] Erro ao buscar conversa:', e);
      return [];
    }
  },

  markAsRead: async (msgId: string) => {
    try {
      await supabase.from('messages').update({ is_read: true }).eq('id', msgId);
      window.dispatchEvent(new Event('messages-update'));
    } catch (e) { }
  },

  markConversationAsRead: async (myId: string, otherId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('to_id', myId)
        .eq('from_id', otherId)
        .eq('is_read', false);

      window.dispatchEvent(new Event('messages-update'));
    } catch (e) { }
  },

  sendMessage: async (msg: Partial<Message>): Promise<Message | null> => {
    try {
      console.log('[MessageService] Tentando enviar mensagem...', msg);

      const newMsg = {
        from_id: String(msg.fromId || ''),
        to_id: String(msg.toId || ''),
        subject: msg.subject || 'Sem Assunto',
        content: msg.body || '',
        from_name: msg.fromName || 'Usuário',
        is_read: false,
        type: msg.type || 'chat',
        from_role: sanitizeRole(msg.fromRole),
        to_role: sanitizeRole(msg.toRole)
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(newMsg)
        .select();

      if (error) {
        console.error('[MessageService] ERRO SUPABASE NO ENVIO:', error);
        throw new Error(`${error.code}: ${error.message}${error.details ? ' - ' + error.details : ''}`);
      }

      if (data && data.length > 0) {
        window.dispatchEvent(new Event('messages-update'));
        return mapDbToMessage(data[0]);
      }

      return null;
    } catch (e: any) {
      console.error('[MessageService] Erro fatal em sendMessage:', e);
      throw e; // Lança para o alert no Dashboard
    }
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('to_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (e) {
      return 0;
    }
  },

  clearAll: async (userId: string) => {
    try {
      console.log('[MessageService] Limpando todas as mensagens para:', userId);
      await supabase
        .from('messages')
        .delete()
        .or(`from_id.eq.${userId},to_id.eq.${userId}`);
      window.dispatchEvent(new Event('messages-update'));
    } catch (e) {
      console.error('[MessageService] Erro ao limpar mensagens:', e);
    }
  }
};
;
