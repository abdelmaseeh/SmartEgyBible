import React from 'react';
import { Verse } from '../types';

interface VerseCardProps {
  verse: Verse;
  isTranslatedMode: boolean; 
  showSecondaryText: boolean; 
  fontSizeLevel: number; 
}

const VerseCard: React.FC<VerseCardProps> = ({ verse, isTranslatedMode, showSecondaryText, fontSizeLevel }) => {
  
  const primaryBase = 1.2;
  const secondaryBase = 1.0;
  
  const primarySize = primaryBase + (fontSizeLevel * 0.2);
  const secondarySize = secondaryBase + (fontSizeLevel * 0.15);

  // Fallback to original if translation is missing (even in translated mode)
  const effectiveTranslated = verse.translated || verse.original;
  const primaryText = isTranslatedMode ? effectiveTranslated : verse.original;
  const secondaryText = isTranslatedMode ? verse.original : null;
  
  const primaryFont = isTranslatedMode ? "font-['Cairo'] font-semibold" : "font-amiri font-bold";
  const primaryColor = isTranslatedMode ? "text-[#0F5156]" : "text-slate-900";
  const primaryLeading = isTranslatedMode ? "leading-[1.8]" : "leading-[2.4]";

  return (
    <div className={`group bg-white rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-transparent hover:border-amber-100 relative ring-1 hover:ring-amber-100/50 overflow-hidden
      ${isTranslatedMode ? 'ring-teal-100/50' : 'ring-slate-100'}
    `}>
      
      {!isTranslatedMode && (
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
             <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-50">
                <path d="M0 0 L100 0 L100 100 C100 50 50 0 0 0 Z" />
             </svg>
          </div>
      )}

      <div className="flex gap-5 md:gap-8 relative z-10">
        
        <div className="flex-shrink-0 pt-2">
             <div className="relative flex items-center justify-center w-12 h-12">
                <svg viewBox="0 0 100 100" className={`absolute inset-0 transition-colors w-full h-full fill-current ${isTranslatedMode ? 'text-teal-50 group-hover:text-teal-100' : 'text-[#0F5156]/5 group-hover:text-[#0F5156]/10'}`}>
                   <path d="M50 0 L100 50 L50 100 L0 50 Z" />
                </svg>
                <span className={`relative z-10 font-bold text-xl group-hover:scale-110 transition-transform ${isTranslatedMode ? 'text-teal-700' : 'text-[#0F5156] font-amiri'}`}>
                    {verse.number}
                </span>
             </div>
        </div>
        
        <div className="flex-grow space-y-4">
          <p 
            className={`${primaryColor} ${primaryLeading} ${primaryFont} tracking-wide transition-all duration-300 dir-rtl`}
            style={{ fontSize: `${primarySize}rem` }}
          >
            {primaryText}
          </p>
          
          {isTranslatedMode && showSecondaryText && secondaryText && (
            <div className="relative mt-6 pt-4 border-t border-slate-100/80 animate-fade-in">
              <div className="pr-2">
                <p className="text-[10px] text-slate-400 font-bold mb-1">النص الأصلي</p>
                <p 
                    className="text-slate-600 font-amiri leading-[2.2] opacity-80"
                    style={{ fontSize: `${secondarySize}rem` }}
                >
                    {secondaryText}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerseCard;