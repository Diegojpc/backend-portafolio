import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "../../context/LanguageContext";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { t } = useLanguage();

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

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
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
        const createRes = await fetch("https://backend-portafolio-pa3u.onrender.com/conversations", {
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
      const response = await fetch(`https://backend-portafolio-pa3u.onrender.com/conversations/${currentConvId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, use_local_model: isLocalMode })
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
    setMessages((prev) => [...prev, { role: "user", content: `📎 ${t('chat.uploading')} ${file.name}...` }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://backend-portafolio-pa3u.onrender.com/documents/upload", {
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

  return (
    <div className="fixed z-[100] flex flex-col items-end bottom-4 right-4 sm:bottom-6 sm:right-6">
      {/* Expanded Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="mb-4 w-[calc(100vw-32px)] sm:w-96 overflow-hidden rounded-2xl bg-black/85 sm:bg-black/60 shadow-[0_0_25px_rgba(145,94,255,0.3)] backdrop-blur-xl sm:backdrop-blur-md border border-[rgba(255,255,255,0.1)] flex flex-col h-[78dvh] sm:h-[500px] max-h-[85vh] sm:max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-[#151030] border-b border-[rgba(255,255,255,0.1)] p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] transition-colors ${isLocalMode ? 'text-amber-500 bg-amber-500' : 'text-[#915EFF] bg-[#915EFF]'}`}></div>
                <h3 className="font-bold text-[17px]">
                  {t('chat.title')}
                </h3>
              </div>

              <div className="flex items-center gap-4">
                {/* Mode Toggle Switch */}
                  <label className="flex items-center cursor-pointer gap-2" title="Toggle between Local CPU (Private, Slower) and Gemini Cloud (Fast, Live Web Scraping)">
                    <span className={`text-xs ${!isLocalMode ? "text-[#915EFF] font-bold" : "text-gray-400"}`}>{t('chat.cloud')}</span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isLocalMode} 
                        onChange={() => {
                          if (!isLocalMode) {
                            alert("Local Inference is strictly disabled in this Free-Tier Production Environment to comply with Memory metrics. System will rely securely on Cloud algorithms.");
                            return;
                          }
                          setIsLocalMode(false);
                        }} 
                      />
                      <div className="w-8 h-4 bg-gray-700 rounded-full shadow-inner"></div>
                      <div className={`absolute w-4 h-4 bg-white rounded-full shadow inset-y-0 left-0 transition-transform ${isLocalMode ? 'transform translate-x-100 bg-amber-500 translate-x-4' : 'bg-white'}`}></div>
                    </div>
                    <span className={`text-xs ${isLocalMode ? "text-amber-500 font-bold" : "text-gray-400"}`}>{t('chat.local')}</span>
                  </label>

                <button
                  onClick={toggleChat}
                  className="text-white/60 hover:text-white transition-colors ml-2"
                  title="Close chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#915EFF] scrollbar-track-transparent">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-[14px] leading-relaxed overflow-hidden ${msg.role === "user"
                        ? "bg-[#915EFF] text-white rounded-tr-sm"
                        : "bg-[rgba(255,255,255,0.05)] text-[#aaa6c3] border border-[rgba(255,255,255,0.05)] rounded-tl-sm shadow-sm"
                      }`}
                  >
                    {msg.content ? (
                      msg.role === "assistant" ? (
                        <div className="flex flex-col gap-2 [&>p]:m-0 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&_a]:text-[#915EFF] [&_a]:underline [&_strong]:text-white [&_code]:bg-[rgba(255,255,255,0.1)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )
                    ) : (isLoading && idx === messages.length - 1 ? (
                      <span className="flex items-center gap-1 h-5">
                        <span className="animate-bounce inline-block w-1.5 h-1.5 rounded-full bg-white/60"></span>
                        <span className="animate-bounce inline-block w-1.5 h-1.5 rounded-full bg-white/60 delay-75"></span>
                        <span className="animate-bounce inline-block w-1.5 h-1.5 rounded-full bg-white/60 delay-150"></span>
                      </span>
                    ) : null)}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-[rgba(0,0,0,0.3)] border-t border-[rgba(255,255,255,0.05)]">
              <div className="relative flex items-center gap-2">

                {/* Hidden File Input */}
                <input
                  type="file"
                  accept=".txt,.md,.pdf"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isLoading}
                  className="p-2 text-[#aaa6c3] hover:text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors disabled:opacity-50"
                  title="Upload Document (.pdf, .txt, .md)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                </button>

                {/* Text Field */}
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('chat.placeholder')}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-full text-[#aaa6c3] px-4 py-3 pr-12 focus:outline-none focus:border-[#915EFF] transition-colors text-[14px]"
                    disabled={isLoading || isUploading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || isUploading}
                    className="absolute right-2 p-2 bg-[#915EFF] hover:bg-[#804dee] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button / Bubble */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(145,94,255,0.4)] transition-colors ${isOpen ? 'bg-[#151030] text-white' : 'bg-[#915EFF] text-white'}`}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
        )}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
