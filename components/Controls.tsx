import React from 'react';
import { BIBLE_BOOKS } from '../constants';
import { BookOpen, Hash, Search, Volume2, Pause, Play, Loader2, ChevronDown, Plus, Minus, Type } from 'lucide-react';

interface ControlsProps {
  selectedBookId: string;
  selectedChapter: number;
  onBookChange: (bookId: string) => void;
  onChapterChange: (chapter: number) => void;
  onTranslate: () => void;
  
  // Audio Props
  isAudioLoading: boolean;
  hasContent: boolean;
  isPlaying: boolean;
  currentAudioTime: number;
  audioDuration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;

  // Font Props
  fontSizeLevel: number;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  
  isLoading: boolean;
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

  isLoading
}) => {
  
  const currentBook = BIBLE_BOOKS.find(b => b.id === selectedBookId) || BIBLE_BOOKS[0];

  return (
    <div className="flex flex-col gap-4">
        {/* Main Controls Bar */}
        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-amber-100/50 ring-1 ring-[#0F5156]/5">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
            
            {/* Book Selector */}
            <div className="flex-grow-[2] relative group">
            <label className="block text-xs font-bold text-[#0F5156]/70 mb-1.5 flex items-center gap-1.5 px-1">
                <BookOpen size={14} />
                السفر
            </label>
            <div className="relative">
                <select
                    value={selectedBookId}
                    onChange={(e) => onBookChange(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-100 focus:bg-white border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-[#0F5156] text-slate-800 text-base font-bold rounded-xl block p-3.5 pr-4 pl-10 appearance-none transition-all cursor-pointer outline-none shadow-sm font-amiri"
                    disabled={isLoading}
                >
                    {BIBLE_BOOKS.map((book) => (
                    <option key={book.id} value={book.id}>
                        {book.name}
                    </option>
                    ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-[#0F5156] transition-colors" size={18} />
            </div>
            </div>

            {/* Chapter Selector */}
            <div className="flex-grow-[1] relative group">
            <label className="block text-xs font-bold text-[#0F5156]/70 mb-1.5 flex items-center gap-1.5 px-1">
                <Hash size={14} />
                الأصحاح
            </label>
            <div className="relative">
                <select
                    value={selectedChapter}
                    onChange={(e) => onChapterChange(Number(e.target.value))}
                    className="w-full bg-slate-50/50 hover:bg-slate-100 focus:bg-white border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-[#0F5156] text-slate-800 text-base font-bold rounded-xl block p-3.5 pr-4 pl-10 appearance-none transition-all cursor-pointer outline-none shadow-sm"
                    disabled={isLoading}
                >
                    {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                        الأصحاح {num}
                    </option>
                    ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-[#0F5156] transition-colors" size={18} />
            </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-slate-200 h-10 self-center mx-2"></div>

            {/* Action Buttons */}
            <div className="flex gap-2 md:w-auto mt-2 md:mt-0 items-end">
                {/* Font Size Controls */}
                <div className="flex items-center bg-slate-100 rounded-xl p-1 h-[52px]">
                    <button 
                        onClick={onDecreaseFont}
                        disabled={fontSizeLevel <= 1}
                        className="w-10 h-full flex items-center justify-center text-slate-500 hover:text-[#0F5156] hover:bg-white rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        title="تصغير الخط"
                    >
                        <Minus size={16} />
                    </button>
                    <div className="flex flex-col items-center justify-center px-2 w-8">
                        <Type size={18} className="text-slate-700" />
                        <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">{fontSizeLevel}</span>
                    </div>
                    <button 
                        onClick={onIncreaseFont}
                        disabled={fontSizeLevel >= 5}
                        className="w-10 h-full flex items-center justify-center text-slate-500 hover:text-[#0F5156] hover:bg-white rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        title="تكبير الخط"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Translate Button */}
                <button
                    onClick={onTranslate}
                    disabled={isLoading}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 text-white font-bold h-[52px] px-8 rounded-xl shadow-lg shadow-[#0F5156]/20 transition-all duration-200
                    ${isLoading 
                        ? 'bg-[#0F5156]/70 cursor-not-allowed scale-[0.98]' 
                        : 'bg-[#0F5156] hover:bg-[#0b3d41] hover:-translate-y-0.5 hover:shadow-xl active:scale-95 active:shadow-sm'
                    }`}
                >
                    {isLoading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        <span className="hidden lg:inline">ترجمة...</span>
                    </>
                    ) : (
                    <>
                        <Search size={20} strokeWidth={2.5} className="text-amber-300" />
                        <span className="hidden lg:inline">ترجم الآن</span>
                    </>
                    )}
                </button>
            </div>
        </div>
        </div>

        {/* Audio Player (Conditional) */}
        {hasContent && (
            <div className={`bg-[#0F5156] text-white p-4 rounded-2xl shadow-lg transition-all duration-500 overflow-hidden ${isAudioLoading || currentAudioTime > 0 || isPlaying ? 'max-h-24 opacity-100' : 'max-h-24 opacity-100'}`}>
                <div className="flex items-center gap-4">
                    {/* Play/Pause Button */}
                    <button 
                        onClick={onTogglePlay}
                        disabled={isAudioLoading}
                        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0 border border-white/10 disabled:opacity-50"
                    >
                        {isAudioLoading ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={24} className="fill-current" />
                        ) : (
                            <Play size={24} className="fill-current ml-1" />
                        )}
                    </button>

                    {/* Progress Bar & Time */}
                    <div className="flex-grow flex flex-col justify-center gap-1.5">
                        <div className="flex justify-between text-xs font-medium text-teal-100/80 px-1">
                            <span>{formatTime(currentAudioTime)}</span>
                            <span>{audioDuration ? formatTime(audioDuration) : "--:--"}</span>
                        </div>
                        <div className="relative h-2 bg-black/20 rounded-full w-full group cursor-pointer">
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

                    {/* Icon */}
                    <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/10 text-teal-200">
                        <Volume2 size={20} />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Controls;