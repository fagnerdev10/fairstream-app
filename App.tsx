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
import CreatorPayments from './pages/CreatorPayments';
import CreatorFinancial from './pages/CreatorFinancial';
import MercadoPagoCallback from './pages/MercadoPagoCallback';
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
import { platformSettingsService } from './services/platformSettingsService'; // NOVO IMPORT
import { AlertTriangle, Lock, Info, CheckCircle } from 'lucide-react';
import { BroadcastMessage } from './types';
import { useLocation } from 'react-router-dom';

// ... (BroadcastBanner component)

// ... (Layout component)

// ... (AppRoutes component)

const App: React.FC = () => {
  useEffect(() => {
    seedService.injectSeedContent();
    seedService.checkAndRemoveSeedContent();
    monthlyPayoutService.scheduleAutomaticPayout();
    platformSettingsService.ensureInitialized(); // AUTO-FIX: Garante que as configs existam
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </AuthProvider>
  );
};

return (
  <AuthProvider>
    <SettingsProvider>
      <AppRoutes />
    </SettingsProvider>
  </AuthProvider>
);
};

export default App;
