
import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, EyeOff, ArrowLeft, Megaphone, Image as ImageIcon, Type, ExternalLink, Monitor, Smartphone, Loader2, Sparkles, RefreshCw, Upload, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';

interface PlatformCampaign {
    id: string;
    type: 'text' | 'image';
    title: string;
    desktopDescription?: string;
    mobileDescription?: string;
    bannerImage?: string;
    targetUrl: string;
    isActive: boolean;
    createdAt: string;
    impressions: number;
    clicks: number;
}

const AdminPlatformCampaigns: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useSettings();

    const [campaigns, setCampaigns] = useState<PlatformCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Form state
    const [newCampaign, setNewCampaign] = useState({
        type: 'text' as 'text' | 'image',
        title: '',
        desktopDescription: '',
        mobileDescription: '',
        bannerImage: '',
        bannerSource: 'random' as 'manual' | 'random',
        targetUrl: ''
    });

    const { user, isLoading: authLoading } = useAuth();
    const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';

    useEffect(() => {
        if (!authLoading) {
            if (!isAdmin) {
                navigate('/admin');
            } else {
                loadCampaigns();
            }
        }
    }, [authLoading, isAdmin, navigate]);

    const loadCampaigns = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('platform_campaigns').select('*').order('created_at', { ascending: false });
            if (error) throw error;

            // Map from DB format to component format
            const mapped = (data || []).map(c => ({
                id: c.id,
                type: c.image_url ? 'image' : 'text' as 'text' | 'image',
                title: c.title || '',
                desktopDescription: c.desktop_description || '',
                mobileDescription: c.mobile_description || '',
                bannerImage: c.image_url || '',
                targetUrl: c.target_url || '',
                isActive: c.is_active ?? true,
                createdAt: c.created_at,
                impressions: c.views || 0,
                clicks: c.clicks || 0
            }));
            setCampaigns(mapped);
        } catch (error) {
            console.error('Erro ao carregar campanhas da plataforma:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCampaign.title || !newCampaign.targetUrl) {
            alert('Preencha título e URL!');
            return;
        }

        if (newCampaign.type === 'text' && (!newCampaign.desktopDescription || !newCampaign.mobileDescription)) {
            alert('Preencha as descrições!');
            return;
        }

        if (newCampaign.type === 'image' && !newCampaign.bannerImage) {
            alert('Faça upload da imagem!');
            return;
        }

        try {
            let finalBanner = newCampaign.bannerImage;

            // Se for novo upload e imagem
            if (newCampaign.type === 'image') {
                if (newCampaign.bannerSource === 'manual' && finalBanner.startsWith('data:')) {
                    console.log('📤 [AdminCampaigns] Enviando banner para Storage...');
                    const response = await fetch(finalBanner);
                    const blob = await response.blob();
                    finalBanner = await imageService.uploadToSupabase(blob, 'campaigns', `camp_${Date.now()}`);
                    console.log('✅ [AdminCampaigns] Banner enviado:', finalBanner);
                } else if (newCampaign.bannerSource === 'random') {
                    // Usa Picsum Seed baseado no título para ser consistente
                    finalBanner = `https://picsum.photos/seed/camp_${encodeURIComponent(newCampaign.title)}/1280/720`;
                }
            }

            const { error } = await supabase.from('platform_campaigns').insert({
                title: newCampaign.title,
                image_url: newCampaign.type === 'image' ? finalBanner : null,
                target_url: newCampaign.targetUrl,
                desktop_description: newCampaign.desktopDescription,
                mobile_description: newCampaign.mobileDescription,
                is_active: true,
                location: 'home',
                views: 0,
                clicks: 0
            });

            if (error) throw error;
            // ... resto do código igual ...

            // Reload campaigns from DB
            await loadCampaigns();

            // Reset form
            setNewCampaign({
                type: 'text',
                title: '',
                desktopDescription: '',
                mobileDescription: '',
                bannerImage: '',
                bannerSource: 'random',
                targetUrl: ''
            });

            setShowCreateModal(false);
            setShowPreview(false);
            alert('✅ Campanha da plataforma criada com sucesso!');

            window.dispatchEvent(new Event('ad-update'));
        } catch (error) {
            console.error('Erro ao criar campanha:', error);
            alert('Erro ao criar campanha. Verifique o console.');
        }
    };

    const handleToggleActive = async (id: string) => {
        const campaign = campaigns.find(c => c.id === id);
        if (!campaign) return;

        try {
            const { error } = await supabase.from('platform_campaigns')
                .update({ is_active: !campaign.isActive })
                .eq('id', id);

            if (error) throw error;
            await loadCampaigns();
            window.dispatchEvent(new Event('ad-update'));
        } catch (error) {
            console.error('Erro ao alterar status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Deletar esta campanha da plataforma?')) {
            try {
                const { error } = await supabase.from('platform_campaigns').delete().eq('id', id);
                if (error) throw error;
                await loadCampaigns();
                window.dispatchEvent(new Event('ad-update'));
            } catch (error) {
                console.error('Erro ao deletar:', error);
            }
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                // Otimiza para banner: 1200px (qualidade 0.8)
                const optimizedBlob = await imageService.optimizeImage(file, 1200, 0.8);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewCampaign(prev => ({
                        ...prev,
                        bannerImage: reader.result as string,
                        bannerSource: 'manual'
                    }));
                };
                reader.readAsDataURL(optimizedBlob);
            } catch (err) {
                console.error("Erro ao otimizar banner:", err);
            }
        }
    };

    // Styles
    const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
    const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

    const activeCampaigns = campaigns.filter(c => c.isActive);

    return (
        <div className={`min-h-screen p-6 ${bgPage}`}>
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className={`flex items-center gap-2 mb-4 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
                    >
                        <ArrowLeft size={20} /> Voltar ao Painel
                    </button>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className={`text-2xl font-bold flex items-center gap-3 ${textPrimary}`}>
                                <Megaphone className="text-purple-500" /> Campanhas da Plataforma
                            </h1>
                            <p className={textSecondary}>Crie campanhas especiais gratuitas para a Página Principal</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
                        >
                            <Plus size={18} /> Nova Campanha
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className={`p-4 rounded-xl border ${cardBg}`}>
                        <p className={`text-xs uppercase font-bold mb-1 ${textSecondary}`}>Total de Campanhas</p>
                        <p className={`text-2xl font-bold ${textPrimary}`}>{campaigns.length}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${cardBg}`}>
                        <p className={`text-xs uppercase font-bold mb-1 ${textSecondary}`}>Campanhas Ativas</p>
                        <p className="text-2xl font-bold text-green-500">{activeCampaigns.length}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${cardBg}`}>
                        <p className={`text-xs uppercase font-bold mb-1 ${textSecondary}`}>Impressões Totais</p>
                        <p className={`text-2xl font-bold ${textPrimary}`}>
                            {campaigns.reduce((acc, c) => acc + c.impressions, 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Campaigns List */}
                <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
                    <div className={`p-4 border-b ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
                        <h2 className={`font-bold ${textPrimary}`}>Todas as Campanhas da Plataforma</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={theme === 'dark' ? 'bg-zinc-900/50 text-zinc-400' : 'bg-gray-50 text-gray-500'}>
                                <tr>
                                    <th className="p-4">Campanha</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">URL</th>
                                    <th className="p-4">Impressões</th>
                                    <th className="p-4">Cliques</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                                {campaigns.map(campaign => (
                                    <tr key={campaign.id} className={theme === 'dark' ? 'hover:bg-zinc-800/30' : 'hover:bg-gray-50'}>
                                        <td className="p-4">
                                            <div className={`font-bold ${textPrimary}`}>{campaign.title}</div>
                                            <div className="text-xs text-zinc-500">{new Date(campaign.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${campaign.type === 'image'
                                                ? 'bg-blue-900/20 text-blue-400'
                                                : 'bg-green-900/20 text-green-400'
                                                }`}>
                                                {campaign.type === 'image' ? 'Imagem' : 'Texto'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <a
                                                href={campaign.targetUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:underline flex items-center gap-1 text-xs"
                                            >
                                                Link <ExternalLink size={12} />
                                            </a>
                                        </td>
                                        <td className={`p-4 ${textPrimary}`}>{campaign.impressions.toLocaleString()}</td>
                                        <td className={`p-4 ${textPrimary}`}>{campaign.clicks.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${campaign.isActive
                                                ? 'bg-green-900/20 text-green-500 border border-green-900'
                                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                                }`}>
                                                {campaign.isActive ? 'Ativa' : 'Pausada'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(campaign.id)}
                                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-gray-200'
                                                        }`}
                                                    title={campaign.isActive ? 'Pausar' : 'Ativar'}
                                                >
                                                    {campaign.isActive ? <Eye size={16} className="text-green-500" /> : <EyeOff size={16} className="text-zinc-500" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(campaign.id)}
                                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-gray-200'
                                                        }`}
                                                    title="Deletar"
                                                >
                                                    <Trash2 size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {campaigns.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className={`p-10 text-center ${textSecondary}`}>
                                            Nenhuma campanha da plataforma criada ainda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className={`w-full max-w-3xl rounded-xl shadow-2xl ${cardBg} border max-h-[90vh] overflow-y-auto`}>
                            <div className={`p-6 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
                                <h2 className={`text-xl font-bold ${textPrimary}`}>Nova Campanha da Plataforma</h2>
                                <p className={`text-sm ${textSecondary}`}>Gratuita • Aparece apenas na Página Principal</p>

                                {/* Tabs */}
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${!showPreview ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
                                            }`}
                                    >
                                        <Type size={16} /> Editar
                                    </button>
                                    <button
                                        onClick={() => setShowPreview(true)}
                                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${showPreview ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
                                            }`}
                                    >
                                        <Eye size={16} /> Visualizar
                                    </button>
                                </div>
                            </div>

                            {!showPreview ? (
                                <div className="p-6 space-y-6">
                                    {/* Type Selection */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Tipo de Campanha</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setNewCampaign(prev => ({ ...prev, type: 'text' }))}
                                                className={`p-4 rounded-lg border-2 transition-colors ${newCampaign.type === 'text'
                                                    ? 'border-green-500 bg-green-500/10'
                                                    : theme === 'dark' ? 'border-zinc-700 hover:border-zinc-600' : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                            >
                                                <Type className={newCampaign.type === 'text' ? 'text-green-500' : textSecondary} />
                                                <p className={`mt-2 font-bold ${textPrimary}`}>Texto</p>
                                            </button>
                                            <button
                                                onClick={() => setNewCampaign(prev => ({ ...prev, type: 'image' }))}
                                                className={`p-4 rounded-lg border-2 transition-colors ${newCampaign.type === 'image'
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : theme === 'dark' ? 'border-zinc-700 hover:border-zinc-600' : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                            >
                                                <ImageIcon className={newCampaign.type === 'image' ? 'text-blue-500' : textSecondary} />
                                                <p className={`mt-2 font-bold ${textPrimary}`}>Imagem</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Título *</label>
                                        <input
                                            type="text"
                                            value={newCampaign.title}
                                            onChange={(e) => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Ex: Promoção Especial!"
                                            className={`w-full rounded-lg px-4 py-2 outline-none border ${inputBg}`}
                                        />
                                    </div>

                                    {/* Text Fields */}
                                    {newCampaign.type === 'text' && (
                                        <>
                                            <div>
                                                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Descrição (Computador) *</label>
                                                <textarea
                                                    value={newCampaign.desktopDescription}
                                                    onChange={(e) => setNewCampaign(prev => ({ ...prev, desktopDescription: e.target.value }))}
                                                    rows={3}
                                                    className={`w-full rounded-lg px-4 py-2 outline-none border ${inputBg}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Descrição (Celular) *</label>
                                                <textarea
                                                    value={newCampaign.mobileDescription}
                                                    onChange={(e) => setNewCampaign(prev => ({ ...prev, mobileDescription: e.target.value }))}
                                                    rows={2}
                                                    className={`w-full rounded-lg px-4 py-2 outline-none border ${inputBg}`}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Image Upload */}
                                    {newCampaign.type === 'image' && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className={`block text-sm font-medium ${textPrimary}`}>📸 Banner da Campanha *</label>
                                                <div className="flex bg-zinc-800 p-1 rounded-lg gap-1 border border-zinc-700">
                                                    <button
                                                        onClick={() => setNewCampaign(prev => ({ ...prev, bannerSource: 'random' }))}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${newCampaign.bannerSource === 'random' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        <Zap size={12} /> Automática
                                                    </button>
                                                    <button
                                                        onClick={() => setNewCampaign(prev => ({ ...prev, bannerSource: 'manual' }))}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${newCampaign.bannerSource === 'manual' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        <Upload size={12} /> Manual
                                                    </button>
                                                </div>
                                            </div>

                                            <div className={`w-full rounded-xl overflow-hidden mb-4 relative group border-2 transition-all min-h-[250px] ${newCampaign.bannerSource === 'manual' && newCampaign.bannerImage
                                                ? 'border-purple-500 bg-black'
                                                : 'border-dashed border-zinc-600 bg-zinc-900'
                                                }`}>
                                                {newCampaign.bannerSource === 'random' ? (
                                                    <div className="w-full h-full aspect-video bg-zinc-950 relative">
                                                        <img
                                                            src={`https://picsum.photos/seed/camp_${encodeURIComponent(newCampaign.title || 'generic')}/1280/720`}
                                                            alt="Random Preview"
                                                            className="w-full h-full object-cover opacity-60"
                                                        />
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40">
                                                            <Zap className="text-purple-400 mb-2 animate-pulse" size={40} />
                                                            <p className="font-bold text-lg text-white">⚡ Banner Profissional Gerado</p>
                                                            <p className="text-sm text-zinc-300">Baseado no título: "{newCampaign.title || 'Título da Campanha'}"</p>
                                                            <button
                                                                onClick={() => {
                                                                    const randomSuffix = Math.random().toString(36).substring(7);
                                                                    setNewCampaign(prev => ({ ...prev, title: prev.title + ' ' + randomSuffix }));
                                                                }}
                                                                className="mt-4 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 border border-zinc-700"
                                                            >
                                                                <RefreshCw size={12} /> Trocar Imagem (Aleatório)
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : newCampaign.bannerImage ? (
                                                    <>
                                                        <img
                                                            src={newCampaign.bannerImage}
                                                            alt="Banner Preview"
                                                            className="w-full h-full object-contain p-4"
                                                        />

                                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                                                            <label className="px-6 py-4 bg-white text-black rounded-xl cursor-pointer hover:scale-110 transition-transform font-bold text-lg flex items-center gap-3 shadow-2xl">
                                                                <ImageIcon size={28} />
                                                                <span>Trocar</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={handleImageUpload}
                                                                />
                                                            </label>
                                                            <button
                                                                onClick={() => setNewCampaign(prev => ({ ...prev, bannerImage: '' }))}
                                                                className="px-6 py-4 bg-red-600 text-white rounded-xl hover:scale-110 transition-transform font-bold text-lg flex items-center gap-3 shadow-2xl"
                                                            >
                                                                <Trash2 size={28} />
                                                                <span>Remover</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-6 p-12">
                                                        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
                                                            <ImageIcon size={40} className="text-zinc-600" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-bold text-xl mb-3 text-white">Arraste e solte a imagem</p>
                                                            <p className="text-base text-zinc-500 mb-6">ou</p>
                                                            <label className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl cursor-pointer transition-colors inline-block text-lg shadow-lg">
                                                                📁 Selecionar Arquivo
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={handleImageUpload}
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-sm text-zinc-500 bg-zinc-900 p-3 rounded-lg">
                                                📐 <strong>Recomendado:</strong> Proporção 16:9 (ex: 1920×1080)
                                            </p>
                                        </div>
                                    )}

                                    {/* Target URL */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>URL de Destino *</label>
                                        <input
                                            type="url"
                                            value={newCampaign.targetUrl}
                                            onChange={(e) => setNewCampaign(prev => ({ ...prev, targetUrl: e.target.value }))}
                                            placeholder="https://exemplo.com"
                                            className={`w-full rounded-lg px-4 py-2 outline-none border ${inputBg}`}
                                        />
                                    </div>
                                </div>
                            ) : (
                                // PREVIEW MODE
                                <div className="p-6 space-y-6">
                                    <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <Monitor size={20} /> Preview: Como vai aparecer na Home
                                        </h3>

                                        {/* Preview Card igual da Home */}
                                        <div className="max-w-sm mx-auto">
                                            <div className="aspect-video relative rounded-xl overflow-hidden border-2 border-purple-600/50 bg-zinc-900 shadow-2xl">
                                                {newCampaign.type === 'image' ? (
                                                    (newCampaign.bannerSource === 'random' || newCampaign.bannerImage) ? (
                                                        <>
                                                            <img
                                                                src={newCampaign.bannerSource === 'random'
                                                                    ? `https://picsum.photos/seed/camp_${encodeURIComponent(newCampaign.title || 'generic')}/1280/720`
                                                                    : newCampaign.bannerImage
                                                                }
                                                                alt={newCampaign.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                                                                PATROCINADO
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                            <ImageIcon size={48} />
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="w-full h-full p-6 flex flex-col bg-gradient-to-br from-zinc-900 to-zinc-950">
                                                        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">ANÚNCIO</span>
                                                            <h3 className="font-bold text-lg leading-tight text-white">{newCampaign.title || 'Título da Campanha'}</h3>
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto pr-2 mb-3">
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">
                                                                {newCampaign.desktopDescription || 'Descrição vai aparecer aqui...'}
                                                            </p>
                                                        </div>
                                                        <div className="pt-3 border-t border-white/10 flex items-center gap-1 text-blue-500 text-xs font-bold uppercase tracking-wider flex-shrink-0">
                                                            <ExternalLink size={14} /> Saiba Mais
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-3 px-1 mt-2">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${newCampaign.type === 'text' ? 'bg-blue-900/20 border-blue-600/50 text-blue-500' : 'bg-purple-600/20 border-purple-600/50 text-purple-600'}`}>
                                                    <span className="font-bold text-xs">AD</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-base font-semibold truncate text-white">{newCampaign.title || 'Título'}</h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={`p-6 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
                                <button
                                    onClick={() => { setShowCreateModal(false); setShowPreview(false); }}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-200 hover:bg-gray-300'
                                        }`}
                                >
                                    Cancelar
                                </button>
                                {!showPreview && (
                                    <button
                                        onClick={handleCreate}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Save size={18} /> Criar Campanha
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminPlatformCampaigns;
