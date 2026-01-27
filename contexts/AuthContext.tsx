import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { supabaseAuthService } from '../services/supabaseAuthService';

// ======================================
// CONFIGURAÇÃO: USE_SUPABASE
// ======================================
// Mude para 'true' para usar Supabase
// Mude para 'false' para usar localStorage (modo antigo)
const USE_SUPABASE = true;

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  useSupabase: boolean; // Expõe qual modo está sendo usado
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ======================================
  // INICIALIZAÇÃO
  // ======================================
  useEffect(() => {
    const initAuth = async () => {
      if (USE_SUPABASE) {
        // MODO SUPABASE: Verificar sessão do Supabase
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Buscar perfil do usuário
            const profile = await supabaseAuthService.getCurrentUser();
            if (profile) {
              setUser(profile);
              // Também salva no localStorage para compatibilidade
              localStorage.setItem('fairstream_user', JSON.stringify(profile));
            }
          } else {
            // Verificar cache local
            const storedUser = localStorage.getItem('fairstream_user');
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch (e) {
                localStorage.removeItem('fairstream_user');
              }
            }
          }
        } catch (error) {
          console.error('Erro ao verificar sessão Supabase:', error);
          // Fallback para localStorage
          const storedUser = localStorage.getItem('fairstream_user');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (e) {
              localStorage.removeItem('fairstream_user');
            }
          }
        }
      } else {
        // MODO LOCALSTORAGE: Comportamento original
        const storedUser = localStorage.getItem('fairstream_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error("Failed to parse stored user", e);
            localStorage.removeItem('fairstream_user');
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();

    // ESCUTAR ATUALIZAÇÕES EXTERNAS (Ex: do preferenceService)
    const handleAuthChange = () => {
      console.log('🔄 [AuthContext] Detectada mudança externa no usuário, atualizando estado...');
      const stored = localStorage.getItem('fairstream_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) { }
      }
    };

    window.addEventListener('auth-state-change', handleAuthChange);

    // Se usando Supabase, escutar mudanças de autenticação
    if (USE_SUPABASE) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, _session) => {
          console.log('Auth state changed:', event);

          // Não fazer chamadas aqui para evitar conflitos
          // O login/logout é tratado pelas funções específicas
          if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem('fairstream_user');
          }
        }
      );

      return () => {
        subscription.unsubscribe();
        window.removeEventListener('auth-state-change', handleAuthChange);
      };
    }

    return () => window.removeEventListener('auth-state-change', handleAuthChange);
  }, []);

  // ======================================
  // LOGIN
  // ======================================
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('fairstream_user', JSON.stringify(userData));

    // Se usando Supabase, atualizar última atividade
    if (USE_SUPABASE && userData.id) {
      supabaseAuthService.updateLastActive(userData.id).catch(console.error);
    }
  };

  // ======================================
  // LOGOUT
  // ======================================
  const logout = async () => {
    setUser(null);
    localStorage.removeItem('fairstream_user');

    if (USE_SUPABASE) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Erro ao fazer logout do Supabase:', error);
      }
    }
  };

  // ======================================
  // HEARTBEAT: Atualizar última atividade
  // ======================================
  useEffect(() => {
    if (!user?.id || !USE_SUPABASE) return;

    // Atualiza imediatamente
    supabaseAuthService.updateLastActive(user.id).catch(() => { });

    // Atualiza a cada 2 minutos
    const interval = setInterval(() => {
      supabaseAuthService.updateLastActive(user.id).catch(() => { });
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isLoading,
      useSupabase: USE_SUPABASE
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Exportar flag para outros arquivos
export const USE_SUPABASE_AUTH = USE_SUPABASE;