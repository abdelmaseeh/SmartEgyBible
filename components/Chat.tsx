import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot, Loader2, User, Sparkles } from 'lucide-react';
import { sendMessageToChat, ChatMessage } from '../services/gemini';
import AppLogo from './AppLogo';

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string;
  prefilledMessage?: string;
}

// --- Custom Markdown Renderer ---
const parseInline = (text: string): React.ReactNode[] => {
  // Handle bold **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold opacity-100">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const MarkdownRenderer: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      nodes.push(
        <ul key={`list-${nodes.length}`} className={`mb-4 mr-4 space-y-2 ${isUser ? 'text-white' : 'text-slate-700'}`}>
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Headers
    if (trimmed.startsWith('###')) {
      flushList();
      nodes.push(
        <h3 key={`h3-${idx}`} className={`font-bold text-lg mb-2 mt-4 ${isUser ? 'text-amber-300' : 'text-[#0F5156]'}`}>
          {parseInline(trimmed.replace(/^###\s*/, ''))}
        </h3>
      );
      return;
    }
     if (trimmed.startsWith('##')) {
      flushList();
      nodes.push(
        <h2 key={`h2-${idx}`} className={`font-bold text-xl mb-3 mt-5 ${isUser ? 'text-amber-300' : 'text-[#0F5156]'}`}>
          {parseInline(trimmed.replace(/^##\s*/, ''))}
        </h2>
      );
      return;
    }

    // List item (Bullets or Numbers)
    const isBullet = /^[*-]\s/.test(trimmed);
    const isOrdered = /^\d+\.\s/.test(trimmed);

    if (isBullet || isOrdered) {
      inList = true;
      const cleanContent = trimmed.replace(/^([*-]|\d+\.)\s*/, '');
      listItems.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 leading-relaxed">
           <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUser ? 'bg-amber-300' : 'bg-amber-500'}`} />
           <span>{parseInline(cleanContent)}</span>
        </li>
      );
    } else {
      flushList();
      nodes.push(
        <p key={`p-${idx}`} className={`mb-3 leading-7 last:mb-0 ${isUser ? 'text-white' : 'text-slate-800'}`}>
          {parseInline(trimmed)}
        </p>
      );
    }
  });

  flushList();

  return <div className="markdown-content text-sm">{nodes}</div>;
};
// ------------------------------

const Chat: React.FC<ChatProps> = ({ isOpen, onClose, initialContext, prefilledMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Handle prefilled message
  useEffect(() => {
    if (isOpen && prefilledMessage) {
       setInput(prefilledMessage);
       setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, prefilledMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    // Add user message immediately
    const userMsg: ChatMessage = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToChat(textToSend, initialContext);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full md:w-[460px] bg-[#fcfbf9] shadow-2xl z-50 flex flex-col border-l border-white/50 transition-transform duration-300 font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-amber-100 bg-white/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shadow-lg shadow-[#0F5156]/10 rounded-xl overflow-hidden">
               <AppLogo className="w-full h-full" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">المساعد الذكي</h3>
              <p className="text-[10px] text-[#0F5156] font-bold bg-[#0F5156]/5 px-2 py-0.5 rounded-full inline-block mt-1">
                 St-Takla.org بحث موثق من
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#fdfbf7]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 ring-1 ring-amber-100">
                 <Sparkles size={32} className="text-amber-500" />
              </div>
              <h4 className="text-slate-800 font-bold text-lg mb-2">كيف يمكنني مساعدتك؟</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                اسأل عن تفسير الآيات، معاني الكلمات، أو الخلفية التاريخية.
                <br />
                <span className="font-bold text-[#0F5156] block mt-2 text-xs">جميع الإجابات من مصادر كنسية موثوقة.</span>
              </p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`flex max-w-[90%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-[#0F5156] text-white'}`}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div className={`p-4 rounded-2xl shadow-sm relative ${
                  msg.role === 'user' 
                    ? 'bg-[#0F5156] text-white rounded-tr-none' 
                    : 'bg-white border border-amber-100/50 text-slate-800 rounded-tl-none'
                }`}>
                    <MarkdownRenderer content={msg.text} isUser={msg.role === 'user'} />
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start w-full animate-fade-in">
                <div className="flex max-w-[85%] gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0F5156] text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                        <Bot size={16} />
                    </div>
                    <div className="bg-white border border-amber-100/50 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-[#0F5156] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-[#0F5156] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-[#0F5156] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-400">جاري البحث والكتابة...</span>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-amber-100 sticky bottom-0 z-10">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-end gap-3 relative"
          >
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl px-2 py-2 focus-within:ring-2 focus-within:ring-[#0F5156]/20 focus-within:border-[#0F5156] focus-within:bg-white transition-all shadow-inner">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب سؤالك هنا..."
                  className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none max-h-32 min-h-[44px] px-3 py-2.5 outline-none text-slate-700 placeholder:text-slate-400"
                  rows={Math.min(input.split('\n').length, 4)}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                      }
                  }}
                />
            </div>
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-[#0F5156] text-white p-3.5 rounded-full hover:bg-[#0b3d41] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#0F5156]/30 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 mb-1"
            >
              <Send size={20} className={isLoading ? "opacity-0" : "opacity-100"} />
              {isLoading && <Loader2 size={20} className="absolute top-3.5 left-3.5 animate-spin" />}
            </button>
          </form>
          <div className="mt-3 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                الإجابات تعتمد حصراً على موقع St-Takla.org
              </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;