import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { payoutService } from '../services/payoutService';
import { pixService } from '../services/pixService';
import { videoService } from '../services/videoService';
import { authService } from '../services/authService';
import { membershipData } from '../services/membershipData';
import { supabase } from '../services/supabaseClient';
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Loader2, Download, Eye, ArrowRight, AlertCircle, Save, CreditCard, Trash2 } from 'lucide-react';

const CreatorFinancial: React.FC = () => {
    const { user, login } = useAuth();
    const { theme } = useSettings();
    const navigate = useNavigate();

    const [balance, setBalance] = useState({
        available: 0,
        pending: 0,
        pendingBruto: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        membershipCount: 0,
        membershipTotal: 0,
        monetizationTotal: 0,
        viewsCount: 0
    });
    const [isSavingPix, setIsSavingPix] = useState(false);
    const [pixKey, setPixKey] = useState(user?.pixKey || '');
    const [pixKeyType, setPixKeyType] = useState<any>(user?.pixKeyType || 'random');
    const [cpf, setCpf] = useState(user?.cpf || '');
    const [payoutHolderName, setPayoutHolderName] = useState(user?.payoutHolderName || user?.name || '');
    const [payoutEmail, setPayoutEmail] = useState(user?.payoutEmail || user?.email || '');
    const [asaasWalletId, setAsaasWalletId] = useState(user?.asaasWalletId || ''); // NOVO

    const [splitPayments, setSplitPayments] = useState<any[]>([]);
    const [supportTransactions, setSupportTransactions] = useState<any[]>([]);
    const [totalSupports, setTotalSupports] = useState(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'supports'>('overview');


    // State for API Key fallback
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [lastPaidDate, setLastPaidDate] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }

        if (user.isSeed) {
            navigate('/dashboard');
            return;
        }

        loadFinancialData();
    }, [user]);

    const loadFinancialData = async () => {
        if (!user) return;

        // 1. Busca dados de Ads/Views (PayoutService)
        const bal: any = await payoutService.getCreatorBalance(user.id);
        const pendingDetails = await payoutService.getPendingMonthlyPayouts() as any[];
        const userDetails = pendingDetails.find(p => p.creatorId === user.id);

        // 2. Busca dados de Membros/Assinaturas (MembershipData - Mais preciso para Splits)
        const memberStats = await membershipData.getCurrentStats(user.id);

        // 3. Combina os dados
        // Preferimos memberStats para membros pois reflete o estado atual dos splits diretos
        const currentMonthMemberRevenue = memberStats.creatorMonthlyRevenue || 0;

        // Monetização: O valor vindo do bal.pending já é o 100% (Bruto) segundo a nova lógica do service
        const adsRevenueBruto = bal.pending || 0;
        const adsRevenueLiquido = adsRevenueBruto * 0.50; // Parte do criador (50%)

        setBalance({
            ...bal,
            membershipCount: memberStats.activeCount,
            membershipTotal: currentMonthMemberRevenue, // Membros já é líquido (split automático)
            monetizationTotal: adsRevenueBruto, // Exibe o valor bruto para bater com as views
            viewsCount: bal.viewsCount || 0,

            // Recalcula totais combinados para exibição
            pending: adsRevenueLiquido + currentMonthMemberRevenue, // Total Líquido a receber
            pendingBruto: adsRevenueBruto + (memberStats.grossMonthlyRevenue || 0) // Total Bruto (50/50 + Membros)
        });

        const splits = payoutService.getSplitPaymentsByCreator(user.id);
        setSplitPayments(splits);

        const supports = await pixService.getSupportTransactionsByCreator(user.id);
        setSupportTransactions(supports);

        const totalS = await pixService.getTotalSupportByCreator(user.id);
        setTotalSupports(totalS);


        // 4. Busca data do último pagamento (Async)
        try {
            const history = await payoutService.getPaidMonthlyPayouts();
            const last = history.find((p: any) => p.creatorId === user.id);
            if (last) {
                setLastPaidDate(payoutService.getShortMonthName((last as any).paidAt));
            } else {
                setLastPaidDate(null);
            }
        } catch (e) { console.error("Erro ao buscar último pagamento", e); }
    };

    const handleSavePixKey = async () => {
        if (!user) return;
        setIsSavingPix(true);
        try {
            // Agora salva também o asaasWalletId
            await authService.updateUser(user.id, { pixKey, pixKeyType, cpf, payoutHolderName, asaasWalletId });
            alert("✅ Dados salvos com sucesso!");
        } catch (e) {
            alert("❌ Erro ao salvar dados.");
        } finally {
            setIsSavingPix(false);
        }
    };

    const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';

    if (!user) return null;


    const statusText = balance.pending > 0
        ? 'PENDENTE'
        : (lastPaidDate ? `PAGO EM 05/${lastPaidDate}` : 'PAGO');

    return (
        <div className={`min-h-screen p-6 ${bgPage}`}>
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <h1 className={`text-3xl font-bold ${textPrimary}`}>💰 Painel Financeiro</h1>
                    <p className={textSecondary}>Pagamentos mensais (dia 5)</p>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-6 rounded-xl border ${cardBg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-zinc-500 font-bold uppercase">Saldo Disponível</span>
                            <CheckCircle className="text-green-500" size={20} />
                        </div>
                        <div className="text-2xl font-bold text-green-500">
                            R$ {balance.available.toFixed(2)}
                        </div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mt-2">TOTAL JÁ PAGO (HISTÓRICO)</p>
                    </div>

                    <div className={`p-6 rounded-xl border border-yellow-500/30 ${cardBg} bg-yellow-500/5`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-yellow-600 font-bold uppercase">
                                Ganhos deste Mês
                            </span>
                            <Clock className="text-yellow-500" size={20} />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500">
                                <span className="flex items-center gap-1">
                                    Saldo Bruto
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            // COM CONFIRMAÇÃO PARA EVITAR ACIDENTES
                                            if (!confirm("⚠️ ATENÇÃO: Isso vai zerar todos os seus ganhos deste mês e visualizações em TODOS os seus vídeos no bando de dados. Deseja continuar?")) return;

                                            try {
                                                const uid = String(user.id);

                                                // 1. LIMPEZA SUPABASE (Vídeos do Criador)
                                                console.log('🧹 [ZerarTudo] Limpando dados no Supabase para:', uid);

                                                // Zera as colunas de monetização na tabela videos
                                                const { error: videoError } = await supabase
                                                    .from('videos')
                                                    .update({
                                                        ad_impressions: 0,
                                                        accumulated_revenue: 0,
                                                        views: 0,
                                                        likes: 0
                                                    })
                                                    .eq('creator_id', uid);

                                                // Zera o saldo no profile
                                                const { error: profileError } = await supabase
                                                    .from('profiles')
                                                    .update({ balance: 0 })
                                                    .eq('id', uid);

                                                if (videoError || profileError) {
                                                    console.error('Erro ao limpar Supabase:', videoError || profileError);
                                                }

                                                // 2. LIMPEZA LOCAL (LocalStorage)
                                                try {
                                                    const splits = JSON.parse(localStorage.getItem('fairstream_splits') || '[]');
                                                    const keptSplits = splits.filter((s: any) => String(s.creatorId) !== uid);
                                                    localStorage.setItem('fairstream_splits', JSON.stringify(keptSplits));

                                                    const videos = JSON.parse(localStorage.getItem('fairstream_videos_db_v8') || '[]');
                                                    const newVideos = videos.map((v: any) => {
                                                        if (v.creator && String(v.creator.id) === uid) {
                                                            return { ...v, views: 0, adImpressions: 0, accumulatedRevenue: 0 };
                                                        }
                                                        return v;
                                                    });
                                                    localStorage.setItem('fairstream_videos_db_v8', JSON.stringify(newVideos));

                                                    const subs = JSON.parse(localStorage.getItem('fairstream_subs_db') || '[]');
                                                    const keptSubs = subs.filter((s: any) => String(s.channelId) !== uid);
                                                    localStorage.setItem('fairstream_subs_db', JSON.stringify(keptSubs));
                                                } catch (e) { console.warn('Erro ao limpar LocalStorage', e); }

                                                window.dispatchEvent(new Event("video-update"));
                                                window.dispatchEvent(new Event("subscription-update"));

                                                alert("✅ DADOS ZERADOS COM SUCESSO!");
                                                window.location.reload();

                                            } catch (err: any) {
                                                alert("Erro: " + err.message);
                                            }
                                        }}
                                        className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded ml-2 hover:bg-red-600 transition-colors shadow-sm"
                                        title="Zerar Tudo Agora"
                                    >
                                        ZERAR TUDO
                                    </button>
                                </span>
                                <span>R$ {balance.pendingBruto.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs uppercase font-bold text-yellow-600">
                                <span>Líquido Total</span>
                                <span className="text-lg">R$ {balance.pending.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${balance.pending > 0 ? 'bg-yellow-900/30 text-yellow-500' : 'bg-green-900/30 text-green-500'}`}>
                                {statusText}
                            </span>
                            <p className="text-xs text-zinc-500">
                                {balance.pending > 0 ? 'Aguardando fechamento' : 'Ciclo concluído'}
                            </p>
                        </div>
                    </div>

                    <div className={`p-6 rounded-xl border ${cardBg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-zinc-500 uppercase font-bold">Fontes de Receita</span>
                            <TrendingUp className="text-blue-500" size={20} />
                        </div>
                        <div className={`text-2xl font-bold ${textPrimary}`}>
                            {(balance.pending).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="flex flex-col gap-1 mt-2 border-t pt-2 border-dashed border-zinc-700/50">
                            <div className="flex justify-between text-[10px] text-zinc-500">
                                <span className="flex items-center gap-1">Ads / Views ({balance.viewsCount}) <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1 rounded">Dia 05</span></span>
                                <span>{balance.monetizationTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-500">
                                <span className="flex items-center gap-1">Membros ({balance.membershipCount})</span>
                                <span>{balance.membershipTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-xl border ${cardBg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-zinc-500 font-bold uppercase">Total de Apoios</span>
                            <DollarSign className="text-purple-500" size={20} />
                        </div>
                        <div className={`text-2xl font-bold ${textPrimary}`}>
                            {splitPayments.filter(s => s.status === 'completed' && s.type === 'donation').length + supportTransactions.length}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">Contribuições recebidas</p>
                    </div>
                </div>

                {/* Aviso de Repasse Automático */}
                <div className={`p-6 rounded-xl border ${cardBg}`}>


                    {/* Configuração de Recebimento (Status Automático) */}
                    <div className={`p-6 rounded-2xl border ${asaasWalletId ? 'border-green-500/20 bg-green-500/5' : 'border-yellow-500/20 bg-yellow-500/5'} shadow-sm relative overflow-hidden mt-6`}>
                        {asaasWalletId && <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 blur-3xl -z-10"></div>}

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-full ${asaasWalletId ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                        {asaasWalletId ? (
                                            <CheckCircle className="text-green-500" size={20} />
                                        ) : (
                                            <AlertCircle className="text-yellow-600" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${textPrimary}`}>
                                            {asaasWalletId ? 'Conta de Recebimento Ativa' : 'Ativação Pendente'}
                                        </h3>
                                        <p className="text-xs text-zinc-500">
                                            {asaasWalletId
                                                ? 'Sua carteira digital está pronta para receber pagamentos.'
                                                : 'Sua carteira digital ainda não foi gerada. Necessário para receber.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 w-full md:w-auto flex flex-col gap-2 items-end">
                                {asaasWalletId ? (
                                    <div className="w-full md:w-auto bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">SEU ID DE CARTEIRA (WALLET ID)</span>
                                        <code className={`text-sm font-mono ${textPrimary} opacity-80 break-all`}>
                                            {asaasWalletId}
                                        </code>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        <input
                                            type="text"
                                            placeholder="Digite seu CPF (Somente números)"
                                            value={cpf}
                                            onChange={(e) => setCpf(e.target.value)}
                                            className={`p-3 rounded-xl text-sm border outline-none focus:border-purple-500 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-gray-300'}`}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!user) return;
                                                const cleanedCpf = cpf.replace(/\D/g, '');
                                                if (!cleanedCpf || cleanedCpf.length !== 11) {
                                                    alert("Por favor, digite um CPF válido (11 dígitos).");
                                                    return;
                                                }
                                                setIsSavingPix(true);
                                                try {
                                                    const updatedUser = await authService.createWalletForUser(user.id, cleanedCpf);

                                                    // Atualiza sessão e contexto
                                                    // @ts-ignore
                                                    if (login) login(updatedUser);

                                                    // Atualiza UI local
                                                    setAsaasWalletId(updatedUser.asaasWalletId || '');

                                                    alert("✅ Carteira gerada com sucesso!");
                                                } catch (err: any) {
                                                    console.error(err);
                                                    const msg = err.message || "";
                                                    if (msg.includes('access_token') || msg.includes('autenticação')) {
                                                        setShowApiKeyInput(true);
                                                        alert("⚠️ Chave de API não encontrada ou inválida. Por favor, insira abaixo.");
                                                    } else {
                                                        alert("Erro ao gerar carteira: " + msg);
                                                    }
                                                } finally {
                                                    setIsSavingPix(false);
                                                }
                                            }}
                                            disabled={isSavingPix}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            {isSavingPix ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                            Gerar Carteira Agora
                                        </button>

                                        {showApiKeyInput && (
                                            <div className="mt-2 w-full p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                                                <p className="text-xs text-red-400 mb-2 font-bold">Configuração de Ambiente de Teste (Sandbox)</p>
                                                <p className="text-[10px] text-zinc-500 mb-2">A chave de API não foi detectada no arquivo .env. Digite-a aqui para salvar no navegador.</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Cole sua API Key do Asaas Sandbox ($aact_...)"
                                                        value={apiKeyInput}
                                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                                        className={`flex-1 p-2 rounded text-xs border outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300'}`}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (apiKeyInput.length < 10) return alert("Chave muito curta.");
                                                            localStorage.setItem('fairstream_asaas_key', apiKeyInput);
                                                            alert("✅ Chave salva! Tente gerar a carteira novamente.");
                                                            setShowApiKeyInput(false);
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aviso de Ciclo */}
                {/* Aviso de Ciclo - REGRAS CORRETAS */}
                <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800">
                    <div className="flex items-start gap-4">
                        <Clock className="text-blue-500 mt-1" size={20} />
                        <div>
                            <p className="text-sm font-bold text-white uppercase">Regras de Pagamento</p>
                            <div className="text-xs text-zinc-400 mt-2 space-y-1">
                                <p>⭐ <span className="font-bold text-zinc-300">Apoios (100%):</span> Cai na hora na sua conta (Pix Direto).</p>
                                <p>✅ <span className="font-bold text-zinc-300">Membros (70%):</span> Cai na hora na sua conta (Divisão Automática).</p>
                                <p>🕒 <span className="font-bold text-zinc-300">Monetização (50%):</span> Acumula e é pago no dia 05 de cada mês.</p>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Conteúdo das Tabs */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className={`p-6 rounded-xl border ${cardBg}`}>
                            <div className="space-y-3">
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'supports' && (
                    <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <div>
                                <h3 className={`font-bold ${textPrimary}`}>Apoios via Pix Direto</h3>
                                <p className="text-xs text-zinc-500">100% do valor vai para você (0% de taxa)</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-green-500">R$ {totalSupports.toFixed(2)}</div>
                                <div className="text-xs text-zinc-500">Total arrecadado</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-gray-50 text-gray-500'}>
                                    <tr>
                                        <th className="p-4 text-left">Apoiador</th>
                                        <th className="p-4 text-right">Valor</th>
                                        <th className="p-4 text-left">Data</th>
                                    </tr>
                                </thead>
                                <tbody className={theme === 'dark' ? 'divide-y divide-zinc-800' : 'divide-y divide-gray-200'}>
                                    {supportTransactions.length === 0 ? (
                                        <tr><td colSpan={3} className="p-12 text-center text-zinc-500">Nenhum apoio recebido ainda</td></tr>
                                    ) : (
                                        supportTransactions.map(support => (
                                            <tr key={support.id} className={theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={support.supporterAvatar || `https://ui-avatars.com/api/?name=${support.supporterName}`} className="w-8 h-8 rounded-full" alt="" />
                                                        <span className={`font-medium ${textPrimary}`}>{support.supporterName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-bold text-green-500">R$ {support.amount.toFixed(2)}</td>
                                                <td className="p-4 text-zinc-500 text-xs">{new Date(support.date).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}






            </div>

        </div >
    );
};

export default CreatorFinancial;
