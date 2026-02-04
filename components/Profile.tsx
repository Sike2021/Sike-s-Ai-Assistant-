
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { Message } from '../types';
import { getSavedMessagesKey, GLOBAL_NOTES_KEY, SIKE_USERS_KEY } from '../utils/appUtils';

export const ProfilePage: React.FC<{
    currentNotes: string;
    onSave: (notes: string) => void;
    currentUserEmail: string | null;
}> = ({ currentNotes, onSave, currentUserEmail }) => {
    const [activeTab, setActiveTab] = useState('memory');
    const [notes, setNotes] = useState(currentNotes);
    const [savedMessages, setSavedMessages] = useState<Message[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const savedMessagesKey = getSavedMessagesKey(currentUserEmail);

    useEffect(() => {
        setNotes(currentNotes);
    }, [currentNotes]);
    
    useEffect(() => {
        if (activeTab === 'saved') {
            try {
                const saved = JSON.parse(localStorage.getItem(savedMessagesKey) || '[]');
                setSavedMessages(saved);
            } catch (e) {
                console.error("Failed to load saved messages:", e);
                setSavedMessages([]);
            }
        }
    }, [activeTab, savedMessagesKey]);

    const handleUnsave = (messageId: string) => {
        if (window.confirm("Are you sure you want to remove this saved item?")) {
            const updated = savedMessages.filter(m => m.id !== messageId);
            setSavedMessages(updated);
            localStorage.setItem(savedMessagesKey, JSON.stringify(updated));
        }
    };
    
    const handleSaveNotes = () => {
        onSave(notes);
    };

    /**
     * UNIVERSAL BACKUP CORE
     * Collects all keys related to the SigNify ecosystem.
     */
    const handleExportData = () => {
        const data: Record<string, string> = {};
        const prefixFilters = ['sike', 'signify', 'sindhi']; // Capture all variant keys
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && prefixFilters.some(pref => key.toLowerCase().includes(pref))) {
                data[key] = localStorage.getItem(key) || '';
            }
        }

        const appBackup = {
            version: "3.2",
            timestamp: Date.now(),
            bundle: data
        };

        const blob = new Blob([JSON.stringify(appBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signify_master_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /**
     * UNIVERSAL RESTORE CORE
     */
    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const raw = JSON.parse(event.target?.result as string);
                const data = raw.bundle || raw; // Support both old and new backup formats
                
                if (typeof data !== 'object') throw new Error("Invalid data format");
                
                if (window.confirm("This will replace all current chats and settings. Are you sure?")) {
                    // Clear existing app data first to prevent key collision
                    const prefixFilters = ['sike', 'signify', 'sindhi'];
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && prefixFilters.some(pref => key.toLowerCase().includes(pref))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));

                    // Restore new data
                    Object.keys(data).forEach(key => {
                        localStorage.setItem(key, data[key]);
                    });

                    alert("SigNify logic core restored! Restarting...");
                    window.location.reload();
                }
            } catch (err) {
                alert("Restoration failed. The file may be corrupted.");
                console.error(err);
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    };

    const suggestions = [
        "Respond like a wise sage. Focus on logic and clarity.",
        "Always address me by my preferred title.",
        "Keep your explanations brief and focused on the technical side.",
        "When I speak Urdu, correct my grammar politely.",
        "I am a developer. Provide code examples in Python and TypeScript."
    ];
    
    const copySuggestion = (text: string) => {
        setNotes(prev => prev ? `${prev}\n- ${text}` : `- ${text}`);
        setActiveTab('memory');
    };

    const TabButton: React.FC<{ tabId: string; label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tabId
                    ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md">
                    <h1 className="text-2xl font-bold mb-2">AI Memory & Data</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Configure the neural memory of SigNify Engine 3.2.
                    </p>
                    
                    <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                            <TabButton tabId="memory" label="Neural Memory" />
                            <TabButton tabId="suggestions" label="Templates" />
                            <TabButton tabId="saved" label="Bookmarks" />
                            <TabButton tabId="data" label="Backup Center" />
                        </nav>
                    </div>

                    <div>
                        {activeTab === 'memory' && (
                            <div className="animate-in fade-in duration-300">
                                <h2 className="text-lg font-semibold mb-2">Neural Directives</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    Directly influence the AI's behavior. Instructions here bypass its standard programming.
                                </p>
                                <textarea
                                    className="w-full h-80 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition font-medium text-slate-800 dark:text-slate-200"
                                    placeholder="Example: Call me Commander. I only want to discuss technology in English. If I speak Sindhi, only translate it to English..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <button onClick={handleSaveNotes} className="mt-4 w-full flex items-center justify-center gap-2 py-4 px-4 rounded-[24px] bg-cyan-600 text-white font-black font-commander uppercase tracking-widest hover:bg-cyan-500 transition shadow-xl">
                                    <Icons.Check className="h-5 w-5" /> Commit to Memory
                                </button>
                            </div>
                        )}
                        {activeTab === 'suggestions' && (
                            <div className="animate-in fade-in duration-300 space-y-3">
                               {suggestions.map((s, i) => (
                                   <div key={i} className="group flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-transparent hover:border-cyan-500/30 transition-all">
                                        <p className="text-slate-700 dark:text-slate-300 font-medium">{s}</p>
                                        <button onClick={() => copySuggestion(s)} className="flex-shrink-0 p-2 text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 rounded-xl transition-all">
                                            <Icons.Plus className="h-5 w-5" />
                                        </button>
                                   </div>
                               ))}
                            </div>
                        )}
                        {activeTab === 'saved' && (
                           <div className="animate-in fade-in duration-300">
                                <h2 className="text-lg font-semibold mb-2">Saved Transmissions</h2>
                                {savedMessages.length > 0 ? (
                                    <div className="space-y-4">
                                        {savedMessages.map(msg => (
                                            <div key={msg.id} className="bg-slate-100 dark:bg-slate-900/50 p-6 rounded-[32px] relative group border border-slate-200 dark:border-slate-700">
                                                <button onClick={() => handleUnsave(msg.id)} className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-red-500 transition-all">
                                                    <Icons.Trash className="h-5 w-5" />
                                                </button>
                                                <div
                                                    className="prose dark:prose-invert max-w-none text-sm"
                                                    dangerouslySetInnerHTML={{ __html: (window as any).marked.parse(msg.text) }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center opacity-30">
                                        <Icons.Bookmark className="h-12 w-12 mb-2" />
                                        <p className="text-sm uppercase font-black tracking-widest">No Bookmarks Found</p>
                                    </div>
                                )}
                           </div>
                        )}
                        {activeTab === 'data' && (
                            <div className="animate-in fade-in duration-300">
                                <h2 className="text-lg font-semibold mb-2">Master Data Recovery</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    Transfer your entire SigNify environment (chats, memory, history) to another device or browser.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2"><Icons.Download className="h-5 w-5" /> Master Export</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Serializes all your neural data into a single portable JSON file.</p>
                                        </div>
                                        <button onClick={handleExportData} className="w-full py-4 px-4 rounded-[20px] bg-cyan-600 text-white font-black font-commander text-[10px] uppercase tracking-widest hover:bg-cyan-500 transition shadow-lg">Download Backup</button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2"><Icons.Upload className="h-5 w-5" /> Master Import</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Restore your environment. Warning: overwrites current data.</p>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 px-4 rounded-[20px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-black font-commander text-[10px] uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition shadow-lg">Upload Backup</button>
                                    </div>
                                </div>
                                <div className="mt-8 p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                                    <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Icons.AlertTriangle className="h-4 w-4" /> Technical Note
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Backups include full chat history and all local linguistic training data.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
