import React, { useState } from 'react';
import { Icons } from './Icons';
import { NeuralVaultPage } from './Vault';
import { LinguisticLearnerPage } from './LinguisticLearner';
import { ProfilePage } from './Profile';
import { PageProps } from '../types';

export const IntelligenceHubPage: React.FC<PageProps & { currentNotes: string, onSaveNotes: (n: string) => void }> = (props) => {
    const [activeSubTab, setActiveSubTab] = useState<'vault' | 'learner' | 'memory'>('vault');

    const TabButton: React.FC<{ id: typeof activeSubTab, icon: React.ElementType, label: string }> = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveSubTab(id)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-4 border-b-4 transition-all ${
                activeSubTab === id 
                ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
        >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
            {/* Top Navigation Bar for Intelligence Tools */}
            <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex justify-around px-2">
                <TabButton id="vault" icon={Icons.Bookmark} label="Vault" />
                <TabButton id="learner" icon={Icons.BrainCircuit} label="Learner" />
                <TabButton id="memory" icon={Icons.Settings} label="Memory" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeSubTab === 'vault' && <NeuralVaultPage {...props} />}
                {activeSubTab === 'learner' && <LinguisticLearnerPage {...props} />}
                {activeSubTab === 'memory' && (
                    <ProfilePage 
                        currentNotes={props.currentNotes} 
                        onSave={props.onSaveNotes} 
                        currentUserEmail={props.currentUserEmail || null} 
                    />
                )}
            </div>
        </div>
    );
};
