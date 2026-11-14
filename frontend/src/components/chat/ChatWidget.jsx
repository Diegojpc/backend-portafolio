import { useState, useRef, useEffect, Suspense, lazy } from "react";
import { OPEN_CHAT_EVENT } from "../../utils/events";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "../../context/LanguageContext";

const VoiceCall = lazy(() => import("../call/VoiceCall"));

// VITE_BACKEND_URL overrides everything; `npm run dev` talks to the local backend; production builds use Render.
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "https://backend-portafolio-pa3u.onrender.com");

// Last /health answer for voice, so the mic can show on the next visit while the backend is still waking up.
const VOICE_CACHE_KEY = "portfolio_voice";
const HEALTH_TIMEOUT_MS = 60_000;
// Render's free tier can take 40+ s to wake; retry instead of hiding the mic after one failed ping.
const HEALTH_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000, 30_000];

// null = unknown, true/false = last known /health answer
const readVoiceCache = () => {
  try {
    const saved = localStorage.getItem(VOICE_CACHE_KEY);
    return saved === null ? null : saved === "1";
  } catch {
    return null;
  }
};

const writeVoiceCache = (enabled) => {
  try {
    localStorage.setItem(VOICE_CACHE_KEY, enabled ? "1" : "0");
  } catch {
    // storage blocked (private mode): the mic just won't be remembered
  }
};

