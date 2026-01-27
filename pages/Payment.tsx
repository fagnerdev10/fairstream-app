import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, CreditCard, Lock, ArrowLeft, ShieldCheck, QrCode, Copy, Loader2 } from 'lucide-react';
import { AdPlanType } from '../types';

const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { planType, planName, price } = location.state || {};

  const [method] = useState<'pix'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Method, 2: Payment, 3: Success

  // Se tentar acessar direto sem dados
  if (!planType || !price) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Pedido inválido</h2>
          <button onClick={() => navigate('/ads')} className="text-blue-400 hover:underline">Voltar</button>
        </div>
      </div>
    );
  }

  const handleProcessPayment = () => {
    setIsProcessing(true);

    // Simula tempo de processamento do gateway
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3); // Success
    }, 2000);
  };

  const handleFinish = () => {
    // Volta para o dashboard informando sucesso
    navigate('/ads', {
      state: {
        success: true,
        newPlan: planType
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6 flex flex-col items-center">
      {/* Header Simples */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8 border-b border-zinc-800 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /> Cancelar
        </button>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-green-500" />
          <span className="text-sm text-zinc-400">Ambiente Seguro</span>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Coluna da Esquerda: Resumo do Pedido */}
        <div className="md:col-span-1 order-2 md:order-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-bold mb-4 border-b border-zinc-800 pb-2">Resumo do Pedido</h3>

            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-300">Plano {planName}</span>
              <span className="font-medium">R$ {price},00</span>
            </div>
            <div className="flex justify-between items-center mb-4 text-sm text-zinc-500">
              <span>Ciclo</span>
              <span>Mensal</span>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-2xl text-green-400">R$ {price},00</span>
            </div>

            <div className="mt-6 bg-blue-900/20 border border-blue-900/50 p-3 rounded text-xs text-blue-200 flex gap-2">
              <ShieldCheck size={16} className="flex-shrink-0" />
              <p>O valor será transferido diretamente para a administração da FairStream.</p>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Pagamento */}
        <div className="md:col-span-2 order-1 md:order-2">

          {step === 1 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Escolha a forma de pagamento</h2>

              <div className="space-y-4 mb-8">
                {/* Opção Pix (Única Ativa) */}
                <div className="w-full p-5 rounded-xl border bg-green-900/20 border-green-500 ring-1 ring-green-500 flex items-center gap-4 transition-all">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg" className="w-full h-full object-contain" alt="Pix" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-white text-lg">Pix (Automático)</div>
                    <div className="text-sm text-zinc-400">Aprovação imediata • Sem taxas extras</div>
                  </div>
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-colors text-lg"
              >
                Continuar para Pagamento
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 animate-fade-in">
              {method === 'pix' ? (
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Escaneie o QR Code</h2>
                  <p className="text-zinc-400 mb-6">Abra o app do seu banco e pague via Pix</p>

                  <div className="bg-white p-4 rounded-xl inline-block mb-6 mx-auto shadow-lg">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=fairstream-plan-${planType}-${Date.now()}`} alt="QR Code" />
                  </div>

                  <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-3 flex items-center justify-between text-zinc-400 font-mono text-sm mb-8">
                    <span className="truncate mr-4">00020126360014BR.GOV.BCB.PIX0114+551199999999...</span>
                    <button className="text-blue-400 hover:text-white flex items-center gap-1 font-sans font-bold">
                      <Copy size={14} /> Copiar
                    </button>
                  </div>

                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : 'Já realizei o pagamento'}
                  </button>
                </div>
              ) : null}
              <button onClick={() => setStep(1)} className="mt-4 text-zinc-500 hover:text-zinc-300 w-full text-center text-sm">Voltar</button>
            </div>
          )}

          {step === 3 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 animate-fade-in text-center py-12">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <CheckCircle size={40} className="text-black" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Pagamento Confirmado!</h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                Seu plano foi atualizado para <strong>{planName}</strong> com sucesso. O valor foi enviado para a administração.
              </p>
              <button
                onClick={handleFinish}
                className="bg-white text-black hover:bg-zinc-200 font-bold py-3 px-8 rounded-full transition-colors"
              >
                Voltar para o Painel
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Payment;