
import React, { useState, useEffect } from 'react';
import { Search, Bell, Video, Menu, Mic, User as UserIcon, LogOut, Megaphone, Shield, Moon, Sun, Globe, CreditCard } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, Language } from '../contexts/SettingsContext';
import { messageService } from '../services/messageService';
import { Message } from '../types';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, language, setLanguage, t } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const loadNotifications = async () => {
    if (user) {
      try {
        const msgs = await messageService.getMessages(user.id);
        // Filtrar apenas tipos relevantes para notificação (opcional, aqui mostra tudo)
        const sorted = [...msgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(sorted);
        setUnreadCount(msgs.filter(m => !m.read).length);
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
      }
    }
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('messages-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('messages-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user]);

  const handleNotificationClick = async (msg: Message) => {
    // Se for warnings ou info, marca lido.
    if (!msg.read) {
      await messageService.markAsRead(msg.id);
      await loadNotifications();
    }
    setIsNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await messageService.markAsRead(n.id);
    }
    await loadNotifications();
  };

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchTerm.trim()) navigate(`/?q=${encodeURIComponent(searchTerm)}`);
      else navigate('/');
    }
  };

  const executeSearch = () => {
    if (searchTerm.trim()) navigate(`/?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate('/');
  };

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  ];

  return (
    <>
      {isMenuOpen && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)} />}
      <header className={`h-16 fixed top-0 w-full z-50 flex items-center justify-between px-4 border-b transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f0f0f]/95 backdrop-blur-md border-zinc-800' : 'bg-white/95 backdrop-blur-md border-gray-200 shadow-sm'
        }`}>
        <div className="flex items-center gap-4">
          <button className={`p-2 rounded-full md:hidden transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
            <Menu size={24} />
          </button>
          <div onClick={() => { setSearchTerm(''); navigate('/'); }} className="flex items-center gap-1 cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className={`text-xl font-bold tracking-tight hidden sm:block ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>FairStream</span>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-4 hidden sm:flex items-center gap-2">
          <div className={`flex flex-1 items-center border rounded-full overflow-hidden focus-within:border-blue-500 transition-colors ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-gray-100 border-gray-300'
            }`}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              placeholder={t('header_search_placeholder')}
              className={`flex-1 bg-transparent px-4 py-2 outline-none ${theme === 'dark' ? 'text-white placeholder-zinc-500' : 'text-gray-900 placeholder-gray-500'}`}
            />
            <button onClick={executeSearch} className={`px-4 py-2 border-l transition-colors ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-gray-200 hover:bg-gray-300 border-gray-300'
              }`}>
              <Search size={20} className={theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'} />
            </button>
          </div>
          <button className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            <Mic size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative group hidden md:block">
            <button className={`flex items-center gap-1 p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-100 text-gray-600'}`}>
              <Globe size={20} />
              <span className="text-xs uppercase font-bold">{language}</span>
            </button>
            <div className={`absolute right-0 top-10 w-40 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50 border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
              }`}>
              {languages.map(lang => (
                <button key={lang.code} onClick={() => setLanguage(lang.code)} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-gray-100 text-gray-700'
                  } ${language === lang.code ? (theme === 'dark' ? 'bg-zinc-800 font-bold' : 'bg-gray-100 font-bold') : ''}`}>
                  <span>{lang.flag}</span> {lang.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-100 text-gray-600'}`}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <>
              {/* Botão criar restrito apenas ao criador */}
              {user.role === 'creator' && (
                <button onClick={() => navigate('/upload')} className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                  <Video size={20} className="text-red-500" />
                  <span className={`text-sm font-medium hidden md:block ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('header_create')}</span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsMenuOpen(false); }}
                  className={`p-2 rounded-full relative transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsNotificationsOpen(false)}></div>
                    <div className={`absolute right-0 top-12 w-80 border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
                      }`}>
                      <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-gray-100 bg-gray-50'}`}>
                        <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Notificações</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-blue-500 hover:text-blue-400 font-medium">
                            Marcar lidas
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((msg) => (
                            <div
                              key={msg.id}
                              onClick={() => handleNotificationClick(msg)}
                              className={`p-4 border-b cursor-pointer transition-colors ${theme === 'dark'
                                ? `border-zinc-800 hover:bg-zinc-800 ${!msg.read ? 'bg-zinc-900/50' : ''}`
                                : `border-gray-100 hover:bg-gray-50 ${!msg.read ? 'bg-blue-50' : ''}`
                                }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold text-xs ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                                  {msg.fromName || 'Sistema'}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {new Date(msg.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className={`text-sm mb-1 ${!msg.read ? 'font-semibold' : ''} ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                                {msg.subject || msg.body.substring(0, 30)}
                              </p>
                              <p className={`text-xs line-clamp-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                                {msg.body}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <Bell size={24} className="mx-auto mb-2 text-zinc-500 opacity-50" />
                            <p className="text-sm text-zinc-500">Nenhuma notificação.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <img src={user.avatar} alt="Avatar" className={`w-8 h-8 rounded-full cursor-pointer border object-cover transition-colors ${theme === 'dark' ? 'border-zinc-700 hover:border-zinc-500' : 'border-gray-300 hover:border-gray-500'
                  }`} onClick={() => setIsMenuOpen(!isMenuOpen)} />

                {isMenuOpen && (
                  <div className={`absolute right-0 top-12 w-64 border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
                    }`}>
                    <div className={`p-4 border-b ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>{user.email || user.phone}</p>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}>
                        {user.role === 'owner' ? 'Dono' : user.role}
                      </span>
                    </div>
                    <div className="py-1">
                      {user.role === 'viewer' && user.email !== 'admin@fairstream.com' && (
                        <button onClick={() => handleNavigate('/viewer-panel')} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                          <CreditCard size={16} className="text-purple-500" /> Área de Membro
                        </button>
                      )}
                      {user.role === 'creator' && (
                        <button onClick={() => handleNavigate('/dashboard')} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                          <Video size={16} className={theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'} /> {t('nav_creator_panel')}
                        </button>
                      )}
                      {user.role === 'advertiser' && (
                        <button onClick={() => handleNavigate('/ads')} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                          <Megaphone size={16} className={theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'} /> {t('nav_advertiser')}
                        </button>
                      )}
                      {user.role === 'owner' && (
                        <button onClick={() => handleNavigate('/admin')} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 font-bold border-t ${theme === 'dark' ? 'hover:bg-zinc-800 text-red-400 border-zinc-800' : 'hover:bg-gray-100 text-red-600 border-gray-100'
                          }`}>
                          <Shield size={16} /> {t('nav_owner_panel')}
                        </button>
                      )}
                    </div>
                    <div className={`border-t py-1 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                      <button onClick={handleLogout} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 font-medium ${theme === 'dark' ? 'hover:bg-zinc-800 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}>
                        <LogOut size={16} /> {t('header_logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => navigate('/auth')} className={`flex items-center gap-2 px-4 py-2 border rounded-full font-medium transition-colors ${theme === 'dark' ? 'border-zinc-700 text-blue-400 hover:bg-blue-900/20' : 'border-gray-300 text-blue-600 hover:bg-blue-50'
              }`}>
              <UserIcon size={18} /> <span className="text-sm">{t('header_login')}</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
