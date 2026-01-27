
import React, { useEffect, useState } from 'react';
import { Home, Flame, Clock, BarChart2, Megaphone, Shield, UserX, EyeOff, Book, CreditCard, UserPlus, Inbox, TrendingUp, Users, Settings, Radio, BookOpen, Wallet, Link as LinkIcon, DollarSign, MessageSquare, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { messageService } from '../services/messageService';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, t } = useSettings();
  const [unreadCount, setUnreadCount] = useState(0);
  const isAdminPanel = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (user) {
      const updateCount = async () => {
        const count = await messageService.getUnreadCount(user.id);
        setUnreadCount(count);
      };
      updateCount();
      window.addEventListener('messages-update', updateCount);
      return () => window.removeEventListener('messages-update', updateCount);
    }
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ icon: Icon, label, path, badge, indent = false }: { icon: any, label: string, path: string, badge?: number, indent?: boolean }) => (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-4 w-full p-3 rounded-lg transition-colors relative ${isActive(path)
        ? 'bg-red-600 text-white font-medium'
        : theme === 'dark'
          ? 'text-gray-300 hover:bg-zinc-800'
          : 'text-gray-700 hover:bg-gray-100'
        } ${indent ? 'pl-8 text-sm' : ''}`}
    >
      <Icon size={indent ? 16 : 20} />
      <span className="text-sm flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  );



  return (
    <aside className={`w-64 h-[calc(100vh-64px)] fixed left-0 top-16 hidden md:flex flex-col p-3 border-r overflow-y-auto z-10 transition-colors duration-300 ${theme === 'dark'
      ? 'bg-[#0f0f0f] border-zinc-800'
      : 'bg-white border-gray-200'
      }`}>
      <div className="space-y-1">
        <NavItem icon={Home} label={t('nav_home')} path="/" />
        <NavItem icon={Flame} label={t('nav_trending')} path="/trending" />
        <NavItem icon={Clock} label={t('nav_history')} path="/history" />
      </div>

      {/* --- SEÇÃO COMERCIAL (Apenas Anunciante) --- */}
      {!isAdminPanel && user?.role === 'advertiser' && (
        <div className={`my-4 border-t pt-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <h3 className={`px-3 text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Comercial
          </h3>
          <NavItem icon={Megaphone} label={t('nav_advertiser')} path="/ads" />
        </div>
      )}

      {/* --- ÁREA DO CRIADOR (Apenas Criador) --- */}
      {!isAdminPanel && user?.role === 'creator' && (
        <div className={`my-4 border-t pt-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <h3 className={`px-3 text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {t('nav_creator_area')}
          </h3>
          <NavItem icon={BarChart2} label={t('nav_creator_panel')} path="/dashboard" />
          <NavItem icon={Wallet} label="Painel Financeiro" path="/dashboard/financial" />
          <NavItem icon={DollarSign} label="Monetização" path="/monetization" />
          <NavItem icon={Radio} label="Transmitir Live" path="/creator/live" />
          <NavItem icon={BookOpen} label="Tutorial de Live" path="/creator/live-guide" indent />
        </div>
      )}

      {/* --- PREFERÊNCIAS (Para todos os logados) --- */}
      {!isAdminPanel && user && user.role !== 'owner' && user.email !== 'admin@fairstream.com' && (
        <div className={`my-4 border-t pt-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <h3 className={`px-3 text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Minha Conta
          </h3>
          <NavItem icon={UserX} label="Canais Bloqueados" path="/blocked-channels" />
          <NavItem icon={EyeOff} label="Canais Ignorados" path="/ignored-channels" />
        </div>
      )}

      {/* --- ADMINISTRAÇÃO (SOMENTE DONO) --- */}
      {(user?.role === 'owner' || user?.email === 'admin@fairstream.com') && (
        <>
          <div className={`my-4 border-t pt-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
            <h3 className="px-3 text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
              {t('nav_admin')}
            </h3>
            <NavItem icon={Shield} label={t('nav_owner_panel')} path="/admin" />
          </div>
          <div className={`my-4 border-t pt-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">
              Financeiro
            </h3>
            <NavItem icon={LinkIcon} label="Status dos Criadores" path="/admin/financeiro/status-criadores" />
            <NavItem icon={TrendingUp} label="Config. de Preços" path="/admin/financeiro/precos" />
            <NavItem icon={Users} label="Anunciantes & Saldos" path="/admin/financeiro/anunciantes" />
            <NavItem icon={Megaphone} label="Campanhas da Plataforma" path="/admin/platform-campaigns" />
            <NavItem icon={Settings} label="Config. Financeiras" path="/admin/financeiro/configuracoes" />
            <NavItem icon={FileText} label="Painel Fiscal (Contabilidade)" path="/admin/fiscal" />
          </div>
          <div className={`my-4 border-t pt-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">
              Ferramentas
            </h3>
            <NavItem icon={UserPlus} label="Criar Perfis Falsos" path="/admin/seed-profiles" />
          </div>
        </>
      )}

      {/* Seção "Minha Área" removida por solicitação do usuário */}

      <div className={`mt-auto p-4 rounded-lg border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'
        }`}>
        <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>FairStream AI &copy; 2025</p>
        <p className={`text-[10px] mb-2 ${theme === 'dark' ? 'text-zinc-600' : 'text-gray-500'}`}>{t('nav_footer')}</p>
        <button
          onClick={() => navigate('/rules')}
          className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
        >
          <Book size={10} /> Regras da Comunidade
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
