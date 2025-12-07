import React, { useState } from 'react';
import { BIBLE_BOOKS } from '../constants';
import { BookOpen, Hash, Volume2, Pause, Play, Loader2, ChevronDown, Plus, Minus, Type, Sparkles, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ControlsProps {
  selectedBookId: string;
  selectedChapter: number;
  onBookChange: (bookId: string) => void;
  onChapterChange: (chapter: number) => void;
  onTranslate: () => void;
  
  isAudioLoading: boolean;
  hasContent: boolean;
  isPlaying: boolean;
  currentAudioTime: number;
  audioDuration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;

  fontSizeLevel: number;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  
  isLoading: boolean;
  isTranslatedMode: boolean;

  onNextChapter: () => void;
  onPrevChapter: () => void;
}

const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Controls: React.FC<ControlsProps> = ({
  selectedBookId,
  selectedChapter,
  onBookChange,
  onChapterChange,
  onTranslate,
  
  isAudioLoading,
  hasContent,
  isPlaying,
  currentAudioTime,
  audioDuration,
  onTogglePlay,
  onSeek,

  fontSizeLevel,
  onIncreaseFont,
  onDecreaseFont,

  isLoading,
  isTranslatedMode,
  onNextChapter,
  onPrevChapter
}) => {
  
  const currentBook = BIBLE_BOOKS.find(b => b.id === selectedBookId) || BIBLE_BOOKS[0];
  const [showMobileFontSettings, setShowMobileFontSettings] = useState(false);

  // --- DESKTOP SIDEBAR VIEW ---
  const renderDesktopSidebar = () => (
    <div className="hidden lg:flex flex-col gap-6 w-72 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-2 pl-2 custom-scrollbar">
        
        {/* Navigation Card */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-xs font-bold text-[#0F5156] uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen size={14} />
                التنقل
            </h3>
            
            <div className="space-y-4">
                <div className="relative group">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 px-1">السفر</label>
                    <div className="relative">
                        <select
                            value={selectedBookId}
                            onChange={(e) => onBookChange(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-[#0F5156] text-slate-800 text-sm font-bold rounded-xl block p-3 pr-4 pl-8 appearance-none transition-all cursor-pointer outline-none font-amiri"
                            disabled={isLoading}
                        >
                            {BIBLE_BOOKS.map((book) => (
                            <option key={book.id} value={book.id}>
                                {book.name}
                            </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="relative group">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 px-1">الأصحاح</label>
                    <div className="relative">
                        <select
                            value={selectedChapter}
                            onChange={(e) => onChapterChange(Number(e.target.value))}
                            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-[#0F5156] text-slate-800 text-sm font-bold rounded-xl block p-3 pr-4 pl-8 appearance-none transition-all cursor-pointer outline-none"
                            disabled={isLoading}
                        >
                            {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>
                                الأصحاح {num}
                            </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                     <button onClick={onNextChapter} className="flex-1 bg-slate-50 hover:bg-[#0F5156] hover:text-white text-slate-600 p-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-100">
                        <ChevronRight size={14} /> التالي
                     </button>
                     <button onClick={onPrevChapter} className="flex-1 bg-slate-50 hover:bg-[#0F5156] hover:text-white text-slate-600 p-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-100">
                        السابق <ChevronLeft size={14} />
                     </button>
                </div>
            </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col gap-4">
             <button
                onClick={onTranslate}
                disabled={isLoading || isTranslatedMode}
                className={`w-full flex items-center justify-center gap-2.5 text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-300 relative overflow-hidden group
                ${isLoading 
                    ? 'bg-[#0F5156]/70 cursor-not-allowed' 
                    : isTranslatedMode
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-none cursor-default'
                        : 'bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-600 hover:to-emerald-500 hover:shadow-teal-900/20 active:scale-95'
                }`}
            >
                {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                ) : isTranslatedMode ? (
                    <Check size={20} />
                ) : (
                    <Sparkles size={20} className="text-amber-300" strokeWidth={2.5} />
                )}
                <span>
                    {isLoading ? "جاري الترجمة..." : isTranslatedMode ? "تم الترجمة" : "ترجم بالمصري"}
                </span>
            </button>

            <div className="flex items-center bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                <button 
                    onClick={onDecreaseFont}
                    disabled={fontSizeLevel <= 1}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#0F5156] hover:bg-white rounded-lg transition-all disabled:opacity-30"
                >
                    <Minus size={16} />
                </button>
                <div className="flex-1 flex items-center justify-center gap-2">
                    <Type size={16} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{fontSizeLevel}</span>
                </div>
                <button 
                    onClick={onIncreaseFont}
                    disabled={fontSizeLevel >= 5}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#0F5156] hover:bg-white rounded-lg transition-all disabled:opacity-30"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>

        {/* Audio Player Card */}
        {hasContent && (
             <div className="bg-[#0F5156] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                 <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-100 flex items-center gap-1.5">
                            <Volume2 size={14} /> القارئ الصوتي
                        </span>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-teal-50">
                             {formatTime(currentAudioTime)} / {audioDuration ? formatTime(audioDuration) : "--:--"}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onTogglePlay}
                            disabled={isAudioLoading}
                            className="w-12 h-12 rounded-full bg-white text-[#0F5156] hover:bg-teal-50 flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50 shadow-md"
                        >
                            {isAudioLoading ? <Loader2 size={24} className="animate-spin" /> : isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                        </button>
                        
                        <div className="flex-1 relative h-1.5 bg-black/20 rounded-full group cursor-pointer">
                            <div 
                                className="absolute top-0 left-0 h-full bg-amber-400 rounded-full" 
                                style={{ width: `${audioDuration ? (currentAudioTime / audioDuration) * 100 : 0}%` }}
                            />
                            <input 
                                type="range" 
                                min="0" 
                                max={audioDuration || 100} 
                                value={currentAudioTime} 
                                onChange={(e) => onSeek(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isAudioLoading || !audioDuration}
                            />
                        </div>
                    </div>
                 </div>
                 {/* Decorative BG */}
                 <Volume2 className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-[-15deg]" />
             </div>
        )}
    </div>
  );

  // --- MOBILE SOLID VIEW ---
  const renderMobileView = () => (
    <div className="lg:hidden">
        
        {/* Top Sticky Navigation Bar - High Contrast, integrated */}
        <div className="bg-white/95 backdrop-blur-md border-b border-amber-100 sticky top-0 z-30 px-4 py-3 shadow-sm mb-4">
            <div className="flex gap-2">
                 <div className="flex-grow-[2] relative">
                    <select
                        value={selectedBookId}
                        onChange={(e) => onBookChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg block p-2.5 pr-8 appearance-none focus:ring-2 focus:ring-[#0F5156] outline-none font-amiri"
                    >
                        {BIBLE_BOOKS.map((book) => (
                        <option key={book.id} value={book.id}>
                            {book.name}
                        </option>
                        ))}
                    </select>
                    <BookOpen className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                 </div>
                 
                 <div className="flex-grow-[1] relative">
                    <select
                        value={selectedChapter}
                        onChange={(e) => onChapterChange(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg block p-2.5 pr-8 appearance-none focus:ring-2 focus:ring-[#0F5156] outline-none"
                    >
                        {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                            {num}
                        </option>
                        ))}
                    </select>
                    <Hash className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                 </div>
            </div>
        </div>

        {/* Font Settings Overlay - Clean Card */}
        {showMobileFontSettings && (
             <div className="fixed bottom-24 left-4 right-4 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 z-50 animate-fade-in ring-1 ring-slate-900/5">
                 <div className="flex justify-between items-center mb-4">
                     <span className="text-sm font-bold text-slate-700">حجم الخط</span>
                     <button onClick={() => setShowMobileFontSettings(false)} className="text-slate-400 hover:text-red-500 bg-slate-50 rounded-full p-1"><X size={16} /></button>
                 </div>
                 <div className="flex items-center bg-slate-50 rounded-xl p-2 border border-slate-200">
                    <button onClick={onDecreaseFont} disabled={fontSizeLevel <= 1} className="p-3 flex-1 flex justify-center hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30 text-slate-600"><Minus size={18} /></button>
                    <span className="w-12 text-center font-bold text-[#0F5156] text-lg">{fontSizeLevel}</span>
                    <button onClick={onIncreaseFont} disabled={fontSizeLevel >= 5} className="p-3 flex-1 flex justify-center hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30 text-slate-600"><Plus size={18} /></button>
                 </div>
             </div>
        )}

        {/* Solid Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 pb-safe-area">
            <div className="flex items-center justify-between px-4 py-3 gap-2 max-w-lg mx-auto">
                
                {/* Prev Chapter */}
                <button onClick={onPrevChapter} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#0F5156] p-2 rounded-xl transition-colors">
                    <ChevronRight size={24} />
                    <span className="text-[10px] font-bold">السابق</span>
                </button>

                {/* Audio Toggle */}
                <button onClick={onTogglePlay} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${isPlaying ? 'text-amber-500' : 'text-slate-400 hover:text-[#0F5156]'}`}>
                    {isAudioLoading ? <Loader2 size={24} className="animate-spin" /> : isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                    <span className="text-[10px] font-bold">استماع</span>
                </button>

                {/* MAGIC BUTTON (Center Primary) */}
                <div className="relative -top-8">
                    <button
                        onClick={onTranslate}
                        disabled={isLoading || isTranslatedMode}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-teal-900/10 transition-transform duration-300 ring-4 ring-white
                        ${isLoading 
                            ? 'bg-[#0F5156] cursor-wait' 
                            : isTranslatedMode
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gradient-to-tr from-[#0F5156] to-[#0d464a] text-amber-300 hover:scale-105 active:scale-95'
                        }`}
                    >
                        {isLoading ? <Loader2 size={28} className="animate-spin text-white" /> : isTranslatedMode ? <Check size={28} /> : <Sparkles size={28} strokeWidth={2.5} />}
                    </button>
                    {/* Label below floating button */}
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#0F5156] whitespace-nowrap">
                        {isTranslatedMode ? 'تم الترجمة' : 'ترجم'}
                    </span>
                </div>

                {/* Font Settings Toggle */}
                <button onClick={() => setShowMobileFontSettings(!showMobileFontSettings)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${showMobileFontSettings ? 'text-[#0F5156]' : 'text-slate-400 hover:text-[#0F5156]'}`}>
                    <Type size={24} />
                    <span className="text-[10px] font-bold">الخط</span>
                </button>

                {/* Next Chapter */}
                <button onClick={onNextChapter} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#0F5156] p-2 rounded-xl transition-colors">
                    <ChevronLeft size={24} />
                    <span className="text-[10px] font-bold">التالي</span>
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <>
        {renderDesktopSidebar()}
        {renderMobileView()}
    </>
  );
};

export default Controls;