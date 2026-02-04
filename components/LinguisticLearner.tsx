
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { PageProps } from '../types';
import { saveExplicitLinguisticRule } from '../services/geminiService';

export const LinguisticLearnerPage: React.FC<PageProps> = () => {
    const [rules, setRules] = useState<any[]>([]);
    const [trigger, setTrigger] = useState('');
    const [response, setResponse] = useState('');
    const [autoCount, setAutoCount] = useState(0);

    useEffect(() => {
        const savedRules = localStorage.getItem('sike_explicit_linguistic_rules') || '[]';
        setRules(JSON.parse(savedRules));
        
        const auto = localStorage.getItem('sike_linguistic_training_sindhi') || '[]';
        setAutoCount(JSON.parse(auto).length);
    }, []);

    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trigger.trim() || !response.trim()) return;
        saveExplicitLinguisticRule(trigger, response);
        const updated = [...rules, { id: Date.now().toString(), trigger, response }];
        setRules(updated);
        setTrigger('');
        setResponse('');
    };

    const deleteRule = (id: string) => {
        const filtered = rules.filter(r => r.id !== id);
        setRules(filtered);
        localStorage.setItem('sike_explicit_linguistic_rules', JSON.stringify(filtered));
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                        <Icons.BrainCircuit className="h-40 w-40" />
                    </div>
                    <h1 className="text-3xl font-black font-commander uppercase tracking-tighter text-cyan-600 dark:text-cyan-400 mb-2">Language Learner</h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
                        Explicitly teach SigNify how to react. Define specific responses for Sindhi phrases. 
                        Your rules are injected into every persona's logic core.
                    </p>
                    
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="px-6 py-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl border border-cyan-100 dark:border-cyan-800">
                            <span className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-widest block mb-1">Deep Context Storage</span>
                            <span className="text-2xl font-bold text-slate-800 dark:text-white">{autoCount} / 1000 <span className="text-xs font-normal opacity-50">Samples</span></span>
                        </div>
                        <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block mb-1">Active Reaction Rules</span>
                            <span className="text-2xl font-bold text-slate-800 dark:text-white">{rules.length} <span className="text-xs font-normal opacity-50">Rules</span></span>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Add Rule Form */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Icons.Plus className="h-5 w-5 text-cyan-500" /> Define Rule
                        </h2>
                        <form onSubmit={handleAddRule} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">If User Says (Sindhi/Urdu):</label>
                                <input 
                                    value={trigger}
                                    onChange={(e) => setTrigger(e.target.value)}
                                    placeholder="e.g. اسلام عليڪم"
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-cyan-500 outline-none transition-all font-sindhi text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">SigNify Reacts As:</label>
                                <textarea 
                                    value={response}
                                    onChange={(e) => setResponse(e.target.value)}
                                    placeholder="Explain how the AI should respond or behave..."
                                    className="w-full h-32 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-cyan-500 outline-none transition-all text-sm font-medium"
                                />
                            </div>
                            <button type="submit" className="w-full py-5 bg-cyan-600 text-white rounded-3xl font-black font-commander tracking-widest uppercase shadow-xl hover:bg-cyan-500 active:scale-95 transition-all">Inject Logic</button>
                        </form>
                    </div>

                    {/* Rules List */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Icons.BookmarkCheck className="h-5 w-5 text-cyan-500" /> Active Logic Matrix
                        </h2>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                            {rules.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 grayscale">
                                    <Icons.Cpu className="h-12 w-12 mb-2" />
                                    <p className="text-[10px] uppercase font-black tracking-widest">No Custom Logic Detected</p>
                                </div>
                            ) : (
                                rules.map(rule => (
                                    <div key={rule.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative group animate-in fade-in slide-in-from-right-4">
                                        <button 
                                            onClick={() => deleteRule(rule.id)}
                                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Icons.Trash className="h-4 w-4" />
                                        </button>
                                        <div className="space-y-1 mb-4">
                                            <p className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Input Pattern</p>
                                            <p className="font-sindhi text-lg text-slate-800 dark:text-slate-100">"{rule.trigger}"</p>
                                        </div>
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 mb-4" />
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Neural Reaction</p>
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic">"{rule.response}"</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
