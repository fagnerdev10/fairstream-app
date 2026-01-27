
import React from 'react';
import { useCampaignApproval } from '../hooks/useCampaignApproval';
import { Check, X, Eye, DollarSign, Layout, Image, Type } from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';

const CampaignApprovalPanel: React.FC = () => {
  const { pendingCampaigns, stats, approve, reject, isLoading, refreshData } = useCampaignApproval();

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs text-zinc-500 uppercase font-bold">Pendentes</p>
          <p className="text-2xl font-bold text-blue-500">{stats.pending}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs text-zinc-500 uppercase font-bold">Ativas</p>
          <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs text-zinc-500 uppercase font-bold">Rejeitadas</p>
          <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Eye size={18} className="text-blue-500"/> Fila de Aprovação
          </h3>
          <button onClick={refreshData} className="text-xs text-blue-400 hover:underline">Atualizar</button>
        </div>

        {pendingCampaigns.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
              <Check size={24} />
            </div>
            <p className="text-zinc-400 font-medium">Tudo limpo! Nenhuma campanha pendente.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {pendingCampaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 hover:bg-zinc-800/30 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center">
                
                {/* Preview Miniatura */}
                <div className="w-full md:w-32 h-20 bg-black rounded-lg border border-zinc-700 overflow-hidden flex-shrink-0 relative">
                  {campaign.type === 'image' ? (
                    <img src={campaign.bannerImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Type size={24} />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 bg-black/80 px-1.5 py-0.5 text-[10px] text-white font-bold rounded-tl">
                    {campaign.location === 'home' ? 'HOME' : 'VIDEO'}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white truncate">{campaign.title}</h4>
                    <PaymentStatusBadge status={campaign.status} showLabel={false} />
                  </div>
                  
                  <div className="text-xs text-zinc-400 flex flex-col gap-1">
                    <span className="flex items-center gap-1">
                      <Layout size={10} /> {campaign.type === 'image' ? 'Banner Visual' : 'Anúncio de Texto'}
                    </span>
                    <span className="flex items-center gap-1 text-green-400 font-mono">
                      <DollarSign size={10} /> Orçamento: R$ {campaign.budget.toFixed(2)}
                    </span>
                    <span className="truncate">Categorias: {campaign.targetCategories.join(', ')}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => reject(campaign.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-900/20 transition-colors text-sm font-medium"
                  >
                    <X size={16} /> Rejeitar
                  </button>
                  <button 
                    onClick={() => approve(campaign.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors text-sm font-bold shadow-lg shadow-green-900/20"
                  >
                    <Check size={16} /> Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignApprovalPanel;