// AbortController instead of AbortSignal.timeout(): the latter throws on Safari < 16 and would hide the mic forever.
const fetchWithTimeout = async (path) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    return await fetch(`${BACKEND_URL}${path}`, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Asks the backend whether it is up and whether voice is enabled: { voice: boolean | null }.
 * Content blockers (Brave Shields, uBlock, AdGuard… on desktop, Android and iOS) block any URL
 * containing "/health" (net::ERR_BLOCKED_BY_CLIENT), which used to leave the widget "offline" with the
 * mic disabled even though chat and voice endpoints work. If /health fails, "/" (not blocked) proves the
 * server is alive; voice availability is then unknown (null) and the call itself reports if it is off.
 */
const probeBackend = async () => {
  try {
    const res = await fetchWithTimeout("/health");
    if (!res.ok) throw new Error(`/health returned ${res.status}`);
    return { voice: Boolean((await res.json()).realtime_voice) };
  } catch (healthErr) {
    const res = await fetchWithTimeout("/");
    if (!res.ok) throw new Error(`/ returned ${res.status} (after /health failed: ${healthErr})`);
    console.warn(`[ChatWidget] /health unreachable (${healthErr}); likely a content blocker. Backend is up via "/".`);
    return { voice: null };
  }
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  // null until /health answers (or a cached answer exists); false only when the backend says voice is off
  const [voiceEnabled, setVoiceEnabled] = useState(readVoiceCache);
  const [callOpen, setCallOpen] = useState(false);
  // "warming" | "ready" | "error"
  const [serverStatus, setServerStatus] = useState("warming");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { t } = useLanguage();

  // Warm-up ping: fires on page load so the server is ready before the user opens chat.
  // Retries with backoff, and starts over when the tab comes back or the network returns (iOS suspends
  // background tabs and kills their fetches).
  useEffect(() => {
    let cancelled = false;
    let failed = false;
    let retryTimer;

    const warmUp = async (attempt = 0) => {
      try {
        const { voice } = await probeBackend();
        if (cancelled) return;
        failed = false;
        setServerStatus("ready");
        if (voice === null) {
          // /health blocked: keep the last known answer, or offer the call (it reports "voice_disabled" itself).
          setVoiceEnabled((prev) => (prev === false ? false : true));
        } else {
          setVoiceEnabled(voice);
          writeVoiceCache(voice);
        }
      } catch (err) {
        if (cancelled) return;
        const delay = HEALTH_RETRY_DELAYS_MS[attempt];
        console.warn(`[ChatWidget] /health attempt ${attempt + 1} failed (${err}); ${delay === undefined ? "giving up" : `retrying in ${delay} ms`}`);
        if (delay === undefined) {
          failed = true;
          setServerStatus("error");
          return;
        }
        retryTimer = setTimeout(() => warmUp(attempt + 1), delay);
      }
    };

    const restart = () => {
      if (!failed) return;
      failed = false;
      setServerStatus("warming");
      warmUp();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") restart();
    };

    warmUp();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", restart);
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", restart);
    };
  }, []);

  const voiceReady = serverStatus === "ready" && voiceEnabled === true;
  const voiceHint = voiceReady ? t('call.open') : serverStatus === "error" ? t('call.unavailable') : t('call.connecting');

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: "assistant", content: t('chat.welcome') }
      ]);
    }
  }, [messages.length]);

  const toggleChat = () => setIsOpen(!isOpen);

  // The Hero "Talk to my AI" CTA opens the widget through a window event.
  useEffect(() => {
    const openChat = () => {
      console.info("[ChatWidget] Open requested by", OPEN_CHAT_EVENT);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_CHAT_EVENT, openChat);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, openChat);
  }, []);

  // preset: text from a suggestion chip; otherwise the input field is sent.
  const sendMessage = async (e, preset) => {
    e?.preventDefault();
    const userText = (preset ?? input).trim();
    if (!userText || isLoading) return;

    console.info("[ChatWidget] Sending message", { chars: userText.length, fromSuggestion: preset !== undefined });
    setInput("");
    setIsLoading(true);

    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: "user", content: userText }]);

    // Add temporary empty assistant message to be filled by stream
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      let currentConvId = conversationId;

      // 1. Create conversation if it doesn't exist
      if (!currentConvId) {
        const createRes = await fetch(`${BACKEND_URL}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Portfolio Chat" })
        });

        if (!createRes.ok) throw new Error("Failed to create conversation");
        const convData = await createRes.json();
        currentConvId = convData.id;
        setConversationId(currentConvId);
      }

      // 2. Fetch Chat Stream using native fetch Reader (SSE)
      const response = await fetch(`${BACKEND_URL}/conversations/${currentConvId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, use_local_model: false })
      });

      if (!response.ok) throw new Error("Failed to communicate with AI server");

      // 3. Read Stream chunk by chunk
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantFullMessage = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          assistantFullMessage += chunk;

          // Update the last message (the assistant one we added empty earlier)
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = assistantFullMessage;
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = t('chat.fallbackError');
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Optimistic UI for User file interaction
    setMessages((prev) => [...prev, { role: "user", content: `${t('chat.uploading')} ${file.name}...` }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `${t('chat.successParse')} **${file.name}**. ${t('chat.successMsg')}`
      }]);
    } catch (error) {
      console.error("Upload Error:", error);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `${t('chat.errorParse')} ${file.name}. Error: ${error.message}`
      }]);
    } finally {
      setIsUploading(false);
      // Reset DOM element gracefully
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const statusText = serverStatus === "warming" ? t('chat.warming')
    : serverStatus === "error" ? t('chat.offline')
    : t('chat.online');
  const statusDot = serverStatus === "warming" ? "bg-yellow-400 animate-pulse"
    : serverStatus === "error" ? "bg-red-500"
    : "bg-accent";
  // Suggestions only before the visitor has written anything (just the welcome message).
  const showSuggestions = !callOpen && messages.length === 1 && !isLoading;
  const iconBtn = "w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors";

  return (
    <div className="fixed z-[100] flex flex-col items-end bottom-4 right-4 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            data-testid="chat-panel"
            role="dialog"
            aria-label={t('chat.title')}
            className="mb-3 w-[calc(100vw-32px)] sm:w-[400px] overflow-hidden rounded-3xl bg-surface border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] flex flex-col h-[78dvh] sm:h-[560px] max-h-[calc(100dvh-7.5rem)]"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-2 pl-4 pr-2 py-2.5 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0 w-10 h-10 rounded-full bg-surface-2 hidden xs:flex border border-accent/50 items-center justify-center font-display font-bold text-[13px] text-white">
                  AI
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${statusDot}`} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex flex-col">
                  <h3 className="font-display font-semibold text-[16px] leading-tight text-white truncate">{t('chat.title')}</h3>
                  <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted truncate" aria-live="polite">
                    {/* Below xs the avatar is hidden, so the status dot moves next to the text */}
                    <span className={`xs:hidden shrink-0 w-2 h-2 rounded-full ${statusDot}`} aria-hidden="true" />
                    <span className="truncate">{statusText} · {t('chat.subtitle')}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {voiceEnabled !== false && (
                  <button
                    type="button"
                    onClick={() => setCallOpen((v) => !v)}
                    disabled={!voiceReady}
                    className={`${iconBtn} border disabled:cursor-not-allowed disabled:opacity-40 ${!voiceReady && serverStatus === "warming" ? "animate-pulse" : ""} ${callOpen ? "border-accent bg-accent text-ink" : "border-white/10 text-accent hover:border-accent/60"}`}
                    title={voiceHint}
                    aria-label={voiceHint}
                    aria-pressed={callOpen}
                    data-testid="open-call"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 19v3" /></svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleChat}
                  className={`${iconBtn} border border-white/10 text-white hover:bg-white/5`}
                  aria-label={t('chat.close')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
            </div>

            {callOpen ? (
              <Suspense fallback={<div className="flex-1" />}>
                <VoiceCall
                  backendUrl={BACKEND_URL}
                  conversationId={conversationId}
                  onConversationId={setConversationId}
                  onTurn={(userText, reply) => setMessages((prev) => [
                    ...prev,
                    { role: "user", content: userText },
                    ...(reply ? [{ role: "assistant", content: reply }] : []),
                  ])}
                  onClose={() => setCallOpen(false)}
                />
              </Suspense>
            ) : (
            <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3.5" aria-live="polite">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-[14px] leading-[1.55] overflow-hidden ${msg.role === "user"
                        ? "bg-accent text-ink rounded-[16px_4px_16px_16px]"
                        : "bg-surface-2 text-white/90 rounded-[4px_16px_16px_16px]"
                      }`}
                  >
                    {msg.content ? (
                      msg.role === "assistant" ? (
                        <div className="flex flex-col gap-2 [&>p]:m-0 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&_a]:text-accent [&_a]:underline [&_strong]:text-white [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[12px]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )
                    ) : (isLoading && idx === messages.length - 1 ? (
                      <span className="flex items-center gap-1 h-5" aria-label={t('call.thinking')}>
                        <span className="animate-bounce inline-block w-1.5 h-1.5 rounded-full bg-accent/80"></span>
                        <span className="animate-bounce inline-block w-1.5 h-1.5 rounded-full bg-accent/80 [animation-delay:120ms]"></span>
                        <span className="animate-bounce inline-block w-1.5 h-1.5 rounded-full bg-accent/80 [animation-delay:240ms]"></span>
                      </span>
                    ) : null)}
                  </div>
                </motion.div>
              ))}

              {showSuggestions && (
                // Hidden on very short screens (phone landscape): optional, and they would need scrolling.
                <div className="mt-1 flex flex-col gap-2 h-sm:hidden">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim">{t('chat.suggestionsLabel')}</span>
                  <div className="flex flex-wrap gap-2">
                    {['s1', 's2', 's3'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => sendMessage(undefined, t(`chat.suggestions.${k}`))}
                        disabled={serverStatus === "error"}
                        className="min-h-[36px] px-3 py-1.5 rounded-full border border-white/15 text-left text-[13px] text-soft hover:text-white hover:border-accent/60 transition-colors disabled:opacity-40"
                      >
                        {t(`chat.suggestions.${k}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form onSubmit={sendMessage} className="shrink-0 flex items-center gap-1.5 xs:gap-2 p-2.5 xs:p-3 border-t border-white/10">
              <input
                type="file"
                accept=".txt,.md,.pdf"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                className={`${iconBtn} border border-white/10 text-soft hover:text-white hover:bg-white/5 disabled:opacity-40`}
                aria-label={t('chat.attach')}
                title={t('chat.attach')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  aria-label={t('chat.placeholder')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  className="w-full h-11 px-3 xs:px-4 rounded-full bg-ink border border-white/10 text-white placeholder:text-dim text-[16px] sm:text-[14px] outline-none focus:border-accent/70 transition-colors"
                  disabled={isLoading || isUploading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isUploading}
                className={`${iconBtn} bg-accent text-ink hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label={t('chat.send')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </form>
            </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <motion.button
        type="button"
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? t('chat.close') : t('chat.open')}
        aria-expanded={isOpen}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(45,226,230,0.5)] transition-colors ${isOpen ? 'bg-surface-2 text-white border border-white/10' : 'bg-accent text-ink'}`}
      >
        {serverStatus === "warming" && !isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping bg-accent opacity-30 pointer-events-none" />
        )}
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
        )}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
