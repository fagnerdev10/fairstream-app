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
import AdminCreatorStatus from './pages/AdminCreatorStatus';
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

import CreatorFinancial from './pages/CreatorFinancial';

import HowToLive from './pages/HowToLive';
import Monetization from './pages/Monetization';
import AdminPlatformCampaigns from './pages/AdminPlatformCampaigns';
import AdminFiscal from './pages/AdminFiscal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { authService } from './services/authService';
import { broadcastService } from './services/broadcastService';
import { userPreferences } from './services/userPreferences';
import { seedService } from './services/seedService';
import { monthlyPayoutService } from './services/monthlyPayoutService';
import { platformSettingsService } from './services/platformSettingsService';
import { AlertTriangle, Lock, Info, CheckCircle } from 'lucide-react';
import { BroadcastMessage } from './types';
import { useLocation } from 'react-router-dom';

// BROADCAST BANNER COMPONENT
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
        case 'warning': return 'bg-yellow-500/10 text-yellow-500 border-b border-yellow-500/20';
        case 'alert': return 'bg-red-500/10 text-red-500 border-b border-red-500/20';
        case 'success': return 'bg-emerald-500/10 text-emerald-500 border-b border-emerald-500/20';
        case 'info':
        default: return 'bg-blue-500/10 text-blue-400 border-b border-blue-500/20';
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
          className={`w-full px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium text-center backdrop-blur-md ${getStyle(msg.style)}`}
        >
          <div className="shrink-0 animate-pulse">{getIcon(msg.style)}</div>
          <span className="max-w-4xl truncate md:whitespace-normal">{msg.content}</span>
        </div>
      ))}
    </div>
  );
};

const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { theme, maintenanceMode } = useSettings();
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch/');
  const isMaintenance = maintenanceMode;

  const [isCompact, setIsCompact] = useState(userPreferences.getCompactModePreference());
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    const handleCompactUpdate = () => setIsCompact(userPreferences.getCompactModePreference());
    const handleFocusUpdate = () => setIsFocusMode(localStorage.getItem('fairstream_focus_mode') === 'true');

    handleFocusUpdate();
    window.addEventListener('compact-mode-update', handleCompactUpdate);
    window.addEventListener('focus-mode-update', handleFocusUpdate);

    return () => {
      window.removeEventListener('compact-mode-update', handleCompactUpdate);
      window.removeEventListener('focus-mode-update', handleFocusUpdate);
    };
  }, []);

  useEffect(() => {
    const ensureAudioPower = async () => {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();
      }
      window.dispatchEvent(new Event('POWER_AUDIO_ON'));
    };

    ['click', 'touchstart'].forEach(e =>
      window.addEventListener(e, ensureAudioPower, { capture: true, passive: true })
    );

    return () => {
      ['click', 'touchstart'].forEach(e =>
        window.removeEventListener(e, ensureAudioPower)
      );
    };
  }, []);

  if (!isLoading && isMaintenance && user?.role !== 'owner' && user?.email !== 'admin@fairstream.com') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`border p-8 rounded-2xl max-w-md shadow-2xl ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="text-yellow-500" size={32} /></div>
          <h1 className="text-2xl font-bold mb-4 text-center">Manutenção</h1>
          <p className="text-center text-zinc-500 mb-6">Estamos ajustando alguns detalhes importantes. Voltamos em breve!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
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
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/history" element={<History />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/channel/:id" element={<ChannelPage />} />
          <Route path="/rules" element={<CommunityRules />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/monetization" element={<Monetization />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/financial" element={<CreatorFinancial />} />
          <Route path="/creator/inbox" element={<CreatorInbox />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/seed-profiles" element={<AdminSeed />} />
          <Route path="/admin/financeiro/precos" element={<FinancePrices />} />
          <Route path="/admin/financeiro/anunciantes" element={<FinanceAdvertisers />} />
          <Route path="/admin/financeiro/configuracoes" element={<FinanceSettings />} />
          <Route path="/admin/financeiro/status-criadores" element={<AdminCreatorStatus />} />
          <Route path="/admin/platform-campaigns" element={<AdminPlatformCampaigns />} />
          <Route path="/admin/fiscal" element={<AdminFiscal />} />
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
    monthlyPayoutService.scheduleAutomaticPayout();
    platformSettingsService.ensureInitialized();
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
