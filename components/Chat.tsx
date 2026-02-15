
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Icons } from './Icons';
import { CopyButton, SourceBubble, Dropdown, CameraModal, LoadingSpinner } from './Shared';
import { Message, Source, VaultFile } from '../types';
import { chunkText, getSavedMessagesKey, createWavBlob } from '../utils/appUtils';
import { generateGeminiTTS, saveToLinguisticMemory } from '../services/geminiService';

/** Audio Decoding Utilities */
function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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

export const ChatMessage: React.FC<{ message: Message; language: string; currentUserEmail?: string | null; }> = ({ message, language, currentUserEmail }) => {
  const [ttsState, setTtsState] = useState<'stopped' | 'loading' | 'playing'>('stopped');
  const [activeVoice, setActiveVoice] = useState<'Kore' | 'Zephyr' | 'Fenrir' | 'Puck'>('Kore');
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isUser = message.sender === 'user';
  const [isSaved, setIsSaved] = useState(false);
  const savedMessagesKey = getSavedMessagesKey(currentUserEmail || null);

  useEffect(() => {
    if (savedMessagesKey && !isUser) {
        try {
            const saved = JSON.parse(localStorage.getItem(savedMessagesKey) || '[]');
            if (saved.some((m: Message) => m.id === message.id)) setIsSaved(true);
        } catch (e) {}
    }
    return () => stopTTS();
  }, [savedMessagesKey, message.id, isUser]);
  
  const handleSaveMessage = () => {
      if (!savedMessagesKey || !message.text) return;
      try {
          const saved = JSON.parse(localStorage.getItem(savedMessagesKey) || '[]');
          if (saved.some((m: Message) => m.id === message.id)) {
              const updated = saved.filter((m: Message) => m.id !== message.id);
              localStorage.setItem(savedMessagesKey, JSON.stringify(updated));
              setIsSaved(false);
          } else {
              saved.unshift(message);
              localStorage.setItem(savedMessagesKey, JSON.stringify(saved));
              setIsSaved(true);
          }
      } catch (e) {}
  };
  
  const processCitations = (text: string) => {
    const citationRegex = /\[Source:\s*([^\]]+)\]/g;
    return text.replace(citationRegex, (match, p1) => {
        return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-600/10 text-cyan-500 border border-cyan-500/20 rounded-md text-[10px] font-black uppercase tracking-tighter mx-1 cursor-default select-none shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>${p1}</span>`;
    });
  };

  const displayableText = useMemo(() => {
      if (isUser) return message.text;
      let text = (message.text || "").replace(/\/\/\/ SIMULATION_START[\s\S]*?\/\/\/ SIMULATION_END/g, '*(Interactive Simulation loaded in the Lab)*');
      return processCitations(text);
  }, [message.text, isUser]);

  const stopTTS = () => {
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch(e) {}
          audioSourceRef.current = null;
      }
      setTtsState('stopped');
  };

  const handleTTS = async () => {
    if (ttsState !== 'stopped') { stopTTS(); return; }
    setTtsState('loading');
    try {
        const cleanForAudio = (message.text || "").replace(/\[Source:[^\]]+\]/g, '').replace(/[*#`_]/g, '');
        const base64Audio = await generateGeminiTTS(cleanForAudio, activeVoice);
        if (!base64Audio) throw new Error("Synthesis core busy.");
        const pcmData = decode(base64Audio);
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await decodeAudioData(pcmData, audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setTtsState('stopped');
        audioSourceRef.current = source;
        source.start();
        setTtsState('playing');
    } catch (err) { setTtsState('stopped'); }
  };

  const langClass = language === 'Urdu' ? 'font-urdu' : language === 'Sindhi' ? 'font-sindhi' : '';
  const voiceOptions = ['Kore', 'Zephyr', 'Fenrir', 'Puck'];
  const voiceDisplayMap = { Kore: 'Clear Male', Zephyr: 'Warm Male', Fenrir: 'Deep Male', Puck: 'Bright Male' };
  
  const isError = message.text.startsWith('/// SYSTEM ERROR:');

  return (
    <div className={`flex items-start gap-4 mt-8 ${isUser ? 'justify-end' : ''}`} data-is-bot-message={!isUser}>
      {!isUser && (
        <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br ${isError ? 'from-red-800 to-slate-950 text-red-400' : 'from-slate-800 to-slate-950 text-cyan-400'} shadow-2xl border border-slate-700 transform -rotate-3 transition-transform hover:rotate-0`}>
          {isError ? <Icons.AlertTriangle className="h-7 w-7" /> : <Icons.Sparkles className="h-7 w-7" />}
        </div>
      )}
      <div className={`max-w-2xl flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
         <div className={`flex flex-wrap items-center gap-2 mb-2 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && !isError && (
                <div className="flex items-center gap-1 p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-slate-200 dark:border-slate-800 shadow-sm scale-90">
                    <button onClick={handleTTS} className={`p-1.5 rounded-full transition-colors ${ttsState === 'playing' ? 'text-red-500 hover:bg-red-50' : 'text-cyan-600 hover:bg-cyan-50'}`}>
                        {ttsState === 'loading' ? <Icons.Spinner className="h-4 w-4 animate-spin" /> : ttsState === 'playing' ? <Icons.Stop className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                    </button>
                    <div className="w-24">
                        <Dropdown options={voiceOptions} selected={activeVoice} onSelect={(v) => { stopTTS(); setActiveVoice(v); }} displayValueMap={voiceDisplayMap} />
                    </div>
                </div>
            )}
            <div className="flex items-center gap-1 scale-90">
                <CopyButton textToCopy={message.text} />
                {!isUser && !isError && (
                    <button onClick={handleSaveMessage} className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 ${isSaved ? 'text-cyan-500' : 'text-slate-400'}`}>
                        {isSaved ? <Icons.BookmarkCheck className="h-4 w-4" /> : <Icons.Bookmark className="h-4 w-4" />}
                    </button>
                )}
            </div>
         </div>
         <div className={`group relative p-6 rounded-[32px] w-full transition-all duration-300 shadow-2xl ${isUser ? 'bg-cyan-600 text-white rounded-tr-none' : isError ? 'bg-red-50 dark:bg-red-900/10 border-l-[6px] border-red-500 text-red-700 dark:text-red-300 rounded-tl-none' : 'bg-white dark:bg-slate-800/80 border-l-[6px] border-cyan-500 dark:text-slate-100 rounded-tl-none'}`}>
            <span className={`absolute -top-3 ${isUser ? 'right-4' : 'left-4'} text-[9px] font-black font-commander uppercase tracking-[0.3em] bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm ${isError ? 'text-red-600' : 'text-cyan-600 dark:text-cyan-400'}`}>
                {isUser ? 'Authorized User' : isError ? 'System Failure' : 'SigNify OS • Intelligence'}
            </span>
            {message.imageUrls && message.imageUrls.length > 0 && (
                <div className={`grid gap-4 mb-4 ${message.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {message.imageUrls.map((url, index) => <img key={index} src={url} className="rounded-3xl max-w-full bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-lg" alt="transmission" />)}
                </div>
            )}
            <div className={`prose dark:prose-invert max-w-none text-base leading-relaxed ${langClass}`} dangerouslySetInnerHTML={{ __html: (window as any).marked.parse(displayableText) }} />
         </div>
      </div>
       {isUser && (
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-2xl border border-slate-100 dark:border-slate-800 transform rotate-3 transition-transform hover:rotate-0">
          <Icons.User className="h-7 w-7" />
        </div>
      )}
    </div>
  );
};

export const ChatComponent: React.FC<{
    historyId: string;
    pageTitle: string;
    welcomeMessage: { author: string; text: string };
    placeholder: string;
    showFilters: boolean;
    isOnline: boolean;
    aiStreamFunction: any;
    currentUserEmail?: string | null;
    userProfileNotes?: string;
    onSimulationCodeFound?: (code: string) => void;
}> = ({ historyId, pageTitle, welcomeMessage, placeholder, showFilters, isOnline, aiStreamFunction, currentUserEmail, userProfileNotes, onSimulationCodeFound }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [attachedImages, setAttachedImages] = useState<{ base64: string; mimeType: string; name: string }[]>([]);
    const [language, setLanguage] = useState('English');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const storageKey = useMemo(() => `${historyId}_${(currentUserEmail || 'global').replace(/[@.]/g, '_')}`, [historyId, currentUserEmail]);
    const vaultKey = useMemo(() => `signify_vault_${(currentUserEmail || 'global').replace(/[@.]/g, '_')}`, [currentUserEmail]);

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) setMessages(JSON.parse(saved));
        
        const vault = localStorage.getItem(vaultKey);
        if (vault) setVaultFiles(JSON.parse(vault).files || []);

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(p => p + (p ? ' ' : '') + transcript);
                setIsRecording(false);
                saveToLinguisticMemory(transcript);
            };
            recognitionRef.current.onend = () => setIsRecording(false);
        }
    }, [storageKey, vaultKey]);

    const handleToggleRecording = () => {
        if (!recognitionRef.current) { alert("Speech Recognition not supported."); return; }
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.lang = language === 'Urdu' ? 'ur-PK' : language === 'Sindhi' ? 'sd-PK' : 'en-US';
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && attachedImages.length === 0) || isLoading || !isOnline) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            imageUrls: attachedImages.map(img => `data:${img.mimeType};base64,${img.base64}`)
        };
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot' };

        setMessages(prev => [...prev, userMsg, botMsg]);
        const currentInput = input;
        const currentImages = [...attachedImages];
        setInput(''); setAttachedImages([]); setIsLoading(true);

        try {
            const stream = aiStreamFunction(currentInput, messages, language, currentImages, currentUserEmail, userProfileNotes);
            let fullText = '';
            for await (const chunk of stream) {
                if (chunk.error) throw new Error(chunk.error);
                if (chunk.text) {
                    fullText += chunk.text;
                    setMessages(prev => {
                        const updated = prev.map(m => m.id === botMsg.id ? { ...m, text: fullText } : m);
                        localStorage.setItem(storageKey, JSON.stringify(updated));
                        return updated;
                    });
                    if (onSimulationCodeFound) {
                        const simMatch = fullText.match(/\/\/\/ SIMULATION_START([\s\S]*?)\/\/\/ SIMULATION_END/);
                        if (simMatch && simMatch[1]) onSimulationCodeFound(simMatch[1]);
                    }
                }
            }
            saveToLinguisticMemory(fullText);
            saveToLinguisticMemory(currentInput);
        } catch (err: any) {
            const errorMsg = err?.message || "Transmission timed out.";
            setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, text: `/// SYSTEM ERROR: ${errorMsg}` } : m));
        } finally { setIsLoading(false); }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                setAttachedImages(prev => [...prev, { base64, mimeType: file.type, name: file.name }]);
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-xl font-black font-commander uppercase tracking-tighter">{pageTitle}</h2>
                    {showFilters && (
                        <div className="w-40">
                            <Dropdown options={['English', 'Urdu', 'Sindhi']} selected={language} onSelect={setLanguage} />
                        </div>
                    )}
                </div>
                {vaultFiles.length > 0 && (
                    <div className="flex items-center gap-3 px-2 overflow-x-auto no-scrollbar py-1">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-600/10 border border-cyan-500/20 rounded-lg whitespace-nowrap">
                            <Icons.Bookmark className="h-3 w-3 text-cyan-500" />
                            <span className="text-[8px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-widest">Neural Recall Active:</span>
                        </div>
                        {vaultFiles.map(f => (
                            <span key={f.id} className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                {f.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg">
                            <Icons.Sparkles className="h-6 w-6" />
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none shadow-md border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase mb-1">{welcomeMessage.author}</p>
                            <p className="text-sm">{welcomeMessage.text}</p>
                            {vaultFiles.length > 0 && <p className="text-[10px] text-slate-500 mt-2 italic">I have indexed {vaultFiles.length} files from your Neural Vault for this session.</p>}
                        </div>
                    </div>
                    {messages.map(m => (
                        <ChatMessage key={m.id} message={m} language={language} currentUserEmail={currentUserEmail} />
                    ))}
                    {isLoading && <LoadingSpinner label="Broadcasting to Logic Core..." />}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 md:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-3xl mx-auto">
                    {attachedImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {attachedImages.map((img, i) => (
                                <div key={i} className="relative group">
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} className="h-16 w-16 object-cover rounded-xl border-2 border-cyan-500 shadow-lg" alt="attachment" />
                                    <button onClick={() => setAttachedImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Icons.X className="h-3 w-3"/></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                placeholder={placeholder}
                                className="w-full pl-12 pr-12 py-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-cyan-500 outline-none transition-all font-medium text-sm"
                                rows={1}
                            />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-cyan-500"><Icons.Paperclip className="h-5 w-5" /></button>
                            <button type="button" onClick={handleToggleRecording} title="Record Audio" className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 transition-all ${isRecording ? 'text-red-500 animate-pulse scale-125' : 'text-slate-400 hover:text-cyan-500'}`}><Icons.Mic2 className="h-5 w-5" /></button>
                        </div>
                        <button type="button" onClick={() => setIsCameraOpen(true)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-cyan-500"><Icons.Camera className="h-5 w-5" /></button>
                        <button type="submit" disabled={isLoading || (!input.trim() && attachedImages.length === 0)} className="p-4 bg-cyan-600 text-white rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 transition-all">
                            <Icons.Send className="h-5 w-5" />
                        </button>
                    </form>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleImageUpload} accept="image/*" />
                </div>
            </div>
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(d) => setAttachedImages(p => [...p, { base64: d.split(',')[1], mimeType: 'image/jpeg', name: 'capture.jpg' }])} />
        </div>
    );
};
