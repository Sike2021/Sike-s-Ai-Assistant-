
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { LoadingSpinner, CopyButton, Dropdown } from './Shared';
import { PageProps } from '../types';
import { getVerbsByInitial, getVerbDetails } from '../services/geminiService';

export const VerbFormsPage: React.FC<PageProps> = ({ isOnline }) => {
    const [selectedInitial, setSelectedInitial] = useState<string | null>(null);
    const [verbs, setVerbs] = useState<string[]>([]);
    const [selectedVerb, setSelectedVerb] = useState<string | null>(null);
    const [verbDetails, setVerbDetails] = useState<any | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const [language, setLanguage] = useState('English');

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const languages = ['English', 'Urdu', 'Sindhi'];

    const handleInitialClick = async (initial: string) => {
        setSelectedInitial(initial);
        setVerbs([]);
        setSelectedVerb(null);
        setVerbDetails(null);
        setError(null);
        setMobileView('list');
        if (!isOnline) return;
        
        setIsLoadingList(true);
        try {
            const list = await getVerbsByInitial(initial);
            setVerbs(list);
        } catch (err) {
            setError("Failed to load verbs.");
        } finally {
            setIsLoadingList(false);
        }
    };

    const handleVerbClick = async (verb: string) => {
        setSelectedVerb(verb);
        setVerbDetails(null);
        setError(null);
        setMobileView('detail');
        if (!isOnline) return;

        setIsLoadingDetails(true);
        try {
            const details = await getVerbDetails(verb, language);
            setVerbDetails(details);
        } catch (err) {
            setError("Failed to fetch details.");
        } finally {
            setIsLoadingDetails(false);
        }
    };
    
    const handleGlobalSearch = () => {
        if(searchTerm.trim()) {
            handleVerbClick(searchTerm.trim());
        }
    };

    const filteredVerbs = verbs.filter(v => 
        v.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {/* A-Z Navigation */}
            <div className="flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 p-2 overflow-x-auto no-scrollbar">
                <div className="flex gap-1 min-w-max mx-auto">
                    {alphabet.map(letter => (
                        <button
                            key={letter}
                            onClick={() => handleInitialClick(letter)}
                            className={`w-9 h-9 flex items-center justify-center rounded-md font-bold transition-all ${
                                selectedInitial === letter 
                                ? 'bg-cyan-600 text-white shadow-lg scale-110' 
                                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Verbs List Sidebar */}
                <div className={`w-full md:w-64 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-300 ${mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 space-y-2">
                        <div className="relative">
                            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search verb..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                        {searchTerm && filteredVerbs.length === 0 && (
                            <button 
                                onClick={handleGlobalSearch}
                                className="w-full py-1.5 text-xs font-bold bg-cyan-600/10 text-cyan-600 rounded-md hover:bg-cyan-600/20 transition-colors"
                            >
                                Search '{searchTerm}' via AI
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {isLoadingList ? (
                            <LoadingSpinner size="40px" label="Listing..." />
                        ) : selectedInitial ? (
                            filteredVerbs.length > 0 ? (
                                filteredVerbs.map(verb => (
                                    <button
                                        key={verb}
                                        onClick={() => handleVerbClick(verb)}
                                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                                            selectedVerb === verb 
                                            ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-bold' 
                                            : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {verb}
                                    </button>
                                ))
                            ) : (
                                <p className="text-center text-xs text-slate-500 py-10">No local matches.</p>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <Icons.Languages className="h-10 w-10 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">Pick a letter or search.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Verb Detail View */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 transition-all duration-300 ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
                    <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center px-4 md:px-8">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Learn In:</span>
                            <div className="w-32">
                                <Dropdown 
                                    options={languages}
                                    selected={language}
                                    onSelect={(l) => {
                                        setLanguage(l);
                                        if(selectedVerb) handleVerbClick(selectedVerb);
                                    }}
                                />
                            </div>
                        </div>
                        <div className="hidden sm:block text-[10px] font-black text-cyan-600/50 uppercase tracking-[0.3em]">SigNify Engine 3.0</div>
                    </div>
                    
                    {!selectedVerb ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                             <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <Icons.Languages className="h-10 w-10 text-cyan-500 opacity-50" />
                             </div>
                             <h2 className="text-2xl font-bold font-commander uppercase tracking-widest">Verb Lexicon</h2>
                             <p className="text-slate-500 mt-2 max-w-md">Browse all English verbs and see their different forms and related words.</p>
                        </div>
                    ) : (
                        <div className="p-4 md:p-10 max-w-4xl mx-auto">
                            <button onClick={() => setMobileView('list')} className="md:hidden flex items-center gap-2 mb-6 text-cyan-600 font-bold px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                                <Icons.ArrowLeft className="h-4 w-4" /> Back to list
                            </button>

                            {isLoadingDetails ? (
                                <div className="py-20">
                                    <LoadingSpinner label={`SigNify 3.0 is fetching '${selectedVerb}'...`} />
                                </div>
                            ) : error ? (
                                <div className="text-center py-10">
                                    <Icons.AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                                    <p className="text-red-500">{error}</p>
                                    <button onClick={() => handleVerbClick(selectedVerb)} className="mt-4 text-cyan-500 font-bold underline">Retry</button>
                                </div>
                            ) : verbDetails ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                                    <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
                                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter capitalize drop-shadow-sm">
                                            {verbDetails.base}
                                        </h1>
                                        <p className="text-lg md:text-xl text-cyan-600 dark:text-cyan-400 font-semibold mt-3 italic">"{verbDetails.description}"</p>
                                    </div>

                                    {/* Principal Verb Forms */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-1">Principal Forms</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-3xl border-b-4 border-cyan-500 text-center shadow-lg transform transition hover:scale-105">
                                                <span className="block text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-2">1st Form (Present)</span>
                                                <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{verbDetails.base}</span>
                                                <div className="mt-2"><CopyButton textToCopy={verbDetails.base} /></div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-3xl border-b-4 border-blue-500 text-center shadow-lg transform transition hover:scale-105">
                                                <span className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">2nd Form (Past)</span>
                                                <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{verbDetails.past}</span>
                                                <div className="mt-2"><CopyButton textToCopy={verbDetails.past} /></div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-3xl border-b-4 border-indigo-500 text-center shadow-lg transform transition hover:scale-105">
                                                <span className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">3rd Form (P. Participle)</span>
                                                <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{verbDetails.pastParticiple}</span>
                                                <div className="mt-2"><CopyButton textToCopy={verbDetails.pastParticiple} /></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parts of Speech / Related Forms */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between group">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Noun Form</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{verbDetails.nounForm || 'N/A'}</span>
                                                <CopyButton textToCopy={verbDetails.nounForm} />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between group">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Adjective Form</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{verbDetails.adjectiveForm || 'N/A'}</span>
                                                <CopyButton textToCopy={verbDetails.adjectiveForm} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Usages with distinct style */}
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                                            <Icons.Sparkles className="h-4 w-4 text-cyan-500" /> Usages & Real World Context
                                        </h3>
                                        <div className="space-y-4">
                                            {verbDetails.usages?.map((usage: string, idx: number) => (
                                                <div key={idx} className="group p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 border-l-4 border-cyan-500 shadow-md rounded-r-3xl text-slate-700 dark:text-slate-300 relative transition-all hover:translate-x-2">
                                                    <span className="absolute -top-3 left-4 text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.3em] bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">Example {idx + 1}</span>
                                                    <p className={`text-lg md:text-xl font-medium leading-relaxed mt-2 tracking-wide ${language !== 'English' ? 'font-urdu' : ''}`}>"{usage}"</p>
                                                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <CopyButton textToCopy={usage} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="pt-10 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-slate-400">
                                        <button 
                                            onClick={() => { setSelectedVerb(null); setMobileView('list'); }}
                                            className="flex items-center gap-2 text-sm font-bold hover:text-cyan-600 transition-colors uppercase tracking-widest"
                                        >
                                            <Icons.ArrowLeft className="h-4 w-4" /> Close Verb
                                        </button>
                                        <span className="text-[10px] font-commander tracking-[0.3em] uppercase italic">SigNify Grammar Engine V3.0 • Gemini 3.1</span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
