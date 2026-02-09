import React from 'react';
import { Icons } from './Icons';
import { SubscriptionTier } from '../types';
import { checkFeatureAccess } from '../utils/appUtils';

export const MainMenuPage: React.FC<{ 
    setPage: (page: string) => void; 
    isCommander: boolean; 
    currentTier: SubscriptionTier;
    onUpgrade: () => void;
}> = ({ setPage, isCommander, currentTier, onUpgrade }) => {
    
    const handleFeatureClick = (id: string) => {
        if (checkFeatureAccess(id, currentTier) || isCommander) {
            setPage(id);
        } else {
            onUpgrade();
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-xl mx-auto space-y-6">
                {/* Hero: Neural Chat */}
                <button
                    onClick={() => handleFeatureClick('aiChat')}
                    className="w-full relative group overflow-hidden bg-cyan-600 rounded-[40px] p-8 text-left transition-all duration-300 transform active:scale-[0.98] shadow-2xl shadow-cyan-500/20 border-b-8 border-cyan-800"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                        <Icons.MessageSquare className="h-32 w-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4 backdrop-blur-md">
                            <Icons.Logo className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black font-commander text-white uppercase tracking-tighter mb-2">Neural Chat</h1>
                        <p className="text-cyan-100 text-sm font-medium max-w-[240px]">High-speed transmission via Gemini 2.5 Flash Core.</p>
                        <div className="mt-6 flex items-center gap-2 text-white font-black text-[10px] tracking-widest uppercase">
                            <span>Open Connection</span>
                            <Icons.ArrowRight className="h-4 w-4" />
                        </div>
                    </div>
                </button>

                {/* Main Utility Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleFeatureClick('intelligenceHub')}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[32px] text-left border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col gap-4 group active:scale-95 transition-all"
                    >
                        <div className="p-3 bg-indigo-600/10 text-indigo-600 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                            <Icons.BrainCircuit className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-xs uppercase tracking-widest dark:text-white">Intelligence Core</h2>
                            <p className="text-[10px] text-slate-500 mt-1">Vault, Learner, Memory</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleFeatureClick('creative')}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[32px] text-left border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col gap-4 group active:scale-95 transition-all"
                    >
                        <div className="p-3 bg-pink-600/10 text-pink-600 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                            <Icons.Feather className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-xs uppercase tracking-widest dark:text-white">Creative Studio</h2>
                            <p className="text-[10px] text-slate-500 mt-1">Stories & Art</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleFeatureClick('storyReader')}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[32px] text-left border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col gap-4 group active:scale-95 transition-all"
                    >
                        <div className="p-3 bg-amber-600/10 text-amber-600 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                            <Icons.Volume2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-xs uppercase tracking-widest dark:text-white">LM Studio</h2>
                            <p className="text-[10px] text-slate-500 mt-1">Audio Overviews</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleFeatureClick('translator')}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[32px] text-left border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col gap-4 group active:scale-95 transition-all"
                    >
                        <div className="p-3 bg-cyan-600/10 text-cyan-600 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                            <Icons.Translator className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-xs uppercase tracking-widest dark:text-white">Translator</h2>
                            <p className="text-[10px] text-slate-500 mt-1">Global Linguistics</p>
                        </div>
                    </button>
                </div>

                {/* Secondary Links */}
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => setPage('aboutContact')} className="flex items-center justify-between p-5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 active:bg-slate-200 transition-colors">
                        <div className="flex items-center gap-3">
                            <Icons.Info className="h-5 w-5 text-slate-500" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">About SigNify OS</span>
                        </div>
                        <Icons.ArrowRight className="h-4 w-4 text-slate-400" />
                    </button>
                </div>
                
                <div className="text-center pt-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Engine 3.2 • Powered by 2.5 Flash Preview</p>
                </div>
            </div>
        </div>
    );
};

export const AboutContactPage: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-md mx-auto space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-800">
                    <h1 className="text-2xl font-black font-commander uppercase tracking-tighter text-cyan-600 dark:text-cyan-400 mb-4">About SigNify</h1>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                        Designed by Sikandar Ali Malik, SigNify OS is an advanced research and expression environment.
                        It utilizes the 2.5 Flash Core to process complex data and local linguistic training for Sindhi and Urdu.
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-cyan-600 text-white rounded-2xl">
                        <Icons.Mail className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Developer Support</p>
                        <a href="mailto:sikandarmalik415@gmail.com" className="text-sm font-bold text-cyan-600 hover:underline">sikandarmalik415@gmail.com</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SikesProfilePage: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-md mx-auto text-center">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[50px] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                    <div className="w-24 h-24 mx-auto rounded-[32px] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white mb-6 shadow-xl">
                        <Icons.User className="h-12 w-12" />
                    </div>
                    <h1 className="text-2xl font-black font-commander uppercase tracking-tight text-slate-900 dark:text-white">Sikandar Ali Malik</h1>
                    <p className="text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Lead Architect</p>
                </div>
            </div>
        </div>
    );
};
