import React, { useState } from 'react';
import { Icons } from './Icons';
import { ChatComponent } from './Chat';
import { Dropdown, LoadingSpinner } from './Shared';
import { PageProps } from '../types';
import { 
    streamCreativeResponse,
    generateNanoBananaImage
} from '../services/geminiService';

export const CreativeStudioPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => {
    const [visuals, setVisuals] = useState<string[]>([]);
    const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
    const [visualPrompt, setVisualPrompt] = useState('');

    const handleGenerateVisuals = async () => {
        if (!visualPrompt.trim() || !isOnline) return;
        setIsGeneratingVisuals(true);
        try {
            const img = await generateNanoBananaImage(`Artistic book illustration: ${visualPrompt}. Cinematic lighting, detailed art style.`);
            if (img) setVisuals(p => [img, ...p].slice(0, 10));
        } catch (err) {
            console.error("Visual generation error:", err);
        } finally {
            setIsGeneratingVisuals(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-white">
            <div className="flex-1 flex flex-col h-full border-r border-gray-200 dark:border-slate-800">
                <ChatComponent 
                    historyId="creative_studio" 
                    pageTitle="Creative Studio" 
                    welcomeMessage={{
                        author: 'Studio Director', 
                        text: "Welcome to your Creative Studio. I am here to help you draft novels, write short stories, and even visualize scenes. Tell me what you're working on, and if you need an illustration, use the tool on the right."
                    }} 
                    placeholder="Draft a new chapter or describe a scene..." 
                    showFilters={true} 
                    isOnline={isOnline} 
                    aiStreamFunction={streamCreativeResponse} 
                    currentUserEmail={currentUserEmail} 
                    userProfileNotes={userProfileNotes}
                />
            </div>

            <div className="w-full md:w-80 lg:w-96 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                <h2 className="text-[10px] font-black font-commander text-cyan-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <Icons.Sparkles className="h-4 w-4" /> Story Illustrator
                </h2>
                
                <div className="space-y-4">
                    <textarea 
                        value={visualPrompt}
                        onChange={(e) => setVisualPrompt(e.target.value)}
                        placeholder="Describe the character or scene for an illustration..."
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:border-cyan-500 transition-all resize-none h-24"
                    />
                    
                    <button 
                        onClick={handleGenerateVisuals} 
                        disabled={!visualPrompt || isGeneratingVisuals || !isOnline} 
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black font-commander uppercase text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                    >
                        {isGeneratingVisuals ? <Icons.Spinner className="h-4 w-4 animate-spin" /> : <Icons.BookImage className="h-4 w-4" />}
                        {isGeneratingVisuals ? 'Synthesizing Art...' : 'Generate Illustration'}
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mt-6">
                        {visuals.map((src, i) => (
                            <div key={i} className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]">
                                <img src={src} className="w-full h-auto object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = src;
                                        link.download = `illustration_${Date.now()}.png`;
                                        link.click();
                                    }} className="p-3 bg-white text-slate-900 rounded-full shadow-xl">
                                        <Icons.Download className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {visuals.length === 0 && !isGeneratingVisuals && (
                            <div className="h-32 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl">
                                <Icons.BookImage className="h-8 w-8 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Studio Gallery Empty</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
