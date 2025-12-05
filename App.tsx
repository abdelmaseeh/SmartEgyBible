import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BIBLE_BOOKS } from './constants';
import { Verse, ChapterTranslation } from './types';
import { fetchChapterTranslation, resetChat, generateChapterAudio, base64ToBlobUrl } from './services/gemini';
import { getCachedTranslation, saveTranslationToCache, clearCache, getCachedAudio, saveAudioToCache } from './services/storage';
import Controls from './components/Controls';
import VerseCard from './components/VerseCard';
import Chat from './components/Chat';
import AppLogo from './components/AppLogo';
import { Info, ToggleLeft, ToggleRight, AlertTriangle, Trash2, MessageCircle, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [selectedBookId, setSelectedBookId] = useState<string>(BIBLE_BOOKS[0].id);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [showOriginal, setShowOriginal] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCachedData, setIsCachedData] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(3); // Default level 3
  
  // Audio State (Managed HTML5 Audio)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Only trigger if no inputs are focused and not in loading state
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
        if (isLoading) return;

        // RTL Logic: ArrowLeft goes "Forward" (Next), ArrowRight goes "Back" (Prev)
        if (e.key === 'ArrowLeft') {
            const book = BIBLE_BOOKS.find(b => b.id === selectedBookId);
            if (book && selectedChapter < book.chapters) {
                setSelectedChapter(prev => prev + 1);
            }
        } else if (e.key === 'ArrowRight') {
            if (selectedChapter > 1) {
                setSelectedChapter(prev => prev - 1);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBookId, selectedChapter, isLoading]);

  // Reset chapter when book changes if the current chapter exceeds the new book's max
  useEffect(() => {
    const book = BIBLE_BOOKS.find(b => b.id === selectedBookId);
    if (book && selectedChapter > book.chapters) {
      setSelectedChapter(1);
    }
    stopAndResetAudio(); 
  }, [selectedBookId]);

  useEffect(() => {
      stopAndResetAudio();
      // Auto-fetch if not just a book change cleanup
      // Optional: Could trigger fetch here, but we rely on User clicking translate or separate logic.
      // But keeping existing behavior: user must click Translate. 
      // However, if keyboard nav is used, we might want to auto-translate? 
      // For now, let's reset and require click or keep existing UX.
      // Actually, if I navigate, I probably want to see the text.
      // BUT `handleTranslate` depends on state. Let's just clear verses to indicate change.
      setVerses([]);
      setIsCachedData(false);
  }, [selectedChapter]);

  // Cleanup audio on unmount
  useEffect(() => {
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.src = "";
          }
      };
  }, []);

  const stopAndResetAudio = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      setIsAudioLoading(false);
      setCurrentAudioTime(0);
      setAudioDuration(0);
  };

  const initAudio = async () => {
      if (!verses.length) return;
      
      setIsAudioLoading(true);
      try {
          // 1. Check Cache for Audio
          let base64ToPlay = await getCachedAudio(selectedBookId, selectedChapter);
          
          // 2. If not in cache, Generate it
          if (!base64ToPlay) {
              const fullText = verses.map(v => v.translated).join(". ");
              base64ToPlay = await generateChapterAudio(fullText);
              // 3. Save to Cache
              await saveAudioToCache(selectedBookId, selectedChapter, base64ToPlay);
          }

          // 4. Create Blob URL and Load into Audio Element
          const blobUrl = base64ToPlayToBlobUrl(base64ToPlay);
          
          if (!audioRef.current) {
              audioRef.current = new Audio();
          }

          const audio = audioRef.current;
          audio.src = blobUrl;
          audio.load();

          // Event Listeners
          audio.onloadedmetadata = () => {
              setAudioDuration(audio.duration);
              setIsAudioLoading(false);
              audio.play().then(() => setIsPlayingAudio(true)).catch(e => console.error(e));
          };

          audio.ontimeupdate = () => {
              setCurrentAudioTime(audio.currentTime);
          };

          audio.onended = () => {
              setIsPlayingAudio(false);
              setCurrentAudioTime(0);
          };

      } catch (err) {
          console.error(err);
          alert("تعذر تشغيل الصوت. حاول مرة أخرى.");
          setIsPlayingAudio(false);
          setIsAudioLoading(false);
      }
  };

  // Wrapper for the base64 conversion to avoid import loops if any
  const base64ToPlayToBlobUrl = (base64: string) => {
      return base64ToBlobUrl(base64);
  };

  const handleTogglePlay = () => {
      if (!audioRef.current || !audioRef.current.src) {
          initAudio();
      } else {
          if (isPlayingAudio) {
              audioRef.current.pause();
              setIsPlayingAudio(false);
          } else {
              audioRef.current.play();
              setIsPlayingAudio(true);
          }
      }
  };

  const handleSeek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentAudioTime(time);
      }
  };

  const handleTranslate = useCallback(async () => {
    setError(null);
    setVerses([]);
    setIsLoading(true);
    setIsCachedData(false);
    stopAndResetAudio(); // Stop any playing audio
    
    // Reset chat context when changing chapters effectively
    resetChat();

    try {
      // 1. Check Cache
      const cached = getCachedTranslation(selectedBookId, selectedChapter);
      if (cached) {
        setVerses(cached.verses);
        setIsCachedData(true);
        setIsLoading(false);
        return;
      }

      // 2. Fetch from API
      const book = BIBLE_BOOKS.find(b => b.id === selectedBookId);
      if (!book) throw new Error("Invalid book selected");

      const fetchedVerses = await fetchChapterTranslation(book.name, selectedChapter);
      
      const translationData: ChapterTranslation = {
        bookId: selectedBookId,
        chapterNumber: selectedChapter,
        verses: fetchedVerses,
        timestamp: Date.now()
      };

      // 3. Save to Cache
      saveTranslationToCache(translationData);
      setVerses(fetchedVerses);

    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBookId, selectedChapter]);

  const handleClearCache = async () => {
      if(window.confirm("هل أنت متأكد من حذف جميع الترجمات والملفات الصوتية المحفوظة؟")) {
          await clearCache();
          alert("تم حذف الذاكرة المؤقتة بنجاح");
          if (isCachedData) {
              setVerses([]);
              setIsCachedData(false);
          }
      }
  }

  const currentBookName = BIBLE_BOOKS.find(b => b.id === selectedBookId)?.name || '';
  
  // Create rich context including the actual verse text
  const contextString = useMemo(() => {
    const baseInfo = `Current reading: ${currentBookName} Chapter ${selectedChapter}.`;
    
    if (verses.length === 0) return baseInfo;
    
    // We include the Original Arabic text (Van Dyck) as it's the standard for St-Takla search
    const textContext = verses.map(v => `[Verse ${v.number}] ${v.original}`).join('\n');
    return `${baseInfo}\n\nORIGINAL TEXT:\n${textContext}`;
  }, [currentBookName, selectedChapter, verses]);

  return (
    <div className="min-h-screen font-sans relative">
      
      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-screen bg-gradient-to-b from-[#fdfbf7] via-[#fffbeb] to-[#fdfbf7] pointer-events-none z-0 opacity-80" />
      <div className="fixed -top-40 right-[-10%] w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 left-[-10%] w-[600px] h-[600px] bg-teal-50/40 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-amber-100/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <AppLogo className="w-14 h-14" />
             <div>
                <h1 className="text-xl md:text-3xl font-bold text-slate-800 tracking-tight font-amiri">
                  الكتاب المقدس <span className="text-[#0F5156]">بالمصري</span>
                </h1>
                <p className="text-[10px] md:text-xs text-[#0F5156]/70 font-bold mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  ترجمة ذكية بروح مصرية
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`group px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 border 
                ${isChatOpen 
                    ? 'bg-[#0F5156] text-white border-[#0F5156] shadow-lg shadow-[#0F5156]/20' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#0F5156]/30 hover:text-[#0F5156]'
                }`}
                title="المساعد الذكي"
            >
                <MessageCircle size={20} className={isChatOpen ? "fill-white/20" : ""} />
                <span className="hidden md:inline text-sm font-bold">المساعد</span>
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            
            <button 
                onClick={handleClearCache}
                className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                title="مسح الذاكرة المؤقتة"
            >
                <Trash2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex gap-8 relative z-10">
        
        <div className={`flex-1 transition-all duration-500 ease-in-out ${isChatOpen ? 'lg:mr-[460px]' : ''}`}>
             
            {/* Intro / Empty State */}
            {!verses.length && !isLoading && !error && (
                <div className="bg-white/60 backdrop-blur-sm border border-white rounded-3xl p-10 mb-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group mt-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="relative z-10">
                        <div className="w-20 h-20 mx-auto mb-6 transform transition-transform group-hover:scale-110 duration-500">
                           <AppLogo className="w-full h-full" />
                        </div>
                        <h2 className="text-[#0F5156] font-bold text-3xl mb-4 font-amiri">كلمة الله بلسانك</h2>
                        <p className="text-slate-600 max-w-lg mx-auto leading-relaxed text-lg">
                            استمتع بتجربة روحية فريدة لقراءة الكتاب المقدس باللهجة المصرية. 
                            <br />
                            <span className="text-sm text-slate-400 mt-2 block">
                                اختر السفر والأصحاح أو استخدم 
                                <span className="bg-slate-200 px-1.5 py-0.5 rounded mx-1 text-slate-600 font-mono text-xs">←</span>
                                و
                                <span className="bg-slate-200 px-1.5 py-0.5 rounded mx-1 text-slate-600 font-mono text-xs">→</span>
                                للتنقل
                            </span>
                        </p>
                    </div>
                </div>
            )}

            {/* Sticky Controls */}
            <div className={`sticky top-24 z-30 transition-all duration-300 ${verses.length > 0 ? 'mb-8' : 'mb-0'}`}>
                <Controls 
                    selectedBookId={selectedBookId}
                    selectedChapter={selectedChapter}
                    onBookChange={setSelectedBookId}
                    onChapterChange={setSelectedChapter}
                    onTranslate={handleTranslate}
                    
                    isLoading={isLoading}
                    
                    // Audio
                    isAudioLoading={isAudioLoading}
                    hasContent={verses.length > 0}
                    isPlaying={isPlayingAudio}
                    currentAudioTime={currentAudioTime}
                    audioDuration={audioDuration}
                    onTogglePlay={handleTogglePlay}
                    onSeek={handleSeek}

                    // Font
                    fontSizeLevel={fontSizeLevel}
                    onIncreaseFont={() => setFontSizeLevel(p => Math.min(p + 1, 5))}
                    onDecreaseFont={() => setFontSizeLevel(p => Math.max(p - 1, 1))}
                />
            </div>

            {/* Options Toolbar (only if verses exist) */}
            {verses.length > 0 && (
            <div className="flex items-center justify-between mb-6 px-2 animate-fade-in">
                <div className="flex items-center gap-3">
                {isCachedData ? (
                    <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-amber-200/50">
                        <Info size={14} /> محفوظ
                    </span>
                ) : (
                    <span className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-teal-200/50">
                        <Sparkles size={14} /> ترجمة فورية
                    </span>
                )}
                </div>

                <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0F5156] transition-all bg-white/50 hover:bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200/60 hover:border-[#0F5156]/30"
                >
                <span>{showOriginal ? 'إخفاء النص الأصلي' : 'إظهار النص الأصلي'}</span>
                {showOriginal ? <ToggleRight size={22} className="text-[#0F5156]" /> : <ToggleLeft size={22} className="text-slate-400" />}
                </button>
            </div>
            )}

            {/* Error Message */}
            {error && (
            <div className="bg-red-50/80 backdrop-blur border border-red-200 p-6 rounded-2xl mb-8 flex items-start gap-4 shadow-sm animate-fade-in">
                <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-red-900 text-lg">نعتذر، حدث خطأ</h3>
                    <p className="text-red-700 mt-1 text-sm leading-relaxed opacity-90">{error}</p>
                </div>
            </div>
            )}

            {/* Verses List */}
            <div className="space-y-6 pb-20">
            {verses.map((verse, index) => (
                <div key={verse.number} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <VerseCard 
                        verse={verse} 
                        showOriginal={showOriginal}
                        fontSizeLevel={fontSizeLevel}
                    />
                </div>
            ))}
            </div>

        </div>

      </main>
      
      {/* Chat Component */}
      <Chat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        initialContext={contextString}
      />

    </div>
  );
};

export default App;