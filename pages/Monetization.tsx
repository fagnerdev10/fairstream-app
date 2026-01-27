
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Info, ShieldCheck, AlertCircle, PieChart, Calculator, Users, Eye, Zap } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const Monetization: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useSettings();

  // Estados da calculadora
  const [viewsPerMonth, setViewsPerMonth] = useState(10000);
  const [membersCount, setMembersCount] = useState(10);
  const [memberPrice, setMemberPrice] = useState(9.90);

  // Cálculos
  const earningsFromViews = viewsPerMonth * 0.10; // 50% de R$ 0,20
  const earningsFromMembers = membersCount * memberPrice * 0.70; // 70% vai pro criador
  const totalMonthly = earningsFromViews + earningsFromMembers;
  const totalYearly = totalMonthly * 12;

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

        {/* Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 mb-4 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
          >
            <ArrowLeft size={20} /> Voltar
          </button>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${textPrimary}`}>
            <DollarSign className="text-green-500" size={36} /> Como funciona a monetização
          </h1>
          <p className={`mt-2 text-lg ${textSecondary}`}>
            Entenda como a FairStream valoriza o seu conteúdo de forma simples e transparente.
          </p>
        </div>

        {/* Card Principal: Valor por View */}
        <section className={`p-8 rounded-xl border shadow-lg ${cardBg}`}>
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${textPrimary}`}>
            💰 Quanto vale cada visualização?
          </h2>

          <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
            <div className={`flex-1 p-6 rounded-xl border border-dashed border-green-500/30 bg-green-500/5 text-center w-full`}>
              <p className="text-sm font-bold uppercase tracking-wider text-green-600 mb-2">Valor Gerado</p>
              <p className="text-4xl font-extrabold text-green-500">R$ 0,20</p>
              <p className={`text-xs mt-2 ${textSecondary}`}>por visualização válida</p>
            </div>

            <div className="hidden md:block text-zinc-500">
              <ArrowLeft className="rotate-180" size={24} />
            </div>

            <div className="flex-1 w-full space-y-4">
              <div className={`p-4 rounded-lg flex justify-between items-center ${theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black font-bold">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <p className={`font-bold ${textPrimary}`}>Você (Criador)</p>
                    <p className="text-xs text-zinc-500">Recebe direto no saldo</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-green-500">R$ 0,10</span>
              </div>

              <div className={`p-4 rounded-lg flex justify-between items-center ${theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className={`font-bold ${textPrimary}`}>FairStream</p>
                    <p className="text-xs text-zinc-500">Manutenção e Operação</p>
                  </div>
                </div>
                <span className={`text-xl font-bold ${textPrimary}`}>R$ 0,10</span>
              </div>
            </div>
          </div>

          <p className={`${textSecondary} leading-relaxed`}>
            Esse valor é dividido de forma justa: <strong className="text-green-500">R$ 0,10 vai diretamente para você</strong> e R$ 0,10 fica com a FairStream para manter servidores, inteligência artificial, equipe e toda a operação da plataforma funcionando.
          </p>
        </section>

        {/* 🧮 CALCULADORA DE GANHOS */}
        <section className={`p-8 rounded-xl border shadow-lg ${cardBg} relative overflow-hidden`}>
          {/* Brilho decorativo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${textPrimary} relative z-10`}>
            <Calculator className="text-purple-500" size={28} />
            🧮 Calculadora de Ganhos
          </h2>
          <p className={`${textSecondary} mb-8`}>Simule quanto você pode ganhar na FairStream!</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Inputs */}
            <div className="space-y-6">
              {/* Views por mês */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${textPrimary}`}>
                  <Eye className="text-blue-500" size={18} />
                  Visualizações por mês
                </label>
                <input
                  type="range"
                  min="1000"
                  max="10000000"
                  step="1000"
                  value={viewsPerMonth}
                  onChange={(e) => setViewsPerMonth(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${textSecondary}`}>1.000</span>
                  <input
                    type="text"
                    value={viewsPerMonth.toLocaleString('pt-BR')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setViewsPerMonth(Math.max(0, Number(raw)));
                    }}
                    className={`w-36 text-center text-lg font-bold rounded-lg py-1 px-2 border ${theme === 'dark'
                      ? 'bg-zinc-800 border-zinc-700 text-green-500'
                      : 'bg-white border-gray-300 text-green-600'
                      }`}
                  />
                  <span className={`text-xs ${textSecondary}`}>10M</span>
                </div>
              </div>

              {/* Membros */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${textPrimary}`}>
                  <Users className="text-purple-500" size={18} />
                  Membros pagantes
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="1"
                  value={membersCount}
                  onChange={(e) => setMembersCount(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${textSecondary}`}>0</span>
                  <input
                    type="text"
                    value={membersCount.toLocaleString('pt-BR')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setMembersCount(Math.max(0, Number(raw)));
                    }}
                    className={`w-28 text-center text-lg font-bold rounded-lg py-1 px-2 border ${theme === 'dark'
                      ? 'bg-zinc-800 border-zinc-700 text-purple-500'
                      : 'bg-white border-gray-300 text-purple-600'
                      }`}
                  />
                  <span className={`text-xs ${textSecondary}`}>10.000</span>
                </div>
              </div>

              {/* Preço do membro */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${textPrimary}`}>
                  <DollarSign className="text-yellow-500" size={18} />
                  Valor da assinatura mensal (mín. R$ 9,90)
                </label>
                <div className="flex gap-2">
                  {[9.90, 14.90, 19.90, 29.90].map((price) => (
                    <button
                      key={price}
                      onClick={() => setMemberPrice(price)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${memberPrice === price
                        ? 'bg-yellow-500 text-black'
                        : theme === 'dark'
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                      R$ {price.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-zinc-950 border border-zinc-800' : 'bg-gray-100'}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                <Zap className="text-yellow-500" size={20} />
                Sua estimativa de ganhos
              </h3>

              <div className="space-y-4">
                {/* Views */}
                <div className={`flex justify-between items-center p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
                  <div>
                    <p className={`text-sm ${textSecondary}`}>Por visualizações</p>
                    <p className={`text-xs ${textSecondary}`}>{viewsPerMonth.toLocaleString('pt-BR')} × R$ 0,10</p>
                  </div>
                  <span className="text-xl font-bold text-green-500">R$ {earningsFromViews.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Membros */}
                <div className={`flex justify-between items-center p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
                  <div>
                    <p className={`text-sm ${textSecondary}`}>Por membros (70%)</p>
                    <p className={`text-xs ${textSecondary}`}>{membersCount} × R$ {memberPrice.toFixed(2)} × 0,70</p>
                  </div>
                  <span className="text-xl font-bold text-purple-500">R$ {earningsFromMembers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-zinc-700 my-2"></div>

                {/* Total Mensal */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-purple-500/20 border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <p className={`font-bold ${textPrimary}`}>💰 Total Mensal</p>
                    <span className="text-2xl font-extrabold text-green-400">R$ {totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Total Anual */}
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm ${textSecondary}`}>📅 Projeção Anual</p>
                    <span className={`text-xl font-bold ${textPrimary}`}>R$ {totalYearly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className={`text-xs ${textSecondary} mt-6 text-center`}>
            * Valores estimados. O ganho real depende do engajamento da sua audiência.
          </p>
        </section>

        {/* Grid de Informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Por que esse modelo? */}
          <section className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <TrendingUp className="text-blue-500" size={20} /> Por que usamos esse modelo?
            </h3>
            <p className={`text-sm leading-relaxed ${textSecondary} mb-4`}>
              A FairStream é uma plataforma nova e, para <strong>incentivar criadores desde o início</strong>, começamos com um valor por visualização significativamente mais alto do que o mercado tradicional.
            </p>
            <p className={`text-sm leading-relaxed ${textSecondary}`}>
              Isso ajuda você a crescer mais rápido financeiramente e torna a plataforma um ambiente atrativo para quem está começando ou migrando de outras redes.
            </p>
          </section>

          {/* Ajustes Futuros */}
          <section className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <PieChart className="text-purple-500" size={20} /> Ajustes futuros
            </h3>
            <p className={`text-sm leading-relaxed ${textSecondary} mb-4`}>
              Conforme a FairStream crescer e atingir grande escala, o valor por visualização poderá ser ajustado para manter o sistema sustentável. O plano de evolução natural é:
            </p>
            <ul className="space-y-2">
              <li className={`flex justify-between text-sm p-2 rounded ${theme === 'dark' ? 'bg-green-900/20 text-green-200 border border-green-900/30' : 'bg-green-100 text-green-800'}`}>
                <span>Fase Inicial (Atual)</span>
                <span className="font-bold">R$ 0,20 / view</span>
              </li>
              <li className={`flex justify-between text-sm p-2 rounded opacity-70 ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>
                <span>Fase Intermediária</span>
                <span>R$ 0,10 / view</span>
              </li>
              <li className={`flex justify-between text-sm p-2 rounded opacity-50 ${theme === 'dark' ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-400'}`}>
                <span>Fase Avançada</span>
                <span>R$ 0,05 / view</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Importante */}
        <section className={`p-6 rounded-xl border border-l-4 border-l-yellow-500 ${theme === 'dark' ? 'bg-yellow-900/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>
            <AlertCircle size={20} /> Importante
          </h3>
          <ul className={`space-y-2 text-sm list-disc list-inside ${theme === 'dark' ? 'text-yellow-200/80' : 'text-yellow-900/80'}`}>
            <li>A monetização por visualização (ads) é calculada internamente pela FairStream e creditada no seu saldo.</li>

            <li>Você pode acompanhar seus ganhos detalhados em tempo real no <strong>Painel do Criador</strong>.</li>
          </ul>
        </section>

      </div>
    </div>
  );
};

export default Monetization;
