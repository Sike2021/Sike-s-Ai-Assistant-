
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { Dropdown, LoadingSpinner, CopyButton } from './Shared';
import { PageProps, NotebookSource, Message } from '../types';
import { generateGeminiTTS, generateMultiSpeakerTTS, streamNotebookChatResponse, generateNotebookOverview } from '../services/geminiService';
import { createWavBlob } from '../utils/appUtils';
import { INJECTED_STORIES } from '../services/injectedKnowledge';
import { ChatMessage } from './Chat';
import JSZip from 'jszip';

/** Audio Decoding Utilities */
function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

type SynthesisStep = 'idle' | 'indexing' | 'scripting' | 'synthesizing' | 'packaging';

export const StoryReaderPage: React.FC<PageProps> = ({ isOnline, userProfileNotes, currentUserEmail }) => {
    // --- State: Sources ---
    const [sources, setSources] = useState<NotebookSource[]>([]);
    const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
    const [isSourceSidebarOpen, setIsSourceSidebarOpen] = useState(true);
    const [isExtractingZip, setIsExtractingZip] = useState(false);
    
    // --- State: Modes ---
    const [activeView, setActiveView] = useState<'reader' | 'chat'>('reader');
    
    // --- State: Reader/TTS ---
    const [readerText, setReaderText] = useState('');
    const [audioState, setAudioState] = useState<'stopped' | 'loading' | 'playing'>('stopped');
    const [lastPcmData, setLastPcmData] = useState<Uint8Array | null>(null);
    const [voiceMode, setVoiceMode] = useState<'Single' | 'Multi'>('Single');
    const [primaryVoice, setPrimaryVoice] = useState('Zephyr');
    const [secondaryVoice, setSecondaryVoice] = useState('Kore');
    const [emotion, setEmotion] = useState('Storyteller');
    const [language, setLanguage] = useState('English');
    
    // --- State: Audio Overview Pipeline ---
    const [synthesisStep, setSynthesisStep] = useState<SynthesisStep>('idle');
    const [targetDuration, setTargetDuration] = useState(5); // 5, 10, 20
    const [downloadingAudio, setDownloadingAudio] = useState(false);
    const [errorAlert, setErrorAlert] = useState<string | null>(null);

    // --- State: Notebook Chat ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const voiceOptions = ['Kore', 'Zephyr', 'Fenrir', 'Puck', 'Charon'];
    const emotionOptions = ['Storyteller', 'Cheerful', 'Suspenseful', 'Serious', 'Whisper', 'Angry'];
    const durationOptions = [5, 10, 20];

    // Auto-discover hardcoded stories on load
    useEffect(() => {
        if (sources.length === 0) {
            setSources(INJECTED_STORIES);
            // Default select all system stories for convenience
            setSelectedSourceIds(new Set(INJECTED_STORIES.map(s => s.id)));
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isChatLoading]);

    useEffect(() => { return () => stopAudio(); }, []);

    const stopAudio = () => {
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch(e) {}
            audioSourceRef.current = null;
        }
        setAudioState('stopped');
    };

    const toggleSourceSelection = (id: string) => {
        setSelectedSourceIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllSources = () => {
        setSelectedSourceIds(new Set(sources.map(s => s.id)));
    };

    const clearSelection = () => {
        setSelectedSourceIds(new Set());
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        setErrorAlert(null);
        
        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                setIsExtractingZip(true);
                try {
                    const zip = await JSZip.loadAsync(file);
                    const newSources: NotebookSource[] = [];
                    
                    const extractionPromises = Object.keys(zip.files).map(async (filename) => {
                        const zipFile = zip.files[filename];
                        if (!zipFile.dir && (filename.endsWith('.txt') || filename.endsWith('.md'))) {
                            const content = await zipFile.async('string');
                            newSources.push({
                                id: Math.random().toString(36).substr(2, 9),
                                name: filename,
                                content: content,
                                size: content.length,
                                type: filename.endsWith('.md') ? 'text/markdown' : 'text/plain'
                            });
                        }
                    });

                    await Promise.all(extractionPromises);
                    setSources(prev => [...prev, ...newSources]);
                    // Auto-select newly uploaded files
                    setSelectedSourceIds(prev => {
                        const next = new Set(prev);
                        newSources.forEach(s => next.add(s.id));
                        return next;
                    });
                } catch (err) {
                    setErrorAlert("Failed to extract ZIP. Ensure it contains text or markdown files.");
                } finally {
                    setIsExtractingZip(false);
                }
            } else if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const newSource: NotebookSource = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        content: event.target?.result as string,
                        size: file.size,
                        type: file.type
                    };
                    setSources(prev => [...prev, newSource]);
                    setSelectedSourceIds(prev => new Set(prev).add(newSource.id));
                };
                reader.readAsText(file);
            } else {
                setErrorAlert(`Unsupported file type: ${file.name}. Use TXT, MD, or ZIP.`);
            }
        }
        if (e.target) e.target.value = '';
    };

    const handleGenerateOverview = async () => {
        const selectedSources = sources.filter(s => selectedSourceIds.has(s.id));
        if (selectedSources.length === 0 || !isOnline) {
            setErrorAlert("Please select at least one source for the Audio Overview.");
            return;
        }
        
        stopAudio();
        setSynthesisStep('indexing');
        setErrorAlert(null);
        
        try {
            await new Promise(r => setTimeout(r, 800));
            setSynthesisStep('scripting');
            // We pass only selected sources to the service
            const script = await generateNotebookOverview(selectedSources, targetDuration);
            setReaderText(script);
            
            setSynthesisStep('synthesizing');
            setVoiceMode('Multi');
            setPrimaryVoice('Zephyr');
            setSecondaryVoice('Kore');
            setActiveView('reader');
            
            await handlePlay(script);
            setSynthesisStep('idle');
        } catch (e: any) {
            console.error(e);
            setSynthesisStep('idle');
            if (e.message?.includes('429')) {
                setErrorAlert("Neural Bandwidth Saturated. SigNify is operating in Free Mode. Please wait a minute or use the Stable Flash Core (Default).");
            } else {
                setErrorAlert("Matrix Handshake failed during Overview generation.");
            }
        }
    };

    const handlePlay = async (textOverride?: string) => {
        const textToPlay = textOverride || (activeView === 'reader' ? readerText : messages[messages.length - 1]?.text);
        if (!textToPlay || !isOnline) return;
        if (audioState !== 'stopped') { stopAudio(); return; }
        setAudioState('loading');
        try {
            const prompt = language !== 'English' ? `In ${language}: ${textToPlay}` : textToPlay;
            const base64Audio = voiceMode === 'Single' 
                ? await generateGeminiTTS(prompt.slice(0, 8000), primaryVoice, emotion)
                : await generateMultiSpeakerTTS(prompt.slice(0, 8000), primaryVoice, secondaryVoice);
            
            if (!base64Audio) throw new Error("Synthesis Failed");
            const pcmData = decode(base64Audio);
            setLastPcmData(pcmData);

            if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(pcmData, audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setAudioState('stopped');
            audioSourceRef.current = source;
            source.start();
            setAudioState('playing');
        } catch (err) { setAudioState('stopped'); }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatLoading || !isOnline) return;
        setErrorAlert(null);

        const userMsg: Message = { id: Date.now().toString(), text: chatInput, sender: 'user' };
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot' };
        
        setMessages(prev => [...prev, userMsg, botMsg]);
        const currentInput = chatInput;
        setChatInput('');
        setIsChatLoading(true);

        try {
            // Chat is across ALL sources in the state currently, but we could filter here too
            const stream = streamNotebookChatResponse(currentInput, messages, sources, userProfileNotes);
            let fullText = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, text: fullText } : m));
                }
            }
        } catch (err: any) {
            let errorMsg = "Handshake failed. Indexing too large?";
            if (err.message?.includes('429')) {
                errorMsg = "Quota exceeded. This is a common limit for Free versions of Gemini. Please switch to the full 'Stable Core' for better results.";
                setErrorAlert(errorMsg);
            }
            setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, text: errorMsg } : m));
        } finally {
            setIsChatLoading(false);
        }
    };

    const downloadAudio = async () => {
        if (!lastPcmData) return;
        setDownloadingAudio(true);
        setSynthesisStep('packaging');
        await new Promise(r => setTimeout(r, 1200));
        const blob = createWavBlob(lastPcmData);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signify_lm_audio_${Date.now()}.wav`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloadingAudio(false);
        setSynthesisStep('idle');
    };

    const stepLabels: Record<SynthesisStep, string> = {
        idle: '',
        indexing: 'Neural Indexing of Selected Sources...',
        scripting: 'Drafting Long-form Script...',
        synthesizing: 'Synthesizing High-Fidelity Voices...',
        packaging: 'Packaging Compressed WAV Transmission...'
    };

    return (
        <div className="h-full flex bg-slate-950 text-white overflow-hidden">
            {/* --- Source Sidebar --- */}
            <div className={`flex-shrink-0 bg-slate-900 border-r border-slate-800 transition-all duration-500 overflow-hidden flex flex-col ${isSourceSidebarOpen ? 'w-80' : 'w-0'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="font-commander font-black text-xs uppercase tracking-widest text-cyan-400">Knowledge Base</h2>
                    <button onClick={() => setIsSourceSidebarOpen(false)} className="text-slate-500 hover:text-white"><Icons.X className="h-5 w-5" /></button>
                </div>
                
                {/* Selection Toolbar */}
                <div className="px-4 py-3 bg-slate-900/80 flex items-center justify-between border-b border-slate-800">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {selectedSourceIds.size} / {sources.length} Selected
                    </span>
                    <div className="flex gap-3">
                        <button onClick={selectAllSources} className="text-[9px] font-black text-cyan-500 uppercase hover:underline">Select All</button>
                        <button onClick={clearSelection} className="text-[9px] font-black text-red-500 uppercase hover:underline">Clear</button>
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {sources.map(s => {
                        const isSelected = selectedSourceIds.has(s.id);
                        const isSystem = s.id.startsWith('sys_');
                        return (
                            <div 
                                key={s.id} 
                                onClick={() => toggleSourceSelection(s.id)}
                                className={`p-4 rounded-2xl border transition-all group relative cursor-pointer ${
                                    isSelected 
                                    ? 'bg-cyan-600/10 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-cyan-600 border-cyan-500' : 'border-slate-600 bg-slate-900'}`}>
                                        {isSelected && <Icons.Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {isSystem ? <Icons.Cpu className="h-3 w-3 text-indigo-400" /> : <Icons.FileText className="h-3 w-3 text-cyan-500" />}
                                            <p className="text-xs font-bold truncate">{s.name}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 uppercase mt-1">
                                            {isSystem ? 'Master Archive' : `${(s.size / 1024).toFixed(1)} KB`}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setReaderText(s.content); setActiveView('reader'); }} 
                                        className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                    >
                                        Load text
                                    </button>
                                    {!isSystem && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSources(prev => prev.filter(src => src.id !== s.id)); }} 
                                            className="px-2 py-1.5 text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20"
                                        >
                                            <Icons.Trash className="h-3 w-3"/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {isExtractingZip && (
                        <div className="py-10">
                            <LoadingSpinner size="40px" label="Extracting Neural Data..." />
                        </div>
                    )}
                    {sources.length === 0 && !isExtractingZip && (
                        <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 grayscale">
                            <Icons.Upload className="h-10 w-10 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest px-8">Upload sources to build your library</p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-600 text-white rounded-2xl font-black font-commander text-[10px] uppercase tracking-widest shadow-xl hover:bg-cyan-500 transition-all">
                        <Icons.Plus className="h-4 w-4" /> Inject Sources / ZIP
                    </button>
                    <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} accept=".txt,.md,.zip" className="hidden" />
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="flex-1 flex flex-col relative">
                {!isSourceSidebarOpen && (
                    <button onClick={() => setIsSourceSidebarOpen(true)} className="absolute left-6 top-6 z-20 p-3 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 text-cyan-500"><Icons.PanelLeftOpen /></button>
                )}

                {/* Header Controls */}
                <div className="flex-shrink-0 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 p-4 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex bg-slate-800 p-1 rounded-2xl">
                        <button onClick={() => setActiveView('reader')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'reader' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Studio Reader</button>
                        <button onClick={() => setActiveView('chat')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'chat' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Notebook Chat</button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Duration</span>
                             <div className="w-24">
                                <Dropdown options={durationOptions.map(n => `${n} mins`)} selected={`${targetDuration} mins`} onSelect={(d) => setTargetDuration(parseInt(d))} />
                             </div>
                        </div>
                        <div className="h-10 w-px bg-slate-800 hidden md:block"></div>
                        
                        <div className="relative">
                            <button 
                                onClick={handleGenerateOverview}
                                disabled={selectedSourceIds.size === 0 || synthesisStep !== 'idle'}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-2xl font-black font-commander text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-cyan-500/10"
                            >
                                {synthesisStep !== 'idle' ? <Icons.Spinner className="h-4 w-4 animate-spin" /> : <Icons.Sparkles className="h-4 w-4" />}
                                Audio Overview
                            </button>
                            {selectedSourceIds.size > 0 && synthesisStep === 'idle' && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-slate-900 animate-in zoom-in">
                                    {selectedSourceIds.size}
                                </span>
                            )}
                        </div>

                        <button onClick={() => handlePlay()} className={`p-3 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${audioState === 'playing' ? 'bg-red-500' : 'bg-cyan-600'}`}>
                            {audioState === 'loading' ? <Icons.Spinner className="h-6 w-6 animate-spin" /> : audioState === 'playing' ? <Icons.Stop className="h-6 w-6" /> : <Icons.Play className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {synthesisStep !== 'idle' && (
                        <div className="bg-cyan-600/10 border-b border-cyan-500/20 p-4 flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-4">
                            <div className="w-full max-w-xl bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                                <div className="bg-cyan-500 h-full animate-progress" style={{ width: '40%' }}></div>
                            </div>
                            <span className="text-[10px] font-black uppercase font-commander text-cyan-400 tracking-[0.2em]">{stepLabels[synthesisStep]}</span>
                        </div>
                    )}
                    
                    {errorAlert && (
                        <div className="bg-red-600 text-white p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <Icons.AlertTriangle className="h-5 w-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">{errorAlert}</span>
                            </div>
                            <button onClick={() => setErrorAlert(null)}><Icons.X className="h-5 w-5" /></button>
                        </div>
                    )}

                    {activeView === 'reader' ? (
                        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-3xl font-black font-commander uppercase tracking-tighter">SigNify <span className="text-cyan-400">LM Studio</span></h1>
                                    <div className="flex gap-2">
                                        {lastPcmData && (
                                            <button 
                                                onClick={downloadAudio} 
                                                disabled={downloadingAudio}
                                                className={`p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-cyan-400 transition-all flex items-center gap-2 ${downloadingAudio ? 'text-cyan-500' : 'text-cyan-400'}`}
                                            >
                                                {downloadingAudio ? <Icons.Spinner className="h-5 w-5 animate-spin" /> : <Icons.Download className="h-5 w-5" />}
                                                {downloadingAudio && <span className="text-[10px] font-black uppercase">Packaging...</span>}
                                            </button>
                                        )}
                                        <button onClick={() => { setReaderText(''); setLastPcmData(null); }} className="p-3 bg-slate-800 rounded-xl text-red-500 border border-slate-700 hover:border-red-500 transition-all"><Icons.Trash className="h-5 w-5" /></button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-3">
                                        <textarea
                                            value={readerText}
                                            onChange={(e) => setReaderText(e.target.value)}
                                            placeholder="Paste research material or select a source from the sidebar..."
                                            className="w-full h-[60vh] p-8 bg-slate-900/50 border-2 border-slate-800 rounded-[40px] focus:border-cyan-500/50 outline-none transition-all text-lg leading-relaxed custom-scrollbar placeholder:text-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Voice Config</h3>
                                            <div className="space-y-4">
                                                <Dropdown label="Voice Profile" options={voiceOptions} selected={primaryVoice} onSelect={setPrimaryVoice} />
                                                <Dropdown label="Tone" options={emotionOptions} selected={emotion} onSelect={setEmotion} />
                                                <Dropdown label="Audio Output" options={['English', 'Urdu', 'Sindhi']} selected={language} onSelect={setLanguage} />
                                                <div className="pt-4 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Dual Speaker</span>
                                                    <button onClick={() => setVoiceMode(v => v === 'Single' ? 'Multi' : 'Single')} className={`w-12 h-6 rounded-full transition-all relative ${voiceMode === 'Multi' ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${voiceMode === 'Multi' ? 'right-1' : 'left-1'}`}></div>
                                                    </button>
                                                </div>
                                                {voiceMode === 'Multi' && <Dropdown label="Partner Voice" options={voiceOptions} selected={secondaryVoice} onSelect={setSecondaryVoice} />}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-cyan-600/5 rounded-2xl border border-cyan-500/10">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-2">Research Tip</p>
                                            <p className="text-[10px] text-slate-500 leading-relaxed italic">"Select specific documents in the sidebar to control exactly what the AI synthesizes into the Audio Overview."</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* --- Notebook Chat View --- */
                        <div className="flex-1 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                                <div className="max-w-3xl mx-auto space-y-6">
                                    {messages.length === 0 ? (
                                        <div className="h-96 flex flex-col items-center justify-center text-center opacity-30 grayscale">
                                            <Icons.MessageSquare className="h-16 w-16 mb-6" />
                                            <h3 className="text-xl font-black font-commander uppercase tracking-widest">Fused Research Matrix</h3>
                                            <p className="text-sm mt-2 max-w-xs">Ask specific questions about your {sources.length} sources (including System Stories). SigNify cross-references every source to give you the most complete answer.</p>
                                        </div>
                                    ) : (
                                        messages.map(m => (
                                            <ChatMessage key={m.id} message={m} language="English" currentUserEmail={currentUserEmail} />
                                        ))
                                    )}
                                    {isChatLoading && <LoadingSpinner label="SigNify is cross-referencing and citing sources..." />}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                            
                            <div className="p-6 bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
                                <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative group">
                                    <input 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={`Analyze ${sources.length} sources simultaneously...`}
                                        className="w-full pl-10 pr-20 py-5 bg-slate-800 border-2 border-transparent focus:border-cyan-500 rounded-3xl outline-none transition-all font-bold disabled:opacity-50 placeholder:text-slate-600"
                                    />
                                    <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-cyan-600 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                                        <Icons.Send className="h-5 w-5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress {
                    animation: progress 2s infinite ease-in-out;
                }
            `}} />
        </div>
    );
};
