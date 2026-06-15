// Admin/admin.tsx
'use client';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Trash2,
  User,
  Search,
  Bot,
  Loader2,
  LogOut,
  UserPlus,
  DatabaseZap,
  ChevronsLeft,
  UploadCloud,
  Settings,
  Menu,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';

// --- LIBRARY MARKDOWN & HTML PARSER ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// --- IMPORT SUB-VIEWS ---
import KnowledgeView from './knowledge-view';
import ManageAdminView from './manage-admin-view';
import RagDetailView from './rag-detail-view';
import SettingsView from './settings-view';
import MonitorView from './Monitor-view';

// --- INTERFACES ---
interface ChatSession {
  _id: string;
  status: string;
  createdAt: string;
}

interface Message {
  sender: 'user' | 'bot';
  msg: string;
  createdAt: string;
}

interface BackendMessage {
  sender: 'USER' | 'BOT';
  msg: string;
  createdAt: string;
}

interface SelectedConversation {
  _id: string;
  status: string;
  messages: Message[];
}

interface ChatListResponse {
  data: ChatSession[];
}

interface ChatHistoryResponse {
  data: BackendMessage[];
}

interface DeleteOldChatsResponse {
  message: string;
}

type ActiveView =
  | 'history'
  | 'knowledge'
  | 'manageAdmin'
  | 'ragUpload'
  | 'settings'
  | 'monitor';

interface MonitorEvent {
  ts: number;
  type: string;
  payload: unknown;
}

