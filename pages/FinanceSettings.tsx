
import React, { useState } from 'react';
import { Settings, Save, ArrowLeft, CreditCard, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { AdminFinancialSettings } from '../types';
import { MOCK_ADMIN_SETTINGS } from '../services/mockData';
import { platformSettingsService } from '../services/platformSettingsService';

const FinanceSettings: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useSettings();
    const { user, isLoading: authLoading } = useAuth();
    const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';

    React.useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/admin');
        }
    }, [authLoading, isAdmin, navigate]);

    // State
    const [settings, setSettings] = useState<AdminFinancialSettings>(MOCK_ADMIN_SETTINGS);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Asaas Config State
    const [asaasKey, setAsaasKey] = useState('');
    const [asaasWalletId, setAsaasWalletId] = useState('');

    React.useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            try {
                const globalSettings = await platformSettingsService.getSettings();
                setAsaasKey(globalSettings.asaasKey);
                setAsaasWalletId(globalSettings.asaasWalletId);
            } catch (e) {
                console.error('Erro ao carregar do Supabase:', e);
            } finally {
                setIsLoading(false);
            }
        };

        if (isAdmin) {
            loadSettings();
        }
    }, [isAdmin]);

    const handleSave = async () => {
        setIsLoading(true);
        const success = await platformSettingsService.updateSettings({
            asaasKey,
            asaasWalletId
        });

        if (success) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } else {
            alert('Não foi possível salvar no banco de dados. Salvando localmente como backup.');
            localStorage.setItem('fairstream_asaas_key', asaasKey);
            localStorage.setItem('fairstream_asaas_wallet_id', asaasWalletId);
        }
        setIsLoading(false);
    };

    // Styles
    const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
    const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

    return (
        <div className={`min-h-screen p-6 ${bgPage}`}>
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className={`flex items-center gap-2 mb-4 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
                    >
                        <ArrowLeft size={20} /> Voltar ao Painel
                    </button>
                    <h1 className={`text-2xl font-bold flex items-center gap-3 ${textPrimary}`}>
                        <Settings className="text-zinc-500" /> Configurações Financeiras
                    </h1>
                    <p className={textSecondary}>Gerencie gateways de pagamento e chaves de recebimento.</p>
                </div>

                <div className="space-y-6">

                    {/* INTEGRAÇÃO ASAAS */}
                    <div className={`p-6 rounded-xl border shadow-sm ${cardBg} border-blue-500/20 bg-blue-500/5`}>
                        <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                            <CreditCard size={20} className="text-blue-500" /> Integração Asaas (Splits Automáticos)
                        </h2>
                        <p className={`text-sm mb-4 ${textSecondary}`}>
                            Configure as credenciais do Asaas para processar pagamentos e divisões automáticas.
                        </p>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>API Key (Environment: Sandbox/Produção)</label>
                                <input
                                    type="password"
                                    value={asaasKey}
                                    onChange={(e) => setAsaasKey(e.target.value)}
                                    placeholder="Copie sua Chave de API aqui (começa com $...)"
                                    className={`w-full rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Wallet ID da Plataforma (Conta Mestre)</label>
                                <input
                                    type="text"
                                    value={asaasWalletId}
                                    onChange={(e) => setAsaasWalletId(e.target.value)}
                                    placeholder="Ex: 6dd4685d-fc9d..."
                                    className={`w-full rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                                />
                                <p className="text-xs text-zinc-500 mt-1">
                                    Este ID receberá a porcentagem da plataforma nos splits.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Save Action */}
                    <div className="flex items-center justify-end gap-4 pt-4">
                        {showSuccess && (
                            <span className="text-green-500 font-bold text-sm animate-fade-in">
                                ✅ Configurações salvas!
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? <span className="animate-spin">🌀</span> : <Save size={18} />}
                            {isLoading ? 'Salvando...' : 'Salvar Tudo'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FinanceSettings;
