import React from 'react';
import { BIBLE_BOOKS } from '../constants';
import { BookOpen, Volume2, Pause, Play, Loader2, ChevronDown, Plus, Minus, Type, Sparkles, Check, ChevronLeft, ChevronRight, Key, X } from 'lucide-react';

interface ControlsProps {
  isOpen: boolean;
  onClose: () => void;
  
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
  onChangeApiKey: () => void;
}

const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Controls: React.FC<ControlsProps> = ({
  isOpen,
  onClose,

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
  onPrevChapter,
  onChangeApiKey,
}) => {
  
  const currentBook = BIBLE_BOOKS.find(b => b.id === selectedBookId) || BIBLE_BOOKS[0];

  return (
    <>
        {/* Mobile Backdrop */}
        <div 
            className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Unified Sidebar Container */}
        <div 
            className={`
                fixed lg:sticky top-0 lg:top-24 right-0 z-50 
                h-full lg:h-[calc(100vh-8rem)] 
                w-[280px] sm:w-[320px] 
                bg-[#fdfbf7] lg:bg-transparent 
                shadow-2xl lg:shadow-none 
                border-l border-amber-100 lg:border-none
                transition-all duration-300 ease-in-out transform
                overflow-y-auto custom-scrollbar p-4 lg:p-0 lg:pr-2 lg:pl-2
                ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:p-0 lg:overflow-hidden'}
            `}
        >
            <div className="flex flex-col gap-6 min-w-[280px] lg:min-w-0 pb-20 lg:pb-0">
                
                {/* Mobile Header (Close Button) */}
                <div className="flex items-center justify-between lg:hidden mb-2">
                    <span className="font-amiri font-bold text-lg text-[#0F5156]">لوحة التحكم</span>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 bg-white rounded-full shadow-sm">
                        <X size={20} />
                    </button>
                </div>

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
                        onClick={() => { onTranslate(); if(window.innerWidth < 1024) onClose(); }}
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

                    <button 
                        onClick={onChangeApiKey}
                        className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-[#0F5156] hover:bg-slate-50 py-2 rounded-xl transition-all text-xs font-bold border border-transparent hover:border-slate-100"
                    >
                        <Key size={14} />
                        تغيير مفتاح API
                    </button>
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
        </div>
    </>
  );
};

export default Controls;