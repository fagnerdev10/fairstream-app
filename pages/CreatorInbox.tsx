
import React, { useState, useEffect } from 'react';
import { messageService } from '../services/messageService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Message } from '../types';
import { Mail, ArrowLeft, Inbox, AlertTriangle, Send, RefreshCw, X, Plus, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreatorInbox: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useSettings();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showNewMsgModal, setShowNewMsgModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');

  const loadMessages = async () => {
    if (!user) return;
    try {
      // Usamos getMessages para ver mensagens recebidas
      const msgs = await messageService.getMessages(user.id);
      setMessages(msgs);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Polling a cada 5 segundos para não sobrecarregar
    const interval = setInterval(loadMessages, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  const handleMarkAsRead = async (msgId: string) => {
    await messageService.markAsRead(msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
  };

  const toggleExpand = (msg: Message) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
    } else {
      setExpandedId(msg.id);
      if (!msg.read && msg.toId === user?.id) {
        handleMarkAsRead(msg.id);
      }
    }
  };

  const handleReply = async (msg: Message) => {
    if (!replyText.trim() || !user) return;

    const newMsg = await messageService.sendMessage({
      fromId: user.id,
      toId: 'admin',
      subject: `Re: ${msg.subject}`,
      body: replyText,
      fromName: user.name,
      type: 'chat',
      fromRole: 'creator',
      toRole: 'owner'
    });

    setReplyText('');
    if (newMsg) setMessages(prev => [newMsg, ...prev]);
  };

  const handleSubmitNewMessage = async () => {
    if (!newSubject.trim() || !newBody.trim() || !user) {
      alert("Preencha todos os campos.");
      return;
    }

    const newMsg = await messageService.sendMessage({
      fromId: user.id,
      toId: 'admin',
      subject: newSubject,
      body: newBody,
      fromName: user.name,
      type: 'chat',
      fromRole: 'creator',
      toRole: 'owner'
    });

    if (newMsg) setMessages(prev => [newMsg, ...prev]);
    setSuccessMsg('Mensagem enviada com sucesso para a administração!');
    setTimeout(() => setSuccessMsg(''), 4000);

    setNewSubject('');
    setNewBody('');
    setShowNewMsgModal(false);
  };

  const getIcon = (fromId: string) => {
    if (fromId === 'admin') return <AlertTriangle className="text-yellow-500" size={20} />;
    return <Mail className="text-blue-500" size={20} />;
  };

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const bgRead = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const bgUnread = theme === 'dark' ? 'bg-zinc-800/30' : 'bg-white';
  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  if (loading) return <div className="p-10 text-center text-zinc-500">Carregando mensagens...</div>;

  return (
    <div className={`min-h-screen p-4 md:p-6 ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center gap-2 mb-6 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
        >
          <ArrowLeft size={20} /> Voltar ao Painel
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${textPrimary}`}>
            <Inbox className="text-blue-500" /> Caixa de Entrada (Criador)
          </h1>
          <div className="flex gap-2">
            <button onClick={loadMessages} className={`p-2 rounded-lg border ${theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800' : 'border-gray-300 hover:bg-gray-100'}`} title="Atualizar">
              <RefreshCw size={18} className={textSecondary} />
            </button>
            <button onClick={() => setShowNewMsgModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-900/20">
              <Plus size={18} /> Nova Mensagem
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle size={20} /> {successMsg}
          </div>
        )}

        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className={`text-center py-20 border rounded-xl border-dashed ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-300'}`}>
              <Mail size={48} className={`mx-auto mb-4 opacity-20 ${textPrimary}`} />
              <p className={textSecondary}>Você não tem mensagens como criador.</p>
              <button onClick={() => setShowNewMsgModal(true)} className="mt-4 text-blue-500 hover:underline text-sm">
                Enviar primeira mensagem
              </button>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`border rounded-xl transition-all overflow-hidden ${!msg.read ? 'border-blue-500/30 shadow-sm' : (theme === 'dark' ? 'border-zinc-800' : 'border-gray-200')} ${msg.read ? bgRead : bgUnread}`}
              >
                <div
                  onClick={() => toggleExpand(msg)}
                  className="p-4 cursor-pointer flex items-center justify-between gap-4 hover:opacity-90"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`p-2 rounded-full flex-shrink-0 ${msg.fromId === 'admin' ? 'bg-yellow-900/20' : 'bg-blue-900/20'}`}>
                      {getIcon(msg.fromId)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-sm ${textPrimary}`}>
                          {msg.fromId === user?.id ? 'Você' : (msg.fromName || 'Sistema')}
                        </span>
                        {!msg.read && msg.toId === user?.id && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
                      </div>
                      <h3 className={`text-sm font-medium truncate ${msg.read ? textSecondary : textPrimary}`}>
                        {msg.subject}
                      </h3>
                    </div>
                  </div>
                  <div className={`text-xs ${textSecondary} whitespace-nowrap`}>
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {expandedId === msg.id && (
                  <div className={`p-4 pt-0 pl-16 pr-4 pb-4 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
                    <div className={`mt-4 text-sm leading-relaxed whitespace-pre-wrap ${textSecondary}`}>
                      {msg.body}
                    </div>

                    {msg.fromId !== user?.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Responder..."
                            className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-black'}`}
                            onKeyDown={(e) => e.key === 'Enter' && handleReply(msg)}
                          />
                          <button
                            onClick={() => handleReply(msg)}
                            disabled={!replyText.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showNewMsgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className={`w-full max-w-lg rounded-xl border p-6 shadow-2xl relative ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
            <button
              onClick={() => setShowNewMsgModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${textPrimary}`}>
              <Send className="text-blue-500" /> Nova Mensagem
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Assunto</label>
                <input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 outline-none border focus:border-blue-500 transition-colors ${inputBg}`}
                  placeholder="Ex: Dúvida sobre pagamento"
                  autoFocus
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Mensagem</label>
                <textarea
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  rows={5}
                  className={`w-full rounded-lg px-3 py-2 outline-none border focus:border-blue-500 transition-colors resize-none ${inputBg}`}
                  placeholder="Descreva sua solicitação para a administração..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowNewMsgModal(false)}
                  className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitNewMessage}
                  disabled={!newSubject.trim() || !newBody.trim()}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                  Enviar Mensagem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorInbox;
