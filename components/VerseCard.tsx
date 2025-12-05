import React from 'react';
import { Verse } from '../types';

interface VerseCardProps {
  verse: Verse;
  showOriginal: boolean;
  fontSizeLevel: number; // 1 to 5
}

const VerseCard: React.FC<VerseCardProps> = ({ verse, showOriginal, fontSizeLevel }) => {
  // Base size is 1.25rem (text-xl), step is 0.25rem
  // Level 1: 1.25rem, Level 3: 1.75rem, Level 5: 2.25rem
  const translatedSize = 1 + (fontSizeLevel * 0.25); 
  const originalSize = 1 + (fontSizeLevel * 0.2); 

  return (
    <div className="group bg-white rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-transparent hover:border-amber-100 relative ring-1 ring-slate-100 hover:ring-amber-100/50 overflow-hidden">
      
      {/* Coptic Corner Decoration (Top Right) */}
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
         <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-50">
            <path d="M0 0 L100 0 L100 100 C100 50 50 0 0 0 Z" />
         </svg>
      </div>

      <div className="flex gap-5 md:gap-8 relative z-10">
        
        {/* Decorative Number */}
        <div className="flex-shrink-0 pt-1">
             <div className="relative flex items-center justify-center w-12 h-12">
                <svg viewBox="0 0 100 100" className="absolute inset-0 text-[#0F5156]/10 group-hover:text-[#0F5156]/20 transition-colors w-full h-full fill-current">
                   <path d="M50 0 L100 50 L50 100 L0 50 Z" />
                </svg>
                <span className="relative z-10 text-[#0F5156] font-amiri font-bold text-xl group-hover:scale-110 transition-transform">{verse.number}</span>
             </div>
        </div>
        
        <div className="flex-grow space-y-5">
          {/* Translated Text (Masri) */}
          <p 
            className="text-slate-800 leading-[1.8] font-bold font-['Cairo'] tracking-wide transition-all duration-300"
            style={{ fontSize: `${translatedSize}rem` }}
          >
            {verse.translated}
          </p>
          
          {/* Original Text (Van Dyck) - Conditional */}
          {showOriginal && (
            <div className="relative group/original mt-4 pt-2 border-t border-slate-100">
              <div className="absolute top-2 right-0 w-1 h-[calc(100%-8px)] bg-amber-200/50 rounded-full group-hover/original:bg-amber-400 transition-colors"></div>
              <div className="pr-5 py-1">
                <p 
                    className="text-slate-500 font-amiri leading-[2.2] opacity-80 group-hover/original:opacity-100 group-hover/original:text-[#0F5156] transition-all dir-rtl duration-300"
                    style={{ fontSize: `${originalSize}rem` }}
                >
                    {verse.original}
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