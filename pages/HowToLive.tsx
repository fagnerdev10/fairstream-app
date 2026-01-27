
import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ArrowLeft, Youtube, Link as LinkIcon, Settings, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HowToLive: React.FC = () => {
  const { theme } = useSettings();
  const navigate = useNavigate();

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        <button 
          onClick={() => navigate('/creator/live')}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
        >
          <ArrowLeft size={20} /> Voltar para Transmissão
        </button>

        <div className="border-b border-zinc-700 pb-6">
          <h1 className={`text-3xl font-bold ${textPrimary}`}>Como Fazer Live</h1>
          <p className={`mt-2 ${textSecondary}`}>
            Guia passo a passo para conectar sua transmissão do YouTube à FairStream.
          </p>
        </div>

        <div className="space-y-6">
          
          {/* Passo 1 */}
          <div className={`p-6 rounded-xl border flex gap-4 ${cardBg}`}>
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">1</div>
            <div>
              <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${textPrimary}`}>
                <Youtube size={20} className="text-red-600" /> Acesse o YouTube Studio
              </h3>
              <p className={`text-sm leading-relaxed ${textSecondary}`}>
                Entre no seu canal do YouTube e clique no ícone de câmera "Criar" no canto superior direito, depois selecione <strong>"Transmitir ao vivo"</strong>. Se for sua primeira vez, pode ser necessário aguardar 24h para ativação do recurso pelo YouTube.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className={`p-6 rounded-xl border flex gap-4 ${cardBg}`}>
            <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">2</div>
            <div>
              <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${textPrimary}`}>
                <Settings size={20} className="text-blue-500" /> Configure a Live
              </h3>
              <p className={`text-sm leading-relaxed ${textSecondary}`}>
                Crie uma nova transmissão. Defina o título e a descrição. Em "Visibilidade", recomendamos marcar como <strong>"Não listado"</strong> (se quiser que apareça apenas aqui) ou "Público".
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className={`p-6 rounded-xl border flex gap-4 ${cardBg}`}>
            <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">3</div>
            <div>
              <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${textPrimary}`}>
                <LinkIcon size={20} className="text-green-500" /> Copie o ID do Vídeo
              </h3>
              <p className={`text-sm leading-relaxed ${textSecondary}`}>
                Após criar a sala da live, clique no botão de compartilhar e copie o link. O ID é a parte final do link.
                <br/><br/>
                Exemplo: <code>youtube.com/watch?v=</code><strong className="text-white bg-zinc-800 px-1 rounded">dQw4w9WgXcQ</strong>
              </p>
            </div>
          </div>

          {/* Passo 4 */}
          <div className={`p-6 rounded-xl border flex gap-4 ${cardBg}`}>
            <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">4</div>
            <div>
              <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${textPrimary}`}>
                <Radio size={20} className="text-purple-500" /> Cole na FairStream
              </h3>
              <p className={`text-sm leading-relaxed ${textSecondary}`}>
                Volte para a página "Transmitir ao Vivo" no seu painel da FairStream, cole o ID no campo de texto e clique em <strong>Salvar</strong>. Sua live aparecerá instantaneamente para seus seguidores.
              </p>
            </div>
          </div>

        </div>

        <div className="flex justify-center pt-8">
          <button 
            onClick={() => navigate('/creator/live')}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors shadow-lg"
          >
            Configurar Minha Live Agora
          </button>
        </div>

      </div>
    </div>
  );
};

export default HowToLive;
