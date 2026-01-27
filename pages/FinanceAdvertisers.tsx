
import React, { useState, useEffect } from 'react';
import { Users, Search, MessageSquare, ArrowLeft, CheckSquare, Square, Trash2, RefreshCw, X, Video, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { adService } from '../services/adService';
import { AdvertiserProfile, Transaction } from '../types';

const FinanceAdvertisers: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useSettings();

    const [advertisers, setAdvertisers] = useState<AdvertiserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [viewingAdvertiser, setViewingAdvertiser] = useState<AdvertiserProfile | null>(null);
    const [advertiserTransactions, setAdvertiserTransactions] = useState<Transaction[]>([]);

    const { user, isLoading } = useAuth();
    const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';

    useEffect(() => {
        if (!isLoading && !isAdmin) {
            navigate('/admin');
        }
        if (!isLoading && isAdmin) {
            loadData();
        }
    }, [isLoading, isAdmin, navigate]);

    const loadData = async () => {
        setAdvertisers(await adService.getAllAdvertisers());
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === advertisers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(advertisers.map(adv => adv.id));
        }
    };

    const toggleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkDeleteHistory = async () => {
        if (confirm(`Apagar histórico de transações de ${selectedIds.length} anunciantes?`)) {
            for (const id of selectedIds) {
                await adService.clearTransactions(id);
            }
            alert("Histórico limpo.");
            setSelectedIds([]);
        }
    };

    const handleChat = (userId: string) => {
        // CORREÇÃO CRÍTICA: Redireciona para o ADMIN PANEL com role 'advertiser'
        // Isso garante que abra o contexto correto na sidebar do admin
        navigate('/admin', {
            state: {
                openChatId: userId,
                openChatRole: 'advertiser' // Força o contexto de anunciante
            }
        });
    };

    const handleOpenDetails = async (adv: AdvertiserProfile) => {
        setViewingAdvertiser(adv);
        setAdvertiserTransactions(await adService.getTransactions(adv.id));
    };

    // Styles
    const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
    const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

    const filtered = advertisers.filter(a => a.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={`min-h-screen p-6 ${bgPage}`}>
            <div className="max-w-7xl mx-auto">

                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate('/admin')}
                            className={`flex items-center gap-2 mb-2 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
                        >
                            <ArrowLeft size={20} /> Voltar ao Painel
                        </button>
                        <h1 className={`text-2xl font-bold flex items-center gap-3 ${textPrimary}`}>
                            <Users className="text-blue-500" /> Anunciantes & Saldos
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar empresa..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2 rounded-lg border outline-none text-sm w-64 ${inputBg}`}
                            />
                        </div>
                        <button onClick={loadData} className={`p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-gray-300 hover:bg-gray-100'}`}>
                            <RefreshCw size={18} className={textSecondary} />
                        </button>
                    </div>
                </div>

                <div className={`rounded-xl border overflow-hidden shadow-sm ${cardBg}`}>
                    <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
                        <div className={`text-sm font-bold ${textSecondary}`}>
                            {filtered.length} Anunciantes Cadastrados
                        </div>
                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDeleteHistory} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                <Trash2 size={12} /> Limpar Histórico Selecionado
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`${theme === 'dark' ? 'bg-zinc-900/50 text-zinc-400' : 'bg-gray-50 text-gray-500'} uppercase text-xs font-bold`}>
                                <tr>
                                    <th className="p-4 w-10">
                                        <button onClick={toggleSelectAll}>
                                            {selectedIds.length > 0 && selectedIds.length === advertisers.length
                                                ? <CheckSquare size={18} className="text-blue-500" />
                                                : <Square size={18} />
                                            }
                                        </button>
                                    </th>
                                    <th className="p-4">Empresa / ID</th>
                                    <th className="p-4">Saldo Financeiro</th>
                                    <th className="p-4">Views Padrão</th>
                                    <th className="p-4">Views Home</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                                {filtered.map(adv => (
                                    <tr key={adv.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800/30' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4">
                                            <button onClick={() => toggleSelectOne(adv.id)}>
                                                {selectedIds.includes(adv.id)
                                                    ? <CheckSquare size={18} className="text-blue-500" />
                                                    : <Square size={18} className="text-zinc-400" />
                                                }
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className={`font-bold ${textPrimary}`}>{adv.companyName}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{adv.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-bold ${adv.balance > 0 ? 'text-green-500' : textSecondary}`}>
                                                R$ {adv.balance.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className={`p-4 ${textPrimary}`}>{adv.standardImpressions.toLocaleString()}</td>
                                        <td className={`p-4 ${textPrimary}`}>{adv.homepageImpressions.toLocaleString()}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleChat(adv.id)}
                                                    className={`p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-blue-400' : 'border-gray-300 hover:bg-gray-100 text-blue-600'}`}
                                                    title="Enviar Mensagem (Chat)"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDetails(adv)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${theme === 'dark' ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' : 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                                                >
                                                    Detalhes
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className={`p-10 text-center ${textSecondary}`}>
                                            Nenhum anunciante encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {viewingAdvertiser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className={`w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] ${theme === 'dark' ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-gray-200'}`}>

                            <div className={`p-6 border-b flex justify-between items-start ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950 rounded-t-xl' : 'border-gray-200 bg-gray-50 rounded-t-xl'}`}>
                                <div>
                                    <h2 className={`text-2xl font-bold ${textPrimary}`}>{viewingAdvertiser.companyName}</h2>
                                    <p className={`text-sm font-mono ${textSecondary}`}>ID: {viewingAdvertiser.id}</p>
                                </div>
                                <button
                                    onClick={() => setViewingAdvertiser(null)}
                                    className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-200 text-gray-500'}`}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-xs font-bold uppercase mb-1 ${textSecondary}`}>Saldo Financeiro</p>
                                        <p className="text-2xl font-bold text-green-500">R$ {viewingAdvertiser.balance.toFixed(2)}</p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-xs font-bold uppercase mb-1 flex items-center gap-2 ${textSecondary}`}><Video size={14} /> Views Padrão</p>
                                        <p className={`text-2xl font-bold ${textPrimary}`}>{viewingAdvertiser.standardImpressions.toLocaleString()}</p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`}>
                                        <p className={`text-xs font-bold uppercase mb-1 flex items-center gap-2 ${textSecondary}`}><Layout size={14} /> Views Home</p>
                                        <p className={`text-2xl font-bold ${textPrimary}`}>{viewingAdvertiser.homepageImpressions.toLocaleString()}</p>
                                    </div>
                                </div>

                                <h3 className={`font-bold text-lg mb-4 ${textPrimary}`}>Histórico de Transações</h3>
                                <div className={`rounded-lg border overflow-hidden ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className={theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-gray-50 text-gray-500'}>
                                                <tr>
                                                    <th className="p-3">Data</th>
                                                    <th className="p-3">Tipo</th>
                                                    <th className="p-3">Descrição</th>
                                                    <th className="p-3 text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                                                {advertiserTransactions.map(tx => (
                                                    <tr key={tx.id} className={theme === 'dark' ? 'hover:bg-zinc-800/30' : 'hover:bg-gray-50'}>
                                                        <td className={`p-3 ${textSecondary}`}>{new Date(tx.date).toLocaleDateString()}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${tx.type === 'deposit'
                                                                ? 'bg-green-900/20 text-green-500 border border-green-900/50'
                                                                : 'bg-red-900/20 text-red-500 border border-red-900/50'
                                                                }`}>
                                                                {tx.type === 'deposit' ? 'Depósito' : 'Gasto'}
                                                            </span>
                                                        </td>
                                                        <td className={`p-3 ${textPrimary}`}>{tx.description}</td>
                                                        <td className={`p-3 text-right font-bold ${tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                                                            {tx.type === 'deposit' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {advertiserTransactions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className={`p-6 text-center ${textSecondary}`}>Nenhuma transação registrada.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinanceAdvertisers;
