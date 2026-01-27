
import React, { useState, useEffect } from 'react';
import { Subscription, BillingHistoryItem } from '../types';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Crown, CheckCircle, XCircle, Calendar, CreditCard, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

const ViewerSubscriptions: React.FC = () => {
    const { user } = useAuth();
    const { theme } = useSettings();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [history, setHistory] = useState<BillingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (user) {
            const subs = await subscriptionService.getUserSubscriptions(user.id);
            setSubscriptions(subs);

            const hist = await subscriptionService.getBillingHistory(user.id);
            setHistory(hist);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // Escuta evento global disparado pelo serviço
        const handleUpdate = () => loadData();
        window.addEventListener('subscription-update', handleUpdate);
        return () => window.removeEventListener('subscription-update', handleUpdate);
    }, [user]);

    const handleCancel = (subId: string) => {
        // Cancelamento Direto (sem confirm para evitar bloqueio)
        const success = subscriptionService.cancelSubscription(subId);

        if (success) {
            setSubscriptions(prev => prev.map(s =>
                String(s.id) === String(subId) ? { ...s, status: 'cancelled' } : s
            ));
            alert("Assinatura cancelada com sucesso!");
            loadData();
        } else {
            alert(`Não foi possível cancelar a assinatura (ID: ${subId}). Tente atualizar a página.`);
        }
    };

    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
    const bgCard = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';

    if (loading) return <div className="p-10 text-center">Carregando assinaturas...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* ASSINATURAS ATIVAS */}
            <section>
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                    <Crown className="text-yellow-500" /> Minhas Assinaturas
                </h2>

                {subscriptions.length === 0 ? (
                    <div className={`p-8 text-center border rounded-xl border-dashed ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-300 bg-gray-50'}`}>
                        <p className={textSecondary}>Você ainda não possui assinaturas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subscriptions.map(sub => {
                            const isCancelled = sub.status === 'cancelled';
                            const displayDate = isCancelled
                                ? "Expira no fim do ciclo"
                                : new Date(sub.nextBillingDate || Date.now()).toLocaleDateString();

                            return (
                                <div key={sub.id} className={`border rounded-xl overflow-hidden flex flex-col relative transition-all ${bgCard} ${isCancelled ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                                    {/* Header do Card */}
                                    <div className={`p-4 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'} ${sub.type === 'global' ? 'bg-purple-900/20' : 'bg-blue-900/20'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                {sub.type === 'channel' ? (
                                                    <img src={sub.channelAvatar || 'https://picsum.photos/50'} alt={sub.channelName} className="w-10 h-10 rounded-full border border-white/10" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
                                                        <Crown size={20} />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className={`font-bold ${textPrimary}`}>
                                                        {sub.type === 'global' ? 'FairStream Premium' : sub.channelName || 'Membro do Canal'}
                                                    </h3>
                                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${sub.type === 'global' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                        {sub.type === 'global' ? 'Global' : 'Canal'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold text-lg ${textPrimary}`}>{formatCurrency(sub.price)}</p>
                                                <p className="text-[10px] text-zinc-500">/mês</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Corpo do Card (Benefícios) */}
                                    <div className="p-4 flex-1">
                                        <ul className="space-y-2 mb-4">
                                            {sub.type === 'global' ? (
                                                <>
                                                    <li className="flex items-start gap-2 text-sm text-zinc-400"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /> Sem anúncios em toda plataforma</li>
                                                    <li className="flex items-start gap-2 text-sm text-zinc-400"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /> Selo VIP Global no chat</li>
                                                    <li className="flex items-start gap-2 text-sm text-zinc-400"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /> Prioridade em Lives</li>
                                                </>
                                            ) : (
                                                <>
                                                    <li className="flex items-start gap-2 text-sm text-zinc-400"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /> Sem anúncios neste canal</li>
                                                    <li className="flex items-start gap-2 text-sm text-zinc-400"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /> Conteúdo exclusivo</li>
                                                    <li className="flex items-start gap-2 text-sm text-zinc-400"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /> Selo de Membro no chat</li>
                                                </>
                                            )}
                                        </ul>

                                        <div className={`text-xs p-3 rounded mb-4 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-100'} space-y-1`}>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500 flex items-center gap-1"><Calendar size={12} /> Próxima cobrança:</span>
                                                <span className={`${isCancelled ? 'text-red-500 font-bold' : textPrimary}`}>
                                                    {displayDate}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500 flex items-center gap-1"><CreditCard size={12} /> Método:</span>
                                                <span className={textPrimary}>{sub.paymentMethod === 'pix' ? 'Pix' : 'Cartão final 4242'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer (Ações) */}
                                    <div className={`p-4 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
                                        {!isCancelled ? (
                                            <button
                                                onClick={() => handleCancel(sub.id)}
                                                className="w-full border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={16} /> Cancelar Assinatura
                                            </button>
                                        ) : (
                                            <div className="w-full bg-zinc-800 text-zinc-400 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 cursor-default border border-zinc-700">
                                                <Clock size={16} /> Cancelamento Agendado
                                            </div>
                                        )}
                                    </div>

                                    {/* Overlay de Cancelado */}
                                    {isCancelled && (
                                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-lg">
                                            CANCELADO
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* HISTÓRICO DE PAGAMENTOS */}
            <section>
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                    <Clock className="text-blue-500" /> Histórico de Pagamentos
                </h2>

                <div className={`border rounded-xl overflow-hidden ${bgCard}`}>
                    <table className="w-full text-left text-sm">
                        <thead className={theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-gray-100 text-gray-500'}>
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Método</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                            {history.map(item => (
                                <tr key={item.id} className={theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}>
                                    <td className={`p-4 ${textSecondary}`}>{new Date(item.date).toLocaleDateString()}</td>
                                    <td className={`p-4 font-medium ${textPrimary}`}>{item.description}</td>
                                    <td className={`p-4 ${textSecondary}`}>{item.paymentMethod}</td>
                                    <td className="p-4">
                                        <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-bold border border-green-500/20 uppercase">
                                            {item.status === 'paid' ? 'Pago' : item.status}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-bold ${textPrimary}`}>
                                        {formatCurrency(item.amount)}
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                                        Nenhum histórico disponível.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default ViewerSubscriptions;
