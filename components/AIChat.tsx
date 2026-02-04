
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Icons } from './Icons';
import { Dropdown, CameraModal, LoadingSpinner } from './Shared';
import { ChatMessage } from './Chat';
import { Message, Conversation, PageProps, UserProfile } from '../types';
import { streamAIChatResponse, generateConversationTitle } from './services/geminiService';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
        const currentInput = input;
        const currentImages = [...attachedImages];
        setInput(''); setAttachedImages([]); setIsLoading(true);
        try {
            // Updated call signature: prompt, history, language, images, userEmail, userProfileNotes, chatMode, userName
            const stream = streamAIChatResponse(currentInput, history, 'English', currentImages, currentUserEmail, userProfileNotes, chatMode, userName);
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
                const up = prev.map(c => c.id === convoId ? { ...c, messages: c.messages.map(m => m.id === botMsg.id ? { ...m, text: "Bandwidth saturation detected. The stable logic core is cooling down. Please retry in 60 seconds." } : m) } : c);
                return up;
            });
        } finally { setIsLoading(false); }
    };

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-950">
            <div className={`flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl border-r border-slate-200 dark:border-slate-800 transition-all duration-500 overflow-hidden ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
                <div className="p-6 h-full flex flex-col">
                    <button onClick={() => setCurrentConversationId(null)} className="w-full flex items-center justify-center gap-3 py-4 rounded-[24px] bg-cyan-600 text-white font-black font-commander tracking-widest shadow-xl shadow-cyan-600/20 active:scale-95 transition-all mb-8">
                        <Icons.Plus className="h-5 w-5" /> NEW COMMS
                    </button>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Transmission Logs</p>
                        {conversations.map(c => (
                            <button key={c.id} onClick={() => setCurrentConversationId(c.id)} className={`w-full text-left px-5 py-4 rounded-[20px] transition-all group relative overflow-hidden ${currentConversationId === c.id ? 'bg-white dark:bg-slate-800 shadow-xl border-l-4 border-cyan-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}>
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
            <div className="flex-1 flex flex-col relative">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute left-4 top-4 z-20 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-cyan-500">{isSidebarOpen ? <Icons.PanelLeftClose /> : <Icons.PanelLeftOpen />}</button>
                <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-4 flex justify-center">
                    <div className="w-64"><Dropdown label="Quantum Logic Mode" options={chatModes} selected={chatMode} onSelect={setChatMode} /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        {currentMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                <LoadingSpinner size="80px" label="Stable Core: Gemini 3.1 Flash" />
                                <h2 className="text-3xl font-black font-commander uppercase tracking-tighter mt-6">SigNify Engine 3.2</h2>
                                <p className="text-slate-500 mt-2">Welcome, {userName}. Awaiting instruction via Stable Logic Core.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {currentMessages.map(m => <ChatMessage key={m.id} message={m} language="English" currentUserEmail={currentUserEmail} />)}
                                {isLoading && <div className="py-10"><LoadingSpinner label="Engine Reasoning (Flash Mode)..." /></div>}
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-20" />
                    </div>
                </div>
                <div className="p-6 md:p-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-2xl">
                    <div className="max-w-4xl mx-auto relative group">
                        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())} placeholder="Initiate neural handshake..." className="w-full pl-16 pr-32 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-transparent focus:border-cyan-500 outline-none transition-all font-bold text-lg" rows={1} />
                        <button onClick={() => fileInputRef.current?.click()} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-cyan-500"><Icons.Paperclip className="h-6 w-6" /></button>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {}} />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                            <button onClick={() => setIsCameraOpen(true)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-2xl text-slate-500"><Icons.Camera className="h-6 w-6" /></button>
                            <button onClick={() => handleSubmit()} disabled={isLoading || !input.trim()} className="p-4 bg-cyan-600 text-white rounded-2xl shadow-xl shadow-cyan-600/30 active:scale-90 transition-all"><Icons.Send className="h-6 w-6" /></button>
                        </div>
                    </div>
                </div>
            </div>
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(d) => setAttachedImages(p => [...p, { base64: d.split(',')[1], mimeType: 'image/jpeg', name: 'capture.jpg' }])} />
        </div>
    );
};
