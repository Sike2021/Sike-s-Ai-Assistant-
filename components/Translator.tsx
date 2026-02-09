import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { Dropdown, LoadingSpinner } from './Shared';
import { PageProps, TranslatorResponse } from '../types';
import { getTranslatorResponse, getTranslatorResponseFromImage, generateGeminiTTS } from '../services/geminiService';
import { createWavBlob } from '../utils/appUtils';

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

export const TranslatorPage: React.FC<PageProps> = ({ isOnline }) => {
    const [sourceText, setSourceText] = useState('');
    const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sourceLanguage, setSourceLanguage] = useState('English');
    const [targetLanguage, setTargetLanguage] = useState('Urdu');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TranslatorResponse | null>(null);
    const [fontSize, setFontSize] = useState(1);

    // Audio State
    const [ttsState, setTtsState] = useState<'stopped' | 'loading' | 'playing'>('stopped');
    const [lastPcmData, setLastPcmData] = useState<Uint8Array | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        return () => stopTTS();
    }, []);

    const stopTTS = () => {
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch(e) {}
            audioSourceRef.current = null;
        }
        setTtsState('stopped');
    };

    const handleTTS = async () => {
        if (!result || !result.mainTranslation || !isOnline) return;
        if (ttsState !== 'stopped') {
            stopTTS();
            return;
        }

        setTtsState('loading');
        try {
            const voice = targetLanguage === 'English' ? 'Zephyr' : (targetLanguage === 'Urdu' || targetLanguage === 'Arabic') ? 'Kore' : 'Puck';
            const base64Audio = await generateGeminiTTS(result.mainTranslation, voice, 'Calm');
            
            if (!base64Audio) throw new Error("Synthesis core timed out.");

            const pcmData = decode(base64Audio);
            setLastPcmData(pcmData);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            const audioBuffer = await decodeAudioData(pcmData, audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setTtsState('stopped');
            
            audioSourceRef.current = source;
            source.start();
            setTtsState('playing');
        } catch (err) {
            console.error("Audio Handshake Error:", err);
            setTtsState('stopped');
            setError("Audio core is currently busy or connection is too unstable.");
        }
    };

    const handleDownloadAudio = () => {
        if (!lastPcmData) return;
        const blob = createWavBlob(lastPcmData);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signify_translation_${Date.now()}.wav`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleTranslate = async () => {
        if ((!sourceText.trim() && !attachedImage) || !isOnline) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        stopTTS();
        setLastPcmData(null);
        try {
            let translation;
            if (attachedImage) {
                translation = await getTranslatorResponseFromImage(attachedImage.base64, attachedImage.mimeType, sourceLanguage, targetLanguage);
            } else {
                translation = await getTranslatorResponse(sourceText, sourceLanguage, targetLanguage);
            }
            
            if (!translation || !translation.mainTranslation) {
                throw new Error("Translation core returned malformed data.");
            }
            
            setResult(translation);
        } catch (err) {
            let errorMessage = "Handshake failed. The logic core is currently unreachable.";
            const rawError = err instanceof Error ? err.message : String(err);
            
            // Specifically handle quota exhaustion (429)
            if (rawError.includes("429") || rawError.includes("quota") || rawError.includes("RESOURCE_EXHAUSTED")) {
                errorMessage = "Neural Bandwidth Saturated (Quota Limit). The logic core is cooling down. Please wait 60 seconds and try again. Switching to 'Stable Mode' (Flash Core) for next attempt.";
            } else if (rawError.includes("JSON")) {
                errorMessage = "Decoding Error. The matrix returned an unreadable response. Please simplify your input.";
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const fontSizeClasses = ['text-base', 'text-xl', 'text-2xl'];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-cyan-600 rounded-[24px] text-white shadow-xl shadow-cyan-500/20 transform -rotate-3">
                        <Icons.Translator className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black font-commander uppercase tracking-tighter text-slate-900 dark:text-white">Neural Linguistics</h1>
                        <p className="text-sm text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-widest">Stable Core: Gemini 2.5 Flash</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Input Panel */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8">
                            <Dropdown label="Origin" options={['English', 'Urdu', 'Sindhi', 'Arabic', 'French', 'German', 'Spanish']} selected={sourceLanguage} onSelect={setSourceLanguage} />
                            <div className="pt-6"><Icons.RefreshCw className="h-6 w-6 text-slate-300 dark:text-slate-600" /></div>
                            <Dropdown label="Destination" options={['Urdu', 'Sindhi', 'English', 'Arabic', 'French', 'German', 'Spanish']} selected={targetLanguage} onSelect={setTargetLanguage} />
                        </div>

                        <div className="relative flex-1">
                            <textarea
                                className="w-full h-80 p-8 rounded-[40px] bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-cyan-500 focus:outline-none transition-all text-xl font-medium custom-scrollbar placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                placeholder={attachedImage ? "Text extracted from transmission..." : "Type text to translate or upload an image..."}
                                value={sourceText}
                                onChange={(e) => { setSourceText(e.target.value); if(attachedImage) setAttachedImage(null); }}
                            />
                            {!attachedImage && (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-6 right-6 p-4 bg-white dark:bg-slate-700 rounded-[28px] shadow-2xl border border-slate-100 dark:border-slate-600 text-slate-500 hover:text-cyan-500 transition-all hover:scale-110 active:scale-95"
                                    title="Visual Translation"
                                >
                                    <Icons.Camera className="h-7 w-7" />
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if(file) {
                                    const reader = new FileReader();
                                    reader.onload = () => setAttachedImage({ base64: (reader.result as string).split(',')[1], mimeType: file.type, name: file.name });
                                    reader.readAsDataURL(file);
                                }
                            }} />
                        </div>

                        {attachedImage && (
                            <div className="mt-6 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-[32px] border border-cyan-100 dark:border-cyan-800 flex items-center justify-between animate-in fade-in zoom-in-95">
                                <div className="flex items-center gap-3">
                                    <Icons.BookImage className="h-5 w-5 text-cyan-500" />
                                    <span className="text-xs font-black text-cyan-700 dark:text-cyan-300 truncate max-w-[200px] uppercase tracking-widest">{attachedImage.name}</span>
                                </div>
                                <button onClick={() => setAttachedImage(null)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"><Icons.X className="h-5 w-5"/></button>
                            </div>
                        )}

                        <button 
                            onClick={handleTranslate} 
                            disabled={isLoading || (!sourceText.trim() && !attachedImage) || !isOnline} 
                            className="mt-8 w-full py-6 bg-cyan-600 text-white rounded-[32px] font-black font-commander uppercase tracking-[0.2em] text-xs shadow-2xl shadow-cyan-600/30 hover:bg-cyan-500 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                        >
                            {isLoading ? <Icons.Spinner className="animate-spin h-6 w-6" /> : <Icons.Languages className="h-6 w-6" />}
                            {isLoading ? 'Encrypting Linguistics...' : 'Initiate Handshake'}
                        </button>
                    </div>

                    {/* Result Panel */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[600px]">
                        <div className="flex justify-between items-center mb-8 px-2">
                            <h2 className="text-[10px] font-black font-commander text-slate-400 uppercase tracking-[0.5em]">Translation Matrix</h2>
                            <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-[20px]">
                                {[0, 1, 2].map(i => (
                                    <button key={i} onClick={() => setFontSize(i)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${fontSize === i ? 'bg-white dark:bg-slate-700 shadow-xl text-cyan-500' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <Icons.TextSize className={`h-${5+i} w-${5+i}`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col">
                            {isLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                                    <LoadingSpinner size="80px" label="Reconstructing Syntax..." />
                                    <p className="text-[10px] font-commander font-black text-slate-400 uppercase tracking-widest animate-pulse">Quantum reasoning in progress</p>
                                </div>
                            ) : error ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-red-50 dark:bg-red-950/20 rounded-[40px] border border-red-100 dark:border-red-900/30">
                                    <div className="p-5 bg-white dark:bg-red-900/30 rounded-[30px] shadow-xl mb-6">
                                        <Icons.AlertTriangle className="h-10 w-10 text-red-500" />
                                    </div>
                                    <h3 className="text-red-600 dark:text-red-400 font-black font-commander uppercase text-sm mb-2">Matrix Failure</h3>
                                    <p className="text-red-500 text-sm font-bold max-w-xs">{error}</p>
                                    <button onClick={handleTranslate} className="mt-8 px-8 py-3 bg-red-600 text-white font-black font-commander uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-500 transition-all shadow-lg shadow-red-600/20">Retry Handshake</button>
                                </div>
                            ) : result ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 h-full overflow-y-auto custom-scrollbar pr-2">
                                    <div className="p-10 bg-slate-50 dark:bg-slate-800/40 rounded-[48px] border-l-[12px] border-cyan-500 relative group shadow-inner">
                                        <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <button onClick={handleTTS} className={`p-4 rounded-[24px] bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700 transition-all hover:scale-110 active:scale-95 ${ttsState === 'playing' ? 'text-red-500' : 'text-cyan-600'}`}>
                                                {ttsState === 'loading' ? <Icons.Spinner className="h-6 w-6 animate-spin" /> : ttsState === 'playing' ? <Icons.Stop className="h-6 w-6" /> : <Icons.Volume2 className="h-6 w-6" />}
                                            </button>
                                            {lastPcmData && (
                                                <button onClick={handleDownloadAudio} className="p-4 rounded-[24px] bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700 text-cyan-600 transition-all hover:scale-110 active:scale-95">
                                                    <Icons.Download className="h-6 w-6" />
                                                </button>
                                            )}
                                        </div>
                                        <p className={`leading-relaxed font-bold tracking-tight text-slate-800 dark:text-slate-100 ${fontSizeClasses[fontSize]} ${targetLanguage === 'Urdu' ? 'font-urdu' : targetLanguage === 'Sindhi' ? 'font-sindhi' : ''}`}>
                                            {result.mainTranslation}
                                        </p>
                                        <div className="mt-6 flex items-center gap-2 opacity-30">
                                            <div className="h-1 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                            <span className="text-[8px] font-black font-commander uppercase">End Transmission</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pb-8">
                                        <div className="flex items-center gap-4 px-2">
                                            <h3 className="text-[10px] font-black font-commander text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.4em]">Granular Analysis</h3>
                                            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {result.wordByWord && result.wordByWord.map((item, idx) => (
                                                <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-[30px] border border-slate-100 dark:border-slate-800/50 flex justify-between items-center group hover:border-cyan-500/40 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{item.original}</span>
                                                    <span className={`font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors ${targetLanguage === 'Urdu' ? 'font-urdu text-lg' : ''}`}>{item.translation}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-center grayscale select-none">
                                    <Icons.Feather className="h-32 w-32 mb-6" />
                                    <p className="font-commander font-black uppercase tracking-[1em] text-sm">Awaiting Input Stream</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};