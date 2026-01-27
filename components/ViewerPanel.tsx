
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { User, Wallet } from 'lucide-react';
import ViewerSubscriptions from './ViewerSubscriptions';

const ViewerPanel: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useSettings();

  if (!user) return null;

  // Bloqueio para Administração
  if (user.role === 'owner' || user.email === 'admin@fairstream.com') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-zinc-500">Sua conta de administrador não possui acesso à Área do Espectador.</p>
        </div>
      </div>
    );
  }

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
              <User className="text-blue-500" /> Área do Espectador
            </h1>
            <p className={textSecondary}>Gerencie suas assinaturas e histórico de pagamentos.</p>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
            <span className="text-xs text-zinc-500 block uppercase font-bold">Conta</span>
            <span className={`font-medium ${textPrimary}`}>{user.name}</span>
          </div>
        </div>

        {/* Conteúdo Principal - Assinaturas */}
        <ViewerSubscriptions />
      </div>
    </div>
  );
};

export default ViewerPanel;
