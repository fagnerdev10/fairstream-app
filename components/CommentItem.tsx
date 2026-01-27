
import React, { useState } from 'react';
import { Comment } from '../types';
import { ThumbsUp, MessageCircle, Crown, Send, X, Trash2, Flag, Ban, AlertTriangle, Pin, Heart } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface CommentItemProps {
  comment: Comment;
  creatorId: string; // ID do criador do vídeo para verificar badge
  depth?: number;    // Profundidade para indentação
  onResponder: (parentId: string, texto: string) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onBlock: (userId: string) => void;
  onPin?: (commentId: string) => void; // Nova função para fixar
  onLike?: (commentId: string) => void; // Nova função para curtir
  currentUser: any; // Usuário logado
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  creatorId,
  depth = 0,
  onResponder,
  onDelete,
  onReport,
  onBlock,
  onPin,
  onLike,
  currentUser
}) => {
  const { theme } = useSettings();
  const [isReplying, setIsReplying] = useState(false);
  const [responseText, setResponseText] = useState('');

  const isCreator = comment.userId === creatorId; // Se o autor do comentário é o dono do vídeo
  const isOwner = currentUser?.id === creatorId; // Se o usuário logado é o dono do vídeo

  // Verifica se o usuário atual curtiu este comentário localmente
  const isLikedByMe = !!localStorage.getItem(`liked_comment_${comment.id}_${currentUser?.id}`);

  // Estilos
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const textTertiary = theme === 'dark' ? 'text-zinc-500' : 'text-gray-500';
  const bgInput = theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900';

  // Destaque de Elogio
  const praiseStyle = comment.elogio
    ? (theme === 'dark' ? 'border border-pink-500/30 bg-pink-500/5 rounded-lg p-3' : 'border border-pink-300 bg-pink-50 rounded-lg p-3')
    : '';

  const handleSubmit = () => {
    if (!responseText.trim()) return;
    onResponder(comment.id, responseText);
    setResponseText('');
    setIsReplying(false);
  };

  // Ajuste de profundidade para mobile (menor indentação)
  const indentationClass = depth > 0
    ? 'ml-3 md:ml-12 mt-3 border-l-2 border-zinc-800 pl-3 md:pl-4'
    : 'mt-4 border-b border-zinc-800/50 pb-4';

  return (
    <div className={`flex flex-col ${indentationClass}`}>

      {/* Indicador de Fixado */}
      {comment.fixado && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2 ml-11">
          <Pin size={12} className="fill-zinc-400" /> Fixado por {isCreator ? 'criador' : 'moderador'}
        </div>
      )}

      {/* Container Principal do Comentário */}
      <div className={`flex gap-3 text-sm group/comment ${praiseStyle}`}>
        <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-xs md:text-sm ${textPrimary} flex items-center gap-1 ${isCreator ? 'bg-zinc-800 px-2 py-0.5 rounded text-white' : ''}`}>
              {comment.userName}
              {isCreator && (
                <span className="text-[10px] bg-zinc-600 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 ml-1">
                  <Crown size={10} className="text-yellow-500" /> Criador
                </span>
              )}
            </span>
            <span className={`text-[10px] md:text-xs ${textTertiary}`}>{comment.timestamp}</span>

            {comment.isQualityComment && (
              <span className="bg-green-900/30 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-green-900/50">
                Top
              </span>
            )}

            {comment.denunciado && (
              <span className="bg-red-900/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-900/50 flex items-center gap-1">
                <AlertTriangle size={10} /> Denunciado
              </span>
            )}
          </div>

          {/* Texto do Comentário */}
          <p className={`mt-1 text-sm ${textSecondary} whitespace-pre-wrap leading-relaxed break-words`}>
            {comment.text}
            {comment.elogio && <Heart size={12} className="inline ml-2 text-pink-500 fill-pink-500 animate-pulse" />}
          </p>

          {/* Barra de Ações */}
          <div className="flex items-center gap-4 mt-2 text-zinc-400 flex-wrap">
            <button
              onClick={() => onLike && onLike(comment.id)}
              className={`flex items-center gap-1 text-xs transition-colors group ${isLikedByMe ? 'text-blue-500' : 'hover:text-blue-500'}`}
            >
              <ThumbsUp size={14} className={`group-hover:scale-110 transition-transform ${isLikedByMe ? 'fill-blue-500' : ''}`} /> {comment.likes || 0}
            </button>

            <button
              onClick={() => setIsReplying(!isReplying)}
              className={`flex items-center gap-1 text-xs transition-colors group font-medium ${isReplying ? 'text-blue-500' : 'hover:text-blue-500'}`}
            >
              <MessageCircle size={14} className="group-hover:scale-110 transition-transform" /> Responder
            </button>

            {/* Ações de Moderação */}
            {/* Ações de Moderação */}
            <div className="flex items-center gap-2 opacity-0 group-hover/comment:opacity-100 transition-opacity ml-auto">

              {/* Denunciar: Só para comentários de OUTROS */}
              {currentUser?.id !== comment.userId && (
                <button
                  onClick={() => onReport(comment.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-900/20 text-yellow-500 hover:bg-yellow-900/40 text-xs font-medium transition-colors border border-yellow-500/30"
                  title="Denunciar Abuso"
                >
                  <Flag size={16} /> Denunciar
                </button>
              )}

              {/* Fixar: Só dono do canal (nível 0) */}
              {isOwner && onPin && depth === 0 && (
                <button
                  onClick={() => onPin(comment.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors border ${comment.fixado ? 'bg-blue-900/40 text-blue-400 border-blue-500/50' : 'bg-blue-900/20 text-blue-500 hover:bg-blue-900/40 border-blue-500/30'}`}
                  title={comment.fixado ? "Desfixar" : "Fixar no topo"}
                >
                  <Pin size={16} className={comment.fixado ? "fill-blue-400" : ""} /> {comment.fixado ? 'Desfixar' : 'Fixar'}
                </button>
              )}

              {/* Bloquear: Só dono do canal pode bloquear visitantes (e não ele mesmo) */}
              {isOwner && comment.userId !== currentUser?.id && (
                <button
                  onClick={() => onBlock(comment.userId)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-orange-900/20 text-orange-500 hover:bg-orange-900/40 text-xs font-medium transition-colors border border-orange-500/30"
                  title="Bloquear Usuário"
                >
                  <Ban size={16} /> Bloquear
                </button>
              )}

              {/* Excluir: Dono do canal OU Autor do comentário */}
              {(isOwner || comment.userId === currentUser?.id) && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-red-900/20 text-red-500 hover:bg-red-900/40 text-xs font-medium transition-colors border border-red-500/30"
                  title="Excluir Comentário"
                >
                  <Trash2 size={16} /> Excluir
                </button>
              )}
            </div>
          </div>

          {/* Campo de Resposta (Condicional) */}
          {isReplying && (
            <div className="mt-3 animate-fade-in flex flex-col gap-2">
              {currentUser ? (
                <>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className={`w-full text-sm px-3 py-2 rounded border outline-none focus:border-blue-500 transition-colors resize-none ${bgInput}`}
                    placeholder={`Respondendo a ${comment.userName}...`}
                    autoFocus
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsReplying(false)}
                      className="text-xs px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!responseText.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Send size={12} /> Responder
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-red-400 bg-red-900/10 p-2 rounded border border-red-900/30">
                  Faça login para responder.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Renderização Recursiva de Respostas */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              creatorId={creatorId}
              depth={depth + 1}
              onResponder={onResponder}
              onDelete={onDelete}
              onReport={onReport}
              onBlock={onBlock}
              onLike={onLike}
              // onPin não é passado para respostas aninhadas (apenas nível 0)
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
