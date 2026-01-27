
const AUTOPLAY_KEY = 'fairstream_autoplay_pref';
const FOCUS_MODE_KEY = 'fairstream_focus_mode';
const COMPACT_MODE_KEY = 'fairstream_compact_mode';

export const userPreferences = {
  // --- AUTO PLAY ---
  getAutoPlayPreference: (): boolean => {
    try {
      const stored = localStorage.getItem(AUTOPLAY_KEY);
      return stored === null ? true : JSON.parse(stored);
    } catch (e) {
      console.warn("Erro ao ler preferência de autoplay", e);
      return true;
    }
  },

  setAutoPlayPreference: (value: boolean) => {
    localStorage.setItem(AUTOPLAY_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event('preference-update'));
  },

  // --- MODO FOCO (WATCH PAGE) ---
  getFocusModePreference: (): boolean => {
    try {
      const stored = localStorage.getItem(FOCUS_MODE_KEY);
      return stored === null ? false : JSON.parse(stored);
    } catch (e) {
      console.warn("Erro ao ler preferência de modo foco", e);
      return false;
    }
  },

  setFocusModePreference: (value: boolean) => {
    localStorage.setItem(FOCUS_MODE_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event('focus-mode-update'));
  },

  // --- MODO COMPACTO (HOME PAGE) ---
  getCompactModePreference: (): boolean => {
    try {
      const stored = localStorage.getItem(COMPACT_MODE_KEY);
      return stored === null ? false : JSON.parse(stored);
    } catch (e) {
      console.warn("Erro ao ler preferência de modo compacto", e);
      return false;
    }
  },

  setCompactModePreference: (value: boolean) => {
    localStorage.setItem(COMPACT_MODE_KEY, JSON.stringify(value));
    // Dispara evento para atualizar App.tsx (layout) e Home.tsx (filtros)
    window.dispatchEvent(new Event('compact-mode-update'));
  }
};
