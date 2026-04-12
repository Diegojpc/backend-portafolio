import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

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
        { role: "assistant", content: "Hi! I am Diego's AI Assistant. How can I help you today?" }
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
        const createRes = await fetch("http://localhost:8000/conversations", {
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
      const response = await fetch(`http://localhost:8000/conversations/${currentConvId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText })
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
        newMessages[newMessages.length - 1].content = "Sorry, I am having trouble connecting to my server. Please try again later.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Expanded Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="mb-4 w-80 sm:w-96 overflow-hidden rounded-2xl bg-black/60 shadow-[0_0_20px_rgba(145,94,255,0.2)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] flex flex-col h-[500px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-[#151030] border-b border-[rgba(255,255,255,0.1)] p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#915EFF] shadow-[0_0_10px_#915EFF]"></div>
                <h3 className="font-bold text-[17px]">Virtual Assistant</h3>
              </div>
              <button 
                onClick={toggleChat}
                className="text-white/60 hover:text-white transition-colors"
                title="Close chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
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
                    className={`max-w-[85%] rounded-2xl p-3 text-[14px] leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-[#915EFF] text-white rounded-tr-sm" 
                        : "bg-[rgba(255,255,255,0.05)] text-[#aaa6c3] border border-[rgba(255,255,255,0.05)] rounded-tl-sm"
                    }`}
                  >
                    {msg.content || (isLoading && idx === messages.length - 1 ? (
                       <span className="flex items-center gap-1">
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
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-full text-[#aaa6c3] px-4 py-3 pr-12 focus:outline-none focus:border-[#915EFF] transition-colors text-[14px]"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-[#915EFF] hover:bg-[#804dee] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
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
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        )}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
