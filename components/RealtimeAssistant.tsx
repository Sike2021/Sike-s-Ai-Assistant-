
import React from 'react';
import { Icons } from './Icons';
import { PageProps } from '../types';

export const RealtimeAssistantPage: React.FC<PageProps> = () => {
    return (
        <div className="h-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-red-600/10 rounded-[30px] flex items-center justify-center mb-8 border border-red-500/20">
                <Icons.StopCircle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-black font-commander uppercase tracking-tighter text-white mb-4">Transmission Paused</h1>
            <p className="text-slate-400 max-w-md leading-relaxed mb-10">
                The Real-time Voice Link has been deactivated due to API bandwidth limits. 
                Please use <span className="text-cyan-400 font-bold">Neural Chat</span> for text/image queries, or the <span className="text-cyan-400 font-bold">Language Learner</span> to refine AI behavior.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 text-left w-full sm:w-64">
                    <Icons.BrainCircuit className="h-6 w-6 text-cyan-500 mb-4" />
                    <h3 className="text-white font-bold text-sm mb-2">Teach Dialects</h3>
                    <p className="text-slate-500 text-xs">Use the Language Learner to teach SigNify how to speak your specific Sindhi dialect.</p>
                </div>
                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 text-left w-full sm:w-64">
                    <Icons.MessageSquare className="h-6 w-6 text-cyan-500 mb-4" />
                    <h3 className="text-white font-bold text-sm mb-2">Standard Comms</h3>
                    <p className="text-slate-500 text-xs">Neural Chat still supports the Microphone for hands-free text input.</p>
                </div>
            </div>
        </div>
    );
};
