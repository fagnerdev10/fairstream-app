
import { BroadcastMessage, BroadcastRole, UserRole } from '../types';
import { supabase } from './supabaseClient';

const BROADCAST_KEY = 'fairstream_broadcasts_db';

export const broadcastService = {
  // Retorna todas as mensagens (para o Admin)
  getAll: async (): Promise<BroadcastMessage[]> => {
    try {
      const { data, error } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        return data.map((d: any) => ({
          id: d.id,
          content: d.content,
          targetRole: d.target_role,
          style: d.style,
          isActive: d.is_active,
          createdAt: d.created_at
        }));
      }
    } catch (e) {
      console.error("Erro ao buscar broadcasts do Supabase:", e);
    }
    // Fallback local
    try {
      const data = localStorage.getItem(BROADCAST_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Retorna mensagens ativas para um papel específico
  getActiveForRole: async (role: UserRole): Promise<BroadcastMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        const all: BroadcastMessage[] = data.map((d: any) => ({
          id: d.id,
          content: d.content,
          targetRole: d.target_role,
          style: d.style,
          isActive: d.is_active,
          createdAt: d.created_at
        }));

        return all.filter(msg => {
          if (msg.targetRole === 'all') return true;
          return msg.targetRole === role;
        });
      }
    } catch (e) {
      console.warn("Supabase offline/error for broadcasts:", e);
    }

    // Fallback local
    try {
      const data = localStorage.getItem(BROADCAST_KEY);
      if (!data) return [];

      const all: BroadcastMessage[] = JSON.parse(data);
      return all.filter(msg => {
        if (!msg.isActive) return false;
        if (msg.targetRole === 'all') return true;
        return msg.targetRole === role;
      });
    } catch {
      return [];
    }
  },

  create: async (message: Omit<BroadcastMessage, 'id' | 'createdAt'>) => {
    const newMessage = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      content: message.content,
      target_role: message.targetRole,
      style: message.style,
      is_active: message.isActive,
      created_at: new Date().toISOString()
    };

    // Supabase
    try {
      const { error } = await supabase.from('broadcasts').insert(newMessage);
      if (error) throw error;
    } catch (e) { console.error("Erro ao criar broadcast no Supabase:", e); }

    // Local
    try {
      const all = JSON.parse(localStorage.getItem(BROADCAST_KEY) || '[]');
      const localMsg: BroadcastMessage = {
        id: newMessage.id,
        content: newMessage.content,
        targetRole: message.targetRole,
        style: message.style,
        isActive: message.isActive,
        createdAt: newMessage.created_at
      };
      all.unshift(localMsg);
      localStorage.setItem(BROADCAST_KEY, JSON.stringify(all));
      window.dispatchEvent(new Event('broadcast-update'));
    } catch { }

    return newMessage;
  },

  update: async (id: string, updates: Partial<BroadcastMessage>) => {
    // Supabase
    try {
      const dbUpdates: any = {};
      if (updates.content) dbUpdates.content = updates.content;
      if (updates.targetRole) dbUpdates.target_role = updates.targetRole;
      if (updates.style) dbUpdates.style = updates.style;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      await supabase.from('broadcasts').update(dbUpdates).eq('id', id);
    } catch (e) { console.error(e); }

    // Local
    const all = JSON.parse(localStorage.getItem(BROADCAST_KEY) || '[]');
    const index = all.findIndex((m: any) => m.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], ...updates };
      localStorage.setItem(BROADCAST_KEY, JSON.stringify(all));
      window.dispatchEvent(new Event('broadcast-update'));
    }
  },

  delete: async (id: string): Promise<boolean> => {
    // Supabase
    try {
      await supabase.from('broadcasts').delete().eq('id', id);
    } catch (e) { console.error(e); }

    // Local
    try {
      const all = JSON.parse(localStorage.getItem(BROADCAST_KEY) || '[]');
      const initialLength = all.length;
      const filtered = all.filter((m: any) => m.id !== id);

      if (filtered.length !== initialLength) {
        localStorage.setItem(BROADCAST_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new Event('broadcast-update'));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao apagar broadcast:", error);
      return false;
    }
  }
};
