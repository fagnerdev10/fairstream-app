
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, FileWarning, Lock } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const CommunityRules: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useSettings();

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';

  return (
    <div className={`min-h-screen p-4 md:p-8 ${bgPage} font-sans`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 mb-4 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
          >
            <ArrowLeft size={20} /> Voltar
          </button>
          
          <div className={`p-6 rounded-xl border-l-4 border-green-500 shadow-lg ${cardBg} mb-6`}>
            <h1 className={`text-2xl md:text-3xl font-bold flex items-center gap-3 ${textPrimary}`}>
              <Shield className="text-green-500" size={32} />
              ✅ REGRAS OFICIAIS DE CONTEÚDO — FAIRSTREAM
            </h1>
            <p className={`mt-2 text-lg font-medium text-red-500 flex items-center gap-2`}>
              <Lock size={18} />
              (Apenas o que é proibido. Sem exceções.)
            </p>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="space-y-6">

          {/* 1. Violência e Criminalidade */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 1. Violência e Criminalidade
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Mostrar qualquer tipo de violência física</li>
              <li>Pessoas brigando, agressões, confrontos</li>
              <li>Exibição de armas, facas ou objetos perigosos</li>
              <li>Mostrar ou incentivar crimes</li>
              <li>Programas policiais, perseguições, prisões, operações, flagrantes</li>
              <li>Conteúdo que glorifique violência, gangues ou atividades ilegais</li>
              <li>Desafios perigosos ou comportamentos que coloquem pessoas em risco</li>
            </ul>
          </section>

          {/* 2. Conteúdo Sexual ou Pornográfico */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 2. Conteúdo Sexual ou Pornográfico
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Pornografia</li>
              <li>Nudez explícita</li>
              <li>Qualquer conteúdo sexual envolvendo menores</li>
              <li>Exploração sexual</li>
            </ul>
          </section>

          {/* 3. Desinformação */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 3. Desinformação, Alarmismo e Previsões Catastróficas
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Conteúdos dizendo que “o mundo vai acabar”, “apocalipse”, “a economia vai colapsar”, “vai ter guerra”, etc., sem base real</li>
              <li>Previsões catastróficas inventadas para assustar o público</li>
              <li>Notícias falsas, boatos, manipulação ou conteúdo enganoso</li>
              <li>Criar pânico, medo ou sensação de caos sem dados confiáveis</li>
            </ul>
          </section>

          {/* 4. Política */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 4. Política Sensacionalista ou Manipuladora
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Conteúdo político sensacionalista</li>
              <li>Conteúdo político enganoso, distorcido ou tendencioso</li>
              <li>Vídeos que incentivem ódio, violência ou ataques políticos</li>
              <li>Manipulação emocional, fake news, teorias conspiratórias</li>
              <li>Conteúdo político que tente enganar, inflamar ou dividir o público</li>
            </ul>
            <p className={`mt-3 text-sm italic ${textSecondary} border-t pt-2 border-dashed border-zinc-700`}>
              Permitido apenas política informativa, neutra e factual — sem sensacionalismo.
            </p>
          </section>

          {/* 5. Ódio e Discriminação */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 5. Ódio, Discriminação e Assédio
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Ataques contra pessoas ou grupos por raça, gênero, religião, orientação sexual, nacionalidade ou deficiência</li>
              <li>Incentivo ao ódio, violência ou exclusão</li>
              <li>Assédio, humilhação, perseguição ou bullying</li>
            </ul>
          </section>

          {/* 6. Conteúdo Infantil */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 6. Conteúdo Infantil Inadequado
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Qualquer conteúdo sexual envolvendo menores</li>
              <li>Situações perigosas com crianças</li>
              <li>Exploração infantil</li>
              <li>Violência envolvendo crianças</li>
              <li>Conteúdo adulto disfarçado de infantil</li>
              <li>Temas assustadores, pesados ou inadequados para menores</li>
            </ul>
          </section>

          {/* 7. Atividades Ilegais */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 7. Atividades Ilegais
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Ensinar, mostrar ou incentivar crimes</li>
              <li>Uso, venda ou promoção de drogas ilegais</li>
              <li>Instruções para hackear, fraudar ou burlar sistemas</li>
              <li>Divulgação de dados pessoais de terceiros (doxxing)</li>
              <li>Golpes, pirâmides, esquemas ilegais</li>
            </ul>
          </section>

          {/* 8. Spam e Golpes */}
          <section className={`p-6 rounded-xl border border-l-4 border-l-red-600 ${cardBg}`}>
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              ❌ 8. Spam, Golpes e Manipulação
            </h2>
            <ul className={`list-disc list-inside space-y-2 ${textPrimary}`}>
              <li>Spam, comentários repetitivos ou enganosos</li>
              <li>Contas falsas para manipular métricas</li>
              <li>Bots para inflar visualizações, curtidas ou seguidores</li>
              <li>Links maliciosos, golpes ou fraudes</li>
            </ul>
          </section>

        </div>

        <div className={`mt-8 text-center text-sm ${textSecondary} p-4 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-300'}`}>
          FairStream AI &copy; 2025 - Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default CommunityRules;
