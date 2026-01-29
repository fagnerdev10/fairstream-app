
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import AdminSeed from './pages/AdminSeed';
import FinancePrices from './pages/FinancePrices';
import FinanceAdvertisers from './pages/FinanceAdvertisers';
import FinanceSettings from './pages/FinanceSettings';
import AdminCreatorStatus from './pages/AdminCreatorStatus'; // Novo Import
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import Auth from './pages/Auth';
import Verification from './pages/Verification';
import Trending from './pages/Trending';
import History from './pages/History';
import Payment from './pages/Payment';
import BlockedChannels from './pages/BlockedChannels';
import IgnoredChannels from './pages/IgnoredChannels';
import CommunityRules from './pages/CommunityRules';
import CreatorVideoComments from './pages/CreatorVideoComments';
import ChannelPage from './pages/ChannelPage';
import ViewerPanel from './components/ViewerPanel';
import CreatorInbox from './pages/CreatorInbox';
import CreatorLive from './pages/CreatorLive';
import CreatorPayments from './pages/CreatorPayments'; // Novo Import
import CreatorFinancial from './pages/CreatorFinancial';
import MercadoPagoCallback from './pages/MercadoPagoCallback'; // Novo Import - Painel Financeiro
import HowToLive from './pages/HowToLive';
import Monetization from './pages/Monetization'; // Import da nova página
import AdminPlatformCampaigns from './pages/AdminPlatformCampaigns'; // ✅ Campanhas da Plataforma
import AdminFiscal from './pages/AdminFiscal'; // ✅ Painel Fiscal
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { authService } from './services/authService';
import { broadcastService } from './services/broadcastService';
import { userPreferences } from './services/userPreferences';
import { seedService } from './services/seedService';
import { monthlyPayoutService } from './services/monthlyPayoutService';
import { AlertTriangle, Lock, Info, CheckCircle } from 'lucide-react';
import { BroadcastMessage } from './types';

const BroadcastBanner: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const { theme } = useSettings();

  useEffect(() => {
    const fetchBroadcasts = async () => {
      const role = user?.role || 'viewer';
      const activeMessages = await broadcastService.getActiveForRole(role);
      setMessages(activeMessages);
    };

    fetchBroadcasts();

    const handleUpdate = () => {
      fetchBroadcasts();
    };

    window.addEventListener('broadcast-update', handleUpdate);
    return () => window.removeEventListener('broadcast-update', handleUpdate);
  }, [user]);

  if (messages.length === 0) return null;

  const getStyle = (style: string) => {
    if (theme === 'dark') {
      switch (style) {
        case 'warning': return 'bg-yellow-500/10 text-yellow-500 border-b border-yellow-500/20 shadow-[0_0_15px_-5px_rgba(234,179,8,0.2)]';
        case 'alert': return 'bg-red-500/10 text-red-500 border-b border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]';
        case 'success': return 'bg-emerald-500/10 text-emerald-500 border-b border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]';
        case 'info':
        default: return 'bg-blue-500/10 text-blue-400 border-b border-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]';
      }
    } else {
      switch (style) {
        case 'warning': return 'bg-yellow-50 text-yellow-700 border-b border-yellow-200';
        case 'alert': return 'bg-red-50 text-red-700 border-b border-red-200';
        case 'success': return 'bg-green-50 text-green-700 border-b border-green-200';
        case 'info':
        default: return 'bg-blue-50 text-blue-700 border-b border-blue-200';
      }
    }
  };

  const getIcon = (style: string) => {
    switch (style) {
      case 'warning': return <AlertTriangle size={16} />;
      case 'alert': return <AlertTriangle size={16} />;
      case 'success': return <CheckCircle size={16} />;
      case 'info': default: return <Info size={16} />;
    }
  };

  return (
    <div className="flex flex-col w-full sticky top-16 z-50">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`w-full px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium text-center backdrop-blur-md transition-all duration-300 ${getStyle(msg.style)}`}
        >
          <div className="shrink-0 animate-pulse">{getIcon(msg.style)}</div>
          <span className="max-w-4xl truncate md:whitespace-normal">{msg.content}</span>
        </div>
      ))}
    </div>
  );
};

import { useLocation } from 'react-router-dom';

