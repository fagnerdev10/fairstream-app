
import React, { useState, useEffect } from 'react';
import { Save, TrendingUp, Video, Layout, ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { adService } from '../services/adService';

const FinancePrices: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useSettings();

  // States
  const [price100k, setPrice100k] = useState(0.20);
  const [price500k, setPrice500k] = useState(0.15);
  const [price1m, setPrice1m] = useState(0.10);
  const [homepagePrice, setHomepagePrice] = useState(0.30);
  const [showSuccess, setShowSuccess] = useState(false);

  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/admin');
    }

    // Only load data if the user is an admin or loading is complete and they are not an admin (which would trigger redirect)
    if (!isLoading && isAdmin) {
      adService.getTieredPricing().then(savedPricing => {
        setPrice100k(savedPricing.p100k);
        setPrice500k(savedPricing.p500k);
        setPrice1m(savedPricing.p1m);
        setHomepagePrice(savedPricing.homepagePrice || 0.30);
      });
    }
  }, [isLoading, isAdmin, navigate]); // Added isLoading, isAdmin, navigate to dependency array

  const handleSave = async () => {
    await adService.saveTieredPricing({
      p100k: price100k,
      p500k: price500k,
      p1m: price1m,
      homepagePrice: homepagePrice
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const calculateExample = (views: number, price: number) => {
    return (views * price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Styles
  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className={`flex items-center gap-2 mb-4 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
          >
            <ArrowLeft size={20} /> Voltar ao Painel
          </button>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${textPrimary}`}>
            <TrendingUp className="text-green-500" /> Configuração de Preços (CPV)
          </h1>
          <p className={textSecondary}>Defina o Custo por Visualização cobrado dos anunciantes.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* PACOTE PADRÃO (VÍDEOS) */}
          <div className={`p-6 rounded-xl border shadow-sm ${cardBg}`}>
            <div className="flex items-center gap-3 mb-6 border-b border-zinc-700/50 pb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Video className="text-blue-500" size={24} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary}`}>Anúncios em Vídeos</h2>
                <p className={`text-xs ${textSecondary}`}>Preço dinâmico por volume (Tiered Pricing)</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Até 499k views (CPV Base)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={price100k}
                    onChange={(e) => setPrice100k(Number(e.target.value))}
                    className={`w-full rounded-lg pl-8 pr-4 py-2 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>500k a 999k views (Desconto Médio)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={price500k}
                    onChange={(e) => setPrice500k(Number(e.target.value))}
                    className={`w-full rounded-lg pl-8 pr-4 py-2 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Acima de 1M views (Desconto Máximo)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={price1m}
                    onChange={(e) => setPrice1m(Number(e.target.value))}
                    className={`w-full rounded-lg pl-8 pr-4 py-2 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PACOTE HOME & SIMULAÇÃO */}
          <div className="space-y-8">
            <div className={`p-6 rounded-xl border shadow-sm ${cardBg}`}>
              <div className="flex items-center gap-3 mb-6 border-b border-zinc-700/50 pb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Layout className="text-purple-500" size={24} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>Página Principal (Home)</h2>
                  <p className={`text-xs ${textSecondary}`}>Preço fixo premium para destaque máximo</p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Preço Único por View (Home)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={homepagePrice}
                    onChange={(e) => setHomepagePrice(Number(e.target.value))}
                    className={`w-full rounded-lg pl-8 pr-4 py-2 outline-none focus:border-purple-500 transition-colors ${inputBg}`}
                  />
                </div>
                <div className="mt-3 flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <p>Este valor não sofre desconto por volume devido à escassez do espaço na Home.</p>
                </div>
              </div>
            </div>

            {/* Simulação */}
            <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-300'}`}>
              <h3 className={`font-bold mb-4 ${textPrimary}`}>Simulação de Receita</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={textSecondary}>10.000 views (Padrão)</span>
                  <span className={`font-mono ${textPrimary}`}>{calculateExample(10000, price100k)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={textSecondary}>1.000.000 views (Padrão)</span>
                  <span className={`font-mono ${textPrimary}`}>{calculateExample(1000000, price1m)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-2 mt-2">
                  <span className="text-purple-400 font-bold">100.000 views (Home)</span>
                  <span className="text-purple-400 font-bold font-mono">{calculateExample(100000, homepagePrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`mt-8 pt-6 border-t flex items-center justify-between ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {showSuccess && (
              <span className="text-green-500 font-bold text-sm animate-fade-in flex items-center gap-1">
                ✅ Preços atualizados!
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-green-900/20 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Save size={18} /> Salvar Configurações
          </button>
        </div>

      </div>
    </div>
  );
};

export default FinancePrices;
