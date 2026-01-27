import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export type Language = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it';
export type Theme = 'dark' | 'light';

import { authService } from '../services/authService';
import { platformSettingsService } from '../services/platformSettingsService';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: string) => string;
  // Platform Settings (Global)
  maintenanceMode: boolean;
  setMaintenanceMode: (enabled: boolean) => Promise<void>;
  maxWarnings: number;
  setMaxWarnings: (count: number) => Promise<void>;
  allowRegistrations: boolean;
  setAllowRegistrations: (enabled: boolean) => Promise<void>;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Dicionário de Traduções
const translations: Record<Language, Record<string, string>> = {
  pt: {
    nav_home: "Início",
    nav_trending: "Em Alta",
    nav_history: "Histórico",
    nav_commercial: "Comercial",
    nav_advertiser: "Painel do Anunciante",
    nav_creator_area: "Área do Criador",
    nav_my_videos: "Seus Vídeos",
    nav_creator_panel: "Painel do Criador",
    nav_admin: "Administração",
    nav_owner_panel: "Painel Administrativo",
    nav_footer: "Monetização justa. Transparência total.",
    header_search_placeholder: "Pesquisar...",
    header_create: "Criar",
    header_login: "Fazer Login",
    header_logout: "Sair",
    theme_light: "Modo Claro",
    theme_dark: "Modo Escuro"
  },
  en: {
    nav_home: "Home",
    nav_trending: "Trending",
    nav_history: "History",
    nav_commercial: "Commercial",
    nav_advertiser: "Advertiser Dashboard",
    nav_creator_area: "Creator Area",
    nav_my_videos: "Your Videos",
    nav_creator_panel: "Creator Dashboard",
    nav_admin: "Administration",
    nav_owner_panel: "Owner Panel",
    nav_footer: "Fair monetization. Total transparency.",
    header_search_placeholder: "Search...",
    header_create: "Create",
    header_login: "Login",
    header_logout: "Logout",
    theme_light: "Light Mode",
    theme_dark: "Dark Mode"
  },
  es: {
    nav_home: "Inicio",
    nav_trending: "Tendencias",
    nav_history: "Historial",
    nav_commercial: "Comercial",
    nav_advertiser: "Panel de Anunciantes",
    nav_creator_area: "Área del Creador",
    nav_my_videos: "Tus Videos",
    nav_creator_panel: "Panel del Creador",
    nav_admin: "Administración",
    nav_owner_panel: "Panel del Propietario",
    nav_footer: "Monetización justa. Transparencia total.",
    header_search_placeholder: "Buscar...",
    header_create: "Crear",
    header_login: "Iniciar Sesión",
    header_logout: "Cerrar Sesión",
    theme_light: "Modo Claro",
    theme_dark: "Modo Oscuro"
  },
  fr: {
    nav_home: "Accueil",
    nav_trending: "Tendances",
    nav_history: "Historique",
    nav_commercial: "Commercial",
    nav_advertiser: "Tableau de Bord Annonceur",
    nav_creator_area: "Espace Créateur",
    nav_my_videos: "Vos Vidéos",
    nav_creator_panel: "Tableau de Bord Créateur",
    nav_admin: "Administration",
    nav_owner_panel: "Panneau Propriétaire",
    nav_footer: "Monétisation équitable. Transparence totale.",
    header_search_placeholder: "Rechercher...",
    header_create: "Créer",
    header_login: "Connexion",
    header_logout: "Déconnexion",
    theme_light: "Mode Clair",
    theme_dark: "Mode Sombre"
  },
  de: {
    nav_home: "Startseite",
    nav_trending: "Trends",
    nav_history: "Verlauf",
    nav_commercial: "Werbung",
    nav_advertiser: "Werbe-Dashboard",
    nav_creator_area: "Creator-Bereich",
    nav_my_videos: "Deine Videos",
    nav_creator_panel: "Creator-Dashboard",
    nav_admin: "Verwaltung",
    nav_owner_panel: "Eigentümer-Panel",
    nav_footer: "Faire Monetarisierung. Totale Transparenz.",
    header_search_placeholder: "Suchen...",
    header_create: "Erstellen",
    header_login: "Anmelden",
    header_logout: "Abmelden",
    theme_light: "Heller Modus",
    theme_dark: "Dunkler Modus"
  },
  it: {
    nav_home: "Home",
    nav_trending: "Tendenze",
    nav_history: "Cronologia",
    nav_commercial: "Commerciale",
    nav_advertiser: "Pannello Inserzionisti",
    nav_creator_area: "Area Creator",
    nav_my_videos: "I tuoi Video",
    nav_creator_panel: "Pannello Creator",
    nav_admin: "Amministrazione",
    nav_owner_panel: "Pannello Proprietario",
    nav_footer: "Monetizzazione equa. Trasparenza totale.",
    header_search_placeholder: "Cerca...",
    header_create: "Crea",
    header_login: "Accedi",
    header_logout: "Esci",
    theme_light: "Modalità Chiara",
    theme_dark: "Modalità Scura"
  }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('dark');

  // Platform Settings States
  const [maintenanceMode, setMaintenanceModeState] = useState(false);
  const [maxWarnings, setMaxWarningsState] = useState(3);
  const [allowRegistrations, setAllowRegistrationsState] = useState(true);

  // Carregar Configurações
  useEffect(() => {
    // 1. Preferências do Usuário (Local)
    const savedLang = localStorage.getItem('fs_language') as Language;
    const savedTheme = localStorage.getItem('fs_theme') as Theme;
    if (savedLang && translations[savedLang]) setLanguage(savedLang);
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) setTheme(savedTheme);

    // 2. Configurações da Plataforma (Supabase)
    reloadSettings();
  }, []);

  const reloadSettings = async () => {
    try {
      const settings = await platformSettingsService.getSettings();
      setMaintenanceModeState(settings.isMaintenanceMode);
      setMaxWarningsState(settings.maxWarnings);
      // setAllowRegistrationsState(settings.allowRegistrations); // Se desejar adicionar essa coluna depois
    } catch (e) {
      console.error("Erro ao carregar configurações da plataforma:", e);
    }
  };

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('fs_language', lang);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('fs_theme', newTheme);
  };

  // Actions para Atualizar Settings (Persistindo no Supabase via PlatformSettingsService)
  const setMaintenanceMode = async (enabled: boolean) => {
    setMaintenanceModeState(enabled);
    await platformSettingsService.updateSettings({ isMaintenanceMode: enabled });
  };

  const setMaxWarnings = async (count: number) => {
    setMaxWarningsState(count);
    await platformSettingsService.updateSettings({ maxWarnings: count });
  };

  const setAllowRegistrations = async (enabled: boolean) => {
    setAllowRegistrationsState(enabled);
    // await platformSettingsService.updateSettings({ allowRegistrations: enabled });
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{
      language,
      setLanguage: changeLanguage,
      theme,
      toggleTheme,
      t,
      maintenanceMode,
      setMaintenanceMode,
      maxWarnings,
      setMaxWarnings,
      allowRegistrations,
      setAllowRegistrations,
      reloadSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
