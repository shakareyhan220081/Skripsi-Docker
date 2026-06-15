'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  Send,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  X,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';

// --- LIBRARY MARKDOWN & HTML PARSER ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// ------------------------------------------------------------
// TYPE DEFINITIONS
// ------------------------------------------------------------
interface Message {
  sender: 'bot' | 'user';
  text: string;
}

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface CategoryStructure {
  _id: string;
  topics: string[];
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function generateTabId(): string {
  try {
    if (
      typeof window !== 'undefined' &&
      window.crypto &&
      'randomUUID' in window.crypto
    ) {
      return window.crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `tab-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// INITIAL DATA
// ------------------------------------------------------------
const initialMessages: Message[] = [
  {
    sender: 'bot',
    text: 'Halo! Saya Asisten Virtual Cerdas Anda. Bagaimana saya dapat membantu Anda hari ini? Jangan ragu untuk bertanya kepada saya tentang layanan, prosedur, atau dokumen basis pengetahuan kami.',
  },
];

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Copy Feedback State
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Suggestions State
  const [showTopicSuggestion, setShowTopicSuggestion] = useState(true);

  // Auth & Captcha
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [userConsent, setUserConsent] = useState<string | null>(null);
  const userConsentRef = useRef<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

  // WebSocket State
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>(
    'CLOSED',
  );

  // Map request_id -> message index in messages array
  const streamMapRef = useRef<Record<string, number>>({});

  // per-tab id & hello flag & heartbeat interval ref
  const tabIdRef = useRef<string>(generateTabId());
  const helloSentRef = useRef<boolean>(false);
  const heartbeatIntervalRef = useRef<number | null>(null);

  // ------------------------------------------------------------
  // THEME LOGIC
  // ------------------------------------------------------------
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('chatbot-theme');
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      const chatbotSection = document.querySelector(
        'section[data-chatbot="true"]',
      );
      if (chatbotSection) {
        chatbotSection.classList.add('dark');
      }
    } else {
      setIsDarkMode(false);
      const chatbotSection = document.querySelector(
        'section[data-chatbot="true"]',
      );
      if (chatbotSection) {
        chatbotSection.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const chatbotSection = document.querySelector(
      'section[data-chatbot="true"]',
    );

    if (isDarkMode) {
      if (chatbotSection) chatbotSection.classList.remove('dark');
      localStorage.setItem('chatbot-theme', 'light');
      setIsDarkMode(false);
    } else {
      if (chatbotSection) chatbotSection.classList.add('dark');
      localStorage.setItem('chatbot-theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // ------------------------------------------------------------
  // LOGGING
  // ------------------------------------------------------------
  const logChatToBackend = useCallback(
    async (sender: 'user' | 'bot', msg: string) => {
      if (userConsentRef.current !== 'true') return;
      try {
        await fetch('http://localhost:5000/api/send-msg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sender, msg, isLogOnly: true }),
        });
      } catch (error) {
        console.warn('Failed logging chat', error);
      }
    },
    [],
  );

  // ------------------------------------------------------------
  // WEBSOCKET
  // ------------------------------------------------------------
  useEffect(() => {
    // MENGGUNAKAN LOCALHOST UNTUK DOCKER LOKAL
    const socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
      setWsStatus('OPEN');

      if (!helloSentRef.current) {
        const hello = {
          type: 'client_hello',
          tab_id: tabIdRef.current,
          user_agent:
            typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        };
        try {
          socket.send(JSON.stringify(hello));
          helloSentRef.current = true;
        } catch {}
      }

      try {
        if (heartbeatIntervalRef.current == null) {
          heartbeatIntervalRef.current = window.setInterval(() => {
            try {
              const hb = {
                type: 'client_heartbeat',
                tab_id: tabIdRef.current,
                user_agent: navigator.userAgent,
              };
              socket.send(JSON.stringify(hb));
            } catch {}
          }, 30_000);
        }
      } catch {}
    };

    socket.onmessage = (event) => {
      try {
        const data = safeJsonParse(event.data);
        if (!data) return;

        if (data.type === 'stream') {
          if (data.event === 'start') {
            setLoading(true);
            return;
          }
          if (data.event === 'progress') return;
        }

        if (data.type === 'reply') {
          const idx = streamMapRef.current[data.request_id];
          if (typeof idx === 'number') {
            setMessages((prev) => {
              const arr = [...prev];
              arr[idx] = { sender: 'bot', text: data.reply || '' };
              return arr;
            });
            delete streamMapRef.current[data.request_id];
          } else {
            setMessages((prev) => [
              ...prev,
              { sender: 'bot', text: data.reply || '' },
            ]);
          }
          setLoading(false);
          logChatToBackend('bot', data.reply || '');
          return;
        }

        if (data.Reply) {
          setMessages((prev) => [...prev, { sender: 'bot', text: data.Reply }]);
          setLoading(false);
          logChatToBackend('bot', data.Reply);
        }

        if (data.type === 'client_hello_ack' && data.tab_id) {
          tabIdRef.current = data.tab_id;
        }
      } catch (e) {
        console.error('WS Parse Error:', e);
      }
    };

    socket.onclose = () => {
      setWsStatus('CLOSED');
      if (heartbeatIntervalRef.current != null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    socket.onerror = () => {
      setWsStatus('CLOSED');
      setLoading(false);
    };

    setWs(socket);

    const handleBeforeUnload = () => {
      try {
        const payload = { type: 'client_goodbye', tab_id: tabIdRef.current };
        socket.send(JSON.stringify(payload));
      } catch {}
      try {
        socket.close();
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      try {
        if (heartbeatIntervalRef.current != null) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        socket.close();
      } catch {}
    };
  }, [logChatToBackend]);

  // ------------------------------------------------------------
  // COPY FUNCTION
  // ------------------------------------------------------------
  const handleCopyMessage = (text: string, index: number) => {
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ------------------------------------------------------------
  // AUTH & CAPTCHA
  // ------------------------------------------------------------
  const createNewChatSession = async (captchaToken: string) => {
    const consentValue = userConsent || 'false';
    try {
      const res = await fetch('http://localhost:5000/api/create-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          captchaToken: captchaToken,
          consent: consentValue,
        }),
      });

      if (res.ok) {
        setIsCaptchaVerified(true);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create chat session');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `⚠️ Verification failed: ${msg}. Please refresh.`,
        },
      ]);
      setIsCaptchaVerified(false);
    }
  };

  useEffect(() => {
    setUserConsent(null);
    setShowConsentModal(true);
  }, []);

  const handleConsent = (hasAgreed: boolean) => {
    setUserConsent(hasAgreed ? 'true' : 'false');
    const val = hasAgreed ? 'true' : 'false';
    setUserConsent(val);
    userConsentRef.current = val;
    setShowConsentModal(false);
    if (!hasAgreed) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Riwayat sesi ini tidak akan disimpan untuk pelatihan AI.',
        },
      ]);
    }
  };

  const handleCaptchaChange = (token: string | null) => {
    if (token) createNewChatSession(token);
    else setIsCaptchaVerified(false);
  };

  // ------------------------------------------------------------
  // TOPICS
  // ------------------------------------------------------------
  const handleRequestTopics = async () => {
    if (!isCaptchaVerified) return;
    setShowTopicSuggestion(false);
    const userMsg = 'Tampilkan list topik';
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/knowledge/structure');
      if (!res.ok) throw new Error('Failed to fetch topic data.');
      const json = await res.json();
      const structure: CategoryStructure[] = json.data;

      let botResponse = 'Berikut adalah daftar topik yang tersedia:\n\n';
      if (structure.length === 0) {
        botResponse = 'Maaf, belum ada topik yang tersedia saat ini.';
      } else {
        structure.forEach((cat) => {
          botResponse += `### 📂 ${cat._id}\n`;
          cat.topics.forEach((topic) => {
            botResponse += `- ${topic}\n`;
          });
          botResponse += `\n`;
        });
        botResponse +=
          '\n*Silakan ketik salah satu topik di atas untuk detail.*';
      }
      setMessages((prev) => [...prev, { sender: 'bot', text: botResponse }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Maaf, gagal memuat daftar topik. Silakan coba lagi.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // SEND LOGIC
  // ------------------------------------------------------------
  const buildHistoryPayload = (additionalUserText?: string) => {
    const MAX = 8;
    let hist = [...messages];
    if (additionalUserText)
      hist = [...hist, { sender: 'user', text: additionalUserText }];
    const last = hist.slice(-MAX);
    return last.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
  };

  const handleSend = async () => {
    if (!input.trim() || showConsentModal || !isCaptchaVerified) return;
    if (wsStatus !== 'OPEN' || !ws) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Koneksi ke server terputus. Silakan refresh halaman.',
        },
      ]);
      return;
    }

    setShowTopicSuggestion(false);
    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const historyPayload = buildHistoryPayload(userMsg);
      const payload = {
        message: userMsg,
        history: historyPayload,
        tab_id: tabIdRef.current,
      };
      ws!.send(JSON.stringify(payload));
      logChatToBackend('user', userMsg);
    } catch {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (loading || messages.length === 0 || wsStatus !== 'OPEN' || !ws) return;
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
    if (!lastUser) return;

    setMessages((prev) => {
      const arr = [...prev];
      if (arr.length > 0 && arr[arr.length - 1].sender === 'bot') arr.pop();
      return arr;
    });

    setLoading(true);
    try {
      const historyPayload = buildHistoryPayload(lastUser.text);
      const payload = {
        message: lastUser.text,
        history: historyPayload,
        tab_id: tabIdRef.current,
      };
      ws!.send(JSON.stringify(payload));
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ------------------------------------------------------------
  // CODE BLOCK COMPONENT
  // ------------------------------------------------------------
  const CodeBlock = ({
    inline,
    className,
    children,
    ...props
  }: CodeBlockProps) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');

    const handleCopyCode = () => {
      navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (!inline) {
      return (
        <div
          className='relative group my-4 rounded-lg overflow-hidden border bg-black/5 dark:bg-black/30 w-full'
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className='flex justify-between items-center px-3 py-2 bg-black/5 dark:bg-white/5 border-b'
            style={{ borderColor: 'var(--border)' }}
          >
            <span className='text-[10px] sm:text-xs font-mono opacity-70'>
              {match ? match[1] : 'text'}
            </span>
            <button
              onClick={handleCopyCode}
              className='p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors'
              title='Copy Code'
            >
              {copied ? (
                <Check className='w-3.5 h-3.5 text-green-500' />
              ) : (
                <Copy className='w-3.5 h-3.5 opacity-70' />
              )}
            </button>
          </div>
          <div
            className='p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm font-mono'
            style={{ color: 'var(--foreground)' }}
          >
            <code
              className={`${className || ''} whitespace-pre-wrap break-words`}
              {...props}
            >
              {children}
            </code>
          </div>
        </div>
      );
    }
    return (
      <code
        className='px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono bg-black/10 dark:bg-white/10 break-words'
        style={{ color: 'var(--foreground)' }}
        {...props}
      >
        {children}
      </code>
    );
  };

  if (!mounted) return null;

  // ------------------------------------------------------------
  // UI RENDER (RESPONSIVE)
  // ------------------------------------------------------------
  return (
    <section
      data-chatbot='true'
      className='fixed inset-0 overflow-hidden bg-gray-50 dark:bg-neutral-950 z-50'
    >
      {/* CONSENT MODAL */}
      {showConsentModal && (
        <div className='absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300'>
          <div className='glass-card p-5 sm:p-6 w-full max-w-[90%] sm:max-w-sm shadow-2xl ring-1 ring-white/20 rounded-2xl md:rounded-3xl'>
            <h3
              className='text-lg sm:text-xl font-bold mb-2 sm:mb-3'
              style={{ color: 'var(--foreground)' }}
            >
              Persetujuan Privasi
            </h3>
            <p
              className='text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed opacity-90'
              style={{ color: 'var(--foreground)' }}
            >
              Untuk meningkatkan kualitas jawaban AI, kami memerlukan izin untuk
              menyimpan riwayat percakapan ini secara anonim.
            </p>
            <div className='flex gap-2 sm:gap-3'>
              <button
                onClick={() => handleConsent(false)}
                className='flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 transition-colors'
              >
                Tolak
              </button>
              <button
                onClick={() => handleConsent(true)}
                className='flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all'
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                Setuju
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CHAT CONTAINER */}
      <div
        className='w-full h-full mx-auto flex flex-col overflow-hidden max-w-6xl xl:max-w-7xl glass-card sm:rounded-2xl shadow-none sm:shadow-2xl relative border-0 sm:border bg-white/90 dark:bg-neutral-900/90'
        style={{
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow:
            mounted && window.innerWidth > 640
              ? '0 20px 50px -12px rgba(0, 0, 0, 0.25)'
              : 'none',
        }}
      >
        {/* HEADER */}
        <header
          className='flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b backdrop-blur-xl z-10 shrink-0'
          style={{
            borderColor: 'var(--border)',
            background:
              'linear-gradient(to right, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
          }}
        >
          <div className='flex items-center gap-3 sm:gap-4'>
            <div className='relative'>
              <div
                className='w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-md flex items-center justify-center overflow-hidden bg-white relative'
                style={{ border: '1px solid var(--border)' }}
              >
                <Image
                  src='/Logo.jpg'
                  alt='Bot Logo'
                  fill
                  sizes='(max-width: 640px) 36px, 44px'
                  className='object-contain p-1'
                />
              </div>
              <div className='absolute -bottom-1 -right-1 flex h-3 w-3 sm:h-3.5 sm:w-3.5'>
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    wsStatus === 'OPEN' ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 border-2 border-white dark:border-gray-900 ${
                    wsStatus === 'OPEN' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                ></span>
              </div>
            </div>
            <div className='flex flex-col justify-center'>
              <h1
                className='text-sm sm:text-lg font-bold tracking-tight line-clamp-1'
                style={{ color: 'var(--foreground)' }}
              >
                Universitas Padjajaran
              </h1>
              <p
                className='text-[10px] sm:text-xs font-medium opacity-70 flex items-center gap-1.5'
                style={{ color: 'var(--foreground)' }}
              >
                <span className='w-1.5 h-1.5 rounded-full bg-current opacity-50'></span>{' '}
                Skripsi - shaka reyhan saputra 140810220081
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className='p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all border border-transparent hover:border-border'
          >
            {isDarkMode ? (
              <Sun
                className='w-4 h-4 sm:w-5 sm:h-5'
                style={{ color: 'var(--foreground)' }}
              />
            ) : (
              <Moon
                className='w-4 h-4 sm:w-5 sm:h-5'
                style={{ color: 'var(--foreground)' }}
              />
            )}
          </button>
        </header>

        {/* CHAT AREA */}
        <div className='flex-1 overflow-y-auto min-h-0 overscroll-contain p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5'>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 sm:gap-4 group ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className='shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md border overflow-hidden relative bg-white'
                style={{ borderColor: 'var(--border)' }}
              >
                <Image
                  src={msg.sender === 'user' ? '/Logo.jpg' : '/Logo.jpg'}
                  alt={msg.sender}
                  fill
                  sizes='(max-width: 640px) 32px, 40px'
                  className='object-contain p-0.5'
                />
              </div>
              <div
                className={`flex flex-col max-w-[92%] sm:max-w-[80%] md:max-w-[72%] ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`px-3 py-2 sm:px-5 sm:py-4 rounded-2xl text-[13px] sm:text-sm leading-relaxed shadow-sm relative break-words w-full ${
                    msg.sender === 'user'
                      ? 'rounded-tr-none text-white backdrop-blur-sm'
                      : 'rounded-tl-none border shadow-md'
                  }`}
                  style={
                    msg.sender === 'user'
                      ? {
                          background:
                            'linear-gradient(135deg, var(--primary), var(--accent))',
                          color: 'var(--primary-foreground)',
                          boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1)',
                        }
                      : {
                          background: 'var(--card-bg)',
                          color: 'var(--foreground)',
                          borderColor: 'var(--border)',
                        }
                  }
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      table: ({ ...props }) => (
                        <div
                          className='overflow-x-auto w-full my-3 border rounded-lg bg-black/5 dark:bg-white/5 scrollbar-thin'
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <table
                            className='min-w-full divide-y text-left text-[11px] sm:text-xs'
                            style={{ borderColor: 'var(--border)' }}
                            {...props}
                          />
                        </div>
                      ),
                      thead: ({ ...props }) => (
                        <thead
                          className='bg-black/5 dark:bg-white/5'
                          {...props}
                        />
                      ),
                      th: ({ ...props }) => (
                        <th
                          className='px-2 py-1.5 sm:px-3 sm:py-2 font-semibold opacity-80 whitespace-nowrap'
                          {...props}
                        />
                      ),
                      tbody: ({ ...props }) => (
                        <tbody
                          className='divide-y'
                          style={{ borderColor: 'var(--border)' }}
                          {...props}
                        />
                      ),
                      td: ({ ...props }) => (
                        <td
                          className='px-2 py-1.5 sm:px-3 sm:py-2 whitespace-normal min-w-[100px] align-top'
                          {...props}
                        />
                      ),
                      a: (props) => (
                        <a
                          {...props}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='underline underline-offset-2 font-semibold opacity-90 hover:opacity-100 break-all'
                        />
                      ),
                      p: (props) => (
                        <p className='mb-2 last:mb-0 break-words' {...props} />
                      ),
                      ul: (props) => (
                        <ul
                          className='list-disc ml-4 mb-2 space-y-1'
                          {...props}
                        />
                      ),
                      ol: (props) => (
                        <ol
                          className='list-decimal ml-4 mb-2 space-y-1'
                          {...props}
                        />
                      ),
                      li: (props) => <li className='pl-1' {...props} />,
                      strong: (props) => (
                        <strong className='font-bold' {...props} />
                      ),
                      h1: (props) => (
                        <h1
                          className='text-base sm:text-lg font-bold mt-2 mb-2'
                          {...props}
                        />
                      ),
                      h2: (props) => (
                        <h2
                          className='text-sm sm:text-base font-bold mt-2 mb-2'
                          {...props}
                        />
                      ),
                      h3: (props) => (
                        <h3
                          className='text-xs sm:text-sm font-bold mt-2 mb-1'
                          {...props}
                        />
                      ),
                      code: CodeBlock as React.ComponentType<CodeBlockProps>,
                      blockquote: (props) => (
                        <blockquote
                          className='border-l-4 pl-3 sm:pl-4 py-1 my-2 italic opacity-80'
                          style={{
                            borderColor: 'currentColor',
                            background: 'rgba(255,255,255,0.1)',
                          }}
                          {...props}
                        />
                      ),
                    }}
                  >
                    {typeof msg.text === 'string'
                      ? msg.text
                      : String(msg.text || '')}
                  </ReactMarkdown>
                </div>

                {msg.sender === 'bot' && (
                  <div className='flex items-center gap-3 mt-1.5 sm:mt-2 ml-1'>
                    <button
                      onClick={() => handleCopyMessage(msg.text, i)}
                      className='flex items-center gap-1 text-[9px] sm:text-[10px] font-medium hover:text-emerald-500 transition-colors'
                      style={{
                        color:
                          copiedIndex === i
                            ? '#10B981'
                            : 'var(--muted-foreground)',
                      }}
                    >
                      {copiedIndex === i ? (
                        <Check className='w-3 h-3' />
                      ) : (
                        <Copy className='w-3 h-3' />
                      )}
                      <span>{copiedIndex === i ? 'Copied' : 'Salin'}</span>
                    </button>
                    {i === messages.length - 1 && !loading && (
                      <button
                        onClick={handleRetry}
                        className='flex items-center gap-1 text-[9px] sm:text-[10px] font-medium hover:text-amber-500 transition-colors'
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        <RefreshCw className='w-3 h-3' />
                        <span>Diperbarui</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className='flex gap-2 sm:gap-4 animate-pulse'>
              <div
                className='w-8 h-8 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center bg-white overflow-hidden relative'
                style={{ borderColor: 'var(--border)' }}
              >
                <Image
                  src='/Logo.jpg'
                  alt='Bot Loading'
                  fill
                  sizes='(max-width: 640px) 32px, 40px'
                  className='object-contain p-0.5'
                />
              </div>
              <div
                className='px-3 py-2 sm:px-5 sm:py-4 rounded-2xl rounded-tl-none border flex items-center gap-1.5 sm:gap-2'
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                }}
              >
                <span
                  className='w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce'
                  style={{ background: 'var(--primary)' }}
                ></span>
                <span
                  className='w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce delay-150'
                  style={{ background: 'var(--primary)', opacity: 0.7 }}
                ></span>
                <span
                  className='w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce delay-300'
                  style={{ background: 'var(--primary)', opacity: 0.4 }}
                ></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* CAPTCHA AREA */}
        {!showConsentModal && !isCaptchaVerified && (
          <div
            className='p-3 sm:p-4 border-t flex justify-center bg-black/5 dark:bg-black/20 shrink-0'
            style={{ borderColor: 'var(--border)' }}
          >
            {recaptchaSiteKey ? (
              <div className='scale-90 sm:scale-100 origin-center'>
                <ReCAPTCHA
                  sitekey={recaptchaSiteKey}
                  onChange={handleCaptchaChange}
                  theme={isDarkMode ? 'dark' : 'light'}
                />
              </div>
            ) : (
              <div className='flex items-center gap-2 text-amber-600 text-[11px] sm:text-sm bg-amber-50/50 px-3 py-2 rounded-lg border border-amber-200 text-center'>
                <AlertTriangle className='w-4 h-4 shrink-0' />
                <span>⚠️ ReCAPTCHA configuration is missing.</span>
              </div>
            )}
          </div>
        )}

        {/* FOOTER INPUT AREA */}
        <div
          className='p-5 sm:p-20 border-t backdrop-blur-md shrink-0 relative'
          style={{
            zIndex: 20,
            borderColor: 'var(--border)',
            background:
              'linear-gradient(to top, var(--card-bg), rgba(255,255,255,0.0))',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 15px)',
          }}
        >
          {showTopicSuggestion && isCaptchaVerified && !loading && (
            <div className='flex items-center justify-between bg-black/5 dark:bg-white/5 px-3 sm:px-4 py-2 rounded-lg mb-3 sm:mb-4 border border-transparent hover:border-border transition-colors'>
              <div
                className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm opacity-80 mr-2 line-clamp-1'
                style={{ color: 'var(--foreground)' }}
              >
                <BookOpen className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0' />
                <span>Belum yakin ingin bertanya apa? Lihat topik.</span>
              </div>
              <div className='flex items-center gap-1.5 sm:gap-2 shrink-0'>
                <button
                  onClick={handleRequestTopics}
                  className='text-[10px] sm:text-xs font-bold px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-md hover:opacity-80 transition-opacity whitespace-nowrap'
                  style={{
                    background: 'var(--secondary)',
                    color: 'var(--secondary-foreground)',
                  }}
                >
                  Daftar Topik
                </button>
                <button
                  onClick={() => setShowTopicSuggestion(false)}
                  className='p-1 hover:bg-black/10 rounded-full transition-colors'
                >
                  <X className='w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50' />
                </button>
              </div>
            </div>
          )}

          <div className='relative flex items-center w-full max-w-4xl mx-auto'>
            <input
              type='text'
              placeholder={
                isCaptchaVerified
                  ? 'Ketik pertanyaan...'
                  : 'Selesaikan verifikasi...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={
                loading ||
                showConsentModal ||
                !isCaptchaVerified ||
                wsStatus !== 'OPEN'
              }
              className='w-full pl-4 pr-12 sm:pl-6 sm:pr-14 py-2.5 sm:py-3 rounded-2xl outline-none text-[13px] sm:text-sm transition-all shadow-inner focus:ring-2'
              style={
                {
                  background: isDarkMode
                    ? 'rgba(0,0,0,0.3)'
                    : 'rgba(255,255,255,0.8)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                } as React.CSSProperties
              }
            />
            <div className='absolute right-1.5 sm:right-2'>
              <button
                onClick={handleSend}
                disabled={
                  !input.trim() ||
                  loading ||
                  !isCaptchaVerified ||
                  wsStatus !== 'OPEN'
                }
                className='h-10 w-10 sm:h-11 sm:w-11 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
                style={{
                  background: input.trim() ? 'var(--primary)' : 'var(--muted)',
                  color: input.trim()
                    ? 'var(--primary-foreground)'
                    : 'var(--muted-foreground)',
                }}
              >
                {loading ? (
                  <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 animate-spin' />
                ) : (
                  <Send className='w-4 h-4 sm:w-5 sm:h-5 ml-0.5' />
                )}
              </button>
            </div>
          </div>

          <p
            className='text-[9px] sm:text-[10px] text-center mt-2 sm:mt-3 opacity-60 font-medium px-2'
            style={{ color: 'var(--foreground)' }}
          >
            AI dapat membuat kesalahan. Harap verifikasi informasi penting
            sebelum digunakan.
          </p>
        </div>
      </div>
    </section>
  );
}
