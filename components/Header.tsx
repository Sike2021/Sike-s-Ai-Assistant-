import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { UserProfile, SubscriptionTier } from '../types';

interface HeaderProps {
  page: string;
  setPage: (page: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onGoHome: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isCommander: boolean;
  onStartAuth: () => void;
  onOpenSubscription: () => void;
}

export const Header: React.FC<HeaderProps> = ({ page, setPage, theme, setTheme, onGoHome, userProfile, onLogout, isCommander, onStartAuth, onOpenSubscription }) => {
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const currentTier: SubscriptionTier = userProfile?.subscription?.expiry && userProfile.subscription.expiry > Date.now() ? userProfile.subscription.tier : 'free';

  const tierColors = {
      free: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      study: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      pro: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300'
  };

  return (
    <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 md:py-4 shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onGoHome} className="flex items-center gap-3 group">
              <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-600 to-sky-700 text-white shadow-lg shadow-cyan-600/20">
                <Icons.Logo className="h-6 w-6" />
              </div>
              <div className="text-left hidden xs:block">
                <h1 className="text-base font-black font-commander uppercase tracking-tighter leading-none dark:text-white">SigNify OS</h1>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">2.5 Logic Core</p>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             {userProfile ? (
                <button
                    onClick={onOpenSubscription}
                    className={`inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${tierColors[currentTier]}`}
                >
                    {currentTier}
                </button>
             ) : (
                <button
                    onClick={onStartAuth}
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-all hover:scale-105 active:scale-95"
                    title="Connect"
                >
                    <Icons.UserPlus className="h-5 w-5" />
                </button>
             )}

              <button
                  onClick={toggleTheme}
                  className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-all hover:scale-105 active:scale-95"
              >
                  {theme === 'dark' ? <Icons.Sun className="h-5 w-5" /> : <Icons.Moon className="h-5 w-5" />}
              </button>

              <button
                  onClick={onGoHome}
                  className="p-3 rounded-2xl bg-cyan-600/10 text-cyan-600 dark:bg-cyan-600/20 dark:text-cyan-400 transition-all hover:scale-105 active:scale-95"
              >
                  <Icons.Home className="h-5 w-5" />
              </button>
          </div>
        </div>
    </header>
  );
};
