import React, { useState, useEffect } from 'react';
import { monthlyPayoutService } from '../services/monthlyPayoutService';
import { authService } from '../services/authService';
import './AdminMonthlyPayouts.css';

interface PendingPayout {
    creatorId: string;
    creatorName: string;
    creatorEmail: string;
    creatorWalletId: string;
    totalViews: number;
    totalRevenue: number;
    platformRevenue: number;
    month: string;
    year: number;
}

interface PayoutHistory {
    id: string;
    creatorId: string;
    creatorName: string;
    amount: number;
    platformAmount: number;
    views: number;
    month: string;
    year: number;
    processedAt: string;
    asaasTransferId?: string;
}

export const AdminMonthlyPayouts: React.FC = () => {
    const [pending, setPending] = useState<PendingPayout[]>([]);
    const [history, setHistory] = useState<PayoutHistory[]>([]);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [tab, setTab] = useState<'pending' | 'history'>('pending');
    const [cpv, setCpv] = useState(0.20);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const pendingData = await monthlyPayoutService.getPendingMonetizationPayouts();
            setPending(pendingData);

            const historyData = await monthlyPayoutService.getPayoutHistory();
            setHistory(historyData as any);

            const currentCpv = await monthlyPayoutService.getCurrentCPV();
            setCpv(currentCpv);
        } catch (e) {
            console.error("Erro ao carregar payouts:", e);
        }
    };

    const processPayouts = async () => {
        if (!confirm(`Confirma o processamento de ${pending.length} pagamento(s)?\n\nIsso criará transferências REAIS via Asaas!`)) {
            return;
        }

        setProcessing(true);
        setResult(null);

        try {
            const processResult = await monthlyPayoutService.processAllMonthlyPayouts();
            setResult(processResult);
            loadData(); // Recarrega dados
            alert(`✅ Processamento concluído!\n\nSucessos: ${processResult.succeeded}\nFalhas: ${processResult.failed}`);
        } catch (error: any) {
            alert(`❌ Erro ao processar: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const totalPendingCreator = pending.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalPendingPlatform = pending.reduce((sum, p) => sum + p.platformRevenue, 0);
    const totalPaidCreator = history.reduce((sum, h) => sum + h.amount, 0);
    const totalPaidPlatform = history.reduce((sum, h) => sum + h.platformAmount, 0);

    const isTodayPayoutDay = monthlyPayoutService.isTodayPayoutDay();
    const nextPayoutDate = monthlyPayoutService.getNextPayoutDate ? monthlyPayoutService.getNextPayoutDate() : '05/próximo mês';

    return (
        <div className="admin-monthly-payouts">
            <div className="header">
                <h1>💰 Pagamentos Mensais (Monetização 50/50)</h1>
                <div className="info-cards">
                    <div className="info-card">
                        <div className="label">Próximo Pagamento</div>
                        <div className="value">
                            {isTodayPayoutDay ? (
                                <span className="today">🔔 HOJE!</span>
                            ) : (
                                nextPayoutDate
                            )}
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="label">CPV Atual</div>
                        <div className="value">
                            R$ {cpv.toFixed(2)}
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="label">Criadores Pendentes</div>
                        <div className="value">{pending.length}</div>
                    </div>
                </div>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${tab === 'pending' ? 'active' : ''}`}
                    onClick={() => setTab('pending')}
                >
                    📋 Pendentes ({pending.length})
                </button>
                <button
                    className={`tab ${tab === 'history' ? 'active' : ''}`}
                    onClick={() => setTab('history')}
                >
                    📜 Histórico ({history.length})
                </button>
            </div>

            {tab === 'pending' && (
                <div className="tab-content">
                    {pending.length === 0 ? (
                        <div className="empty-state">
                            <p>✅ Nenhum pagamento pendente no momento</p>
                        </div>
                    ) : (
                        <>
                            <div className="summary">
                                <div className="summary-item">
                                    <span>Total a pagar (Criadores):</span>
                                    <strong>R$ {totalPendingCreator.toFixed(2)}</strong>
                                </div>
                                <div className="summary-item platform">
                                    <span>Receita da plataforma:</span>
                                    <strong>R$ {totalPendingPlatform.toFixed(2)}</strong>
                                </div>
                            </div>

                            <div className="action-bar">
                                <button
                                    className="btn-process"
                                    onClick={processPayouts}
                                    disabled={processing}
                                >
                                    {processing ? '⏳ Processando...' : '💸 Processar Todos os Pagamentos'}
                                </button>
                                <span className="warning">
                                    ⚠️ Isso criará transferências REAIS via Asaas!
                                </span>
                            </div>

                            <table className="payouts-table">
                                <thead>
                                    <tr>
                                        <th>Criador</th>
                                        <th>Email</th>
                                        <th>Wallet ID</th>
                                        <th>Views</th>
                                        <th>Valor (50%)</th>
                                        <th>Plataforma (50%)</th>
                                        <th>Período</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pending.map((p) => (
                                        <tr key={p.creatorId}>
                                            <td>{p.creatorName}</td>
                                            <td>{p.creatorEmail}</td>
                                            <td>
                                                <code>{p.creatorWalletId.substring(0, 12)}...</code>
                                            </td>
                                            <td>{p.totalViews.toLocaleString()}</td>
                                            <td className="money creator">R$ {p.totalRevenue.toFixed(2)}</td>
                                            <td className="money platform">R$ {p.platformRevenue.toFixed(2)}</td>
                                            <td>{p.month}/{p.year}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {result && (
                        <div className="result-panel">
                            <h3>📊 Resultado do Processamento</h3>
                            <div className="result-stats">
                                <div className="stat success">
                                    <span>✅ Sucessos:</span>
                                    <strong>{result.succeeded}</strong>
                                </div>
                                <div className="stat failed">
                                    <span>❌ Falhas:</span>
                                    <strong>{result.failed}</strong>
                                </div>
                                <div className="stat total">
                                    <span>📊 Total:</span>
                                    <strong>{result.total}</strong>
                                </div>
                            </div>

                            {result.results && result.results.length > 0 && (
                                <div className="result-details">
                                    <h4>Detalhes:</h4>
                                    {result.results.map((r: any, i: number) => (
                                        <div
                                            key={i}
                                            className={`result-item ${r.success ? 'success' : 'failed'}`}
                                        >
                                            <span className="name">{r.creatorName}</span>
                                            <span className="amount">R$ {r.amount.toFixed(2)}</span>
                                            {r.success ? (
                                                <span className="status success">
                                                    ✅ {r.asaasPaymentId}
                                                </span>
                                            ) : (
                                                <span className="status failed">
                                                    ❌ {r.error}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {tab === 'history' && (
                <div className="tab-content">
                    {history.length === 0 ? (
                        <div className="empty-state">
                            <p>📜 Nenhum pagamento processado ainda</p>
                        </div>
                    ) : (
                        <>
                            <div className="summary">
                                <div className="summary-item">
                                    <span>Total pago (Criadores):</span>
                                    <strong>R$ {totalPaidCreator.toFixed(2)}</strong>
                                </div>
                                <div className="summary-item platform">
                                    <span>Total recebido (Plataforma):</span>
                                    <strong>R$ {totalPaidPlatform.toFixed(2)}</strong>
                                </div>
                            </div>

                            <table className="payouts-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Criador</th>
                                        <th>Views</th>
                                        <th>Valor Pago</th>
                                        <th>Plataforma</th>
                                        <th>Período</th>
                                        <th>Transfer ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h) => (
                                        <tr key={h.id}>
                                            <td>
                                                {new Date(h.processedAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td>{h.creatorName}</td>
                                            <td>{h.views.toLocaleString()}</td>
                                            <td className="money creator">R$ {h.amount.toFixed(2)}</td>
                                            <td className="money platform">R$ {h.platformAmount.toFixed(2)}</td>
                                            <td>{h.month}/{h.year}</td>
                                            <td>
                                                {h.asaasTransferId ? (
                                                    <code>{h.asaasTransferId.substring(0, 12)}...</code>
                                                ) : (
                                                    <span className="na">N/A</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
