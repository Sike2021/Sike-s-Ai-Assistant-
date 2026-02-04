
import React from 'react';
import { Icons } from './Icons';
import { SubscriptionTier } from '../types';
import { checkFeatureAccess } from '../utils/appUtils';

export const MainMenuPage: React.FC<{ 
    setPage: (page: string) => void; 
    isCommander: boolean; 
    currentTier: SubscriptionTier;
    onUpgrade: () => void;
}> = ({ setPage, isCommander, currentTier, onUpgrade }) => {
    
    const handleFeatureClick = (id: string) => {
        if (checkFeatureAccess(id, currentTier) || isCommander) {
            setPage(id === 'examCenter' ? 'performance' : id);
        } else {
            onUpgrade();
        }
    };

    const baseFeatures = [
        { id: 'vault', label: 'Neural Vault', icon: Icons.Bookmark, description: 'High-speed file uploader with autonomous task extraction.' },
        { id: 'linguisticLearner', label: 'Language Learner', icon: Icons.BrainCircuit, description: 'Explicitly teach the AI how to react in Sindhi/Urdu.' },
        { id: 'aiChat', label: 'Neural Chat', icon: Icons.MessageSquare, description: 'Ask anything, write stories, get help with images.' },
        { id: 'writing', label: 'Creative Writing', icon: Icons.Feather, description: 'Write stories, novels, and raw scenes.' },
        { id: 'storybook', label: 'Storybook Generator', icon: Icons.BookImage, description: 'Create illustrated stories from your ideas.' },
        { id: 'storyReader', label: 'SigNify LM Studio', icon: Icons.Volume2, description: 'Notebook-style research. Chat with multiple sources & generate Audio Overviews.' },
        { id: 'studyHelper', label: 'Study Helper', icon: Icons.BookText, description: 'Get text & visual answers from your books.' },
        { id: 'simulations', label: 'Interactive Simulations', icon: Icons.PlayCircle, description: 'Run experiments and play out scenarios.' },
        { id: 'examCenter', label: 'Exam Center', icon: Icons.Exam, description: 'Take exams & track performance.' },
        { id: 'grammar', label: 'Grammar Chat', icon: Icons.Grammar, description: 'Interactively correct and improve your writing.' },
        { id: 'verbForms', label: 'Verb Forms (A-Z)', icon: Icons.Languages, description: 'Browse English verbs forms (1st, 2nd, 3rd).' },
        { id: 'translator', label: 'Translator', icon: Icons.Translator, description: 'Translate text and images.' },
        { id: 'profile', label: 'AI Memory & Data', icon: Icons.Settings, description: 'Teach the AI about you and Backup Data.' },
    ];

    const commanderFeatures = isCommander ? [
        { id: 'adminPanel', label: 'Admin Panel', icon: Icons.LayoutDashboard, description: 'View user data and system stats.' },
    ] : [];

    const creatorFeatures = [
        { id: 'sikesProfile', label: "Creator's Profile", icon: Icons.User, description: 'Learn about the mind behind SigNify.' },
        { id: 'aboutContact', label: 'About & Contact', icon: Icons.Info, description: 'Learn about the app and creator.' },
    ];

    const features = [...baseFeatures, ...commanderFeatures, ...creatorFeatures];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl font-commander text-cyan-600 drop-shadow-sm">SigNify 3.2</h1>
                  <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Intelligent Linguistic Training & Interactive Learning.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        const isPrimary = feature.id === 'vault' || feature.id === 'aiChat';
                        const isFullWidth = feature.id === 'adminPanel' || feature.id === 'sikesProfile';
                        const isLocked = !checkFeatureAccess(feature.id, currentTier) && !isCommander;

                        let gridClass = '';
                        if (isPrimary) gridClass = 'md:col-span-1';
                        if (isFullWidth) gridClass = 'lg:col-span-3';

                        return (
                            <div key={feature.id} className={gridClass}>
                                <button
                                    onClick={() => handleFeatureClick(feature.id)}
                                    className={`relative group bg-white dark:bg-slate-800/80 p-6 rounded-2xl w-full h-full text-left flex items-center gap-6 transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-cyan-500/10 border border-slate-200 dark:border-slate-700 ${isFullWidth ? 'flex-col md:flex-row text-center md:text-left' : ''} ${isLocked ? 'opacity-75' : ''}`}
                                >
                                    <div className={`p-3 rounded-2xl ${isPrimary ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-cyan-400'} group-hover:scale-110 transition-transform`}>
                                        <Icon className={`${isFullWidth ? 'h-12 w-12' : 'h-8 w-8'}`} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 dark:text-white text-lg md:text-xl flex items-center gap-2">
                                            {feature.label}
                                            {isLocked && <Icons.Lock className="h-4 w-4 text-slate-400" />}
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{feature.description}</p>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const AboutContactPage: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-800">
                    <h1 className="text-3xl font-black font-commander uppercase tracking-tighter text-cyan-600 dark:text-cyan-400 mb-4">About SigNify 3.2</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                        SigNify Engine 3.2 is an advanced educational ecosystem designed for deep linguistic learning. 
                        By storing 1000+ data samples, we refine our Sindhi and Urdu understanding locally. 
                        Every persona is now aware of all other features, creating a seamless learning experience.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                            <Icons.Mail className="h-5 w-5 text-cyan-500" /> Support
                        </h2>
                        <a href="mailto:sikandarmalik415@gmail.com" className="text-cyan-600 font-bold hover:underline">sikandarmalik415@gmail.com</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SikesProfilePage: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[50px] shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                    <div className="w-32 h-32 mx-auto rounded-[40px] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white mb-6 shadow-xl">
                        <Icons.User className="h-16 w-16" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black font-commander uppercase tracking-tight text-slate-900 dark:text-white">Sikandar Ali Malik</h1>
                    <p className="text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-[0.3em] text-sm mt-2">Lead Architect & Creator</p>
                    <p className="mt-8 text-slate-600 dark:text-slate-300 text-lg leading-relaxed">Democratizing AI for Sindhi and Urdu speakers.</p>
                </div>
            </div>
        </div>
    );
};
