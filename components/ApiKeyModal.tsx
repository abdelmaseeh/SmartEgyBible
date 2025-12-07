import React, { useState } from 'react';
import { Key, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import AppLogo from './AppLogo';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inputKey.trim()) {
      setError("Please enter a valid API Key");
      return;
    }

    if (!inputKey.startsWith("AIza")) {
        setError("Invalid Key Format. It usually starts with 'AIza'");
        return;
    }

    setIsChecking(true);
    // Simulate a brief check or just save it. 
    // In a real app, you might want to make a dummy call to validate.
    setTimeout(() => {
        onSave(inputKey.trim());
        setIsChecking(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-white/20">
        
        {/* Header Decoration */}
        <div className="bg-[#0F5156] h-32 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
            <div className="bg-white p-3 rounded-2xl shadow-xl transform translate-y-8">
                <AppLogo className="w-16 h-16" />
            </div>
        </div>

        <div className="pt-12 pb-8 px-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2 font-amiri">مفتاح التشغيل</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            لاستخدام الذكاء الاصطناعي في الترجمة والمحادثة، يرجى إدخال مفتاح Google Gemini API الخاص بك.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter your API Key (AIza...)"
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F5156] focus:border-[#0F5156] transition-all sm:text-sm"
                />
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 rounded-lg justify-center">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={isChecking}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-[#0F5156] hover:bg-[#0b3d41] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F5156] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isChecking ? <Loader2 className="animate-spin" /> : "حفظ و متابعة"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
             <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0F5156] hover:text-amber-600 transition-colors"
             >
                <ExternalLink size={14} />
                احصل على مفتاح مجاني من Google AI Studio
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;