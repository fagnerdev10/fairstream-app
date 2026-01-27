
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { mercadoPagoService } from '../services/mercadoPagoService';
import { Wallet, CheckCircle, ExternalLink, AlertTriangle, ArrowRight, Unlink } from 'lucide-react';

const CreatorPayments: React.FC = () => {
  const { user, login } = useAuth(); // Login usado para forçar refresh do user state
  const { theme } = useSettings();
  const navigate = useNavigate();

  const handleConnect = () => {
    if (!user) return;
    const url = mercadoPagoService.getConnectUrl(user.id);
    console.log("🔗 URL de Autorização MP:", url);
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    if (!user || !confirm("Tem certeza que deseja desconectar? Você parará de receber pagamentos.")) return;

    await mercadoPagoService.disconnectAccount(user.id);
    // Atualiza estado local (simples reload ou re-fetch)
    window.location.reload();
  };

  if (!user) return null;

  const isConnected = user.mercadoPago?.connected;

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex flex-col gap-2">
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
            <Wallet className="text-blue-500" /> Pagamentos Automáticos
          </h1>
          <p className={textSecondary}>
            Conecte sua conta Mercado Pago para receber repasses automáticos das suas vendas e assinaturas.
          </p>
        </div>

        {/* ALERTA DE RECONEXÃO OBRIGATÓRIA */}
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-start gap-3 animate-pulse">
          <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-yellow-500 uppercase italic">Ação Obrigatória: Reconexão Necessária</p>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Atualizamos nosso sistema para <strong>Split Atômico (70% Criador / 30% Plataforma)</strong>.
              Para que seus repasses funcionem no novo App de Produção, você deve <strong>Desconectar</strong> e <strong>Conectar</strong> sua conta novamente agora.
            </p>
            <p className="text-[10px] text-blue-400 mt-2 font-bold uppercase tracking-wider italic">Sistema agora focado 100% em Pix para repasse imediato.</p>
          </div>
        </div>

        {/* CONFIGURAÇÃO DE RECEBIMENTO - ATIVAÇÃO MANUAL */}
        <div className={`p-8 rounded-xl border flex flex-col items-center justify-center gap-6 text-center shadow-2xl ${cardBg}`}>
          {!isConnected ? (
            <div className="max-w-md w-full space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-lg">
                  <img src="https://http2.mlstatic.com/frontend-assets/mkt-web-navigation/ui-navigation/5.21.22/mercadopago/logo__small.svg" alt="MP" className="w-10" />
                </div>
                <h2 className={`text-2xl font-black ${textPrimary} uppercase tracking-tight`}>Ativar Conta de Recebimento</h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Para que o dinheiro do Pix caia na sua conta, precisamos do seu <strong>User ID do Mercado Pago</strong>.
                  Devido a instabilidades na conexão oficial, use a ativação manual abaixo:
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">ID Numérico da sua conta MP</label>
                  <input
                    id="manual-mp-id"
                    type="text"
                    placeholder="Ex: 3102834096"
                    className="w-full bg-black border-2 border-zinc-700 p-5 rounded-xl text-white font-mono text-2xl text-center focus:border-green-500 transition-all outline-none"
                  />
                  <p className="text-[9px] text-zinc-500 mt-2 text-center">Acesse mercadopago.com.br/developers/panel/user-id para achar seu ID.</p>
                </div>

                <button
                  onClick={() => {
                    const el = document.getElementById('manual-mp-id') as HTMLInputElement;
                    const id = el.value.trim();
                    if (id && !isNaN(Number(id))) {
                      // 1. Atualiza no Banco de Dados do Sistema
                      const DB_KEY = 'fairstream_users_db_v4';
                      const dbUsers = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
                      const dbIdx = dbUsers.findIndex((u: any) => u.id === user.id);

                      const mpData = {
                        connected: true,
                        userId: id,
                        accessToken: 'manual_connected_token',
                        connectedAt: new Date().toISOString()
                      };

                      if (dbIdx !== -1) {
                        dbUsers[dbIdx].mercadoPago = mpData;
                        localStorage.setItem(DB_KEY, JSON.stringify(dbUsers));
                      }

                      // 2. Atualiza a Sessão Atual
                      const updatedUser = { ...user, mercadoPago: mpData };
                      localStorage.setItem('fairstream_user', JSON.stringify(updatedUser));

                      // 3. Refresh no AtuthContext
                      login(updatedUser);

                      alert("🔥 CONTA ATIVADA COM SUCESSO! Agora os repasses de 70% cairão no ID: " + id);
                      window.location.reload();
                    } else {
                      alert("Digite um ID numérico válido (apenas números)!");
                    }
                  }}
                  className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-5 rounded-xl text-xl shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                >
                  SALVAR E ATIVAR REPASSES
                </button>

                <div className="pt-2">
                  <button
                    onClick={handleConnect}
                    className="text-[10px] text-zinc-600 hover:text-blue-500 underline uppercase italic"
                  >
                    Tentar conexão oficial (Botão Azul do MP)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-8">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500/30 rounded-full flex items-center justify-center">
                  <CheckCircle size={40} className="text-green-500" />
                </div>
                <div className="text-left space-y-1">
                  <h2 className="text-2xl font-black text-green-500 uppercase italic leading-none">Repasse Ativo!</h2>
                  <p className={`${textSecondary} text-sm font-medium`}>O dinheiro será enviado para o <strong>ID: {user.mercadoPago?.userId}</strong></p>
                  <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400 font-bold uppercase w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Modo de Repasse Manual
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors border border-zinc-700 text-sm"
                >
                  Verificar Repasses
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-red-500 text-xs font-bold hover:underline opacity-60 hover:opacity-100 transition-opacity"
                >
                  Desconectar / Trocar Conta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* INFO SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
              <AlertTriangle size={18} className="text-yellow-500" /> Como funciona o Split?
            </h3>
            <p className={`text-sm leading-relaxed ${textSecondary}`}>
              A FairStream utiliza o sistema de <strong>Split de Pagamentos</strong>. Quando um espectador assina seu canal ou compra um produto:
            </p>
            <ul className={`mt-3 space-y-2 text-sm ${textSecondary}`}>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> O valor total é processado pelo Mercado Pago.</li>
            </ul>
          </div>

          <div className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`font-bold mb-3 ${textPrimary}`}>Vantagens</h3>
            <ul className="space-y-3">
              <li className={`flex gap-3 text-sm ${textSecondary}`}>
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <span><strong>Recebimento Imediato:</strong> Não precisa esperar dia de saque. O dinheiro cai na sua conta conforme as regras do MP.</span>
              </li>
              <li className={`flex gap-3 text-sm ${textSecondary}`}>
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <span><strong>Transparência Total:</strong> Você vê a entrada direta no seu extrato do Mercado Pago.</span>
              </li>
              <li className={`flex gap-3 text-sm ${textSecondary}`}>
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <span><strong>Sem Intermediários:</strong> Menor risco e maior controle sobre suas finanças.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreatorPayments;
