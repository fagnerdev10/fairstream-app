
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, TrendingUp, DollarSign, PieChart, UserCheck, UserX, X, Search, MoreVertical, CheckCircle } from 'lucide-react';
import { membershipData } from '../services/membershipData';
import { subscriptionService } from '../services/subscriptionService';
import { formatCurrency } from '../utils/formatCurrency';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const MembershipStats: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useSettings();
  
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Busca estatísticas reais baseadas no ID do criador logado
    const data = await membershipData.getCurrentStats(user.id);
    
    setStats(data);
    setMembers(data.memberList);
    setGrowthData(membershipData.getGrowthStats(data.activeCount));
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Escuta eventos de atualização (ex: cancelamento no outro painel)
    const handleUpdate = () => loadData();
    window.addEventListener('subscription-update', handleUpdate);
    return () => window.removeEventListener('subscription-update', handleUpdate);
  }, [user]);

  const handleToggleStatus = (subId: string) => {
    const newStatus = subscriptionService.toggleStatus(subId);
    if (newStatus) {
        // Atualiza localmente para feedback instantâneo
        setMembers(prev => prev.map(m => m.id === subId ? { ...m, status: newStatus } : m));
        // Recarrega stats globais
        setTimeout(loadData, 100); 
    }
  };

  if (!user) return null;
  if (loading && !stats) return <div className="p-6 text-center text-zinc-500">Carregando dados de membros...</div>;

  const bgCard = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const modalBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-300';

  const filteredMembers = members.filter(m => 
     m.subscriberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`border rounded-xl p-6 ${bgCard} animate-fade-in`}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h3 className={`text-xl font-bold flex items-center gap-2 ${textPrimary}`}>
                <Users className="text-blue-500" /> Assinaturas do Canal
            </h3>
            <p className={`text-sm ${textSecondary}`}>Gerencie seus membros e visualize o repasse de receita (70% Criador / 30% Plataforma).</p>
        </div>
        <div className="text-right">
            <p className={`text-xs uppercase font-bold tracking-wider ${textSecondary}`}>Receita Acumulada (Sua Parte)</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.accumulatedRevenue)}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        
        {/* Membros Ativos */}
        <div className={`p-4 rounded-xl border relative overflow-hidden ${theme === 'dark' ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>Membros Ativos</span>
                <UserCheck size={18} className="text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-500 mb-1">{stats.activeCount}</div>
            <div className={`text-xs ${textSecondary}`}>Plano Mensal: R$ 9,90</div>
        </div>

        {/* Receita do Criador (70%) */}
        <div className={`p-4 rounded-xl border relative overflow-hidden ${theme === 'dark' ? 'bg-green-900/10 border-green-900/30' : 'bg-green-50 border-green-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>Sua Receita (70%)</span>
                <DollarSign size={18} className="text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500 mb-1">{formatCurrency(stats.creatorMonthlyRevenue)}</div>
            <div className={`text-xs ${textSecondary}`}>R$ 6,93 por membro</div>
        </div>

        {/* Repasse Plataforma (30%) */}
        <div className={`p-4 rounded-xl border relative overflow-hidden ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Taxa Plataforma (30%)</span>
                <PieChart size={18} className="text-zinc-500" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${textSecondary}`}>{formatCurrency(stats.platformMonthlyRevenue)}</div>
            <div className={`text-xs ${textSecondary}`}>R$ 2,97 por membro</div>
        </div>

        {/* Receita Bruta Total */}
        <div className={`p-4 rounded-xl border relative overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>Faturamento Bruto</span>
                <TrendingUp size={18} className="text-zinc-400" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${textPrimary}`}>{formatCurrency(stats.grossMonthlyRevenue)}</div>
            <div className={`text-xs ${textSecondary}`}>Total gerado no mês</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2">
             <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                <TrendingUp size={16} className="text-zinc-500"/> Crescimento de Membros
             </h4>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                        <defs>
                            <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#333" : "#eee"} vertical={false} />
                        <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fff', border: theme === 'dark' ? '1px solid #333' : '1px solid #eee', borderRadius: '8px' }} 
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="activeMembers" name="Membros Ativos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMembers)" />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Members List (Mini Preview) */}
          <div className="lg:col-span-1 flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h4 className={`text-sm font-bold flex items-center gap-2 ${textPrimary}`}>
                    <Users size={16} className="text-zinc-500"/> Últimos Membros
                </h4>
             </div>
             
             <div className={`flex-1 border rounded-lg overflow-hidden flex flex-col ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-gray-200 bg-gray-50'}`}>
                <div className="overflow-y-auto max-h-64 flex-1">
                    {members.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-xs">Nenhum membro recente.</div>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className={`${theme === 'dark' ? 'bg-zinc-900 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>
                                <tr>
                                    <th className="p-3">Membro</th>
                                    <th className="p-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                                {members.slice(0, 5).map(member => (
                                    <tr key={member.id} className={`${theme === 'dark' ? 'hover:bg-zinc-900' : 'hover:bg-gray-100'}`}>
                                        <td className="p-3 flex items-center gap-2">
                                            <img src={member.subscriberAvatar} alt="" className="w-6 h-6 rounded-full" />
                                            <div className="truncate max-w-[100px]">
                                                <span className={`block font-bold ${textPrimary}`}>{member.subscriberName}</span>
                                                <span className="text-[10px] text-zinc-500">{new Date(member.startDate).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            {member.status === 'active' ? 
                                                <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-1 rounded">Ativo</span> : 
                                                <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded">Canc.</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-2 border-t border-zinc-800 text-center">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="text-xs text-blue-500 hover:underline font-medium"
                    >
                        Ver lista completa
                    </button>
                </div>
             </div>
          </div>
      </div>

      {/* MODAL LISTA COMPLETA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[80vh] ${modalBg}`}>
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${textPrimary}`}>
                        <Users className="text-blue-500" /> Lista Completa de Membros
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-red-500 p-2 rounded-full hover:bg-zinc-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border outline-none text-sm ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={`${theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="p-4">Membro</th>
                                <th className="p-4">Desde</th>
                                <th className="p-4">Plano</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                            {filteredMembers.map(member => (
                                <tr key={member.id} className={`${theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}`}>
                                    <td className="p-4 flex items-center gap-3">
                                        <img src={member.subscriberAvatar} alt="" className="w-8 h-8 rounded-full border border-zinc-700" />
                                        <div>
                                            <div className={`font-bold ${textPrimary}`}>{member.subscriberName}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{member.id}</div>
                                        </div>
                                    </td>
                                    <td className={`p-4 ${textSecondary}`}>{new Date(member.startDate).toLocaleDateString()}</td>
                                    <td className="p-4 font-medium text-green-500">R$ {formatCurrency(member.price)}</td>
                                    <td className="p-4">
                                        {member.status === 'active' ? (
                                            <span className="bg-green-900/20 text-green-400 border border-green-900/50 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1">
                                                <CheckCircle size={12}/> Ativo
                                            </span>
                                        ) : (
                                            <span className="bg-red-900/20 text-red-400 border border-red-900/50 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1">
                                                <UserX size={12}/> Cancelado
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => handleToggleStatus(member.id)}
                                            className={`text-xs px-3 py-1.5 rounded border transition-colors font-bold ${
                                                member.status === 'active' 
                                                ? 'border-red-900/30 text-red-500 hover:bg-red-900/20' 
                                                : 'border-green-900/30 text-green-500 hover:bg-green-900/20'
                                            }`}
                                        >
                                            {member.status === 'active' ? 'Cancelar' : 'Reativar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredMembers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-500">Nenhum membro encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className={`p-4 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'} text-right`}>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">
                        Fechar Lista
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MembershipStats;
