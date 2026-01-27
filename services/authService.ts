// ======================================
// SERVIÇO DE AUTENTICAÇÃO (WRAPPER)
// ======================================
// Este serviço unifica as chamadas de autenticação
// ATENÇÃO: O banco de dados primário agora é o Supabase.

import { User, UserRole, SocialLinks } from '../types';
import { supabaseAuthService } from './supabaseAuthService';
import { videoService } from './videoService';

export const authService = {
  // CONFIGURAÇÕES
  isMaintenanceMode: (): boolean => supabaseAuthService.isMaintenanceMode(),
  setMaintenanceMode: (active: boolean): void => supabaseAuthService.setMaintenanceMode(active),
  getMaxWarnings: (): number => supabaseAuthService.getMaxWarnings(),
  setMaxWarnings: (count: number): void => supabaseAuthService.setMaxWarnings(count),

  // CONSULTAS
  getAllUsers: async (): Promise<User[]> => {
    const supabaseUsers = await supabaseAuthService.getAllUsers();

    // Fallback para usuários locais (Seeds)
    let localUsers: User[] = [];
    try {
      localUsers = JSON.parse(localStorage.getItem('fairstream_users_db_v4') || '[]');
    } catch (e) { }

    // DEDUPLICAÇÃO E LIMPEZA
    // 1. Remove do localUsers qualquer um que já esteja no Supabase (limpeza de bug anterior)
    const cleanedLocal = localUsers.filter(lu => !supabaseUsers.some(su => su.id === lu.id));

    // 2. Remove duplicatas por NOME dentro dos seeds locais (evita spam)
    const uniqueLocal: User[] = [];
    const namesSet = new Set();
    cleanedLocal.forEach(u => {
      const nameKey = u.name.toLowerCase().trim();
      if (!namesSet.has(nameKey)) {
        namesSet.add(nameKey);
        uniqueLocal.push(u);
      }
    });

    // Se houve mudança, salva de volta limpo
    if (uniqueLocal.length !== localUsers.length) {
      console.log(`🧹 [AuthService] Limpando ${localUsers.length - uniqueLocal.length} usuários duplicados do storage local.`);
      localStorage.setItem('fairstream_users_db_v4', JSON.stringify(uniqueLocal));
    }

    // Combina
    const combined = [...supabaseUsers, ...uniqueLocal];
    return combined;
  },

  getAllUsersSync: (): User[] => {
    // Retorna apenas locais sincronamente
    try {
      return JSON.parse(localStorage.getItem('fairstream_users_db_v4') || '[]');
    } catch (e) {
      return [];
    }
  },

  getUserById: async (id: string): Promise<User | null> => {
    // 1. Tenta buscar no Supabase (Prioridade)
    const supabaseUser = await supabaseAuthService.getUserById(id);
    if (supabaseUser) return supabaseUser;

    // 2. Fallback para localStorage (Seeds e Usuários locais)
    try {
      const storedUsers = JSON.parse(localStorage.getItem('fairstream_users_db_v4') || '[]');
      const localUser = storedUsers.find((u: any) => String(u.id) === String(id));
      if (localUser) {
        console.log('📦 [AuthService] Usuário encontrado no cache local (Fallback):', localUser.name);
        return localUser;
      }
    } catch (e) {
      console.warn('Erro ao buscar usuário no cache local:', e);
    }

    return null;
  },

  // AÇÕES
  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    // 1. Atualiza no Supabase
    const updatedUser = await supabaseAuthService.updateUser(userId, updates);

    // 2. Sincroniza cache de sessão (opcional mas útil para UI)
    try {
      const stored = localStorage.getItem('fairstream_user');
      if (stored) {
        const currentUser = JSON.parse(stored);
        if (currentUser.id === userId) {
          localStorage.setItem('fairstream_user', JSON.stringify(updatedUser));
        }
      }
    } catch (e) { }

    // 3. Sincroniza o banco de dados local de usuários (Fallback)
    try {
      const storedUsers = JSON.parse(localStorage.getItem('fairstream_users_db_v4') || '[]');
      const index = storedUsers.findIndex((u: any) => u.id === userId);
      if (index >= 0) {
        storedUsers[index] = updatedUser;
        localStorage.setItem('fairstream_users_db_v4', JSON.stringify(storedUsers));
      }
    } catch (e) { }

    // 4. Efeitos colaterais (vincular avatar e nome aos vídeos)
    if (updates.avatar && (updatedUser.role === 'creator' || updatedUser.role === 'owner')) {
      videoService.updateCreatorAvatarInVideos();
    }
    if (updates.name && (updatedUser.role === 'creator' || updatedUser.role === 'owner')) {
      videoService.updateCreatorNameInVideos();
    }

    return updatedUser;
  },

  // MODERAÇÃO
  warnUser: async (userId: string): Promise<void> => {
    return await supabaseAuthService.warnUser(userId);
  },

  suspendUser: async (userId: string): Promise<void> => {
    return await supabaseAuthService.suspendUser(userId);
  },

  reactivateUser: async (userId: string, clearWarnings = true): Promise<void> => {
    return await supabaseAuthService.reactivateUser(userId);
  },

  // COMPATIBILIDADE
  updateUserProfileDescription: async (userId: string, description: string): Promise<User> => {
    return authService.updateUser(userId, { description });
  },

  updateChannelMessage: async (userId: string, message: string): Promise<User> => {
    return authService.updateUser(userId, { channelMessage: message });
  },

  updateUserSocialLinks: async (userId: string, links: SocialLinks): Promise<User> => {
    return authService.updateUser(userId, { socialLinks: links });
  },

  updateLastActive: async (userId: string): Promise<void> => {
    return await supabaseAuthService.updateLastActive(userId);
  },

  getOnlineCount: async (): Promise<number> => {
    return await supabaseAuthService.getOnlineCount();
  },

  createWalletForUser: async (userId: string, cpf: string): Promise<User> => {
    return await supabaseAuthService.createWalletForUser(userId, cpf);
  }
};
