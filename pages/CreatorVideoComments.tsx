
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoService } from '../services/videoService';
import { Comment, Video } from '../types';
import { MOCK_COMMENTS } from '../services/mockData';
import { ArrowLeft, MessageSquare, ExternalLink } from 'lucide-react';
import CommentItem from '../components/CommentItem';
import { commentService } from '../services/commentService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const PRAISE_KEYWORDS = ["incrível", "ótimo", "perfeito", "excelente", "maravilhoso", "impecável", "gostei", "amei", "parabéns", "brilhante"];

const CreatorVideoComments: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useSettings();

  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (id) {
      const loadVideoAndComments = async () => {
        const v = await videoService.getById(id);
        if (v) {
          setVideo(v);
          const dbComments = await commentService.getCommentsByVideo(id);

          if (dbComments && dbComments.length > 0) {
            const formatted = dbComments.map(c => ({
              id: c.id,
              userId: c.user_id,
              userName: c.user_name,
              userAvatar: c.user_avatar || '/avatar-placeholder.png',
              text: c.content,
              timestamp: new Date(c.created_at).toLocaleDateString('pt-BR'),
              likes: c.likes,
              fixado: c.is_pinned,
              denunciado: false,
              elogio: false,
              isQualityComment: false,
              replies: c.replies?.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                userName: r.user_name,
                userAvatar: r.user_avatar || '/avatar-placeholder.png',
                text: r.content,
                timestamp: new Date(r.created_at).toLocaleDateString('pt-BR'),
                likes: r.likes,
                fixado: false,
                denunciado: false,
                elogio: false,
                isQualityComment: false,
                replies: []
              })) || []
            }));
            setComments(formatted.map(detectPraiseInComment));
          } else {
            setComments(MOCK_COMMENTS.map(detectPraiseInComment));
          }
        } else {
          navigate('/dashboard');
        }
      };
      loadVideoAndComments();
    }
  }, [id, navigate]);

  // Removido o salvamento local, agora é via serviço

  const detectPraiseInComment = (c: Comment): Comment => {
    // Se já foi processado, mantém. Se não, verifica.
    if (c.elogio !== undefined) return c;

    const isPraise = PRAISE_KEYWORDS.some(word => c.text.toLowerCase().includes(word));
    return {
      ...c,
      elogio: isPraise,
      replies: c.replies ? c.replies.map(detectPraiseInComment) : []
    };
  };

  const addReplyRecursively = (currentComments: Comment[], parentId: string, newReply: Comment): Comment[] => {
    return currentComments.map(c => {
      if (c.id === parentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: addReplyRecursively(c.replies, parentId, newReply)
        };
      }
      return c;
    });
  };

  const deleteCommentRecursively = (currentComments: Comment[], commentId: string): Comment[] => {
    return currentComments
      .filter(c => c.id !== commentId)
      .map(c => ({
        ...c,
        replies: c.replies ? deleteCommentRecursively(c.replies, commentId) : []
      }));
  };

  const reportCommentRecursively = (currentComments: Comment[], commentId: string): Comment[] => {
    return currentComments.map(c => {
      if (c.id === commentId) {
        return { ...c, denunciado: true };
      }
      if (c.replies) {
        return { ...c, replies: reportCommentRecursively(c.replies, commentId) };
      }
      return c;
    });
  };

  const likeCommentRecursively = (currentComments: Comment[], commentId: string, userId: string): Comment[] => {
    return currentComments.map(c => {
      if (c.id === commentId) {
        const likeKey = `liked_comment_${commentId}_${userId}`;
        const alreadyLiked = !!localStorage.getItem(likeKey);

        if (alreadyLiked) {
          localStorage.removeItem(likeKey);
          return { ...c, likes: Math.max(0, (c.likes || 0) - 1) };
        } else {
          localStorage.setItem(likeKey, 'true');
          return { ...c, likes: (c.likes || 0) + 1 };
        }
      }
      if (c.replies) {
        return { ...c, replies: likeCommentRecursively(c.replies, commentId, userId) };
      }
      return c;
    });
  };

  const handleResponder = async (parentId: string, texto: string) => {
    if (!user || !id) return;

    const dbReply = await commentService.addComment(
      id,
      user.id,
      user.name,
      user.avatar,
      texto,
      parentId,
      true
    );

    if (dbReply) {
      const newReply: Comment = {
        id: dbReply.id,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        text: texto,
        timestamp: 'Agora',
        likes: 0,
        isQualityComment: false,
        denunciado: false,
        elogio: false,
        fixado: false,
        replies: []
      };

      setComments(prevComments => addReplyRecursively(prevComments, parentId, newReply));
    }
  };

  const handleDelete = async (commentId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este comentário?")) {
      const success = await commentService.deleteCommentAsAdmin(commentId);
      if (success) {
        setComments(prev => deleteCommentRecursively(prev, commentId));
      }
    }
  };

  const handleReport = (commentId: string) => {
    if (window.confirm("Deseja denunciar este comentário por abuso?")) {
      setComments(prev => reportCommentRecursively(prev, commentId));
    }
  };

  const handleBlock = async (userId: string) => {
    if (!video) return;
    if (window.confirm("Bloquear este usuário? Seus comentários não serão mais exibidos neste vídeo.")) {
      // Atualiza lista de bloqueados do vídeo
      const updatedBlocked = [...(video.blockedUserIds || []), userId];
      const updatedVideo = { ...video, blockedUserIds: updatedBlocked };
      setVideo(updatedVideo);
      // Salva no serviço de vídeo para persistir o bloqueio
      await videoService.save(updatedVideo);

      alert("Usuário bloqueado.");
    }
  };

  const handlePin = async (commentId: string) => {
    const target = comments.find(c => c.id === commentId);
    const isAlreadyPinned = !!target?.fixado;

    const success = await commentService.pinComment(commentId, !isAlreadyPinned);

    if (success) {
      setComments(prev => {
        const updated = prev.map(c => ({
          ...c,
          fixado: isAlreadyPinned ? (c.id === commentId ? false : c.fixado) : (c.id === commentId)
        }));

        return updated.sort((a, b) => {
          if (a.fixado) return -1;
          if (b.fixado) return 1;
          return 0;
        });
      });
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      alert("Faça login para curtir.");
      return;
    }
    const success = await commentService.likeComment(commentId);
    if (success) {
      // Local update for UI responsiveness
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, likes: (c.likes || 0) + 1 };
        return c;
      }));
    }
  };

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';

  if (!video) return <div className="p-10 text-center">Carregando...</div>;

  // Filter blocked users from displaying
  const isBlocked = (userId: string) => video.blockedUserIds?.includes(userId);

  const filterBlockedComments = (list: Comment[]): Comment[] => {
    return list
      .filter(c => !isBlocked(c.userId))
      .map(c => ({
        ...c,
        replies: c.replies ? filterBlockedComments(c.replies) : []
      }));
  };

  const visibleComments = filterBlockedComments(comments);

  // Ordenação final para garantir que o fixado esteja no topo também na renderização
  const sortedComments = [...visibleComments].sort((a, b) => {
    if (a.fixado) return -1;
    if (b.fixado) return 1;
    return 0;
  });

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center gap-2 mb-6 text-sm font-medium transition-colors ${textSecondary} hover:${textPrimary}`}
        >
          <ArrowLeft size={20} /> Voltar ao Painel
        </button>

        <div className={`p-6 rounded-xl border mb-6 ${cardBg}`}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h1 className={`text-xl font-bold flex items-center gap-2 ${textPrimary}`}>
                <MessageSquare className="text-blue-500" /> Gerenciar Comentários
              </h1>
              <h2 className={`mt-1 font-medium ${textSecondary}`}>Vídeo: {video.title}</h2>
            </div>
            <a
              href={`#/watch/${video.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Ver Vídeo Público <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <h3 className={`font-bold mb-4 ${textPrimary}`}>Todos os Comentários ({visibleComments.length})</h3>

          <div className="space-y-6">
            {sortedComments.length > 0 ? sortedComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                creatorId={video.creator.id}
                depth={0}
                onResponder={handleResponder}
                onDelete={handleDelete}
                onReport={handleReport}
                onBlock={handleBlock}
                onPin={handlePin}
                onLike={handleLike}
                currentUser={user}
              />
            )) : (
              <div className={`text-center py-10 ${textSecondary}`}>
                Nenhum comentário neste vídeo ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorVideoComments;
