
import { authService } from "./authService";
import { User } from "../types";

const PREF_KEY = 'fairstream_user_preferences';

interface UserPreferences {
  blockedChannels: string[];
  ignoredChannels: string[];
}

const getPrefs = (): UserPreferences => {
  try {
    // 1. Tenta pegar a fonte mais fresca do objeto 'user'
    const sessionUser = localStorage.getItem('fairstream_user');
    let fromUser: Partial<User> = {};
    if (sessionUser) {
      fromUser = JSON.parse(sessionUser);
    }

    // 2. Tenta pegar da chave de preferências (que o savePrefs atualiza primeiro)
    const data = localStorage.getItem(PREF_KEY);
    let fromPrefs: Partial<UserPreferences> = {};
    if (data) {
      fromPrefs = JSON.parse(data);
    }

    // Combina ambos, dando prioridade para o que estiver preenchido (Merge estratégico)
    const blocked = Array.from(new Set([
      ...(Array.isArray(fromUser.blockedChannels) ? fromUser.blockedChannels : []),
      ...(Array.isArray(fromPrefs.blockedChannels) ? fromPrefs.blockedChannels : [])
    ]));

    const ignored = Array.from(new Set([
      ...(Array.isArray(fromUser.ignoredChannels) ? fromUser.ignoredChannels : []),
      ...(Array.isArray(fromPrefs.ignoredChannels) ? fromPrefs.ignoredChannels : [])
    ]));

    return {
      blockedChannels: blocked,
      ignoredChannels: ignored
    };
  } catch (e) {
    console.error('[PreferenceService] Erro ao ler preferências:', e);
    return { blockedChannels: [], ignoredChannels: [] };
  }
};

const syncWithCloud = async (prefs: UserPreferences) => {
  try {
    const stored = localStorage.getItem('fairstream_user');
    if (!stored) return;
    const user = JSON.parse(stored);

    console.log('☁️ [PreferenceService] Sincronizando preferências com o Supabase...');
    await authService.updateUser(user.id, {
      blockedChannels: prefs.blockedChannels,
      ignoredChannels: prefs.ignoredChannels
    });
  } catch (e) {
    console.error('❌ [PreferenceService] Falha ao sincronizar com nuvem:', e);
  }
};

const savePrefs = (prefs: UserPreferences) => {
  // 1. Salva na chave específica
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));

  // 2. Atualiza o objeto do usuário na sessão para que o AuthContext e o resto do app vejam a mudança na hora
  const sessionUser = localStorage.getItem('fairstream_user');
  if (sessionUser) {
    const user = JSON.parse(sessionUser);
    user.blockedChannels = prefs.blockedChannels;
    user.ignoredChannels = prefs.ignoredChannels;
    localStorage.setItem('fairstream_user', JSON.stringify(user));
  }

  // 3. Sincroniza com a nuvem (Supabase)
  syncWithCloud(prefs);

  // 4. Notifica o app
  window.dispatchEvent(new Event('preferences-updated'));
  window.dispatchEvent(new Event('auth-state-change')); // Força AuthContext a atualizar se necessário
};

export const preferenceService = {
  blockChannel: (creatorId: string) => {
    const prefs = getPrefs();
    if (!prefs.blockedChannels.includes(creatorId)) {
      prefs.blockedChannels.push(creatorId);
      savePrefs(prefs);
    }
  },

  ignoreChannel: (creatorId: string) => {
    const prefs = getPrefs();
    if (!prefs.ignoredChannels.includes(creatorId)) {
      prefs.ignoredChannels.push(creatorId);
      savePrefs(prefs);
    }
  },

  isBlockedOrIgnored: (creatorId: string): boolean => {
    const prefs = getPrefs();
    return prefs.blockedChannels.includes(creatorId) || prefs.ignoredChannels.includes(creatorId);
  },

  getBlockedChannels: (): string[] => {
    return getPrefs().blockedChannels;
  },

  unblockChannel: (creatorId: string) => {
    const prefs = getPrefs();
    prefs.blockedChannels = prefs.blockedChannels.filter(id => id !== creatorId);
    savePrefs(prefs);
  },

  getIgnoredChannels: (): string[] => {
    return getPrefs().ignoredChannels;
  },

  unignoreChannel: (creatorId: string) => {
    const prefs = getPrefs();
    prefs.ignoredChannels = prefs.ignoredChannels.filter(id => id !== creatorId);
    savePrefs(prefs);
  }
};
