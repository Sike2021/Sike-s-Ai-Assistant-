
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

interface HeaderProps {
  page: string;
  setPage: (page: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onGoHome: () => void;
  currentUserEmail: string | null;
  onLogout: () => void;
}

const DesktopNavItem: React.FC<{
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-cyan-600/20 text-cyan-500'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    <Icon className="h-5 w-5" />
    <span className="hidden md:inline">{label}</span>
  </button>
);


export const Header: React.FC<HeaderProps> = ({ page, setPage, theme, setTheme, onGoHome, currentUserEmail, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const navItems = [
    { id: 'aboutContact', label: 'About & Contact', icon: Icons.Info },
  ];
  
  const handleNavClick = (pageId: string) => {
    setPage(pageId);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  return (
    <>
      <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-2 md:p-3 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2 md:gap-4">
          {/* Left side: Logo and Title */}
          <div className="flex-shrink-0 flex items-center gap-2 md:gap-3">
            <button onClick={onGoHome} className="flex items-center gap-2 md:gap-3 group">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
                <Icons.Logo className="h-6 w-6" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Sike's AI Assistant</h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">by Sikandar Ali Malik</p>
              </div>
            </button>
          </div>

          {/* Center: Desktop Navigation */}
          <div className="hidden lg:flex flex-1 min-w-0 justify-center">
             <nav className="flex items-center gap-1 md:gap-2">
                <DesktopNavItem 
                    label="Home"
                    icon={Icons.Home}
                    isActive={page === 'mainMenu'}
                    onClick={onGoHome}
                />
              {navItems.map(item => (
                <DesktopNavItem 
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    isActive={page === item.id}
                    onClick={() => setPage(item.id)}
                />
              ))}
            </nav>
          </div>
          
          {/* Right side: Controls */}
          <div className="flex-shrink-0 flex items-center gap-2">
             <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[120px]">{currentUserEmail}</span>
                <button onClick={onLogout} title="Switch User" className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Icons.LogOut className="h-4 w-4" />
                </button>
             </div>
              <button
                  onClick={() => setPage('profile')}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="My Profile & Settings"
              >
                  <Icons.Settings className="h-6 w-6" />
              </button>
              <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Toggle theme"
              >
                  {theme === 'dark' ? <Icons.Sun className="h-6 w-6" /> : <Icons.Moon className="h-6 w-6" />}
              </button>
              <div className="lg:hidden">
                 <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Open menu"
                  >
                   <Icons.Menu className="h-6 w-6" />
                 </button>
              </div>
          </div>
        </div>
      </header>

      {/* --- Flyout Mobile Menu --- */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        ></div>
        
        {/* Menu Content */}
        <div className={`fixed top-0 left-0 bottom-0 w-3/4 max-w-xs bg-white dark:bg-slate-900 shadow-xl p-4 flex flex-col transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
             <h2 className="text-lg font-bold">Menu</h2>
             <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Close menu">
               <Icons.X className="h-6 w-6" />
             </button>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
             <button
                  onClick={() => { onGoHome(); setIsMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full text-left p-3 rounded-lg text-base font-medium transition-colors ${
                    page === 'mainMenu' 
                      ? 'bg-cyan-600/20 text-cyan-600 dark:text-cyan-300' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icons.Home className="h-6 w-6 flex-shrink-0" />
                  <span>Home</span>
                </button>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3 w-full text-left p-3 rounded-lg text-base font-medium transition-colors ${
                    page === item.id 
                      ? 'bg-cyan-600/20 text-cyan-600 dark:text-cyan-300' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-6 w-6 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
             <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
               <button onClick={onLogout} className="flex items-center gap-3 w-full text-left p-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Icons.LogOut className="h-6 w-6 flex-shrink-0" />
                  <span>Switch User</span>
                </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};
