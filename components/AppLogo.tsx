import React from 'react';

interface AppLogoProps {
  className?: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <div className={`${className} relative group`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md transition-transform duration-500 group-hover:scale-105">
        {/* Background Sun/Halo */}
        <circle cx="50" cy="50" r="48" className="fill-white stroke-[#D4AF37] stroke-2" />
        
        {/* Decorative Rays */}
        <path d="M50 2V10M50 90V98M98 50H90M10 50H2M18 18L24 24M76 76L82 82M82 18L76 24M18 82L24 76" 
              className="stroke-[#D4AF37] stroke-[1.5] opacity-50" strokeLinecap="round" />

        {/* Pyramids (Stylized as Book Backing) */}
        <path d="M20 75L50 25L80 75H20Z" className="fill-[#0F5156] opacity-10" />
        <path d="M30 75L50 35L70 75H30Z" className="fill-[#0F5156] opacity-20" />

        {/* Open Book */}
        <path d="M50 35C50 35 65 30 80 35V75C65 70 50 75 50 75C50 75 35 70 20 75V35C35 30 50 35 50 35Z" 
              className="fill-white stroke-[#0F5156] stroke-[2.5] stroke-linejoin-round" />
        
        {/* Book Center Line */}
        <path d="M50 35V75" className="stroke-[#D4AF37] stroke-[2]" />

        {/* Coptic Cross on Right Page */}
        <path d="M65 45V65M58 52H72" className="stroke-[#D4AF37] stroke-[2.5] stroke-linecap-round" />

        {/* Text Lines on Left Page */}
        <path d="M28 48H42M28 55H42M28 62H38" className="stroke-[#0F5156] stroke-[1.5] opacity-30 stroke-linecap-round" />
      </svg>
    </div>
  );
};

export default AppLogo;