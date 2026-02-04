
import React, { useState } from 'react';
import { Icons } from './Icons';
import { ChatComponent } from './Chat';
import { SimulationRunner } from './SimulationRunner';
import { Dropdown, LoadingSpinner } from './Shared';
import { PageProps, Message } from '../types';
import { 
    streamSimulationResponse, 
    streamStudyHelperResponse, 
    streamWritingResponse, 
    streamStorybookResponse, 
    streamGrammarResponse,
    generateNanoBananaImage
} from '../services/geminiService';

export const SimulationsPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => {
    const [simCode, setSimCode] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'split' | 'chat' | 'sim'>('split');
    const [visuals, setVisuals] = useState<string[]>([]);
    const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
    const [visualPrompt, setVisualPrompt] = useState('');
    const [frameCount, setFrameCount] = useState(1);

    const handleGenerateVisuals = async () => {
        if (!visualPrompt.trim() || !isOnline) return;
        setIsGeneratingVisuals(true);
        try {
            const results: string[] = [];
            for (let i = 0; i < frameCount; i++) {
                const img = await generateNanoBananaImage(`Scientific visualization of: ${visualPrompt}. Realistic, 4k. Variant ${i+1}`);
                if (img) results.push(img);
            }
            setVisuals(results);
        } catch (err) {
            console.error("Visual generation error:", err);
        } finally {
            setIsGeneratingVisuals(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-900 overflow-hidden relative text-slate-900 dark:text-white">
            <div className="md:hidden flex-shrink-0 flex border-b border-gray-200 dark:border-slate-800">
                <button onClick={() => setViewMode('chat')} className={`flex-1 py-3 text-[10px] font-black font-commander uppercase tracking-widest ${viewMode === 'chat' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>Chat</button>
                <button onClick={() => setViewMode('sim')} className={`flex-1 py-3 text-[10px] font-black font-commander uppercase tracking-widest ${viewMode === 'sim' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>The Lab</button>
            </div>

            <div className={`flex-1 flex flex-col h-full border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ${viewMode === 'sim' ? 'hidden md:flex' : 'flex'}`}>
                <ChatComponent 
                    historyId="simulations" 
                    pageTitle="Simulation Lab" 
                    welcomeMessage={{
                        author: 'Lead Engineer', 
                        text: "Welcome to The Lab. I build real-time simulations. I am aware of all SigNify features—ask me to simulate a physics concept, or use the Language Learner to teach me how to describe results in Sindhi."
                    }} 
                    placeholder="e.g. Simulate gravitation between two planets..." 
                    showFilters={false} 
                    isOnline={isOnline} 
                    aiStreamFunction={streamSimulationResponse} 
                    currentUserEmail={currentUserEmail} 
                    userProfileNotes={userProfileNotes}
                    onSimulationCodeFound={(code) => {
                        setSimCode(code);
                        if(window.innerWidth < 768) setViewMode('sim');
                    }}
                />
            </div>

            <div className={`flex-1 bg-slate-900 p-2 md:p-4 h-full flex flex-col ${viewMode === 'chat' ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex justify-between items-center mb-2 px-2">
                    <h2 className="text-white font-black font-commander uppercase text-xs flex items-center gap-2 tracking-widest">
                        <Icons.Cpu className="h-5 w-5 text-cyan-400" /> LAB CORE 3.2
                    </h2>
                    <span className="text-[10px] font-black font-commander text-slate-500 uppercase tracking-widest underline">AWARENESS ACTIVE</span>
                </div>
                
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex-[2] rounded-[32px] overflow-hidden border-2 border-slate-800 shadow-2xl relative">
                        <SimulationRunner code={simCode} images={visuals} />
                    </div>

                    <div className="flex-1 bg-slate-950/50 p-6 rounded-[32px] border-2 border-slate-800 overflow-y-auto custom-scrollbar">
                        <h3 className="text-[10px] font-black font-commander text-cyan-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <Icons.Sparkles className="h-4 w-4" /> Nano Banana Visualization
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input 
                                    value={visualPrompt}
                                    onChange={(e) => setVisualPrompt(e.target.value)}
                                    placeholder="Describe assets for the lab..."
                                    className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-medium outline-none focus:border-cyan-500 transition-all"
                                />
                                <div className="w-20">
                                    <Dropdown options={[1, 2, 3].map(String)} selected={String(frameCount)} onSelect={(v) => setFrameCount(Number(v))} />
                                </div>
                            </div>
                            
                            <button onClick={handleGenerateVisuals} disabled={!visualPrompt || isGeneratingVisuals || !isOnline} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black font-commander uppercase text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                                {isGeneratingVisuals ? <Icons.Spinner className="h-4 w-4 animate-spin" /> : <Icons.BookImage className="h-4 w-4" />}
                                {isGeneratingVisuals ? 'Initializing Nano...' : 'Generate Assets'}
                            </button>

                            {visuals.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {visuals.map((src, i) => (
                                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-700"><img src={src} className="w-full h-full object-cover" /></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StudyHelperPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => (
    <ChatComponent
        historyId="studyHelper"
        pageTitle="Study Helper"
        welcomeMessage={{ author: 'SigNify Tutor', text: "I can explain any concept. Note: I can also generate real-time simulations in the 'Simulations' tab if you need to visualize a concept!" }}
        placeholder="Explain photosynthesis or a math problem..."
        showFilters={true}
        isOnline={isOnline}
        aiStreamFunction={streamStudyHelperResponse}
        currentUserEmail={currentUserEmail}
        userProfileNotes={userProfileNotes}
    />
);

export const WritingPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => (
    <ChatComponent
        historyId="writing"
        pageTitle="Writing Spirit"
        welcomeMessage={{ author: 'Writing Spirit', text: "Let's create. Once we've written a scene, you can use the 'Neural Reader' to hear the story with emotional voices." }}
        placeholder="Start a story or novel scene..."
        showFilters={false}
        isOnline={isOnline}
        aiStreamFunction={streamWritingResponse}
        currentUserEmail={currentUserEmail}
        userProfileNotes={userProfileNotes}
    />
);

export const StorybookPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => (
    <ChatComponent
        historyId="storybook"
        pageTitle="Storybook Engine"
        welcomeMessage={{ author: 'Story Weaver', text: "I create illustrated stories. Remember to use the 'Translator' if you want to convert these to other languages perfectly." }}
        placeholder="A story about a brave astronaut..."
        showFilters={false}
        isOnline={isOnline}
        aiStreamFunction={streamStorybookResponse}
        currentUserEmail={currentUserEmail}
        userProfileNotes={userProfileNotes}
    />
);

export const GrammarPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => (
    <ChatComponent
        historyId="grammar"
        pageTitle="Grammar Expert"
        welcomeMessage={{ author: 'Grammar Core', text: "I refine your text. If you want to see how verbs change forms, visit the 'Verb Lexicon' for a full database." }}
        placeholder="Paste text to check grammar and style..."
        showFilters={false}
        isOnline={isOnline}
        aiStreamFunction={streamGrammarResponse}
        currentUserEmail={currentUserEmail}
        userProfileNotes={userProfileNotes}
    />
);
