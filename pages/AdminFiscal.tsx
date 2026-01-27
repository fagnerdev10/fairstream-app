/**
 * PAINEL FISCAL - Relatórios para Contabilidade
 * 
 * Mostra separadamente:
 * - Faturamento bruto (tudo que passou)
 * - Repasses para criadores (não é seu)
 * - Receita líquida (o que é SEU)
 */

import React, { useState, useEffect } from 'react';
import { Download, FileText, DollarSign, Users, TrendingUp, Calendar, PieChart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { monthlyPayoutService } from '../services/monthlyPayoutService';
import { subscriptionService } from '../services/subscriptionService';
import { authService } from '../services/authService';
import { payoutService } from '../services/payoutService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

interface FiscalData {
    period: string;
    // Membros (Split 70/30)
    membershipsTotal: number;      // Total pago pelos membros
    membershipsToCreators: number; // 70% - foi direto pro criador (NÃO É SEU)
    membershipsPlatform: number;   // 30% - sua receita
    membershipsCount: number;

    // Monetização (Split 50/50)
    adsTotal: number;              // Total de anúncios
    adsToCreators: number;         // 50% - repasse mensal (NÃO É SEU)
    adsPlatform: number;           // 50% - sua receita
    adsImpressions: number;

    // Apoios Pix (100% criador)
    donationsTotal: number;        // Total de doações (NÃO É SEU - passou direto)

    // RESUMO
    totalBruto: number;            // Tudo que passou pela plataforma
    totalRepasses: number;         // O que foi pros criadores (NÃO É SEU)
    totalLiquido: number;          // SUA RECEITA REAL
}

interface Transaction {
    id: string;
    date: string;
    type: 'membership' | 'monetization' | 'donation';
    description: string;
    totalAmount: number;
    creatorShare: number;
    platformShare: number;
    creatorId: string;
    creatorName: string;
}

const AdminFiscal: React.FC = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [fiscalData, setFiscalData] = useState<FiscalData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvContent, setCsvContent] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const { theme } = useSettings();
    const { user, isLoading } = useAuth();
    const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';

    useEffect(() => {
        if (!isLoading) {
            if (!isAdmin) {
                navigate('/admin');
            } else {
                loadFiscalData();
            }
        }
    }, [period, selectedMonth, selectedYear, isLoading, isAdmin, navigate]);

    const loadFiscalData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Buscar splits registrados (Supabase via PayoutService)
            const splits = await payoutService.getSplitsFromSupabase();

            // Buscar assinaturas via Service
            const subs = await subscriptionService.getAll();

            // Buscar histórico de pagamentos mensais via Service (Supabase)
            const history = await monthlyPayoutService.getPayoutHistory();

            // Buscar usuários via Service
            const users = await authService.getAllUsers();
            const getUserName = (id: string) => {
                const user = users.find((u: any) => u.id === id);
                return user?.name || 'Criador';
            };

            // Filtrar por período
            const now = new Date();
            let startDate: Date;
            let endDate: Date;

            if (period === 'month') {
                startDate = new Date(selectedYear, selectedMonth, 1);
                endDate = new Date(selectedYear, selectedMonth + 1, 0);
            } else if (period === 'quarter') {
                const quarter = Math.floor(selectedMonth / 3);
                startDate = new Date(selectedYear, quarter * 3, 1);
                endDate = new Date(selectedYear, (quarter + 1) * 3, 0);
            } else {
                startDate = new Date(selectedYear, 0, 1);
                endDate = new Date(selectedYear, 11, 31);
            }

            // Processar dados
            let data: FiscalData = {
                period: period === 'month'
                    ? `${startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
                    : period === 'quarter'
                        ? `${Math.floor(selectedMonth / 3) + 1}º Trimestre ${selectedYear}`
                        : `Ano ${selectedYear}`,
                membershipsTotal: 0,
                membershipsToCreators: 0,
                membershipsPlatform: 0,
                membershipsCount: 0,
                adsTotal: 0,
                adsToCreators: 0,
                adsPlatform: 0,
                adsImpressions: 0,
                donationsTotal: 0,
                totalBruto: 0,
                totalRepasses: 0,
                totalLiquido: 0
            };

            const txList: Transaction[] = [];

            // Processar membros ativos (Split 70/30 - já vai direto)
            subs.filter((s: any) => s.type === 'channel' && s.status === 'active').forEach((sub: any) => {
                const price = sub.price || 9.90;
                const creatorShare = price * 0.70;
                const platformShare = price * 0.30;

                data.membershipsTotal += price;
                data.membershipsToCreators += creatorShare;
                data.membershipsPlatform += platformShare;
                data.membershipsCount++;

                txList.push({
                    id: sub.id,
                    date: sub.startDate || new Date().toISOString(),
                    type: 'membership',
                    description: `Assinatura - ${sub.channelName || 'Canal'}`,
                    totalAmount: price,
                    creatorShare: creatorShare,
                    platformShare: platformShare,
                    creatorId: sub.channelId,
                    creatorName: sub.channelName || getUserName(sub.channelId)
                });
            });

            // Processar monetização paga (Split 50/50)
            history.forEach((h: any) => {
                const creatorAmount = h.amount || 0;
                const platformAmount = h.platformAmount || creatorAmount; // 50/50
                const totalAmount = creatorAmount + platformAmount;

                data.adsTotal += totalAmount;
                data.adsToCreators += creatorAmount;
                data.adsPlatform += platformAmount;
                data.adsImpressions += h.views || 0;

                txList.push({
                    id: h.id,
                    date: h.processedAt || new Date().toISOString(),
                    type: 'monetization',
                    description: `Monetização ${h.month}/${h.year} - ${h.views || 0} impressões`,
                    totalAmount: totalAmount,
                    creatorShare: creatorAmount,
                    platformShare: platformAmount,
                    creatorId: h.creatorId,
                    creatorName: h.creatorName || getUserName(h.creatorId)
                });
            });

            // Processar doações (100% criador - não é seu)
            splits.filter((s: any) => s.type === 'donation').forEach((donation: any) => {
                data.donationsTotal += donation.totalAmount || 0;

                txList.push({
                    id: donation.paymentId,
                    date: donation.createdAt || new Date().toISOString(),
                    type: 'donation',
                    description: `Apoio Pix`,
                    totalAmount: donation.totalAmount || 0,
                    creatorShare: donation.totalAmount || 0,
                    platformShare: 0,
                    creatorId: donation.creatorId,
                    creatorName: getUserName(donation.creatorId)
                });
            });

            // Calcular totais
            data.totalBruto = data.membershipsTotal + data.adsTotal + data.donationsTotal;
            data.totalRepasses = data.membershipsToCreators + data.adsToCreators + data.donationsTotal;
            data.totalLiquido = data.membershipsPlatform + data.adsPlatform;

            setFiscalData(data);
            setTransactions(txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        } catch (error: any) {
            console.error('Erro ao carregar dados fiscais:', error);
            setError(error.message || "Erro desconhecido ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        if (!fiscalData) {
            alert('Nenhum dado para exportar.');
            return;
        }

        // Cabeçalho do resumo
        let csv = 'RELATÓRIO FISCAL - FAIRSTREAM\n';
        csv += `Período: ${fiscalData.period}\n`;
        csv += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

        // Resumo
        csv += 'RESUMO\n';
        csv += `Faturamento Bruto Total,R$ ${fiscalData.totalBruto.toFixed(2)}\n`;
        csv += `Repasses para Criadores,R$ ${fiscalData.totalRepasses.toFixed(2)}\n`;
        csv += `RECEITA LÍQUIDA (SEU FATURAMENTO),R$ ${fiscalData.totalLiquido.toFixed(2)}\n\n`;

        // Detalhamento
        csv += 'DETALHAMENTO POR TIPO\n';
        csv += `Membros - Total Recebido,R$ ${fiscalData.membershipsTotal.toFixed(2)}\n`;
        csv += `Membros - Repasse Criadores (70%),R$ ${fiscalData.membershipsToCreators.toFixed(2)}\n`;
        csv += `Membros - Sua Receita (30%),R$ ${fiscalData.membershipsPlatform.toFixed(2)}\n`;
        csv += `Membros - Quantidade,${fiscalData.membershipsCount}\n\n`;

        csv += `Anúncios - Total Gerado,R$ ${fiscalData.adsTotal.toFixed(2)}\n`;
        csv += `Anúncios - Repasse Criadores (50%),R$ ${fiscalData.adsToCreators.toFixed(2)}\n`;
        csv += `Anúncios - Sua Receita (50%),R$ ${fiscalData.adsPlatform.toFixed(2)}\n`;
        csv += `Anúncios - Impressões,${fiscalData.adsImpressions}\n\n`;

        csv += `Doações Pix - Total (100% Criador),R$ ${fiscalData.donationsTotal.toFixed(2)}\n\n`;

        // Transações (se houver)
        if (transactions.length > 0) {
            csv += 'TRANSAÇÕES DETALHADAS\n';
            csv += 'Data,Tipo,Descrição,Criador,Valor Total,Repasse Criador,Receita Plataforma\n';

            transactions.forEach(tx => {
                const tipo = tx.type === 'membership' ? 'Membro' : tx.type === 'monetization' ? 'Anúncio' : 'Doação';
                csv += `${new Date(tx.date).toLocaleDateString('pt-BR')},${tipo},"${tx.description}","${tx.creatorName}",${tx.totalAmount.toFixed(2)},${tx.creatorShare.toFixed(2)},${tx.platformShare.toFixed(2)}\n`;
            });
        } else {
            csv += 'TRANSAÇÕES DETALHADAS\n';
            csv += 'Nenhuma transação registrada neste período.\n';
        }

        // Mostra no modal
        setCsvContent(csv);
        setShowCsvModal(true);
    };

    const handleCopyCSV = () => {
        // Método que funciona em todos os navegadores
        const textarea = document.createElement('textarea');
        textarea.value = csvContent;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);

        try {
            document.execCommand('copy');
            setCopySuccess(true);
            // Volta ao normal depois de 3 segundos
            setTimeout(() => setCopySuccess(false), 3000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }

        document.body.removeChild(textarea);
    };

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FileText className="text-blue-500" />
                        Painel Fiscal
                    </h1>
                    <p className="text-zinc-400 mt-1">Relatórios para contabilidade - Separação de receitas e repasses</p>
                </div>

                <button
                    onClick={exportCSV}
                    disabled={loading || !!error || !fiscalData}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    <Download size={18} />
                    Exportar CSV
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-zinc-500" />
                    <span className="text-zinc-400 text-sm">Período:</span>
                </div>

                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                    <option value="month">Mensal</option>
                    <option value="quarter">Trimestral</option>
                    <option value="year">Anual</option>
                </select>

                {period === 'month' && (
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                )}

                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                    {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {loading && (
                <div className="w-full flex justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-zinc-500 text-sm">Carregando dados fiscais...</p>
                    </div>
                </div>
            )}

            {!loading && error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 p-6 rounded-xl text-center">
                    <h3 className="font-bold text-lg mb-2">Erro ao carregar dados</h3>
                    <p>{error}</p>
                    <button onClick={() => loadFiscalData()} className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg">Tentar Novamente</button>
                </div>
            )}

            {!loading && !error && fiscalData && (
                <>
                    {/* Cards Principais */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Faturamento Bruto */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="text-zinc-400" size={20} />
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-xs uppercase">Faturamento Bruto</p>
                                    <p className="text-zinc-400 text-[10px]">Tudo que passou pela plataforma</p>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white">
                                R$ {fiscalData.totalBruto.toFixed(2)}
                            </p>
                        </div>

                        {/* Repasses */}
                        <div className="bg-zinc-900 border border-red-900/30 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-900/20 rounded-lg flex items-center justify-center">
                                    <Users className="text-red-500" size={20} />
                                </div>
                                <div>
                                    <p className="text-red-400 text-xs uppercase font-bold">Repasses Criadores</p>
                                    <p className="text-zinc-400 text-[10px]">⚠️ NÃO É SUA RECEITA</p>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-red-400">
                                - R$ {fiscalData.totalRepasses.toFixed(2)}
                            </p>
                        </div>

                        {/* Receita Líquida */}
                        <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-700/50 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-600/30 rounded-lg flex items-center justify-center">
                                    <DollarSign className="text-green-500" size={20} />
                                </div>
                                <div>
                                    <p className="text-green-400 text-xs uppercase font-bold">Receita Líquida</p>
                                    <p className="text-green-300/70 text-[10px]">✅ SUA RECEITA REAL</p>
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-green-400">
                                R$ {fiscalData.totalLiquido.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Detalhamento */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Membros */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                                Membros (Split 70/30)
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Total Recebido:</span>
                                    <span className="text-white font-bold">R$ {fiscalData.membershipsTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-red-400">↳ 70% Criador (direto):</span>
                                    <span className="text-red-400">- R$ {fiscalData.membershipsToCreators.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t border-zinc-800 pt-2">
                                    <span className="text-green-400 font-bold">Sua Receita (30%):</span>
                                    <span className="text-green-400 font-bold">R$ {fiscalData.membershipsPlatform.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-2">
                                    {fiscalData.membershipsCount} assinatura(s) ativa(s)
                                </div>
                            </div>
                        </div>

                        {/* Anúncios */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                Anúncios (Split 50/50)
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Total Gerado:</span>
                                    <span className="text-white font-bold">R$ {fiscalData.adsTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-red-400">↳ 50% Criador (mensal):</span>
                                    <span className="text-red-400">- R$ {fiscalData.adsToCreators.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t border-zinc-800 pt-2">
                                    <span className="text-green-400 font-bold">Sua Receita (50%):</span>
                                    <span className="text-green-400 font-bold">R$ {fiscalData.adsPlatform.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-2">
                                    {fiscalData.adsImpressions.toLocaleString()} impressões
                                </div>
                            </div>
                        </div>

                        {/* Doações */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                Apoios Pix (100% Criador)
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Total em Doações:</span>
                                    <span className="text-white font-bold">R$ {fiscalData.donationsTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-red-400">↳ 100% vai pro Criador:</span>
                                    <span className="text-red-400">- R$ {fiscalData.donationsTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t border-zinc-800 pt-2">
                                    <span className="text-zinc-500">Sua Receita (0%):</span>
                                    <span className="text-zinc-500">R$ 0,00</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-2">
                                    💡 Não entra no seu faturamento
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Aviso MEI */}
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 mb-8">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">⚠️</div>
                            <div>
                                <h4 className="text-yellow-400 font-bold">Importante para MEI</h4>
                                <p className="text-yellow-200/70 text-sm mt-1">
                                    Seu faturamento para fins de MEI é apenas a <strong className="text-green-400">Receita Líquida (R$ {fiscalData.totalLiquido.toFixed(2)})</strong>,
                                    não o valor bruto. Os repasses para criadores <strong className="text-red-400">não são sua receita</strong> pois vão direto para eles via Split do Asaas.
                                </p>
                                <p className="text-yellow-200/50 text-xs mt-2">
                                    Limite MEI: R$ 81.000/ano | Sua receita acumulada: verificar relatório anual
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Transações */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-zinc-800">
                            <h3 className="text-white font-bold">Movimentações Detalhadas</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="text-left p-3 text-zinc-400 font-medium">Data</th>
                                        <th className="text-left p-3 text-zinc-400 font-medium">Tipo</th>
                                        <th className="text-left p-3 text-zinc-400 font-medium">Descrição</th>
                                        <th className="text-left p-3 text-zinc-400 font-medium">Criador</th>
                                        <th className="text-right p-3 text-zinc-400 font-medium">Total</th>
                                        <th className="text-right p-3 text-zinc-400 font-medium">Repasse</th>
                                        <th className="text-right p-3 text-zinc-400 font-medium">Sua Receita</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-zinc-500">
                                                Nenhuma movimentação neste período
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.slice(0, 20).map(tx => (
                                            <tr key={tx.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                                                <td className="p-3 text-zinc-300">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                                                <td className="p-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${tx.type === 'membership' ? 'bg-purple-500/20 text-purple-400' :
                                                        tx.type === 'monetization' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                        {tx.type === 'membership' ? 'Membro' : tx.type === 'monetization' ? 'Anúncio' : 'Apoio'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-zinc-300">{tx.description}</td>
                                                <td className="p-3 text-zinc-400">{tx.creatorName}</td>
                                                <td className="p-3 text-right text-white font-mono">R$ {tx.totalAmount.toFixed(2)}</td>
                                                <td className="p-3 text-right text-red-400 font-mono">- R$ {tx.creatorShare.toFixed(2)}</td>
                                                <td className="p-3 text-right text-green-400 font-mono font-bold">R$ {tx.platformShare.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {transactions.length > 20 && (
                            <div className="p-3 border-t border-zinc-800 text-center text-zinc-500 text-sm">
                                Mostrando 20 de {transactions.length} transações. Exporte o CSV para ver todas.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal CSV */}
            {showCsvModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-3xl shadow-2xl">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">📄 Relatório Fiscal CSV</h3>
                            <button
                                onClick={() => setShowCsvModal(false)}
                                className="text-zinc-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4">
                            <p className="text-zinc-400 text-sm mb-3">
                                Selecione todo o texto abaixo (Ctrl+A), copie (Ctrl+C), cole num arquivo de texto e salve como <strong>.csv</strong>
                            </p>

                            <textarea
                                value={csvContent}
                                readOnly
                                className="w-full h-64 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-zinc-300 font-mono text-xs resize-none focus:outline-none focus:border-green-500"
                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                            />
                        </div>

                        <div className="p-4 border-t border-zinc-800 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCsvModal(false)}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={handleCopyCSV}
                                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${copySuccess
                                    ? 'bg-emerald-400 text-black'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                            >
                                {copySuccess ? '✅ COPIADO! Cole no Bloco de Notas' : '📋 Copiar Tudo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFiscal;