// ==================================================
// Komponen Konfirmasi Bottom-Right (Toast-like UI)
// ==================================================
function ConfirmToast({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Oke',
  cancelLabel = 'Batal',
  loading = false,
}: {
  visible: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      className='fixed bottom-6 right-6 z-[9999] max-w-[380px] w-[calc(100%-3rem)] md:w-full'
    >
      <div className='bg-neutral-900/95 border border-neutral-800 rounded-lg shadow-lg text-white overflow-hidden'>
        <div className='p-4 flex gap-3'>
          <div className='flex-shrink-0'>
            <div className='w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-5 h-5 text-white'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path
                  d='M20 6L9 17l-5-5'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>
          </div>
          <div className='flex-1'>
            {title && (
              <div className='font-semibold text-sm text-emerald-200'>
                {title}
              </div>
            )}
            <div className='text-sm text-emerald-50 mt-1'>{message}</div>
            <div className='mt-3 flex gap-2 justify-end'>
              <button
                onClick={onCancel}
                disabled={loading}
                className='px-3 py-1.5 rounded-md bg-transparent border border-neutral-700 text-neutral-200 text-sm hover:bg-neutral-800/60 transition'
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className='px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-60'
              >
                {loading ? '...' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KOMPONEN 1: SIDEBAR (RESPONSIVE DRAWER & FLOATING)
// ============================================================================
const AdminSidebar = ({
  activeView,
  onNavClick,
  onLogout,
  isLoggingOut,
  userRole,
  isOpen,
  setIsOpen,
}: {
  activeView: ActiveView;
  onNavClick: (view: ActiveView) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  userRole: string | null;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) => {
  const navItems = [
    {
      view: 'history' as ActiveView,
      icon: MessageSquare,
      label: 'Chat History',
    },
    {
      view: 'knowledge' as ActiveView,
      icon: DatabaseZap,
      label: 'Knowledge Base',
    },
    {
      view: 'ragUpload' as ActiveView,
      icon: UploadCloud,
      label: 'Upload & Auto-RAG',
    },
    { view: 'monitor' as ActiveView, icon: Monitor, label: 'Live Monitor' },
    { view: 'settings' as ActiveView, icon: Settings, label: 'Settings' },
  ];

  if (userRole === 'SUPER_ADMIN') {
    navItems.splice(3, 0, {
      view: 'manageAdmin' as ActiveView,
      icon: UserPlus,
      label: 'Manage Admin',
    });
  }

  return (
    <aside
      className={`glass-card flex flex-col transition-all duration-300 ease-in-out z-40 overflow-hidden
                 fixed inset-y-4 left-4 md:relative md:inset-0 md:my-4 md:ml-4
                 ${
                   isOpen
                     ? 'w-64 translate-x-0 shadow-2xl md:shadow-none'
                     : 'w-64 -translate-x-[120%] md:w-20 md:translate-x-0'
                 }`}
    >
      {/* Header Sidebar */}
      <div className='flex items-center justify-between h-20 px-4 md:px-6 border-b border-white/40 mb-2 shrink-0'>
        {isOpen ? (
          <div className='flex justify-between items-center w-full'>
            <div>
              <h1 className='text-lg md:text-xl font-bold text-[#13484f] bg-gradient-to-r from-primary to-accent bg-clip-text whitespace-nowrap'>
                Admin Panel
              </h1>
              <p className='text-[9px] md:text-[10px] text-gray-500 font-medium tracking-wider uppercase opacity-80'>
                University Dashboard
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className='md:hidden p-1.5 bg-white/50 rounded-md text-gray-600 hover:text-gray-900 ml-2'
            >
              <ChevronsLeft className='w-5 h-5' />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className='hidden md:block p-1 text-gray-400 hover:text-gray-600 ml-auto'
            >
              <ChevronsLeft className='w-5 h-5' />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className='hidden md:flex mx-auto hover:bg-black/5 p-2 rounded-lg transition-colors'
          >
            <Menu className='w-6 h-6 text-gray-600' />
          </button>
        )}
      </div>

      {/* Menu Items */}
      <nav className='flex-1 flex flex-col gap-2 px-3 py-2 overflow-y-auto'>
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => {
              onNavClick(item.view);
              if (window.innerWidth < 768) setIsOpen(false);
            }}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${!isOpen ? 'md:justify-center' : ''} 
                      ${
                        activeView === item.view
                          ? 'bg-gradient-to-r from-primary to-accent text-white md:text-black shadow-md' // Added text-white to fix color based on second code
                          : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                      }`}
          >
            <item.icon
              className={`w-5 h-5 flex-shrink-0 ${
                activeView === item.view
                  ? 'text-white md:text-black' // Adjusted to match the second code color approach
                  : 'text-gray-600'
              }`}
            />
            <span
              className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100 block' : 'md:hidden'}`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer Section */}
      <div className='p-4 border-t border-white/40 bg-white/20 shrink-0'>
        <button
          onClick={onLogout}
          disabled={isLoggingOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium 
                    text-red-600 hover:bg-red-50 hover:text-red-700 hover:shadow-sm
                    transition-all disabled:opacity-50
                    ${!isOpen ? 'md:justify-center' : ''}`}
        >
          {isLoggingOut ? (
            <Loader2 className='w-5 h-5 animate-spin flex-shrink-0' />
          ) : (
            <LogOut className='w-5 h-5 flex-shrink-0' />
          )}
          <span
            className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100 block' : 'md:hidden'}`}
          >
            {isLoggingOut ? 'Keluar...' : 'Keluar'}
          </span>
        </button>
      </div>
    </aside>
  );
};

// ============================================================================
// KOMPONEN 2: CHAT HISTORY VIEW (RESPONSIVE)
// ============================================================================

const ChatHistoryView = () => {
  const [chatList, setChatList] = useState<ChatSession[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<SelectedConversation | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState<string | undefined>(
    undefined,
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  const confirmActionRef = useState<() => Promise<void> | void>(() => () => {
    return;
  })[0] as unknown as { current?: () => Promise<void> | void };

  const fetchChatList = async () => {
    try {
      setListLoading(true);
      const res = await fetch('http://localhost:5000/api/admin/chats/all', {
        credentials: 'include',
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Gagal mengambil daftar chat.');
      const data: ChatListResponse = await res.json();
      setChatList(data.data || []);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Terjadi kesalahan yang tidak diketahui.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchChatList();
  }, []);

  const handleSelectConversation = async (chatId: string) => {
    try {
      setDetailLoading(true);
      setSelectedConversation(null);

      const res = await fetch(
        `http://localhost:5000/api/admin/chats/history?chatId=${chatId}`,
        { credentials: 'include' },
      );
      let transformedMessages: Message[] = [];
      let status = 'UNKNOWN';

      if (res.ok) {
        const data: ChatHistoryResponse = await res.json();
        transformedMessages = (data.data || []).map(
          (msg): Message => ({
            msg: msg.msg,
            createdAt: msg.createdAt,
            sender: msg.sender === 'USER' ? 'user' : 'bot',
          }),
        );
        transformedMessages.reverse();
      }

      const currentChat = chatList.find((chat) => chat._id === chatId);
      status = currentChat?.status || 'UNKNOWN';

      setSelectedConversation({
        _id: chatId,
        status,
        messages: transformedMessages,
      });
    } catch (err) {
      setSelectedConversation({ _id: chatId, status: 'ERROR', messages: [] });
      if (err instanceof Error)
        toast.error(`Gagal memuat detail: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const executeDeleteChat = async (id: string) => {
    try {
      setConfirmLoading(true);
      const res = await fetch(`http://localhost:5000/api/admin/chats/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Gagal menghapus chat.');
      setChatList((prev) => prev.filter((c) => c._id !== id));
      if (selectedConversation?._id === id) setSelectedConversation(null);
      toast.success('Percakapan berhasil dihapus.');
    } catch (err) {
      if (err instanceof Error) toast.error(`Error: ${err.message}`);
      else toast.error('Gagal menghapus chat.');
    } finally {
      setConfirmLoading(false);
      setConfirmVisible(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    setConfirmTitle(undefined);
    setConfirmMessage(
      'Apakah Anda yakin ingin menghapus percakapan ini secara permanen?',
    );
    confirmActionRef.current = () => executeDeleteChat(id);
    setConfirmVisible(true);
  };

  const executeDeleteOldChats = async () => {
    try {
      setConfirmLoading(true);
      const res = await fetch(
        'http://localhost:5000/api/admin/chats/delete-old',
        { method: 'DELETE', credentials: 'include' },
      );
      if (!res.ok) throw new Error('Gagal menghapus chat lama.');
      const result: DeleteOldChatsResponse = await res.json();
      toast.success(result.message);
      fetchChatList();
    } catch (err) {
      if (err instanceof Error) toast.error(`Error: ${err.message}`);
      else toast.error('Gagal membersihkan chat lama.');
    } finally {
      setConfirmLoading(false);
      setConfirmVisible(false);
    }
  };

  const handleDeleteOldChats = async () => {
    setConfirmTitle('Hapus Chat Lama');
    setConfirmMessage('Hapus semua chat lama (NONACTIVE > 7 hari)?');
    confirmActionRef.current = () => executeDeleteOldChats();
    setConfirmVisible(true);
  };

  const filteredConversations = chatList.filter((conv) =>
    conv._id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className='p-3 md:p-4 h-full flex flex-col w-full overflow-hidden'>
      {/* Header View */}
      <header className='mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/40 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-sm shrink-0'>
        <div>
          <h1 className='text-xl md:text-2xl font-bold text-[#13484f] tracking-tight'>
            Chat History
          </h1>
          <p className='text-xs md:text-sm text-gray-600 mt-1'>
            Manajemen dan monitoring aktivitas chatbot.
          </p>
        </div>
        <button
          onClick={handleDeleteOldChats}
          className='w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95'
        >
          <Trash2 className='w-4 h-4 md:w-5 md:h-5' />
          <span className='text-sm md:text-base'>Hapus Chat Lama</span>
        </button>
      </header>

      {/* Chat History Section */}
      <section className='flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6 flex-1 min-h-0 w-full'>
        {/* LIST PANEL (Dinamis: Disembunyikan di Mobile jika chat dipilih) */}
        <div
          className={`lg:col-span-1 glass-card flex flex-col overflow-hidden h-full ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className='p-4 border-b border-white/40 bg-white/20 shrink-0'>
            <h2 className='text-sm font-semibold flex items-center mb-3 gap-2 text-gray-700 uppercase tracking-wider opacity-80'>
              <MessageSquare className='w-4 h-4' /> Daftar Percakapan
            </h2>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Cari ID percakapan...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full bg-white/60 text-gray-800 rounded-xl border border-white/50 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-gray-400'
              />
            </div>
          </div>

          <div className='overflow-y-auto flex-1 p-3 space-y-2'>
            {listLoading ? (
              <div className='flex justify-center items-center h-40 text-gray-400'>
                <Loader2 className='w-8 h-8 animate-spin' />
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv._id)}
                  className={`group relative w-full rounded-xl transition-all border cursor-pointer ${
                    selectedConversation?._id === conv._id
                      ? 'bg-white border-primary/30 shadow-md'
                      : 'border-transparent hover:bg-white/40 bg-white/10'
                  }`}
                >
                  <div className='p-4 pr-10'>
                    <div className='flex justify-between items-start mb-1'>
                      <p className='font-mono text-xs text-gray-600 font-semibold truncate w-24'>
                        {conv._id.substring(0, 8)}...
                      </p>
                      <span
                        className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          conv.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-200 text-gray-600 border border-gray-300'
                        }`}
                      >
                        {conv.status}
                      </span>
                    </div>
                    <p className='text-xs text-gray-500'>
                      {new Date(conv.createdAt).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(conv._id);
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg 
                               text-gray-400 hover:text-red-600 hover:bg-red-50 
                               opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-all md:opacity-100
                               ${selectedConversation?._id === conv._id ? 'opacity-100' : ''}`}
                    title='Hapus Percakapan'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              ))
            ) : (
              <div className='text-center text-gray-500 p-8 text-sm opacity-60'>
                <p>{error || 'Tidak ada percakapan ditemukan.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* DETAIL PANEL */}
        <div
          className={`lg:col-span-2 glass-card flex flex-col overflow-hidden h-full ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}
        >
          {detailLoading ? (
            <div className='flex justify-center items-center h-full text-gray-400'>
              <Loader2 className='w-12 h-12 animate-spin' />
            </div>
          ) : selectedConversation ? (
            <>
              <header className='p-3 md:p-4 border-b border-white/40 bg-white/30 flex justify-between items-center backdrop-blur-sm shrink-0'>
                <div className='flex items-center gap-2 md:gap-0'>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className='lg:hidden p-1.5 mr-1 bg-white/50 hover:bg-white/80 rounded-md text-gray-600 transition-colors shadow-sm border border-white'
                  >
                    <ChevronsLeft className='w-5 h-5' />
                  </button>
                  <div>
                    <h3 className='font-bold text-gray-800 text-sm md:text-base'>
                      Detail Percakapan
                    </h3>
                    <p className='text-[10px] md:text-xs font-mono text-gray-500 mt-0.5 truncate max-w-[150px] sm:max-w-xs'>
                      ID: {selectedConversation._id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteChat(selectedConversation._id)}
                  className='flex items-center gap-1.5 md:gap-2 bg-white/50 border border-red-100 text-red-600 hover:bg-red-50 px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors shrink-0'
                >
                  <Trash2 className='w-3.5 h-3.5 md:w-4 md:h-4' />
                  <span className='hidden sm:inline'>Hapus</span>
                </button>
              </header>

              <div className='flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 md:gap-5 bg-white/20 w-full'>
                {selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 md:gap-3 max-w-[95%] md:max-w-[90%] ${
                        msg.sender === 'user'
                          ? 'self-end flex-row-reverse'
                          : 'self-start'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/50 ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-br from-primary to-accent text-white'
                            : 'bg-white text-primary'
                        }`}
                      >
                        {msg.sender === 'user' ? (
                          <User className='w-4 h-4 md:w-5 md:h-5' />
                        ) : (
                          <Bot className='w-4 h-4 md:w-5 md:h-5' />
                        )}
                      </div>
                      <div
                        className={`px-4 py-3 md:px-5 md:py-3 rounded-2xl text-[13px] md:text-sm leading-relaxed shadow-sm overflow-hidden ${
                          msg.sender === 'user'
                            ? 'bg-[#13484f] text-white rounded-tr-none shadow-md'
                            : 'bg-white/90 backdrop-blur-sm text-gray-800 rounded-tl-none border border-white/60'
                        }`}
                      >
                        <div
                          className={`prose prose-sm max-w-none break-words ${msg.sender === 'user' ? 'prose-invert' : ''}`}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              table: ({ ...props }) => (
                                <div className='overflow-x-auto my-3 border border-gray-200 rounded-lg bg-white/50 w-full'>
                                  <table
                                    className='min-w-full divide-y divide-gray-200 text-left text-xs'
                                    {...props}
                                  />
                                </div>
                              ),
                              thead: ({ ...props }) => (
                                <thead className='bg-gray-100/50' {...props} />
                              ),
                              th: ({ ...props }) => (
                                <th
                                  className='px-3 py-2 font-bold text-gray-700 border-b border-gray-100 whitespace-nowrap'
                                  {...props}
                                />
                              ),
                              tbody: ({ ...props }) => (
                                <tbody
                                  className='divide-y divide-gray-100'
                                  {...props}
                                />
                              ),
                              tr: ({ ...props }) => (
                                <tr
                                  className='hover:bg-white/60 transition-colors'
                                  {...props}
                                />
                              ),
                              td: ({ ...props }) => (
                                <td
                                  className='px-3 py-2 whitespace-normal align-top min-w-[120px]'
                                  {...props}
                                />
                              ),
                              ul: ({ ...props }) => (
                                <ul
                                  className='list-disc pl-4 mb-2 space-y-1'
                                  {...props}
                                />
                              ),
                              ol: ({ ...props }) => (
                                <ol
                                  className='list-decimal pl-4 mb-2 space-y-1'
                                  {...props}
                                />
                              ),
                              h3: ({ ...props }) => (
                                <h3
                                  className='font-bold text-base mt-4 mb-2 opacity-90'
                                  {...props}
                                />
                              ),
                              code: ({
                                inline,
                                className,
                                children,
                                ...props
                              }: React.HTMLAttributes<HTMLElement> & {
                                inline?: boolean;
                              }) => {
                                const match = /language-(\w+)/.exec(
                                  className || '',
                                );
                                return !inline ? (
                                  <div className='bg-gray-800 text-gray-100 rounded-xl p-3 md:p-4 my-3 overflow-x-auto text-xs font-mono shadow-inner border border-gray-700 w-full'>
                                    <div className='mb-2 text-[10px] text-gray-400 uppercase tracking-wider'>
                                      {match ? match[1] : 'text'}
                                    </div>
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </div>
                                ) : (
                                  <code
                                    className='bg-gray-100 text-red-600 px-1.5 py-0.5 rounded-md text-[11px] md:text-xs font-mono border border-gray-200 break-all'
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              pre: ({ ...props }) => (
                                <pre
                                  className='m-0 p-0 bg-transparent overflow-x-auto w-full'
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {msg.msg}
                          </ReactMarkdown>
                        </div>
                        <p
                          className={`text-[10px] mt-2 opacity-70 ${msg.sender === 'user' ? 'text-blue-50' : 'text-gray-400'}`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='flex flex-col items-center justify-center h-full text-gray-400 opacity-60'>
                    <DatabaseZap className='w-10 h-10 md:w-12 md:h-12 mb-2' />
                    <p className='text-xs md:text-sm'>
                      Data percakapan kosong.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className='flex flex-col items-center justify-center h-full text-gray-500'>
              <div className='p-5 md:p-6 bg-white/40 rounded-full mb-4 shadow-sm border border-white/60'>
                <MessageSquare className='w-10 h-10 md:w-12 md:h-12 text-primary/60' />
              </div>
              <h3 className='text-base md:text-lg font-bold text-gray-700'>
                Belum ada percakapan dipilih
              </h3>
              <p className='text-xs md:text-sm mt-1'>
                Pilih salah satu dari daftar.
              </p>
            </div>
          )}
        </div>
      </section>

      <ConfirmToast
        visible={confirmVisible}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel='Oke'
        cancelLabel='Batal'
        loading={confirmLoading}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={async () => {
          try {
            setConfirmLoading(true);
            if (confirmActionRef.current) await confirmActionRef.current();
          } catch {
            // error handled in executor
          } finally {
            setConfirmLoading(false);
            setConfirmVisible(false);
          }
        }}
      />
    </div>
  );
};

// ============================================================================
// KOMPONEN UTAMA: ADMIN DASHBOARD
// ============================================================================
export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('history');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // State untuk Kontrol Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [, setMonitorEvents] = useState<MonitorEvent[]>([]);

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    setUserRole(storedRole);
  }, []);

  // Handler auto-collapse untuk layar kecil
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize(); // Eksekusi saat komponen di-load
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:8080/ws-monitor');
      ws.onopen = () => console.log('🔔 Connected to monitor socket');
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          setMonitorEvents((prev) =>
            [
              { ts: Date.now(), type: data.type || 'event', payload: data },
              ...prev,
            ].slice(0, 10),
          );
        } catch (e) {
          console.warn('Monitor parse error', e);
        }
      };
    } catch (e) {
      console.warn('Monitor ws init failed', e);
    }
    return () => {
      if (ws)
        try {
          ws.close();
        } catch {}
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Proses logout gagal.');
      localStorage.removeItem('role');
      window.location.href = '/login';
    } catch (err) {
      if (err instanceof Error)
        toast.error(`Error saat logout: ${err.message}`);
      else toast.error('Terjadi kesalahan yang tidak diketahui saat logout.');
      setIsLoggingOut(false);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'history':
        return <ChatHistoryView />;
      case 'knowledge':
        return <KnowledgeView onBack={() => setActiveView('history')} />;
      case 'ragUpload':
        return (
          <RagDetailView
            onBack={() => setActiveView('knowledge')}
            onSuccess={() => setActiveView('knowledge')}
          />
        );
      case 'manageAdmin':
        return userRole === 'SUPER_ADMIN' ? (
          <ManageAdminView onBack={() => setActiveView('history')} />
        ) : (
          <ChatHistoryView />
        );
      case 'monitor':
        return <MonitorView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ChatHistoryView />;
    }
  };

  return (
    <div className='flex h-[100dvh] font-sans overflow-hidden bg-[var(--background)] w-full'>
      {/* Overlay Gelap di Mobile saat Sidebar Terbuka */}
      {isSidebarOpen && (
        <div
          className='fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm transition-opacity'
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <AdminSidebar
        activeView={activeView}
        onNavClick={setActiveView}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        userRole={userRole}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <main className='flex-1 flex flex-col h-[100dvh] overflow-hidden relative w-full'>
        {/* Mobile Header (Hamburger Menu Trigger) */}
        <div className='md:hidden flex items-center justify-between p-4 bg-white/40 backdrop-blur-md border-b border-white/50 z-20 shrink-0'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className='p-2 bg-white/60 hover:bg-white/80 rounded-lg shadow-sm border border-white/50 transition-colors'
            >
              <Menu className='w-5 h-5 text-[#13484f]' />
            </button>
            <h1 className='font-bold text-[#13484f] text-lg'>Admin Panel</h1>
          </div>
        </div>

        {/* Dynamic View Wrapper */}
        <div className='flex-1 overflow-hidden relative w-full'>
          {renderView()}
        </div>
      </main>
    </div>
  );
}
