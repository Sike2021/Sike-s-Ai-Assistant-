import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from './Icons';
import { Dropdown, CameraModal, LoadingSpinner } from './Shared';
import { ChatMessage } from './Chat';
import { Message, Conversation, PageProps, UserProfile } from '../types';
import { streamAIChatResponse, generateConversationTitle } from '../services/geminiService';
import { getConversationsKey, SIKE_USERS_KEY } from '../utils/appUtils';

const chatModes = ['General', 'Technical', 'Creative', 'Academic', 'Linguistic'];

export const AIChatPage: React.FC<PageProps & { userProfileNotes?: string }> = ({ isOnline, currentUserEmail, userProfileNotes }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedImages, setAttachedImages] = useState<{ base64: string; mimeType: string; name: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [chatMode, setChatMode] = useState('General');
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const currentUser: UserProfile | null = useMemo(() => {
        if (!currentUserEmail) return null;
        const users = JSON.parse(localStorage.getItem(SIKE_USERS_KEY) || '[]');
        return users.find((u: any) => u.email === currentUserEmail) || null;
    }, [currentUserEmail]);

    const userName = currentUser?.name || 'Guest';

    const convKey = getConversationsKey(currentUserEmail);
    useEffect(() => {
        if (convKey) {
            const saved = localStorage.getItem(convKey);
            if (saved) setConversations(JSON.parse(saved).sort((a: any, b: any) => b.lastUpdated - a.lastUpdated));
        }
    }, [convKey]);

    const currentMessages = useMemo(() => {
        const convo = conversations.find(c => c.id === currentConversationId);
        return convo ? convo.messages : [];
    }, [currentConversationId, conversations]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentMessages, isLoading]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && attachedImages.length === 0) || isLoading || !isOnline) return;
        let convoId = currentConversationId || Date.now().toString();
        if (!currentConversationId) setCurrentConversationId(convoId);
        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        if (attachedImages.length > 0) userMsg.imageUrls = attachedImages.map(img => `data:${img.mimeType};base64,${img.base64}`);
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot' };
        
        setConversations(prev => {
            let updated;
            const existing = prev.find(c => c.id === convoId);
            if (existing) {
                updated = prev.map(c => c.id === convoId ? { ...c, messages: [...c.messages, userMsg, botMsg], lastUpdated: Date.now() } : c);
            } else {
                updated = [{ id: convoId, title: 'New Transmission', messages: [userMsg, botMsg], lastUpdated: Date.now() }, ...prev];
            }
            localStorage.setItem(convKey, JSON.stringify(updated));
            return updated;
        });

        const history = currentMessages;
        const currentInput = input; setInput(''); setAttachedImages([]); setIsLoading(true);
        try {
            const stream = streamAIChatResponse(currentInput, history, "English", attachedImages, currentUserEmail, userProfileNotes, chatMode, userName);
            let acc = "";
            for await (const chunk of stream) {
                if (chunk.text) acc += chunk.text;
                setConversations(prev => {
                    const up = prev.map(c => c.id === convoId ? { ...c, messages: c.messages.map(m => m.id === botMsg.id ? { ...m, text: acc } : m) } : c);
                    localStorage.setItem(convKey, JSON.stringify(up));
                    return up;
                });
            }
            if (conversations.find(c => c.id === convoId)?.title === 'New Transmission') {
                generateConversationTitle(currentInput, acc).then(t => setConversations(p => p.map(c => c.id === convoId ? { ...c, title: t } : c)));
            }
        } catch (err) {
            console.error("Transmission Error:", err);
            setConversations(prev => {
                const up = prev.map(c => c.id === convoId ? { ...c, messages: c.messages.map(m => m.id === botMsg.id ? { ...m, text: "Stability error. Bandwidth check failed." } : m) } : c);
                return up;
            });
        } finally { setIsLoading(false); }
    };

    return (
        <div className="flex h-full bg-white dark:bg-slate-950 overflow-hidden">
            {/* Mobile History Drawer */}
            <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isHistoryOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
                <div className={`absolute top-0 left-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 transform ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-commander font-black uppercase text-xs tracking-widest text-cyan-500">Archives</h3>
                            <button onClick={() => setIsHistoryOpen(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><Icons.X className="h-4 w-4" /></button>
                        </div>
                        <button onClick={() => { setCurrentConversationId(null); setIsHistoryOpen(false); }} className="w-full flex items-center justify-center gap-3 py-4 rounded-[20px] bg-cyan-600 text-white font-black font-commander tracking-widest active:scale-95 transition-all mb-8 shadow-xl shadow-cyan-600/20">
                            <Icons.Plus className="h-5 w-5" /> NEW COMMS
                        </button>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {conversations.map(c => (
                                <button key={c.id} onClick={() => { setCurrentConversationId(c.id); setIsHistoryOpen(false); }} className={`w-full text-left px-5 py-4 rounded-[20px] transition-all group relative overflow-hidden ${currentConversationId === c.id ? 'bg-slate-100 dark:bg-slate-800 border-l-4 border-cyan-500 shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'}`}>
                                    <p className="font-bold text-sm truncate pr-6">{c.title}</p>
                                    <p className="text-[9px] text-slate-400 mt-1 font-mono">{new Date(c.lastUpdated).toLocaleDateString()}</p>
                                    <Icons.Trash onClick={(e) => { e.stopPropagation(); setConversations(prev => {
                                        const filtered = prev.filter(p => p.id !== c.id);
                                        localStorage.setItem(convKey, JSON.stringify(filtered));
                                        return filtered;
                                    }); }} className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative">
                {/* Top Action Bar */}
                <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2 px-4">
                    <button onClick={() => setIsHistoryOpen(true)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-cyan-600 dark:text-cyan-400 active:scale-90 transition-all">
                        <Icons.Menu className="h-5 w-5" />
                    </button>
                    <div className="flex-1 max-w-[200px]">
                        <Dropdown options={chatModes} selected={chatMode} onSelect={setChatMode} />
                    </div>
                    <button onClick={() => setCurrentConversationId(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 active:scale-90 transition-all">
                        <Icons.Plus className="h-5 w-5" />
                    </button>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        {currentMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                <div className="p-6 bg-cyan-600/5 rounded-[40px] border border-cyan-500/10 mb-6">
                                    <LoadingSpinner size="60px" label="2.5 Flash Engine Ready" />
                                </div>
                                <h2 className="text-2xl font-black font-commander uppercase tracking-tighter mt-4 dark:text-white">SigNify OS 3.2</h2>
                                <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto font-medium">Neural handshake established. Systems online for {userName}.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {currentMessages.map(m => <ChatMessage key={m.id} message={m} language="English" currentUserEmail={currentUserEmail} />)}
                                {isLoading && <div className="py-10"><LoadingSpinner label="Engine Reasoning..." /></div>}
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-20" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-4xl mx-auto">
                        {attachedImages.length > 0 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                                {attachedImages.map((img, i) => (
                                    <div key={i} className="relative flex-shrink-0">
                                        <img src={`data:${img.mimeType};base64,${img.base64}`} className="h-16 w-16 object-cover rounded-xl border-2 border-cyan-500" />
                                        <button onClick={() => setAttachedImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"><Icons.X className="h-3 w-3"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="relative flex items-center gap-2">
                            <div className="relative flex-1">
                                <textarea 
                                    value={input} 
                                    onChange={(e) => setInput(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())} 
                                    placeholder="Type instructions..." 
                                    className="w-full pl-6 pr-12 py-5 bg-slate-100 dark:bg-slate-800/80 rounded-[28px] border-2 border-transparent focus:border-cyan-500 outline-none transition-all font-bold text-base resize-none max-h-40 overflow-y-auto" 
                                    rows={1} 
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-cyan-500"><Icons.Paperclip className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <button onClick={() => setIsCameraOpen(true)} className="p-5 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-500 active:scale-90 transition-all"><Icons.Camera className="h-5 w-5" /></button>
                            <button onClick={() => handleSubmit()} disabled={isLoading || !input.trim()} className="p-5 bg-cyan-600 text-white rounded-3xl shadow-xl shadow-cyan-600/30 active:scale-90 transition-all disabled:opacity-50"><Icons.Send className="h-5 w-5" /></button>
                        </div>
                    </div>
                </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = () => setAttachedImages(p => [...p, { base64: (reader.result as string).split(',')[1], mimeType: file.type, name: file.name }]);
                    reader.readAsDataURL(file);
                });
            }} accept="image/*" />
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(d) => setAttachedImages(p => [...p, { base64: d.split(',')[1], mimeType: 'image/jpeg', name: 'capture.jpg' }])} />
        </div>
    );
};
