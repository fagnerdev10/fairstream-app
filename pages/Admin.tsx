
import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, User, Trash2, Search, Ban, Unlock, MessageSquare, X, Eye, CheckCircle, XCircle, Image, Type, Video, Megaphone, Zap, Users, Layout, Crown, Radio, Loader2, Flag, ExternalLink, Save, Globe, Monitor, TabletSmartphone, Inbox, Send, ChevronRight, BarChart2, RefreshCw } from 'lucide-react';
import { Channel, Campaign, ChannelStatus, Subscription, BroadcastMessage, BroadcastRole, BroadcastStyle, Report, Message, UserRole, ManualCost } from '../types';
import { authService } from '../services/authService';
import { adService } from '../services/adService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { broadcastService } from '../services/broadcastService';
import { reportService } from '../services/reportService';
import { messageService } from '../services/messageService';
import { platformSettingsService } from '../services/platformSettingsService';
import FinancialReport from '../components/FinancialReport';
import CostEntryForm from '../components/CostEntryForm';
import { generateDailyReportData } from '../services/mockData';
import { supabase } from '../services/supabaseClient';

const Admin: React.FC = () => {
    const { user, isLoading } = useAuth();
    const { theme } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading) {
            const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';
            if (!user || !isAdmin) {
                navigate('/', { replace: true });
            }
        }
    }, [user, isLoading, navigate]);

    const [activeTab, setActiveTab] = useState<'channels' | 'messages' | 'ads' | 'subs' | 'moderation_reports' | 'broadcasts' | 'settings' | 'financial_reports'>('channels');

    const [channels, setChannels] = useState<Channel[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [ads, setAds] = useState<Campaign[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

    const [isMaintenance, setIsMaintenance] = useState(false);
    const [maxWarnings, setMaxWarnings] = useState(0);

    // --- INBOX DO DONO STATES ---
    const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
    const [chatPartnerRole, setChatPartnerRole] = useState<UserRole | null>(null);
    const [chatPartners, setChatPartners] = useState<{ id: string, name: string, role: UserRole, unread: boolean }[]>([]);
    const [activeConversation, setActiveConversation] = useState<Message[]>([]);
    const [adminMessageText, setAdminMessageText] = useState('');
    const [showOnlyUnread, setShowOnlyUnread] = useState(false); // NOVO: Filtro de não lidas
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);

    const [globalStats, setGlobalStats] = useState({
        totalUsers: 0,
        totalCreators: 0,
        totalAdvertisers: 0,
        onlineCount: 0
    });

    const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
    const [newBroadcastText, setNewBroadcastText] = useState('');
    const [newBroadcastRole, setNewBroadcastRole] = useState<BroadcastRole>('all');
    const [newBroadcastStyle, setNewBroadcastStyle] = useState<BroadcastStyle>('info');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [userReports, setUserReports] = useState<Report[]>([]);
    const [previewAd, setPreviewAd] = useState<Campaign | null>(null);

    // --- FINANCIAL REPORT STATES ---
    const [reportPeriod, setReportPeriod] = useState('daily');
    const [manualCosts, setManualCosts] = useState<ManualCost[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';
        if (user && isAdmin) {
            refreshAllData();
        }
    }, [user]);

    // Handler para abrir chat vindo de outra página
    useEffect(() => {
        if (location.state && (location.state as any).openChatId && (location.state as any).openChatRole) {
            setActiveTab('messages');
            setChatPartnerId((location.state as any).openChatId);
            setChatPartnerRole((location.state as any).openChatRole);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const refreshInbox = async () => {
        const partners = await messageService.getConversationPartners('admin');
        setChatPartners(partners);

        if (chatPartnerId && chatPartnerRole) {
            // Busca conversa ESTRITAMENTE para este papel
            const msgs = await messageService.getConversation('admin', chatPartnerId);
            const filteredMsgs = msgs.filter(m => m.type !== 'warning');

            setActiveConversation(filteredMsgs);

            // APENAS marca como lido se houver mensagens NÃO LIDAS para evitar loop infinito
            if (activeTab === 'messages') {
                const hasUnread = filteredMsgs.some(m => m.toId === 'admin' && !m.read);
                if (hasUnread) {
                    await messageService.markConversationAsRead('admin', chatPartnerId);
                }
            }
        }
    };

    useEffect(() => {
        refreshInbox();
        const handleUpdate = () => refreshInbox();
        window.addEventListener('messages-update', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('messages-update', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [activeTab, chatPartnerId, chatPartnerRole]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'messages' && chatPartnerId) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [activeConversation.length, activeTab, chatPartnerId]);

    useEffect(() => {
        const updateOnlineCount = async () => {
            try {
                const count = await authService.getOnlineCount();
                console.log('⚡ [Admin] Usuários Online (últimos 5min):', count);
                setGlobalStats(prev => ({ ...prev, onlineCount: count || 1 }));
            } catch (e) {
                console.error("Erro ao buscar usuários online:", e);
            }
        };
        updateOnlineCount();
        const interval = setInterval(updateOnlineCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const refreshAllData = async () => {
        try {
            console.log('🔄 Carregando usuários...');
            const realUsers = await authService.getAllUsers();
            console.log('👥 Usuários encontrados:', realUsers.length, realUsers);

            const realChannels: Channel[] = realUsers.map((u) => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar,
                subscribers: 0,
                status: u.status || 'active',
                joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
                warnings: u.warnings || 0
            }));
            console.log('📺 Canais mapeados:', realChannels.length);
            setChannels(realChannels);
            setGlobalStats(prev => ({
                ...prev,
                totalUsers: realUsers.length,
                totalCreators: realUsers.filter(u => u.role === 'creator').length,
                totalAdvertisers: realUsers.filter(u => u.role === 'advertiser').length
            }));
        } catch (e) {
            console.error('❌ Erro ao carregar usuários:', e);
        }

        try { setAds(await adService.getCampaigns()); } catch (e) { console.error(e); setAds([]); }
        try { setSubscriptions(await adService.getAllSubscriptions()); } catch (e) { console.error(e); setSubscriptions([]); }
        try { setBroadcasts(await broadcastService.getAll()); } catch (e) { console.error(e); setBroadcasts([]); }
        try { setUserReports(await reportService.getAll()); } catch (e) { console.error(e); setUserReports([]); }

        // Carrega configurações globais do Supabase
        try {
            const platformSettings = await platformSettingsService.getSettings();
            setIsMaintenance(platformSettings.isMaintenanceMode);
            setMaxWarnings(platformSettings.maxWarnings);
        } catch (e) {
            console.error('Erro ao carregar configurações da plataforma:', e);
            setIsMaintenance(authService.isMaintenanceMode());
            setMaxWarnings(authService.getMaxWarnings());
        }

        // Financial Data
        try { setManualCosts(await adService.getManualCosts()); } catch (e) { console.error(e); setManualCosts([]); }

        refreshInbox();
    };

    const handleAdvertir = async (channelId: string) => {
        setChannels(prev => prev.map(ch => {
            if (ch.id === channelId) {
                const newWarnings = (ch.warnings || 0) + 1;
                const willSuspend = maxWarnings > 0 && newWarnings >= maxWarnings;
                return { ...ch, warnings: newWarnings, status: (willSuspend ? 'suspended' : 'warned') as ChannelStatus };
            }
            return ch;
        }));
        try {
            await authService.warnUser(channelId);
            refreshAllData();
        } catch (e) { console.error("Erro ao salvar advertência", e); }
    };

    const handleBanir = async (channelId: string) => {
        if (!confirm(`Tem certeza que deseja BANIR este usuário?`)) return;
        try { await authService.suspendUser(channelId); refreshAllData(); alert("Usuário banido."); } catch (e) { alert("Erro ao banir usuário."); }
    };

    const handleDesbanir = async (channelId: string) => {
        try { await authService.reactivateUser(channelId, true); refreshAllData(); alert("Usuário reativado."); } catch (e) { alert("Erro ao reativar usuário."); }
    };

    const handleSaveMaxWarnings = async () => {
        const success = await platformSettingsService.updateSettings({ maxWarnings });
        if (success) {
            setShowSettingsSuccess(true);
            setTimeout(() => setShowSettingsSuccess(false), 3000);
        } else {
            alert('Erro ao salvar no Supabase. Verifique seu papel (Admin/Owner).');
        }
    };

    const toggleMaintenance = async () => {
        const newState = !isMaintenance;
        const success = await platformSettingsService.updateSettings({ isMaintenanceMode: newState });
        if (success) {
            setIsMaintenance(newState);
            alert(`Modo de Manutenção ${newState ? 'ATIVADO' : 'DESATIVADO'}.`);
        } else {
            alert('Erro ao alterar modo de manutenção. Verifique suas permissões.');
        }
    };

    const handleStartChat = (userId: string, role: UserRole = 'creator') => {
        setActiveTab('messages');
        setChatPartnerId(userId);
        setChatPartnerRole(role);
        setTimeout(refreshInbox, 50);
    };

    const handleSendAdminMessage = async () => {
        if (!adminMessageText.trim() || !chatPartnerId || !chatPartnerRole) {
            console.log('Mensagem vazia ou sem destinatário');
            return;
        }

        try {
            await messageService.sendMessage({
                fromId: 'admin',
                toId: chatPartnerId,
                fromName: 'Suporte FairStream',
                subject: 'Resposta do Suporte',
                body: adminMessageText,
                type: 'chat',
                fromRole: 'owner',
                toRole: chatPartnerRole
            });

            setAdminMessageText('');
            await refreshInbox();
            console.log('Mensagem enviada com sucesso!');
        } catch (error) {
            console.error('Erro ao enviar:', error);
            alert('Erro ao enviar mensagem!');
        }
    };

    const handleCreateBroadcast = async () => {
        if (!newBroadcastText.trim()) return;
        await broadcastService.create({ content: newBroadcastText, targetRole: newBroadcastRole, style: newBroadcastStyle, isActive: true });
        setNewBroadcastText('');
        setBroadcasts(await broadcastService.getAll());
        alert('Mensagem enviada com sucesso!');
    };
    const handleToggleBroadcast = async (id: string, currentStatus: boolean) => {
        await broadcastService.update(id, { isActive: !currentStatus });
        setBroadcasts(await broadcastService.getAll());
    };
    const handleDeleteBroadcast = async (id: string) => {
        if (!confirm("Tem certeza que deseja apagar esta mensagem definitivamente?")) return;
        setDeletingId(id);
        const success = await broadcastService.delete(id);
        if (success) {
            setBroadcasts(prev => prev.filter(b => b.id !== id));
            alert("Mensagem apagada com sucesso.");
        }
        setDeletingId(null);
    };
    const handleReviewReport = async (id: string) => {
        await reportService.markAsReviewed(id);
        setUserReports(await reportService.getAll());
    };
    const handleDeleteReport = async (id: string) => {
        if (confirm("Apagar denúncia do histórico?")) {
            await reportService.delete(id);
            setUserReports(await reportService.getAll());
        }
    };
    const handleApproveAd = async (id: string) => { await adService.updateCampaignStatus(id, 'active'); setPreviewAd(null); refreshAllData(); }
    const handleRejectAd = async (id: string) => { await adService.updateCampaignStatus(id, 'rejected'); setPreviewAd(null); refreshAllData(); }

    const handleDeleteAd = async (id: string) => {
        if (!confirm("Tem certeza que deseja apagar esta campanha definitivamente?")) return;
        const success = await adService.deleteCampaign(id);
        if (success) {
            refreshAllData();
            alert("Campanha apagada com sucesso.");
        } else {
            alert("Erro ao apagar campanha.");
        }
    };

    // FINANCIAL HANDLERS
    const handleAddCost = async (cost: ManualCost) => {
        await adService.addManualCost(cost);
        try { setManualCosts(await adService.getManualCosts()); } catch (e) { console.error(e); }
    };

    const handleDeleteCost = async (id: string) => {
        await adService.deleteManualCost(id);
        try { setManualCosts(await adService.getManualCosts()); } catch (e) { console.error(e); }
    };

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => setIsExporting(false), 2000);
    };

    const getStatusBadge = (status: string) => {
        const colors: any = { active: 'text-green-400 border-green-800 bg-green-900/30', warned: 'text-yellow-400 border-yellow-800 bg-yellow-900/30', suspended: 'text-red-400 border-red-800 bg-red-900/30', pending: 'text-blue-400 border-blue-800 bg-blue-900/30', pending_payment: 'text-orange-400 border-orange-800 bg-orange-900/30', waiting_approval: 'text-blue-400 border-blue-800 bg-blue-900/30', rejected: 'text-red-400 border-red-800 bg-red-900/30', paused: 'text-zinc-400 border-zinc-700 bg-zinc-800', cancelled: 'text-zinc-500 border-zinc-800 bg-zinc-950 line-through' };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || ''}`}>{status.toUpperCase().replace('_', ' ')}</span>;
    };

    const StatCard = ({ icon: Icon, label, value, isLive = false, color = "#333" }: any) => (
        <div className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 w-full ${theme === 'dark' ? 'bg-zinc-50 border-zinc-800 bg-[#f9f9f9] border-[#eee]' : 'bg-white border-gray-200'}`} style={{ backgroundColor: '#f9f9f9', border: '1px solid #eee' }}>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                <Icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }} className="truncate">{label}</p>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: color, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {value}
                    {isLive && <span className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></span>}
                </h3>
            </div>
        </div>
    );

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 className="text-blue-500 animate-spin" size={48} />
                <p className="text-zinc-500 font-bold animate-pulse">Carregando painel administrativo...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full relative space-y-8">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-white mb-2">
                    <Shield className="text-red-600" size={32} /> Painel Administrativo
                    <button
                        onClick={refreshAllData}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-all ml-auto md:ml-4 group"
                        title="Sincronizar dados do Supabase"
                    >
                        <RefreshCw size={20} className="text-zinc-500 group-hover:text-white group-active:rotate-180 transition-all duration-500" />
                    </button>
                </h1>
                {isMaintenance && <div className="mt-4 bg-yellow-600/20 border border-yellow-600/50 p-3 rounded-lg text-yellow-200 flex items-center gap-2 max-w-md"><AlertTriangle size={20} /> <span className="font-bold">MODO DE MANUTENÇÃO ATIVO</span></div>}
            </div>

            {/* --- DASHBOARD STATISTICS ROW 1 --- */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Users} label="Contas Totais" value={globalStats.totalUsers} />
                <StatCard icon={Video} label="Criadores" value={globalStats.totalCreators} />
                <StatCard icon={Megaphone} label="Anunciantes" value={globalStats.totalAdvertisers} />
                <StatCard icon={Zap} label="Online Agora" value={globalStats.onlineCount} isLive color="#10b981" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <StatCard icon={Crown} label="Assinaturas Ativas" value={subscriptions.length} />
                <StatCard icon={BarChart2} label="Receita Bruta" value={`R$ ${subscriptions.reduce((acc, s) => acc + s.price, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="#10b981" />
            </div>

            <div className="flex gap-1 md:gap-4 border-b border-zinc-800 mb-8 overflow-x-auto pb-1 custom-scrollbar">
                <button onClick={() => setActiveTab('channels')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'channels' ? 'border-red-600 text-white' : 'border-transparent text-zinc-500'}`}>Canais & Moderação</button>
                <button onClick={() => setActiveTab('messages')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${activeTab === 'messages' ? 'border-blue-400 text-white' : 'border-transparent text-zinc-500'}`}>
                    <Inbox size={16} /> Caixa de Entrada
                    {chatPartners.some(p => p.unread) && <span className="bg-red-500 w-2 h-2 rounded-full animate-bounce"></span>}
                </button>
                <button onClick={() => setActiveTab('ads')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'ads' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500'}`}>Aprovação de Anúncios</button>
                <button onClick={() => setActiveTab('financial_reports')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'financial_reports' ? 'border-green-500 text-white' : 'border-transparent text-zinc-500'}`}>
                    <BarChart2 size={16} /> Relatórios Financeiros
                </button>
                <button onClick={() => setActiveTab('subs')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'subs' ? 'border-purple-500 text-white' : 'border-transparent text-zinc-500'}`}>Assinaturas</button>
                <button onClick={() => setActiveTab('moderation_reports')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'moderation_reports' ? 'border-red-400 text-white' : 'border-transparent text-zinc-500'}`}>Denúncias</button>
                <button onClick={() => setActiveTab('broadcasts')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'broadcasts' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500'}`}>Avisos Globais</button>
                <button onClick={() => setActiveTab('settings')} className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'settings' ? 'border-purple-500 text-white' : 'border-transparent text-zinc-500'}`}>Configurações Gerais</button>

            </div>

            {activeTab === 'financial_reports' && (
                <div className="space-y-6">
                    <CostEntryForm onAdd={handleAddCost} />
                    <FinancialReport
                        reportPeriod={reportPeriod}
                        setReportPeriod={setReportPeriod}
                        isExporting={isExporting}
                        onExport={handleExport}
                        reportData={generateDailyReportData(new Date().getMonth(), new Date().getFullYear())}
                        manualCosts={manualCosts}
                        onDeleteCost={handleDeleteCost}
                    />
                </div>
            )}

            {activeTab === 'channels' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-950/50">
                        <h2 className="font-bold text-white flex items-center gap-2"><User size={20} className="text-zinc-400" /> Usuários</h2>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                            <input placeholder="Buscar..." className="bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 outline-none text-white w-full text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm text-zinc-300">
                            <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">Usuário</th>
                                    <th className="p-4">Inscritos</th>
                                    <th className="p-4">Desde</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Alertas</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {channels.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(ch => (
                                    <tr key={ch.id} className="hover:bg-zinc-800/50">
                                        <td className="p-4 font-medium text-white max-w-[150px] truncate">{ch.name}</td>
                                        <td className="p-4 text-zinc-400">{ch.subscribers.toLocaleString()}</td>
                                        <td className="p-4 text-zinc-500 text-xs">{ch.joinedDate}</td>
                                        <td className="p-4">{getStatusBadge(ch.status)}</td>
                                        <td className="p-4 flex items-center gap-1">{ch.warnings > 0 && <AlertTriangle size={14} className="text-yellow-500" />}{ch.warnings}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {/* Botão Mensagem para Criador */}
                                                <button onClick={() => handleStartChat(ch.id, 'creator')} className="p-2 hover:bg-blue-900/20 text-blue-500 rounded-lg transition-colors" title="Enviar Mensagem Direta"><MessageSquare size={18} /></button>
                                                {ch.status !== 'suspended' && <button onClick={() => handleAdvertir(ch.id)} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-900/20 border border-yellow-800 text-yellow-500 rounded-lg text-xs font-bold hover:bg-yellow-900/40"><AlertTriangle size={14} /> Advertir</button>}
                                                {(ch.status === 'active' || ch.status === 'warned') && <button onClick={() => handleBanir(ch.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-900/20 border border-red-800 text-red-500 rounded-lg text-xs font-bold hover:bg-red-900/40"><Ban size={14} /> Banir</button>}
                                                {ch.status === 'suspended' && <button onClick={() => handleDesbanir(ch.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-900/20 border border-green-800 text-green-400 rounded-lg text-xs font-bold hover:bg-green-900/40"><Unlock size={14} /> Desbanir</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'messages' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Inbox className="text-blue-500" size={28} /> Caixa de Mensagens
                            </h2>
                            <p className="text-zinc-400 text-sm mt-1">Comunicação direta com usuários da plataforma</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                                <button
                                    onClick={() => setShowOnlyUnread(false)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!showOnlyUnread ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setShowOnlyUnread(true)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${showOnlyUnread ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Não Lidas
                                    {chatPartners.filter(p => p.unread).length > 0 && (
                                        <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-[10px]">
                                            {chatPartners.filter(p => p.unread).length}
                                        </span>
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm('Limpar todas as mensagens desta conversa?')) {
                                        if (chatPartnerId) {
                                            messageService.clearAll(chatPartnerId).then(() => {
                                                setChatPartners([]);
                                                setActiveConversation([]);
                                                setChatPartnerId(null);
                                                setChatPartnerRole(null);
                                                alert('Mensagens limpas!');
                                            });
                                        }
                                    }
                                }}
                                className="bg-red-600/10 hover:bg-red-600 border border-red-600/20 text-red-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                <Trash2 size={16} />
                                Limpar
                            </button>
                        </div>
                    </div>

                    {!chatPartnerId ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {chatPartners.filter(p => showOnlyUnread ? p.unread : true).length === 0 ? (
                                <div className="col-span-full text-center text-zinc-500 py-12 bg-zinc-950/30 rounded-2xl border-2 border-dashed border-zinc-800">
                                    <Inbox size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-lg font-medium">Nenhuma conversa {showOnlyUnread ? 'não lida' : 'encontrada'}.</p>
                                    {showOnlyUnread && <button onClick={() => setShowOnlyUnread(false)} className="text-blue-500 hover:underline mt-2 text-sm">Ver todas as conversas</button>}
                                </div>
                            ) : (
                                chatPartners
                                    .filter(p => showOnlyUnread ? p.unread : true)
                                    .sort((a, b) => (a.unread === b.unread) ? 0 : a.unread ? -1 : 1) // Não lidas primeiro
                                    .map(partner => (
                                        <button
                                            key={`${partner.id}_${partner.role}`}
                                            onClick={() => { setChatPartnerId(partner.id); setChatPartnerRole(partner.role); refreshInbox(); }}
                                            className={`group w-full p-5 rounded-2xl flex items-center justify-between text-left transition-all border-2 ${partner.unread
                                                ? 'bg-blue-600/5 border-blue-500/30 hover:bg-blue-600/10 hover:border-blue-500/50 shadow-lg shadow-blue-900/10'
                                                : 'bg-zinc-800/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner ${partner.unread ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-zinc-700'}`}>
                                                    {partner.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`text-lg transition-colors ${partner.unread ? 'text-white font-black' : 'text-zinc-300 font-bold group-hover:text-white'}`}>{partner.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${partner.role === 'creator' ? 'bg-purple-500' : partner.role === 'advertiser' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{partner.role}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {partner.unread ? (
                                                    <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-blue-500/50">NOVA</span>
                                                ) : (
                                                    <ChevronRight size={20} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                                )}
                                            </div>
                                        </button>
                                    ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header da conversa */}
                            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-xl border border-zinc-700">
                                <button
                                    onClick={() => { setChatPartnerId(null); setChatPartnerRole(null); setActiveConversation([]); }}
                                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors"
                                >
                                    ← Voltar
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                        {(chatPartners.find(p => p.id === chatPartnerId)?.name || 'U').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg">{chatPartners.find(p => p.id === chatPartnerId)?.name || 'Usuário'}</p>
                                        <p className="text-sm text-zinc-400 flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${chatPartnerRole === 'creator' ? 'bg-purple-500' : chatPartnerRole === 'advertiser' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                            {chatPartnerRole === 'creator' ? 'Criador' : chatPartnerRole === 'advertiser' ? 'Anunciante' : 'Espectador'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Área de mensagens - ALTURA DINÂMICA */}
                            <div className="bg-zinc-950 rounded-xl p-5 min-h-[400px] max-h-[calc(100vh-350px)] overflow-y-auto space-y-4 border border-zinc-800">
                                {activeConversation.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                        <MessageSquare size={48} className="mb-4 opacity-30" />
                                        <p className="text-lg">Nenhuma mensagem ainda</p>
                                        <p className="text-sm">Inicie a conversa enviando uma mensagem abaixo</p>
                                    </div>
                                ) : (
                                    <>
                                        {activeConversation.map(msg => (
                                            <div key={msg.id} className={`flex ${msg.fromId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`p-4 rounded-2xl max-w-[75%] shadow-lg ${msg.fromId === 'admin' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md' : 'bg-zinc-800 text-white rounded-bl-md border border-zinc-700'}`}>
                                                    <p className="text-xs font-bold mb-1 opacity-80">{msg.fromId === 'admin' ? '📩 Você (Suporte)' : `👤 ${msg.fromName}`}</p>
                                                    <p className="text-base leading-relaxed">{msg.body}</p>
                                                    <p className="text-xs opacity-60 mt-2 text-right">{new Date(msg.createdAt).toLocaleString('pt-BR')}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Input de mensagem - MELHOR LAYOUT */}
                            <div className="flex gap-3">
                                <textarea
                                    value={adminMessageText}
                                    onChange={e => setAdminMessageText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendAdminMessage();
                                        }
                                    }}
                                    placeholder="Digite sua resposta aqui... (Shift+Enter para nova linha)"
                                    className="flex-1 bg-zinc-900 border-2 border-zinc-800 rounded-2xl px-6 py-5 text-white text-lg outline-none focus:border-blue-500 transition-all resize-none min-h-[150px] shadow-inner"
                                    rows={5}
                                />
                                <button
                                    onClick={handleSendAdminMessage}
                                    disabled={!adminMessageText.trim()}
                                    className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:opacity-30 disabled:cursor-not-allowed text-white px-10 py-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Send size={24} />
                                    <span>Enviar</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ads' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-zinc-950 p-4 border-b border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900 p-3 rounded border border-zinc-800 flex flex-col justify-center">
                            <span className="text-zinc-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Video size={12} /> Impressões (Vídeo)</span>
                            <span className="text-xl font-bold text-blue-400">{ads.filter(c => c.location === 'video').reduce((acc, c) => acc + c.impressions, 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-zinc-900 p-3 rounded border border-zinc-800 flex flex-col justify-center">
                            <span className="text-zinc-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Layout size={12} /> Impressões (Home)</span>
                            <span className="text-xl font-bold text-purple-400">{ads.filter(c => c.location === 'home').reduce((acc, c) => acc + c.impressions, 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-zinc-900 p-3 rounded border border-zinc-800 flex flex-col justify-center">
                            <span className="text-zinc-500 text-xs font-bold uppercase mb-1">Total Campanhas</span>
                            <span className="text-xl font-bold text-white">{ads.length}</span>
                        </div>
                        <div className="bg-zinc-900 p-3 rounded border border-zinc-800 flex flex-col justify-center">
                            <span className="text-zinc-500 text-xs font-bold uppercase mb-1">Em Aprovação</span>
                            <span className="text-xl font-bold text-blue-400">{ads.filter(a => a.status === 'waiting_approval').length}</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm text-zinc-300">
                            <thead className="bg-zinc-950 text-zinc-400">
                                <tr><th className="p-4">Campanha</th><th className="p-4">Tipo</th><th className="p-4">Local</th><th className="p-4">Status</th><th className="p-4">Orçamento</th><th className="p-4 text-right">Ação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {ads.map(ad => (
                                    <tr key={ad.id} className="hover:bg-zinc-800/50">
                                        <td className="p-4 text-white"><div className="font-medium max-w-[250px] truncate">{ad.title}</div><div className="text-xs text-zinc-500 max-w-[250px] truncate">{ad.targetCategories.join(', ')}</div></td>
                                        <td className="p-4">{ad.type === 'image' ? <span title="Banner"><Image size={16} className="text-purple-400" /></span> : <span title="Texto"><Type size={16} className="text-blue-400" /></span>}</td>
                                        <td className="p-4 text-xs text-zinc-300">{ad.location === 'home' ? 'Home' : 'Vídeo'}</td>
                                        <td className="p-4">{getStatusBadge(ad.status)}</td>
                                        <td className="p-4">R$ {ad.budget.toFixed(2)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                <button onClick={() => handleStartChat(ad.advertiserId, 'advertiser')} className="text-zinc-400 hover:text-green-400 p-2 hover:bg-green-900/20 rounded-lg transition-colors" title="Enviar Mensagem ao Anunciante"><MessageSquare size={18} /></button>
                                                <button onClick={() => setPreviewAd(ad)} className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-700 rounded-lg transition-colors" title="Visualizar Anúncio"><Eye size={18} /></button>
                                                <button onClick={() => handleDeleteAd(ad.id)} className="text-zinc-400 hover:text-red-500 p-2 hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir Campanha"><Trash2 size={18} /></button>
                                                {ad.status === 'waiting_approval' && (
                                                    <div className="flex gap-2 ml-2 border-l border-zinc-800 pl-2">
                                                        <button onClick={() => handleApproveAd(ad.id)} className="text-green-400 border border-green-800 px-3 py-1.5 rounded text-xs font-bold hover:bg-green-900/30 flex items-center gap-1"><CheckCircle size={14} /> Aprovar</button>
                                                        <button onClick={() => handleRejectAd(ad.id)} className="text-red-400 border border-red-800 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-900/30 flex items-center gap-1"><XCircle size={14} /> Rejeitar</button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'subs' && (
                <div className="space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Crown className="text-purple-400" /> Gestão de Assinaturas</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl"><p className="text-xs text-zinc-500 uppercase font-bold">Total Assinantes</p><p className="text-2xl font-bold text-white">{subscriptions.length}</p></div>
                            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl"><p className="text-xs text-zinc-500 uppercase font-bold">Assinantes Global (R$ 29,90)</p><p className="text-2xl font-bold text-purple-400">{subscriptions.filter(s => s.type === 'global').length}</p></div>
                            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl"><p className="text-xs text-zinc-500 uppercase font-bold">Assinantes Canal (R$ 9,90)</p><p className="text-2xl font-bold text-blue-400">{subscriptions.filter(s => s.type === 'channel').length}</p></div>
                            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl"><p className="text-xs text-zinc-500 uppercase font-bold">Receita Estimada (Mensal)</p><p className="text-2xl font-bold text-green-400">R$ {subscriptions.reduce((acc, sub) => acc + sub.price, 0).toFixed(2)}</p></div>
                        </div>
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-sm text-zinc-300">
                                <thead className="bg-zinc-950 text-zinc-400">
                                    <tr><th className="p-4">ID</th><th className="p-4">Tipo</th><th className="p-4">Preço</th><th className="p-4">Split (Plataforma/Criador)</th><th className="p-4">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {subscriptions.map((sub, idx) => (
                                        <tr key={idx} className="hover:bg-zinc-800/50">
                                            <td className="p-4 font-mono text-xs">{sub.id}</td>
                                            <td className="p-4">{sub.type === 'global' ? <span className="flex items-center gap-1 text-purple-400 font-bold"><Globe size={14} /> Global</span> : <span className="flex items-center gap-1 text-blue-400 font-bold"><User size={14} /> Canal</span>}</td>
                                            <td className="p-4">R$ {sub.price.toFixed(2)}</td>
                                            <td className="p-4">{sub.type === 'global' ? <span className="text-green-400">100% Plataforma</span> : <span className="text-zinc-300">30% / 70%</span>}</td>
                                            <td className="p-4"><span className="bg-green-900/20 text-green-400 border border-green-900/50 px-2 py-1 rounded text-xs font-bold">ATIVO</span></td>
                                        </tr>
                                    ))}
                                    {subscriptions.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Nenhuma assinatura ativa no momento.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'moderation_reports' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-zinc-800">
                        <h2 className="font-bold text-white flex items-center gap-2"><Flag size={20} className="text-red-400" /> Denúncias de Conteúdo</h2>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm text-zinc-300">
                            <thead className="bg-zinc-950 text-zinc-400">
                                <tr><th className="p-4">Reportado</th><th className="p-4">Motivo</th><th className="p-4">Status</th><th className="p-4">Data</th><th className="p-4 text-right">Ação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {userReports.map(rep => (
                                    <tr key={rep.id} className="hover:bg-zinc-800/50">
                                        <td className="p-4"><div className="font-medium text-white">{rep.videoTitle}</div><div className="text-xs text-zinc-500">ID Denúncia: {rep.id.slice(-6)}</div></td>
                                        <td className="p-4">{rep.reason}</td>
                                        <td className="p-4">{rep.status === 'pending' ? <span className="text-yellow-500 font-bold">Pendente</span> : <span className="text-zinc-500 font-bold">Resolvido</span>}</td>
                                        <td className="p-4 text-xs">{new Date(rep.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {rep.status === 'pending' && <button onClick={() => handleReviewReport(rep.id)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-all">Resolver</button>}
                                                <button className="bg-red-900/20 border border-red-800 text-red-500 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-900/40 transition-all">Remover Conteúdo</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {userReports.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-medium">Não há denúncias registradas no momento.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'broadcasts' && (
                <div className="space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Send className="text-orange-500" /> Criar Aviso Global</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Mensagem do Aviso</label>
                                    <textarea
                                        value={newBroadcastText}
                                        onChange={e => setNewBroadcastText(e.target.value)}
                                        placeholder="Ex: Teremos uma manutenção programada..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-orange-500 transition-colors resize-none"
                                        rows={5}
                                    />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Público Alvo</label>
                                        <select
                                            value={newBroadcastRole}
                                            onChange={e => setNewBroadcastRole(e.target.value as any)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-orange-500 font-bold"
                                        >
                                            <option value="all">Todos os Usuários</option>
                                            <option value="creator">Apenas Criadores</option>
                                            <option value="advertiser">Apenas Anunciantes</option>
                                            <option value="viewer">Apenas Espectadores</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Estilo do Alerta</label>
                                        <select
                                            value={newBroadcastStyle}
                                            onChange={e => setNewBroadcastStyle(e.target.value as any)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-orange-500 font-bold"
                                        >
                                            <option value="info">Informação (Azul)</option>
                                            <option value="warning">Aviso (Amarelo)</option>
                                            <option value="alert">Crítico (Vermelho)</option>
                                            <option value="success">Sucesso (Verde)</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCreateBroadcast}
                                    className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
                                >
                                    <Send size={20} /> Publicar Aviso Agora
                                </button>
                                <p className="text-[10px] text-zinc-500 text-center italic">Este aviso aparecerá instantaneamente no topo para o público selecionado.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
                            <h2 className="font-bold text-white flex items-center gap-2"><Globe size={18} className="text-zinc-500" /> Histórico de Avisos</h2>
                            <span className="bg-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400 font-bold">{broadcasts.length} PUBLICADOS</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-300">
                                <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-black tracking-widest">
                                    <tr><th className="p-4">Mensagem</th><th className="p-4">Estilo</th><th className="p-4 text-center">Alvo</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Ação</th></tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {broadcasts.map(b => (
                                        <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors">
                                            <td className="p-4 max-w-md"><div className="truncate font-medium">{b.content}</div><div className="text-[10px] text-zinc-500 mt-1">{new Date(b.createdAt).toLocaleDateString()}</div></td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${b.style === 'info' ? 'bg-blue-500' : b.style === 'warning' ? 'bg-yellow-500' : b.style === 'alert' ? 'bg-red-500' : 'bg-green-500'}`} />
                                                    <span className="capitalize text-xs">{b.style}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 uppercase text-[10px] font-black text-center text-zinc-500">{b.targetRole === 'all' ? 'TODOS' : b.targetRole}</td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleToggleBroadcast(b.id, b.isActive)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${b.isActive ? 'bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'}`}>
                                                    {b.isActive ? 'ATIVO' : 'LATENTE'}
                                                </button>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDeleteBroadcast(b.id)} className="text-zinc-600 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all" title="Excluir Aviso"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {broadcasts.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-zinc-600 font-medium">Nenhum aviso global registrado no banco de dados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}



            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Shield size={24} className="text-purple-400" /> Segurança e Políticas</h2>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                                <div>
                                    <p className="font-bold text-white">Modo de Manutenção</p>
                                    <p className="text-xs text-zinc-500">Bloqueia o acesso de todos, exceto administradores</p>
                                </div>
                                <button
                                    onClick={() => toggleMaintenance()}
                                    className={`w-14 h-8 rounded-full relative transition-colors ${isMaintenance ? 'bg-red-600' : 'bg-zinc-700'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${isMaintenance ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                                <label className="block font-bold text-white mb-1">Limite de Advertências</label>
                                <p className="text-xs text-zinc-500 mb-4">Número de avisos antes do banimento automático</p>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={maxWarnings}
                                        onChange={e => setMaxWarnings(parseInt(e.target.value))}
                                        className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <span className="text-xl font-bold text-white w-8">{maxWarnings}</span>
                                    <button
                                        onClick={handleSaveMaxWarnings}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        <Save size={16} /> Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {previewAd && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Pré-visualização do Anúncio</h3>
                            <button onClick={() => setPreviewAd(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-6">
                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden mb-6">
                                {previewAd.type === 'image' ? (
                                    <div className="aspect-video w-full bg-black relative">
                                        {previewAd.bannerImage ? (
                                            <img src={previewAd.bannerImage} alt={previewAd.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-zinc-900 border-2 border-dashed border-zinc-800">
                                                <Image size={48} />
                                                <p className="mt-2 text-sm font-bold">Sem imagem disponível</p>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-wide">
                                            PATROCINADO
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 min-h-[160px] flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">PATROCINADO</span>
                                            <h4 className="font-bold text-lg text-white">{previewAd.title}</h4>
                                        </div>
                                        <div className="relative group/text">
                                            <p className="text-zinc-300 text-sm whitespace-pre-wrap max-h-[80px] overflow-y-auto custom-scrollbar">{previewAd.desktopDescription || 'Sem descrição definida.'}</p>
                                        </div>
                                        <div className="mt-4 flex items-center gap-1 text-blue-500 text-xs font-bold uppercase tracking-wider">
                                            <ExternalLink size={14} /> Visitar Site
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Localização</p>
                                    <p className="text-sm text-green-400 font-bold uppercase">{previewAd.location === 'home' ? 'Home' : 'VÍDEO'}</p>
                                </div>
                                <div className="p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Link (Seguro)</p>
                                    <p className="text-sm text-blue-400 font-bold truncate opacity-50 select-all" title="O link não é clicável por segurança. Copie e cole se precisar verificar.">{previewAd.targetUrl}</p>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-zinc-800/20 border border-zinc-800 rounded-xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Categorias Selecionadas</p>
                                <div className="flex flex-wrap gap-2">
                                    {previewAd.targetCategories.map(cat => (
                                        <span key={cat} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-[10px] uppercase font-bold border border-zinc-700">
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {previewAd.status === 'waiting_approval' && (
                            <div className="p-6 bg-zinc-950 border-t border-zinc-800 flex gap-3">
                                <button onClick={() => { handleApproveAd(previewAd.id); setPreviewAd(null); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all">Aprovar Anúncio</button>
                                <button onClick={() => { handleRejectAd(previewAd.id); setPreviewAd(null); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all">Rejeitar Anúncio</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;

