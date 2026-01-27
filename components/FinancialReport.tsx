
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet, FileText, FileSpreadsheet, Calendar } from 'lucide-react';

import { formatCurrency } from '../utils/formatCurrency';
import { ManualCost, Transaction, SplitPaymentRecord } from '../types';
import { exportService } from '../services/exportService';
import { generateDailyReportData, generateWeeklyReportData, generateMonthlyReportData, generateAnnualReportData } from '../services/mockData';
import CashFlowTable from './CashFlowTable';
import { adService } from '../services/adService';

interface FinancialReportProps {
    reportPeriod: string;
    setReportPeriod: (val: any) => void;
    isExporting: boolean;
    onExport: () => void;
    reportData: any[]; // Ignorado em favor da geração local para consistência
    manualCosts: ManualCost[];
    onDeleteCost: (id: string) => void;
}

const FinancialReport: React.FC<FinancialReportProps> = ({
    reportPeriod, setReportPeriod, isExporting, onExport, reportData, manualCosts, onDeleteCost
}) => {

    // Estado local para controle do mês quando em modo "Diário"
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [displayData, setDisplayData] = useState<any[]>([]);

    // Anos disponíveis para filtro (dos últimos 3 anos até o próximo)
    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    const handleResetFinancialData = () => {
        if (confirm("ATENÇÃO: Isso irá apagar todo o histórico de Transações e Despesas Manuais (útil para limpar dados de teste). Deseja continuar?")) {
            localStorage.setItem('fairstream_tx_db', '[]');
            localStorage.setItem('fairstream_costs_db', '[]');
            // Força refresh
            window.dispatchEvent(new Event('storage'));
            alert("Dados financeiros resetados com sucesso.");
        }
    };

    // AGREGADOR DE DADOS REAIS
    useEffect(() => {
        const fetchRealData = async () => {
            const txs: Transaction[] = await adService.getTransactions();
            const splits: SplitPaymentRecord[] = JSON.parse(localStorage.getItem('fairstream_splits') || '[]');

            let aggregated: any[] = [];

            // Helper para iniciar estruturas de dados zeradas
            const initDailyMap = (daysInMonth: number) => {
                const map = new Map();
                for (let i = 1; i <= daysInMonth; i++) map.set(i, { revenue: 0, expenses: 0 });
                return map;
            };

            const initMonthlyMap = () => {
                const map = new Map();
                for (let i = 0; i < 12; i++) map.set(i, { revenue: 0, expenses: 0 });
                return map;
            };

            // --- LÓGICA DIÁRIA (POR MÊS) ---
            if (reportPeriod === 'daily') {
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const dataMap = initDailyMap(daysInMonth);

                // 1. Processar Receitas (Depósitos)
                txs.forEach(t => {
                    if (t.type === 'deposit') {
                        const d = new Date(t.date);
                        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
                            const day = d.getDate();
                            const current = dataMap.get(day);
                            if (current) dataMap.set(day, { ...current, revenue: current.revenue + t.amount });
                        }
                    }
                });

                // 2. Processar Splits (Receita Plataforma e Despesa Repasse)
                splits.forEach(s => {
                    const d = new Date(s.createdAt);
                    if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
                        const day = d.getDate();
                        const current = dataMap.get(day);
                        if (current) {
                            // Revenue = Platform Share
                            // Expenses = Creator Share (O que sai do caixa da plataforma)
                            dataMap.set(day, {
                                revenue: current.revenue + (Number(s.platformShare) || 0),
                                expenses: current.expenses + (Number(s.creatorShare) || 0)
                            });
                        }
                    }
                });

                // Converter Map para Array
                aggregated = Array.from(dataMap.keys()).sort((a, b) => a - b).map(day => ({
                    name: day.toString().padStart(2, '0'),
                    revenue: dataMap.get(day).revenue,
                    expenses: dataMap.get(day).expenses
                }));

            }
            // --- LÓGICA MENSAL (ANUAL) ---
            else if (reportPeriod === 'monthly') {
                const dataMap = initMonthlyMap(); // 0..11

                txs.forEach(t => {
                    if (t.type === 'deposit') {
                        const d = new Date(t.date);
                        if (d.getFullYear() === selectedYear) {
                            const m = d.getMonth();
                            const current = dataMap.get(m);
                            if (current) dataMap.set(m, { ...current, revenue: current.revenue + t.amount });
                        }
                    }
                });

                splits.forEach(s => {
                    const d = new Date(s.createdAt);
                    if (d.getFullYear() === selectedYear) {
                        const m = d.getMonth();
                        const current = dataMap.get(m);
                        if (current) {
                            dataMap.set(m, {
                                revenue: current.revenue + (Number(s.platformShare) || 0),
                                expenses: current.expenses + (Number(s.creatorShare) || 0)
                            });
                        }
                    }
                });

                const monthNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                aggregated = Array.from(dataMap.keys()).sort((a, b) => a - b).map(m => ({
                    name: monthNamesShort[m],
                    revenue: dataMap.get(m).revenue,
                    expenses: dataMap.get(m).expenses
                }));
            }
            // --- FALLBACKS (MANTENDO MOCK PARA WEEKLY/ANNUAL POR ENQUANTO OU SIMPLIFICANDO) ---
            else {
                // Para Weekly e Annual, usar dados reais simplificados ou manter mock se complexidade for alta
                // IMPLEMENTAÇÃO BÁSICA PARA ANNUAL (HISTÓRICO TOTAL)
                if (reportPeriod === 'annual') {
                    const yearMap = new Map();

                    txs.forEach(t => {
                        if (t.type === 'deposit') {
                            const y = new Date(t.date).getFullYear();
                            const cur = yearMap.get(y) || { rev: 0, exp: 0 };
                            yearMap.set(y, { rev: cur.rev + t.amount, exp: cur.exp });
                        }
                    });
                    splits.forEach(s => {
                        const y = new Date(s.createdAt).getFullYear();
                        const cur = yearMap.get(y) || { rev: 0, exp: 0 };
                        yearMap.set(y, { rev: cur.rev + (Number(s.platformShare) || 0), exp: cur.exp + (Number(s.creatorShare) || 0) });
                    });

                    // Se vazio, popula com ano atual
                    if (yearMap.size === 0) yearMap.set(new Date().getFullYear(), { rev: 0, exp: 0 });

                    aggregated = Array.from(yearMap.keys()).sort((a, b) => a - b).map(y => ({
                        name: y.toString(),
                        revenue: yearMap.get(y).rev,
                        expenses: yearMap.get(y).exp
                    }));
                } else {
                    // Weekly -> Fallback to mock for now due to complex week logic
                    aggregated = generateWeeklyReportData();
                }
            }

            setDisplayData(aggregated);
        };

        fetchRealData();
        window.addEventListener('storage', fetchRealData); // Listen for updates
        return () => window.removeEventListener('storage', fetchRealData);

    }, [reportPeriod, selectedMonth, selectedYear]);

    // Calcula Totais
    const totalRevenue = displayData.reduce((acc, curr) => acc + curr.revenue, 0);
    // removemos realDeposits pois já estão incluídos no displayData acima

    // Se houver depósitos reais, SOMA ao mock para o usuário ver o impacto, ou substitui?
    // Para "simulação", somar é mais gratificante: MockBase + DepósitoUsuario
    // const mockRevenue = displayData.reduce((acc, curr) => acc + curr.revenue, 0);
    // const totalRevenue = mockRevenue + realDeposits;

    const autoExpenses = displayData.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalManualCosts = manualCosts.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = autoExpenses + totalManualCosts;
    const netProfit = totalRevenue - totalExpenses;

    const handleCsvExport = () => {
        exportService.exportToCSV(displayData, manualCosts, reportPeriod);
        if (onExport) onExport();
    };

    const handlePdfExport = () => {
        exportService.exportToPDF(displayData, manualCosts, reportPeriod);
        if (onExport) onExport();
    };

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wallet className="text-yellow-500" /> Relatório Consolidado</h2>
                    <p className="text-zinc-400 text-sm">Visão completa de Receitas, Repasses e Despesas Operacionais.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-end">
                    {/* Seletor de Mês condicional */}
                    {reportPeriod === 'daily' && (
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-lg px-2 mr-2">
                            <Calendar size={14} className="text-zinc-500" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-transparent text-white py-2 outline-none text-sm cursor-pointer"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i} className="bg-zinc-900">{m}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent text-zinc-400 py-2 outline-none text-sm cursor-pointer border-l border-zinc-700 pl-2"
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y} className="bg-zinc-900">{y}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <select
                        value={reportPeriod}
                        onChange={(e) => setReportPeriod(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 text-white rounded-lg px-4 py-2 outline-none text-sm mr-2"
                    >
                        <option value="daily">Diário (Por Mês)</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal (Anual)</option>
                        <option value="annual">Anual (Histórico)</option>
                    </select>

                    <button
                        onClick={handlePdfExport}
                        className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                        title="Gerar PDF para Impressão"
                    >
                        <FileText size={16} /> PDF
                    </button>

                    <button
                        onClick={handleCsvExport}
                        disabled={isExporting}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                        title="Baixar Tabela Excel"
                    >
                        <FileSpreadsheet size={16} /> Excel
                    </button>

                    <button
                        onClick={handleResetFinancialData}
                        className="bg-red-900/20 hover:bg-red-900/40 border border-red-800 text-red-500 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-xs ml-2"
                        title="Apagar todos os registros financeiros de teste"
                    >
                        <Trash2 size={14} /> Resetar Dados
                    </button>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2"><DollarSign size={14} className="text-green-500" /> Receita Bruta</p>
                    <h3 className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2"><TrendingUp size={14} className="text-red-400" /> Repasses (Auto)</p>
                    <h3 className="text-2xl font-bold text-red-400">{formatCurrency(autoExpenses)}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2"><TrendingDown size={14} className="text-orange-400" /> Despesas Manuais</p>
                    <h3 className="text-2xl font-bold text-orange-400">{formatCurrency(totalManualCosts)}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent ${netProfit >= 0 ? 'to-green-900/20' : 'to-red-900/20'} rounded-bl-full pointer-events-none`}></div>
                    <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2"><Wallet size={14} className="text-blue-500" /> Lucro Líquido</p>
                    <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-500'}`}>{formatCurrency(netProfit)}</h3>
                </div>
            </div>

            {/* FISCAL / TAX WARNING SECTION */}
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400 mt-1">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h4 className="text-blue-200 font-bold text-sm">Previsão de Impostos (Simples Nacional ~6%)</h4>
                        <p className="text-blue-300/70 text-xs mt-1 max-w-xl">
                            Para evitar bloqueios na Receita Federal, lembre-se de emitir NFS-e sobre a <strong>Receita Bruta</strong>.
                            Valor estimado de impostos a recolher este mês:
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-bold text-blue-300">{formatCurrency(totalRevenue * 0.06)}</span>
                    <span className="text-xs text-blue-400 uppercase font-bold tracking-wider">Estimativa</span>
                </div>
            </div>

            {/* CHART SECTION */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-96">
                <h3 className="font-bold text-white mb-4 text-sm flex justify-between">
                    <span>Fluxo de Caixa (Receita vs Repasses)</span>
                    {reportPeriod === 'daily' && <span className="text-zinc-500 font-normal">{months[selectedMonth]} / {selectedYear}</span>}
                    {reportPeriod === 'weekly' && <span className="text-zinc-500 font-normal">Últimas 4 Semanas</span>}
                    {reportPeriod === 'monthly' && <span className="text-zinc-500 font-normal">Ano de {selectedYear}</span>}
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={displayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#666"
                            fontSize={10}
                            interval={reportPeriod === 'daily' ? 1 : 0}
                            tickFormatter={(val) => val}
                        />
                        <YAxis stroke="#666" fontSize={12} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ color: '#ccc', marginBottom: '5px' }}
                            isAnimationActive={false} // Desabilita animação do tooltip
                        />
                        {/* isAnimationActive={false} torna o gráfico estático, sem "dança" */}
                        <Bar dataKey="revenue" name="Receita" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={reportPeriod === 'daily' ? 12 : 20} isAnimationActive={false} />
                        <Bar dataKey="expenses" name="Repasses" fill="#f87171" radius={[4, 4, 0, 0]} barSize={reportPeriod === 'daily' ? 12 : 20} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* MANUAL EXPENSES TABLE */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 font-bold text-white text-sm flex justify-between items-center bg-zinc-950">
                    <span>Detalhamento de Despesas Manuais</span>
                    <span className="text-xs text-zinc-500 font-normal">Total: {formatCurrency(totalManualCosts)}</span>
                </div>
                {manualCosts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-300">
                            <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs">
                                <tr>
                                    <th className="p-4 font-medium">Descrição</th>
                                    <th className="p-4 font-medium">Data</th>
                                    <th className="p-4 font-medium">Valor</th>
                                    <th className="p-4 font-medium text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {manualCosts.map((cost) => (
                                    <tr key={cost.id} className="hover:bg-zinc-800/50">
                                        <td className="p-4 font-medium text-white">{cost.description}</td>
                                        <td className="p-4 text-xs text-zinc-400">{new Date(cost.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 text-orange-400 font-bold">- {formatCurrency(cost.amount)}</td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => onDeleteCost(cost.id)}
                                                className="text-zinc-500 hover:text-red-500 p-1 rounded hover:bg-zinc-800 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                        Nenhuma despesa manual registrada neste período.
                    </div>
                )}
            </div>

            {/* NEW: DETAILED CASH FLOW TABLE */}
            <CashFlowTable data={displayData} />

            <div className="text-center text-xs text-zinc-600 italic">
                * Para fins fiscais, a Receita Bruta considera todos os depósitos e taxas retidas.
                Os valores de "Repasses" são despesas dedutíveis dependendo do seu regime tributário.
                Consulte seu contador.
            </div>
        </div>
    );
};

export default FinancialReport;
