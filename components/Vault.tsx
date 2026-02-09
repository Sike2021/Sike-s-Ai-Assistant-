import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from './Icons';
import { LoadingSpinner, Dropdown, CopyButton } from './Shared';
import { PageProps, VaultFile, VaultTask, Message } from '../types';
import { streamVaultChatResponse, analyzeVaultFile, getGlobalVaultContext } from '../services/geminiService';
import { INJECTED_STORIES } from '../services/injectedKnowledge';
import { ChatMessage } from './Chat';

export const NeuralVaultPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => {
    const [files, setFiles] = useState<VaultFile[]>([]);
    const [tasks, setTasks] = useState<VaultTask[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [indexingStatus, setIndexingStatus] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const storageKey = useMemo(() => `signify_vault_${(currentUserEmail || 'global').replace(/[@.]/g, '_')}`, [currentUserEmail]);

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            setFiles(parsed.files || []);
            setTasks(parsed.tasks || []);
            setMessages(parsed.messages || []);
        }
    }, [storageKey]);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify({ files, tasks, messages }));
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [files, tasks, messages]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = Array.from(e.target.files || []) as File[];
        uploadedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target?.result as string;
                const newFile: VaultFile = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    content,
                    size: file.size,
                    type: file.type,
                    uploadedAt: Date.now(),
                    summary: "Initializing Neural Map..."
                };
                
                setFiles(prev => [...prev, newFile]);
                if (isOnline) {
                    setIndexingStatus(`Analysing ${file.name}...`);
                    try {
                        const analysis = await analyzeVaultFile(newFile);
                        setFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, ...analysis } : f));
                        setTasks(prev => [...prev, ...analysis.tasks]);
                    } catch (e) {
                        console.error("Neural handshake failed", e);
                    } finally {
                        setIndexingStatus(null);
                    }
                }
            };
            reader.readAsText(file);
        });
        if (e.target) e.target.value = '';
    };

    const handleChat = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || isLoading || !isOnline) return;

        const userMsg: Message = { id: Date.now().toString(), text: chatInput, sender: 'user' };
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot' };
        
        setMessages(prev => [...prev, userMsg, botMsg]);
        const currentInput = chatInput;
        setChatInput('');
        setIsLoading(true);

        try {
            const stream = streamVaultChatResponse(currentInput, messages, 'English', files, currentUserEmail, userProfileNotes);
            let acc = "";
            for await (const chunk of stream) {
                if (chunk.text) {
                    acc += chunk.text;
                    setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, text: acc } : m));
                }
            }
        } catch (e) {
            setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, text: "Vault core unreachable. Using Stable Mode for next attempt." } : m));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTask = (taskId: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
    };

    const memoryUsage = useMemo(() => {
        const totalSize = files.reduce((acc, f) => acc + f.size, 0);
        return Math.min(100, (totalSize / (100 * 1024 * 1024)) * 100);
    }, [files]);

    return (
        <div className="h-full flex bg-slate-950 text-white overflow-hidden font-commander">
            {/* Left Panel: Neural Matrix */}
            <div className={`flex-shrink-0 bg-slate-900 border-r border-slate-800 transition-all duration-500 overflow-hidden flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="font-black text-xs uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                        <Icons.Bookmark className="h-4 w-4" /> Neural Matrix
                    </h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors"><Icons.X className="h-5 w-5" /></button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Neural Data Nodes</p>
                    {files.map(f => (
                        <div key={f.id} onClick={() => setActiveFileId(f.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${activeFileId === f.id ? 'bg-cyan-600/10 border-cyan-500 shadow-[0_0_25px_rgba(34,211,238,0.15)]' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}`}>
                            <div className="flex items-center gap-3">
                                <Icons.FileText className={`h-5 w-5 ${activeFileId === f.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{f.name}</p>
                                    <p className="text-[9px] text-slate-500 uppercase">{(f.size / 1024).toFixed(1)} KB • Local</p>
                                </div>
                            </div>
                            {f.summary && <p className="mt-2 text-[10px] text-slate-400 leading-relaxed line-clamp-2 italic">"{f.summary}"</p>}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter(file => file.id !== f.id)); }} className="text-red-500 hover:scale-110"><Icons.Trash className="h-4 w-4"/></button>
                            </div>
                        </div>
                    ))}
                    
                    {files.length === 0 && (
                        <div className="h-64 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-slate-700 rounded-[32px] mx-2">
                            <Icons.Upload className="h-10 w-10 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest px-8">Inject new source to extend neural map</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-600 text-white rounded-2xl font-black font-commander text-[10px] uppercase tracking-widest shadow-xl hover:bg-cyan-500 active:scale-95 transition-all">
                        <Icons.Plus className="h-4 w-4" /> Inject Source
                    </button>
                    <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} className="hidden" />
                </div>
            </div>

            {/* Main Workspace: Neural Canvas */}
            <div className="flex-1 flex flex-col relative bg-slate-950">
                {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} className="absolute left-6 top-6 z-20 p-3 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 text-cyan-500 hover:scale-105 active:scale-95 transition-all"><Icons.PanelLeftOpen /></button>
                )}

                <div className="flex-shrink-0 border-b border-slate-800 p-4 md:px-10 flex justify-between items-center bg-slate-950/80 backdrop-blur-md">
                    <div className="space-y-0.5">
                        <h1 className="text-xl font-black uppercase tracking-widest text-white">Neural <span className="text-cyan-400">Vault 4.0</span></h1>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.5em]">Stable Engine: Gemini 2.5 Flash</p>
                    </div>
                    {indexingStatus && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-cyan-600/10 border border-cyan-500/30 rounded-full animate-in fade-in zoom-in duration-300">
                            <Icons.Spinner className="h-3 w-3 animate-spin text-cyan-400" />
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">{indexingStatus}</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                <div className="p-10 bg-slate-900 rounded-[64px] border-2 border-slate-800 shadow-inner relative group">
                                    <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-full group-hover:bg-cyan-500/10 transition-all duration-1000"></div>
                                    <LoadingSpinner size="120px" label="Vault Ready" />
                                    <h2 className="text-4xl font-black uppercase tracking-tighter mt-12 mb-4 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Quantum Repository</h2>
                                    <p className="text-slate-500 text-sm max-w-sm leading-relaxed mx-auto">Upload technical documents or logs. SigNify indexes them instantly for cross-module recall.</p>
                                </div>
                            </div>
                        ) : (
                            messages.map(m => (
                                <ChatMessage key={m.id} message={m} language="English" currentUserEmail={currentUserEmail} />
                            ))
                        )}
                        {isLoading && <LoadingSpinner label="Broadcasting query to Matrix..." />}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="p-6 md:p-10 bg-slate-900/80 border-t border-slate-800 backdrop-blur-xl">
                    <form onSubmit={handleChat} className="max-w-4xl mx-auto relative group">
                        <textarea 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChat())}
                            placeholder="Query the indexed documents..."
                            className="w-full pl-8 pr-20 py-5 bg-slate-950 border-2 border-slate-800 focus:border-cyan-500 rounded-[32px] outline-none transition-all font-bold text-lg placeholder:text-slate-700"
                            rows={1}
                        />
                        <button type="submit" disabled={!chatInput.trim() || isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-cyan-600 text-white rounded-2xl shadow-2xl hover:bg-cyan-500 active:scale-95 disabled:opacity-50 transition-all">
                            <Icons.Send className="h-6 w-6" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Panel: Logic Board */}
            <div className="hidden lg:flex flex-shrink-0 w-80 bg-slate-900 border-l border-slate-800 flex-col">
                <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="font-black text-xs uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <Icons.Exam className="h-4 w-4" /> Logic Board
                    </h2>
                </div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {tasks.map(t => (
                        <div key={t.id} onClick={() => toggleTask(t.id)} className={`p-5 rounded-[28px] border-2 transition-all cursor-pointer group ${t.status === 'completed' ? 'bg-slate-800/20 border-slate-800 opacity-50' : 'bg-slate-800 border-slate-700 hover:border-indigo-500 shadow-xl'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${t.priority === 'high' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t.priority}</span>
                                {t.status === 'completed' ? <Icons.Check className="h-4 w-4 text-green-500" /> : <div className="h-4 w-4 rounded-full border border-slate-600" />}
                            </div>
                            <p className={`text-xs font-bold leading-relaxed ${t.status === 'completed' ? 'line-through text-slate-600' : 'text-slate-200'}`}>{t.text}</p>
                        </div>
                    ))}
                    {tasks.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-10 grayscale py-20">
                            <Icons.Exam className="h-12 w-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Task Extraction</p>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-slate-950/80 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-500 mb-3 tracking-widest">
                        <span>Local Cache Capacity</span>
                        <span className={memoryUsage > 80 ? 'text-red-500' : 'text-cyan-400'}>{memoryUsage.toFixed(1)}% / 100 MB</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full transition-all duration-1000 ${memoryUsage > 80 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${memoryUsage}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
