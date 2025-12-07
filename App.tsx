import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BIBLE_BOOKS } from './constants';
import { Verse, ChapterTranslation } from './types';
import { fetchOriginalVerses, fetchTranslationForVerses, resetChat, generateChapterAudio, base64ToBlobUrl } from './services/gemini';
import { getCachedTranslation, saveTranslationToCache, clearCache, getCachedAudio, saveAudioToCache } from './services/storage';
import Controls from './components/Controls';
import VerseCard from './components/VerseCard';
import Chat from './components/Chat';
import AppLogo from './components/AppLogo';
import { Info, ToggleLeft, ToggleRight, AlertTriangle, Trash2, MessageCircle, Sparkles, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

const App: React.FC = () => {
  const [selectedBookId, setSelectedBookId] = useState<string>(BIBLE_BOOKS[0].id);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  
  // View State
  const [isTranslatedMode, setIsTranslatedMode] = useState<boolean>(false);
  const [showSecondaryText, setShowSecondaryText] = useState<boolean>(true);
  
  // Loading States
  const [isFetchingOriginal, setIsFetchingOriginal] = useState<boolean>(false); // Initial load
  const [isTranslating, setIsTranslating] = useState<boolean>(false); // Magic button load
  
  const [error, setError] = useState<string | null>(null);
  const [isCachedData, setIsCachedData] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(3);
  
  // Audio State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // --- Navigation Helpers ---
  const handleNextChapter = useCallback(() => {
    const book = BIBLE_BOOKS.find(b => b.id === selectedBookId);
    if (book && selectedChapter < book.chapters) {
        setSelectedChapter(prev => prev + 1);
    }
  }, [selectedBookId, selectedChapter]);

  const handlePrevChapter = useCallback(() => {
    if (selectedChapter > 1) {
        setSelectedChapter(prev => prev - 1);
    }
  }, [selectedChapter]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
        if (isFetchingOriginal) return;

        if (e.key === 'ArrowLeft') {
            handleNextChapter();
        } else if (e.key === 'ArrowRight') {
            handlePrevChapter();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextChapter, handlePrevChapter, isFetchingOriginal]);

  // Reset chapter when book changes
  useEffect(() => {
    const book = BIBLE_BOOKS.find(b => b.id === selectedBookId);
    if (book && selectedChapter > book.chapters) {
      setSelectedChapter(1);
    }
  }, [selectedBookId]);

  // --- MAIN DATA FETCHING LOGIC (STAGE 1: ORIGINAL TEXT) ---
  const loadChapterData = useCallback(async () => {
    setError(null);
    setVerses([]);
    setIsFetchingOriginal(true);
    setIsCachedData(false);
    setIsTranslatedMode(false); // Reset to Original Mode
    setIsTranslating(false);
    stopAndResetAudio();
    resetChat();

    try {
      // 1. Check Cache
      const cached = getCachedTranslation(selectedBookId, selectedChapter);
      if (cached && cached.verses.length > 0) {
        setVerses(cached.verses);
        setIsCachedData(true);
        setIsFetchingOriginal(false);
        return;
      }

      // 2. Fetch Original ONLY (API or Fallback)
      const originalVerses = await fetchOriginalVerses(selectedBookId, selectedChapter);
      
      const partialData: ChapterTranslation = {
        bookId: selectedBookId,
        chapterNumber: selectedChapter,
        verses: originalVerses,
        timestamp: Date.now()
      };

      // 3. Save Partial Data to Cache (Original text only)
      saveTranslationToCache(partialData);
      setVerses(originalVerses);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء تحميل الأصحاح.");
    } finally {
      setIsFetchingOriginal(false);
    }
  }, [selectedBookId, selectedChapter]);

  // Trigger load on change
  useEffect(() => {
      loadChapterData();
  }, [loadChapterData]);

  // --- TRANSLATION LOGIC (STAGE 2: ON DEMAND) ---
  const handleActivateTranslation = async () => {
      if (isTranslatedMode) return;

      const hasTranslation = verses.length > 0 && !!verses[0].translated;

      if (hasTranslation) {
          setIsTranslatedMode(true);
          setShowSecondaryText(true);
          return;
      }

      setIsTranslating(true);
      setError(null);

      try {
          const translatedVerses = await fetchTranslationForVerses(verses);
          setVerses(translatedVerses);
          
          const fullData: ChapterTranslation = {
              bookId: selectedBookId,
              chapterNumber: selectedChapter,
              verses: translatedVerses,
              timestamp: Date.now()
          };
          saveTranslationToCache(fullData);

          setIsTranslatedMode(true);
          setShowSecondaryText(true);

      } catch (err: any) {
          console.error(err);
          setError("فشل في الترجمة. حاول مرة أخرى.");
      } finally {
          setIsTranslating(false);
      }
  };

  // --- AUDIO LOGIC ---
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
      const textToRead = isTranslatedMode 
        ? verses.map(v => v.translated).join(". ") 
        : verses.map(v => v.original).join(". ");

      if (!textToRead) return;
      
      setIsAudioLoading(true);
      try {
          let base64ToPlay = await getCachedAudio(selectedBookId, selectedChapter);
          
          if (!base64ToPlay) {
              base64ToPlay = await generateChapterAudio(textToRead);
              if (isTranslatedMode) {
                  await saveAudioToCache(selectedBookId, selectedChapter, base64ToPlay);
              }
          }

          const blobUrl = base64ToBlobUrl(base64ToPlay);
          
          if (!audioRef.current) {
              audioRef.current = new Audio();
          }

          const audio = audioRef.current;
          audio.src = blobUrl;
          audio.load();

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

  const handleClearCache = async () => {
      if(window.confirm("هل أنت متأكد من حذف جميع الترجمات والملفات الصوتية المحفوظة؟")) {
          await clearCache();
          alert("تم حذف الذاكرة المؤقتة بنجاح");
          if (isCachedData) {
              setVerses([]);
              setIsCachedData(false);
              loadChapterData();
          }
      }
  }

  const currentBookName = BIBLE_BOOKS.find(b => b.id === selectedBookId)?.name || '';
  
  const contextString = useMemo(() => {
    const baseInfo = `Current reading: ${currentBookName} Chapter ${selectedChapter}.`;
    if (verses.length === 0) return baseInfo;
    const textContext = verses.map(v => `[Verse ${v.number}] ${v.original}`).join('\n');
    return `${baseInfo}\n\nORIGINAL TEXT:\n${textContext}`;
  }, [currentBookName, selectedChapter, verses]);

  return (
    <div className="min-h-screen font-sans relative">
      <div className="fixed top-0 left-0 w-full h-screen bg-gradient-to-b from-[#fdfbf7] via-[#fffbeb] to-[#fdfbf7] pointer-events-none z-0 opacity-80" />
      
      <header className="bg-white/80 backdrop-blur-xl border-b border-amber-100/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <AppLogo className="w-10 h-10 md:w-12 md:h-12" />
             <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight font-amiri">
                  الكتاب المقدس <span className="text-[#0F5156]">بالمصري</span>
                </h1>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`group px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-all duration-300 flex items-center gap-2 border 
                ${isChatOpen 
                    ? 'bg-[#0F5156] text-white border-[#0F5156] shadow-lg shadow-[#0F5156]/20' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#0F5156]/30 hover:text-[#0F5156]'
                }`}
            >
                <MessageCircle size={18} className={isChatOpen ? "fill-white/20" : ""} />
                <span className="hidden md:inline text-sm font-bold">المساعد</span>
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button onClick={handleClearCache} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
                <Trash2 size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Grid - Added pb-32 for mobile bottom bar clearance */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 relative z-10 pb-32 lg:pb-8">
        <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-500 ${isChatOpen ? 'lg:mr-[460px]' : ''}`}>
             
            {/* Sidebar / Controls Container */}
            <div className="lg:w-72 lg:flex-shrink-0 z-30">
                <Controls 
                    selectedBookId={selectedBookId}
                    selectedChapter={selectedChapter}
                    onBookChange={setSelectedBookId}
                    onChapterChange={setSelectedChapter}
                    onTranslate={handleActivateTranslation}
                    
                    isLoading={isTranslating || isFetchingOriginal}
                    isTranslatedMode={isTranslatedMode}
                    
                    isAudioLoading={isAudioLoading}
                    hasContent={verses.length > 0}
                    isPlaying={isPlayingAudio}
                    currentAudioTime={currentAudioTime}
                    audioDuration={audioDuration}
                    onTogglePlay={handleTogglePlay}
                    onSeek={handleSeek}

                    fontSizeLevel={fontSizeLevel}
                    onIncreaseFont={() => setFontSizeLevel(p => Math.min(p + 1, 5))}
                    onDecreaseFont={() => setFontSizeLevel(p => Math.max(p - 1, 1))}

                    onNextChapter={handleNextChapter}
                    onPrevChapter={handlePrevChapter}
                />
            </div>

            {/* Reading Content Area */}
            <div className="flex-1 min-w-0">
                
                {error && (
                <div className="bg-red-50/80 backdrop-blur border border-red-200 p-6 rounded-2xl mb-8 flex items-start gap-4 shadow-sm animate-fade-in">
                    <AlertTriangle size={24} className="text-red-600" />
                    <div>
                        <h3 className="font-bold text-red-900 text-lg">نعتذر، حدث خطأ</h3>
                        <p className="text-red-700 mt-1 text-sm leading-relaxed opacity-90">{error}</p>
                        <button onClick={loadChapterData} className="mt-2 text-red-800 underline font-bold text-sm">محاولة مرة أخرى</button>
                    </div>
                </div>
                )}

                {verses.length > 0 && isTranslatedMode && (
                    <div className="flex justify-between items-center mb-6 animate-fade-in lg:mt-0 mt-4">
                        <div className="hidden lg:block"></div> {/* Spacer */}
                        <button 
                            onClick={() => setShowSecondaryText(!showSecondaryText)}
                            className="flex items-center gap-2 text-[#0F5156] text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-50 transition-colors ml-auto"
                        >
                            {showSecondaryText ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showSecondaryText ? "إخفاء النص الأصلي" : "إظهار النص الأصلي"}
                        </button>
                    </div>
                )}

                <div className="space-y-6">
                {isFetchingOriginal ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-slate-200 rounded-md"></div>
                                <div className="flex-1 space-y-4">
                                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                    <div className="h-4 bg-slate-200 rounded w-4/6"></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    verses.map((verse, index) => (
                        <div key={verse.number} className="animate-fade-in" style={{ animationDelay: `${Math.min(index * 20, 500)}ms` }}>
                            <VerseCard 
                                verse={verse} 
                                isTranslatedMode={isTranslatedMode}
                                showSecondaryText={showSecondaryText}
                                fontSizeLevel={fontSizeLevel}
                            />
                        </div>
                    ))
                )}
                </div>
            </div>
        </div>
      </main>
      
      <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} initialContext={contextString} />
    </div>
  );
};

export default App;