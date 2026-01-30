
import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { ArrowLeft, Users, Wallet, CheckCircle, XCircle, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminCreatorStatus: React.FC = () => {
    const [creators, setCreators] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const { theme } = useSettings();

    const { user, isLoading: authLoading } = useAuth();
    const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/admin');
        }

        const loadData = async () => {
            if (!authLoading && isAdmin) {
                const allUsers = await authService.getAllUsers();
                // Filtra apenas criadores e remove duplicatas
                const uniqueCreators = allUsers
                    .filter(u => u.role === 'creator')
                    .filter((user, index, self) =>
                        index === self.findIndex((t) => (
                            t.id === user.id
                        ))
                    );
                setCreators(uniqueCreators);
            }
        };
        loadData();
    }, [authLoading, isAdmin, navigate]);

    const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
    const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

    const filtered = creators.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={`min-h-screen p-6 ${bgPage}`}>
            <div className="max-w-6xl mx-auto">

                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/admin')}
                            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
                                <Wallet className="text-blue-500" /> Status Financeiro
                            </h1>
                            <p className={textSecondary}>Monitoramento de status dos criadores.</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar criador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`pl-10 pr-4 py-2 rounded-lg border outline-none text-sm w-full md:w-64 ${inputBg}`}
                        />
                    </div>
                </div>

                <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`${theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-gray-100 text-gray-500'} uppercase text-xs font-bold`}>
                                <tr>
                                    <th className="p-4">Criador</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Wallet ID (Asaas)</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme === 'dark' ? 'divide-zinc-800' : 'divide-gray-200'}`}>
                                {filtered.map(creator => {
                                    const isConnected = !!creator.asaasWalletId;
                                    return (
                                        <tr key={creator.id} className={`${theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}`}>
                                            <td className="p-4 flex items-center gap-3">
                                                <img src={creator.avatar} alt="" className="w-8 h-8 rounded-full" />
                                                <div>
                                                    <div className={`font-bold ${textPrimary}`}>{creator.name}</div>
                                                    <div className="text-xs text-zinc-500">{creator.email}</div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {isConnected ? (
                                                    <span className="flex items-center gap-1.5 text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded w-fit text-xs border border-green-500/20">
                                                        <CheckCircle size={14} /> Carteira Ativa
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-zinc-500 font-bold bg-zinc-500/10 px-2 py-1 rounded w-fit text-xs border border-zinc-500/20">
                                                        <XCircle size={14} /> Sem Carteira
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-4 font-mono text-xs ${textSecondary}`}>
                                                {creator.asaasWalletId || '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-blue-500 hover:underline text-xs flex items-center justify-end gap-1">
                                                    Ver Perfil <ExternalLink size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Nenhum criador encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminCreatorStatus;
