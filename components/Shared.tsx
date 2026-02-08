
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { UserProfile, Source } from '../types';
import { SIKE_USERS_KEY } from '../utils/appUtils';

export const LoadingSpinner: React.FC<{ size?: string; label?: string }> = ({ size = '60px', label }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="sig-jelly-container" style={{ '--uib-size': size } as React.CSSProperties}>
          <div className="sig-jelly-dot"></div>
          <div className="sig-jelly-traveler"></div>
        </div>
        <span className="absolute font-commander text-[11px] font-black text-slate-800 dark:text-cyan-400 tracking-tighter drop-shadow-sm">SiG</span>
      </div>
      {label && (
        <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400/80 uppercase tracking-[0.3em] animate-pulse font-commander">
          {label}
        </span>
      )}
    </div>
  );
};

export const SplashScreen: React.FC = () => {
    const [revealCount, setRevealCount] = useState(0);
    const initials = "SIGNIFY".split("");

    useEffect(() => {
        const interval = setInterval(() => {
            setRevealCount(prev => prev < initials.length ? prev + 1 : prev);
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-900/20 to-slate-950"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="flex gap-2 mb-8">
                    {initials.map((char, i) => (
                        <span 
                            key={i} 
                            className={`text-6xl md:text-8xl font-commander font-black transition-all duration-700 ${
                                i < revealCount 
                                ? 'opacity-100 translate-y-0 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                                : 'opacity-0 translate-y-10 text-slate-800'
                            }`}
                        >
                            {char}
                        </span>
                    ))}
                </div>
                {revealCount >= initials.length && (
                    <div className="animate-in fade-in zoom-in duration-1000">
                        <LoadingSpinner label="Initializing Reader 2.1" />
                    </div>
                )}
            </div>
            <div className="absolute bottom-12 text-center z-10">
                <p className="text-cyan-400/30 font-commander text-[9px] font-bold tracking-[0.5em] uppercase">Quantum Neural Architecture • 2.5</p>
            </div>
        </div>
    );
};

export const checkApiKey = () => {
  if (!process.env.API_KEY) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-4">
        <div className="text-center bg-slate-800 p-8 rounded-[40px] shadow-2xl border border-slate-700 max-w-md font-commander">
          <Icons.AlertTriangle className="mx-auto h-12 w-12 text-cyan-400 mb-4" />
          <h1 className="text-xl font-black uppercase tracking-widest">Access Denied</h1>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed">
            Engine 3.0 requires a valid API_KEY to initialize quantum reasoning cores.
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const CopyButton: React.FC<{ textToCopy: string | undefined | null, className?: string, title?: string }> = ({ textToCopy, className, title = "Copy" }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-cyan-500 transition-all active:scale-90 ${className}`}>
            {isCopied ? <Icons.Check className="h-4 w-4 text-green-500" /> : <Icons.Copy className="h-4 w-4" />}
        </button>
    );
};

export const SourceBubble: React.FC<{ source: Source }> = ({ source }) => (
  <a
    href={source.uri}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:border-cyan-500 transition-colors shadow-sm uppercase tracking-tighter"
  >
    <Icons.ExternalLink className="h-3 w-3 text-cyan-500" />
    <span className="truncate max-w-[120px]">{source.title || 'Knowledge Base'}</span>
  </a>
);

/**
 * PREMIUM MODAL DROPDOWN SELECTOR
 * Optimized for touch and high-visibility. Centered pop-up UI.
 */
export const Dropdown: React.FC<{
  label?: string;
  options: (string | number)[];
  selected: string | number;
  onSelect: (option: any) => void;
  disabled?: boolean;
  displayValueMap?: { [key: string | number]: string | number };
}> = ({ label, options, selected, onSelect, disabled = false, displayValueMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const getDisplayLabel = (value: string | number) => displayValueMap?.[value] ?? value;

  return (
    <div className="relative w-full">
      {label && <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400 mb-2 font-commander">{label}</span>}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full inline-flex justify-between items-center rounded-[24px] border-2 border-slate-200 dark:border-slate-700 px-6 py-4 bg-white dark:bg-slate-800 text-xs font-black font-commander uppercase tracking-widest text-gray-700 dark:text-slate-200 hover:border-cyan-500 hover:shadow-2xl transition-all disabled:opacity-50"
      >
        <span className="truncate">{getDisplayLabel(selected)}</span>
        <Icons.ChevronDown className={`ml-2 h-4 w-4 text-cyan-500 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 to-transparent" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[64px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[6px] border-cyan-500/10 p-12 transform animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                    <h3 className="font-commander font-black uppercase tracking-tighter text-3xl text-slate-900 dark:text-white">{label || 'Select Feature'}</h3>
                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.5em]">Quantum Core Selector • 3.0</p>
                </div>
                <button 
                    onClick={() => setIsOpen(false)} 
                    className="p-5 rounded-[28px] bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:scale-110 active:scale-95 transition-all shadow-xl"
                >
                    <Icons.X className="h-7 w-7"/>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-4 -mr-4">
                {options.map(option => {
                    const isSelected = option === selected;
                    return (
                        <button
                            key={option}
                            onClick={() => { onSelect(option); setIsOpen(false); }}
                            className={`w-full text-left px-10 py-6 rounded-[32px] text-sm font-black font-commander uppercase tracking-widest transition-all duration-300 ${
                                isSelected 
                                ? 'bg-cyan-600 text-white shadow-2xl shadow-cyan-600/40 scale-[1.02] border-2 border-cyan-400' 
                                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 border-2 border-transparent hover:border-cyan-500 hover:scale-[1.01]'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={isSelected ? 'animate-pulse' : ''}>{getDisplayLabel(option)}</span>
                                {isSelected ? <Icons.Check className="h-6 w-6" /> : <div className="h-6 w-6 rounded-full border-2 border-slate-200 dark:border-slate-700" />}
                            </div>
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-10 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mb-2"></div>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em]">Tap to commit selection</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (name: string, email: string) => void }> = ({ isOpen, onClose, onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border-4 border-cyan-500 p-8 transform animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black font-commander uppercase tracking-tighter text-slate-900 dark:text-white">Sign In</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Icons.X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(name, email); }} className="space-y-4">
          <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 outline-none focus:border-cyan-500 transition-all font-medium" />
          <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 outline-none focus:border-cyan-500 transition-all font-medium" />
          <button type="submit" className="w-full py-5 bg-cyan-600 text-white rounded-3xl font-black font-commander tracking-widest uppercase shadow-xl shadow-cyan-600/20 hover:bg-cyan-500 transition-all">Establish Handshake</button>
        </form>
      </div>
    </div>
  );
};

export const SelectionCopyPopover: React.FC<{ popover: { visible: boolean; top: number; left: number; text: string } }> = ({ popover }) => {
  if (!popover.visible) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(popover.text);
  };

  return (
    <div 
      className="fixed z-[200] transform -translate-x-1/2 -translate-y-full mb-4 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 pointer-events-auto animate-in fade-in slide-in-from-bottom-2"
      style={{ top: popover.top, left: popover.left }}
    >
      <span className="text-xs font-black font-commander uppercase tracking-widest">Copy Selection?</span>
      <button onClick={handleCopy} className="p-2 bg-cyan-600 rounded-xl hover:bg-cyan-500 transition-colors">
        <Icons.Copy className="h-4 w-4" />
      </button>
    </div>
  );
};

export const SubscriptionModal: React.FC<{ isOpen: boolean; onClose: () => void; user: UserProfile | null; onRedeem: (code: string) => void }> = ({ isOpen, onClose, user, onRedeem }) => {
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border-4 border-cyan-500 p-10 transform animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black font-commander uppercase tracking-tighter text-slate-900 dark:text-white">Subscription</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Icons.X className="h-6 w-6" /></button>
        </div>
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-cyan-600/10 rounded-[30px] flex items-center justify-center mx-auto mb-4">
            <Icons.Award className="h-10 w-10 text-cyan-600" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Enter your neural activation code to unlock premium research tools and unlimited transmission bandwidth.</p>
          <input type="text" placeholder="XXXX-XXXX-XXXX" value={code} onChange={e => setCode(e.target.value)} className="w-full px-6 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 outline-none focus:border-cyan-500 transition-all font-mono uppercase text-center text-xl tracking-[0.2em] font-black" />
        </div>
        <button onClick={() => { onRedeem(code); onClose(); }} className="w-full py-5 bg-cyan-600 text-white rounded-3xl font-black font-commander tracking-widest uppercase shadow-xl shadow-cyan-600/20 hover:bg-cyan-500 transition-all">Redeem Authorization</button>
        <p className="mt-6 text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest">
          Authorized centers only.
        </p>
      </div>
    </div>
  );
};

export const CameraModal: React.FC<{ isOpen: boolean; onClose: () => void; onCapture: (dataUrl: string) => void }> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => console.error("Camera error:", err));
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      onCapture(canvas.toDataURL('image/jpeg'));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-[64px] overflow-hidden border-4 border-cyan-500/30 shadow-[0_0_150px_rgba(0,0,0,1)]">
        <video ref={videoRef} autoPlay playsInline className="w-full h-auto object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute top-8 right-8">
          <button onClick={onClose} className="p-5 bg-black/60 hover:bg-black/80 text-white rounded-[32px] backdrop-blur-xl border border-white/10 transition-all shadow-2xl hover:scale-110 active:scale-95"><Icons.X className="h-8 w-8" /></button>
        </div>

        <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-6">
          <div className="bg-black/60 px-6 py-2 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl">
            <span className="text-[10px] font-black font-commander text-white uppercase tracking-[0.6em]">Neural Optic Interface</span>
          </div>
          <button onClick={capture} className="h-28 w-28 bg-white rounded-full border-[12px] border-cyan-500/40 flex items-center justify-center shadow-[0_0_60px_rgba(34,211,238,0.6)] active:scale-90 transition-all hover:scale-105">
            <div className="h-16 w-16 bg-cyan-600 rounded-full shadow-inner" />
          </button>
        </div>
      </div>
    </div>
  );
};