const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { theme, maintenanceMode } = useSettings();
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch/');
  const isMaintenance = maintenanceMode;

  const [isCompact, setIsCompact] = useState(userPreferences.getCompactModePreference());
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    const handleCompactUpdate = () => {
      setIsCompact(userPreferences.getCompactModePreference());
    };

    const handleFocusUpdate = () => {
      setIsFocusMode(localStorage.getItem('fairstream_focus_mode') === 'true');
    };

    // Inicializa
    handleFocusUpdate();

    window.addEventListener('compact-mode-update', handleCompactUpdate);
    window.addEventListener('focus-mode-update', handleFocusUpdate);

    return () => {
      window.removeEventListener('compact-mode-update', handleCompactUpdate);
      window.removeEventListener('focus-mode-update', handleFocusUpdate);
    };
  }, []);

  if (!isLoading && isMaintenance && user?.role !== 'owner' && user?.email !== 'admin@fairstream.com') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`border p-8 rounded-2xl max-w-md shadow-2xl ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-yellow-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">Em Manutenção</h1>
          <p className={`${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'} mb-6`}>
            A plataforma FairStream está passando por melhorias técnicas.
            Voltaremos em breve.
          </p>
          <div className="text-xs text-zinc-600">
            Acesso restrito à administração.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="bg-red-600 text-white text-[10px] font-bold text-center py-0.5 sticky top-0 z-[9999] uppercase tracking-tighter">
        D6245F8D - PROVA VISUAL V21 - ARQUIVOS LOCAIS SENDO ALTERADOS - {new Date().toLocaleDateString()}
      </div>
      {/* Oculta Header no mobile se for página de vídeo */}
      <div className={`${isWatchPage ? 'hidden md:block' : 'block'}`}>
        {!isFocusMode && <Header />}
      </div>

      <div className={`flex ${isFocusMode || isWatchPage ? 'pt-0 md:pt-16' : 'pt-16'} relative`}>
        {!isCompact && !isFocusMode && <Sidebar />}
        <main className={`flex-1 min-h-[calc(100vh-64px)] overflow-x-hidden flex flex-col ${(isCompact || isFocusMode) ? 'ml-0 w-full' : 'md:ml-64'}`}>
          <BroadcastBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/verify" element={<Verification />} />

        {/* Rota especial de callback OAuth sem sidebar/header padrão se preferir, mas aqui usamos Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/history" element={<History />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/channel/:id" element={<ChannelPage />} />
          <Route path="/rules" element={<CommunityRules />} />
          <Route path="/upload" element={<Upload />} />

          <Route path="/monetization" element={<Monetization />} /> {/* Nova Rota */}

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/payments" element={<CreatorPayments />} />
          <Route path="/dashboard/payments/callback" element={<MercadoPagoCallback />} />
          <Route path="/dashboard/financial" element={<CreatorFinancial />} />

          <Route path="/creator/inbox" element={<CreatorInbox />} />
          <Route path="/creator/live" element={<CreatorLive />} />
          <Route path="/creator/live-guide" element={<HowToLive />} />
          <Route path="/viewer-panel" element={<ViewerPanel />} />
          <Route path="/mp/callback" element={<MercadoPagoCallback />} />

          {/* Rotas Administrativas */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/seed-profiles" element={<AdminSeed />} />
          <Route path="/admin/financeiro/precos" element={<FinancePrices />} />
          <Route path="/admin/financeiro/anunciantes" element={<FinanceAdvertisers />} />
          <Route path="/admin/financeiro/configuracoes" element={<FinanceSettings />} />
          <Route path="/admin/financeiro/status-criadores" element={<AdminCreatorStatus />} />
          <Route path="/admin/platform-campaigns" element={<AdminPlatformCampaigns />} />
          <Route path="/admin/fiscal" element={<AdminFiscal />} /> {/* ✅ Painel Fiscal */}

          <Route path="/ads" element={<AdvertiserDashboard />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/blocked-channels" element={<BlockedChannels />} />
          <Route path="/ignored-channels" element={<IgnoredChannels />} />
          <Route path="/creator/video/:id" element={<CreatorVideoComments />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

const App: React.FC = () => {
  useEffect(() => {
    seedService.injectSeedContent();
    seedService.checkAndRemoveSeedContent();

    // ✅ PAGAMENTO AUTOMÁTICO NO DIA 5 DE CADA MÊS
    // Verifica a cada hora se é dia 5 e processa os pagamentos
    monthlyPayoutService.scheduleAutomaticPayout();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
