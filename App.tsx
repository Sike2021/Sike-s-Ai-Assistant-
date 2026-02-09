import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { UserProfile } from './types';
import { LoginModal, SelectionCopyPopover, SubscriptionModal, SplashScreen } from './components/Shared';
import { MainMenuPage, AboutContactPage, SikesProfilePage } from './components/InfoPages';
import { AIChatPage } from './components/AIChat';
import { CreativeStudioPage } from './components/SpecializedChats';
import { TranslatorPage } from './components/Translator';
import { IntelligenceHubPage } from './components/IntelligenceHub';
import { AdminPanelPage } from './components/Admin';
import { StoryReaderPage } from './components/StoryReader';
import { CURRENT_USER_EMAIL_KEY, SIKE_USERS_KEY, GLOBAL_NOTES_KEY, validateSubscriptionCode } from './utils/appUtils';

export const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [page, setPage] = useState('mainMenu');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeProfileNotes, setActiveProfileNotes] = useState('');
  const [selectionPopover, setSelectionPopover] = useState({ visible: false, top: 0, left: 0, text: '' });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  const isCommander = useMemo(() => currentUserEmail === 'sikandarmalik415@gmail.com', [currentUserEmail]);

  useEffect(() => {
    const timer = setTimeout(() => { setIsInitializing(false); }, 2500);
    return () => clearTimeout(timer);
  }, []);

    const handleLocalLogin = (name: string, email: string) => {
        try {
            const users: UserProfile[] = JSON.parse(localStorage.getItem(SIKE_USERS_KEY) || '[]');
            const normalizedEmail = email.toLowerCase().trim();
            const userIndex = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);

            let user: UserProfile;
            if (userIndex !== -1) {
                users[userIndex] = { ...users[userIndex], name, lastActive: Date.now() };
                user = users[userIndex];
            } else {
                user = { name, email: normalizedEmail, picture: '', notes: '', lastActive: Date.now() };
                users.push(user);
            }

            localStorage.setItem(SIKE_USERS_KEY, JSON.stringify(users));
            localStorage.setItem(CURRENT_USER_EMAIL_KEY, user.email);
            setCurrentUserEmail(user.email);
            setUserProfile(user);
            setIsLoginModalOpen(false);
            setPage('mainMenu');
        } catch (err) { console.error("Error handling user data:", err); }
    };

  useEffect(() => {
    const savedEmail = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (savedEmail) {
      const users: UserProfile[] = JSON.parse(localStorage.getItem(SIKE_USERS_KEY) || '[]');
      const currentUser = users.find(u => u.email === savedEmail);
      if (currentUser) {
        setCurrentUserEmail(savedEmail);
        setUserProfile(currentUser);
      }
    }
  }, []);
  
    useEffect(() => {
        if (userProfile) {
            setActiveProfileNotes(userProfile.notes || '');
        } else {
            setActiveProfileNotes(localStorage.getItem(GLOBAL_NOTES_KEY) || '');
        }
    }, [userProfile]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'commander-mode');
    if (isCommander) {
        root.classList.add('commander-mode', 'dark');
    } else { root.classList.add(theme); }
  }, [theme, isCommander]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
      setCurrentUserEmail(null);
      setUserProfile(null);
      setPage('mainMenu');
    }
  };
  
  const handleProfileSave = (notes: string) => {
      if (currentUserEmail && userProfile) {
          const users: UserProfile[] = JSON.parse(localStorage.getItem(SIKE_USERS_KEY) || '[]');
          const userIndex = users.findIndex(u => u.email === currentUserEmail);
          if (userIndex !== -1) {
              const updatedUser = { ...users[userIndex], notes };
              users[userIndex] = updatedUser;
              localStorage.setItem(SIKE_USERS_KEY, JSON.stringify(users));
              setUserProfile(updatedUser);
              setActiveProfileNotes(notes);
              alert('Intelligence Memory Updated!');
          }
      } else {
          localStorage.setItem(GLOBAL_NOTES_KEY, notes);
          setActiveProfileNotes(notes);
          alert('Global AI Memory Updated.');
      }
  };

  const handleRedeemCode = (code: string) => {
      if (!userProfile) { alert("Please sign in first."); return; }
      const tier = validateSubscriptionCode(code);
      if (!tier) { alert("Invalid code."); return; }
      const users: UserProfile[] = JSON.parse(localStorage.getItem(SIKE_USERS_KEY) || '[]');
      const userIndex = users.findIndex(u => u.email === userProfile.email);
      if (userIndex !== -1) {
          const currentExpiry = users[userIndex].subscription?.expiry || Date.now();
          const newExpiry = (currentExpiry > Date.now() ? currentExpiry : Date.now()) + (30 * 24 * 60 * 60 * 1000);
          const updatedUser = { ...users[userIndex], subscription: { tier, expiry: newExpiry } };
          users[userIndex] = updatedUser;
          localStorage.setItem(SIKE_USERS_KEY, JSON.stringify(users));
          setUserProfile(updatedUser);
          alert(`Code Redeemed! Plan: ${tier.toUpperCase()}`);
      }
  };
  
  if (isInitializing) return <SplashScreen />;

  const renderPage = () => {
    switch (page) {
      case 'mainMenu': return <MainMenuPage setPage={setPage} isCommander={isCommander} currentTier={userProfile?.subscription?.expiry && userProfile.subscription.expiry > Date.now() ? userProfile.subscription.tier : 'free'} onUpgrade={() => setIsSubscriptionModalOpen(true)} />;
      case 'intelligenceHub': return <IntelligenceHubPage isOnline={isOnline} currentUserEmail={currentUserEmail} currentNotes={activeProfileNotes} onSaveNotes={handleProfileSave} />;
      case 'aiChat': return <AIChatPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={activeProfileNotes} />;
      case 'creative': return <CreativeStudioPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={activeProfileNotes} />;
      case 'storyReader': return <StoryReaderPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={activeProfileNotes} />;
      case 'translator': return <TranslatorPage isOnline={isOnline} />;
      case 'aboutContact': return <AboutContactPage />;
      case 'sikesProfile': return <SikesProfilePage />;
      case 'adminPanel': return isCommander ? <AdminPanelPage /> : <MainMenuPage setPage={setPage} isCommander={isCommander} currentTier={'free'} onUpgrade={() => setIsSubscriptionModalOpen(true)} />;
      default: return <MainMenuPage setPage={setPage} isCommander={isCommander} currentTier={'free'} onUpgrade={() => setIsSubscriptionModalOpen(true)} />;
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-100 dark:bg-slate-900">
      <Header 
        page={page} setPage={setPage} theme={theme} setTheme={setTheme} onGoHome={() => setPage('mainMenu')} userProfile={userProfile} onLogout={handleLogout} isCommander={isCommander} onStartAuth={() => setIsLoginModalOpen(true)} onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
      />
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
      <SelectionCopyPopover popover={selectionPopover} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLocalLogin} />
      <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} user={userProfile} onRedeem={handleRedeemCode} />
    </div>
  );
};