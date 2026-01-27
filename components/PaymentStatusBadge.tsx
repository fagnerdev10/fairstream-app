
import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { AdStatus } from '../types';

interface PaymentStatusBadgeProps {
  status: AdStatus;
  showLabel?: boolean;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, showLabel = true }) => {
  // Lógica de mapeamento visual
  const getConfig = (s: AdStatus) => {
    switch (s) {
      case 'active':
        return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle, label: 'Pago & Ativo' };
      case 'waiting_approval':
        return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Clock, label: 'Pago (Em Análise)' };
      case 'pending_payment':
        return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertCircle, label: 'Aguardando Pagto' };
      case 'rejected':
        return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle, label: 'Rejeitado' };
      default:
        return { color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', icon: AlertCircle, label: s };
    }
  };

  const config = getConfig(status);
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${config.bg} ${config.border} ${config.color}`}>
      <Icon size={14} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export default PaymentStatusBadge;
