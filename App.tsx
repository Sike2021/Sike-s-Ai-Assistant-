
// FIX: Import `useMemo` from React to resolve reference error.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Header } from './components/Header';
import { Message, Source, Question, UserAnswer, ExamReport, InProgressExamSession, StudentProfile, Conversation, GrammarEvaluation, UserProfile } from './types';
import { streamStudyHelperResponse, evaluateGrammar, getTranslatorResponse, generateExamQuestions, evaluateExamAnswers, streamAIChatResponse, getTranslatorResponseFromImage, generateConversationTitle, streamWritingResponse, streamSimulationResponse, streamGrammarResponse } from './services/geminiService';
import { Icons } from './components/Icons';

const getExamHistoryKey = (rollNo: string) => `sikeTutorExamHistory_${rollNo}`;
const getInProgressExamKey = (rollNo: string) => `sikeTutorInProgressExam_${rollNo}`;
const CURRENT_USER_EMAIL_KEY = 'sikeAiAssistant_currentUserEmail';
const getConversationsKey = (email: string) => `sikeAiAssistant_conversations_${email.replace(/[@.]/g, '_')}`;
const getUserProfileKey = (email: string) => `sikeAiAssistant_userProfile_${email.replace(/[@.]/g, '_')}`;


// Helper to check for API key
const checkApiKey = () => {
  if (!process.env.API_KEY) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-4">
        <div className="text-center bg-slate-800 p-8 rounded-lg shadow-2xl max-w-md">
          <Icons.AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
          <h1 className="mt-4 text-2xl font-bold">API Key Not Found</h1>
          <p className="mt-2 text-slate-300">
            This application requires a Google AI API key to function. Please ensure the 
            <code className="bg-slate-700 text-cyan-300 rounded px-1 py-0.5 text-sm mx-1">API_KEY</code> 
            environment variable is set correctly.
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Reusable Copy Button Component
const CopyButton: React.FC<{ textToCopy: string | undefined | null, className?: string, title?: string }> = ({ textToCopy, className, title = "Copy" }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => console.error("Failed to copy text:", err));
    };

    return (
        <button onClick={handleCopy} title={isCopied ? "Copied!" : title} className={`p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 ${className}`} disabled={!textToCopy}>
            {isCopied ? <Icons.Check className="h-4 w-4 text-green-500" /> : <Icons.Copy className="h-4 w-4" />}
        </button>
    );
};

// Main App Component
const App: React.FC = () => {
  const apiKeyError = checkApiKey();
  const [page, setPage] = useState('mainMenu');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({ notes: '' });

  useEffect(() => {
    const savedEmail = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
    if (savedEmail) {
      setCurrentUserEmail(savedEmail);
      const profileKey = getUserProfileKey(savedEmail);
      const savedProfile = localStorage.getItem(profileKey);
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
    }
  }, []);
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
  }, [theme]);

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

  const handleSetUser = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    localStorage.setItem(CURRENT_USER_EMAIL_KEY, normalizedEmail);
    setCurrentUserEmail(normalizedEmail);
    // Load profile for new user
    const profileKey = getUserProfileKey(normalizedEmail);
    const savedProfile = localStorage.getItem(profileKey);
    setUserProfile(savedProfile ? JSON.parse(savedProfile) : { notes: '' });
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to switch users? This will take you to the login screen.")) {
      localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
      setCurrentUserEmail(null);
      setUserProfile({ notes: '' });
      setPage('mainMenu');
    }
  };
  
  const handleProfileSave = (notes: string) => {
    if (currentUserEmail) {
        const profile = { notes };
        const profileKey = getUserProfileKey(currentUserEmail);
        localStorage.setItem(profileKey, JSON.stringify(profile));
        setUserProfile(profile);
        alert('Profile saved successfully!');
        setPage('mainMenu');
    }
  };
  
  if (apiKeyError) return apiKeyError;

  if (!currentUserEmail) {
    return <UserProfileGate onEmailSet={handleSetUser} />;
  }
  
  const renderPage = () => {
    const userProfileNotes = userProfile.notes;
    switch (page) {
      case 'mainMenu':
        return <MainMenuPage setPage={setPage} />;
      case 'aiChat':
        return <AIChatPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes} />;
      case 'studyHelper':
        return <StudyHelperPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes} />;
      case 'simulations':
        return <SimulationsPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes} />;
      case 'exam':
        return <ExamPage isOnline={isOnline} />;
      case 'grammar':
        return <GrammarPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes}/>;
      case 'writing':
        return <WritingPage isOnline={isOnline} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes} />;
      case 'translator':
        return <TranslatorPage isOnline={isOnline} />;
      case 'performance':
        return <DashboardPage isOnline={isOnline} setPage={setPage} />;
      case 'profile':
        return <ProfilePage currentNotes={userProfileNotes} onSave={handleProfileSave} />;
      case 'aboutContact':
        return <AboutContactPage />;
      default:
        return <MainMenuPage setPage={setPage} />;
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-100 dark:bg-slate-900">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} onGoHome={() => setPage('mainMenu')} currentUserEmail={currentUserEmail} onLogout={handleLogout}/>
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
};

const UserProfileGate: React.FC<{ onEmailSet: (email: string) => void }> = ({ onEmailSet }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            onEmailSet(email);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-slate-900 p-4">
            <div className="max-w-md w-full bg-slate-50 dark:bg-slate-800/60 p-8 rounded-2xl shadow-lg text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white mb-4">
                    <Icons.User className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold">Welcome to Sike's AI Assistant</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Please enter your email to personalize your experience.</p>
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <input 
                      type="email" 
                      name="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Enter your email address" 
                      required 
                      className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-cyan-500 focus:border-cyan-500" 
                    />
                    <button type="submit" className="w-full py-3 mt-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition">
                      Continue
                    </button>
                </form>
            </div>
        </div>
    );
};

const MainMenuPage: React.FC<{ setPage: (page: string) => void; }> = ({ setPage }) => {
    const features = [
        { id: 'aiChat', label: 'AI Chat', icon: Icons.BrainCircuit, description: 'Ask anything, write stories, get help.' },
        { id: 'writing', label: 'Creative & Brutal Writing', icon: Icons.Feather, description: 'Write stories, novels, and raw scenes.' },
        { id: 'studyHelper', label: 'Study Helper', icon: Icons.BookText, description: 'Get text & visual answers from your books.' },
        { id: 'simulations', label: 'Interactive Simulations', icon: Icons.PlayCircle, description: 'Run experiments and play out scenarios.' },
        { id: 'examCenter', label: 'Exam Center', icon: Icons.Exam, description: 'Take exams & track performance.' },
        { id: 'grammar', label: 'Grammar Chat', icon: Icons.Grammar, description: 'Interactively correct and improve your writing.' },
        { id: 'translator', label: 'Translator', icon: Icons.Translator, description: 'Translate text and images.' },
        { id: 'profile', label: 'My Profile & Settings', icon: Icons.Settings, description: 'Teach the AI about you.' },
        { id: 'aboutContact', label: 'About & Contact', icon: Icons.User, description: 'Learn about the creator.' },
    ];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">Sike's AI Assistant for School</h1>
                  <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Your all-in-one AI learning assistant, ready to help you with anything.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        const isPrimary = feature.id === 'aiChat' || feature.id === 'writing';
                        const isFullWidth = feature.id === 'aiChat';

                        let gridClass = '';
                        if (isPrimary) gridClass = 'md:col-span-2';
                        if (isFullWidth) gridClass = 'lg:col-span-3';

                        return (
                            <div key={feature.id} className={gridClass}>
                                <button
                                    onClick={() => setPage(feature.id === 'examCenter' ? 'performance' : feature.id)}
                                    className={`group bg-white dark:bg-slate-800/80 p-6 rounded-2xl w-full h-full text-left flex items-center gap-6 transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-cyan-500/10 border border-slate-200 dark:border-slate-700 ${isFullWidth ? 'flex-col md:flex-row text-center md:text-left' : ''}`}
                                >
                                    <Icon className={`flex-shrink-0 text-slate-600 dark:text-cyan-400 ${isFullWidth ? 'h-16 w-16 mb-4 md:mb-0' : 'h-12 w-12'}`} />
                                    <div>
                                        <h2 className="font-bold text-slate-800 dark:text-white text-lg md:text-xl">{feature.label}</h2>
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


// Reusable Chat Component
const ChatComponent: React.FC<{
  historyId: string;
  pageTitle: string;
  welcomeMessage: { author: string, text: string };
  placeholder: string;
  showFilters: boolean;
  isOnline: boolean;
  aiStreamFunction: (prompt: string, history: Message[], subject: string, chapter: string, exercise: string, language: string, sourceUrl?: string, imageBase64?: string, imageMimeType?: string, userEmail?: string, userProfileNotes?: string) => AsyncGenerator<any>;
  extraControls?: React.ReactNode;
  currentUserEmail?: string;
  userProfileNotes?: string;
}> = ({ historyId, pageTitle, welcomeMessage, placeholder, showFilters, isOnline, aiStreamFunction, extraControls, currentUserEmail, userProfileNotes }) => {
  const getChatHistoryKey = (id: string) => `sikeTutorChatHistory_${id}`;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Load messages on mount and when historyId changes
  useEffect(() => {
      const chatHistoryKey = getChatHistoryKey(historyId);
      try {
          const savedHistory = localStorage.getItem(chatHistoryKey);
          setMessages(savedHistory ? JSON.parse(savedHistory) : []);
      } catch (e) {
          console.error(`Failed to load chat history for '${historyId}':`, e);
          setMessages([]);
      }
  }, [historyId]);

  // Save messages whenever they are updated
  useEffect(() => {
      const chatHistoryKey = getChatHistoryKey(historyId);
      try {
          localStorage.setItem(chatHistoryKey, JSON.stringify(messages));
      } catch (e) {
          console.error(`Failed to save chat history for '${historyId}':`, e);
      }
  }, [messages, historyId]);

  // Filter states
  const [subject, setSubject] = useState('All');
  const [chapter, setChapter] = useState('All');
  const [exercise, setExercise] = useState('All');
  const [language, setLanguage] = useState('English');
  const [sourceUrl, setSourceUrl] = useState('');

  // Dynamic dropdown options
  const [chapterOptions, setChapterOptions] = useState<string[]>(['All']);
  const [exerciseOptions, setExerciseOptions] = useState<string[]>(['All']);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const subjects = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Sindhi', 'Pakistan Studies', 'Islamiyat'];
  const languages = ['English', 'Urdu', 'Sindhi', 'All'];
  
  const lessonsBySubject: Record<string, { chapter: string; exercises: string[] }[]> = {
    'Physics': [
        { chapter: 'Chapter 10: Simple Harmonic Motion and Waves', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions', 'Numerical Problems'] },
        { chapter: 'Chapter 11: Sound', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions', 'Numerical Problems'] },
        { chapter: 'Chapter 12: Geometrical Optics', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions', 'Numerical Problems'] },
        { chapter: 'Chapter 13: Electrostatics', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions', 'Numerical Problems'] },
        { chapter: 'Chapter 14: Current Electricity', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions', 'Numerical Problems'] },
        { chapter: 'Chapter 15: Electromagnetism', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions', 'Numerical Problems'] },
        { chapter: 'Chapter 16: Basic Electronics', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions'] },
        { chapter: 'Chapter 17: Information and Communication Technology', exercises: ['All', 'Comprehensive Questions'] },
        { chapter: 'Chapter 18: Atomic and Nuclear Physics', exercises: ['All', 'Conceptual Questions', 'Comprehensive Questions', 'Numerical Problems'] },
    ],
    'Chemistry': [
        { chapter: 'Chapter 9: Chemical Equilibrium', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 10: Acids, Bases and Salts', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 11: Organic Chemistry', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 12: Hydrocarbons', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 13: Biochemistry', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 14: Environmental Chemistry I: The Atmosphere', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 15: Environmental Chemistry II: Water', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 16: Chemical Industries', exercises: ['All', 'Short Questions & Answers', 'Long Questions & Answers'] },
    ],
    'Biology': [
        { chapter: 'Chapter 10: Gaseous Exchange', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 11: Homeostasis', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 12: Coordination and Control', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 13: Support and Movement', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 14: Reproduction', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 15: Inheritance', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 16: Man and His Environment', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 17: Biotechnology', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 18: Pharmacology', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
    ],
    'Mathematics': [
        { chapter: 'Unit 17: Sets and Functions', exercises: ['All', 'Exercise 17.1', 'Exercise 17.2', 'Exercise 17.3', 'Exercise 17.4', 'Exercise 17.5', 'Review Exercise'] },
        { chapter: 'Unit 18: Variation', exercises: ['All', 'Exercise 18.1', 'Exercise 18.2', 'Exercise 18.3', 'Exercise 18.4', 'Exercise 18.5', 'Exercise 18.6', 'Review Exercise'] },
        { chapter: 'Unit 19: Algebraic Sentences', exercises: ['All', 'Exercise 19.1', 'Exercise 19.2', 'Review Exercise'] },
        { chapter: 'Unit 20: Factorization, HCF, LCM, Simplification', exercises: ['All', 'Exercise 20.1', 'Exercise 20.2', 'Exercise 20.3', 'Exercise 20.4', 'Exercise 20.5', 'Exercise 20.6', 'Review Exercise'] },
        { chapter: 'Unit 21: Linear Equations and Inequalities', exercises: ['All', 'Exercise 21.1', 'Exercise 21.2', 'Exercise 21.3', 'Exercise 21.4', 'Exercise 21.5', 'Exercise 21.6', 'Exercise 21.7', 'Review Exercise'] },
        { chapter: 'Unit 22: Elimination', exercises: ['All', 'Exercise 22.1', 'Exercise 22.2', 'Review Exercise'] },
        { chapter: 'Unit 23: Logarithms', exercises: ['All', 'Exercise 23.1', 'Exercise 23.2', 'Review Exercise'] },
        { chapter: 'Unit 24: Matrices and Determinants', exercises: ['All', 'Exercise 24.1', 'Exercise 24.2', 'Exercise 24.3', 'Exercise 24.4', 'Review Exercise'] },
        { chapter: 'Unit 25: Information Handling', exercises: ['All', 'Exercise 25.1', 'Exercise 25.2', 'Review Exercise'] },
    ],
    'Computer Science': [
        { chapter: 'Chapter 1: Introduction to C Language', exercises: ['All', 'Review Questions', 'Programming Exercises'] },
        { chapter: 'Chapter 2: Data Types, Operators and Expressions', exercises: ['All', 'Review Questions', 'Programming Exercises'] },
        { chapter: 'Chapter 3: Input/Output Management', exercises: ['All', 'Review Questions', 'Programming Exercises'] },
        { chapter: 'Chapter 4: Control Structures', exercises: ['All', 'Review Questions', 'Programming Exercises'] },
        { chapter: 'Chapter 5: Loop Structures', exercises: ['All', 'Review Questions', 'Programming Exercises'] },
        { chapter: 'Chapter 6: Functions in C', exercises: ['All', 'Review Questions', 'Programming Exercises'] },
        { chapter: 'Chapter 7: File Handling in C', exercises: ['All', 'Review Questions', 'Programming Exercises'] },
        { chapter: 'Chapter 8: Introduction to HTML', exercises: ['All', 'Review Questions', 'Practical Exercises'] },
    ],
    'English': [
        { chapter: 'Lesson 1: The Voice of God (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 2: The Wise Caliph', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 3: Professions', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 4: Little Things (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 5: A Visit', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 6: King Faisal', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 7: From a Railway Carriage (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 8: The Great War Hero', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 9: The Guddu Barrage', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 10: The Man Who Wins (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 11: The Inheritors', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 12: The Minstrel Boy (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 13: The Role of Women in the Pakistan Movement', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 14: A Village Fair', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 15: A New School for Women', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 16: The Miller of the Dee (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 17: A Great Leader', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 18: The Uses of Adversity (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 19: Nursing', exercises: ['All', 'Questions & Answers', 'Vocabulary & Grammar'] },
        { chapter: 'Lesson 20: There\'s a Good Time Coming (Poem)', exercises: ['All', 'Questions & Answers', 'Stanza Explanations', 'Vocabulary & Grammar'] },
    ],
    'Urdu': [
        { chapter: 'حمد', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'نعت', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'مناجات', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'میدان کربلا میں گرمی کی شدت', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'فاطمہ بنت عبداللہ', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'کسان', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'جیوے جیوے پاکستان', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'قومی ہمدردی', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'محسن الملک', exercises: ['All', 'مشقی سوالات و جوابات'] },
        { chapter: 'نصوح اور سلیم کی گفتگو', exercises: ['All', 'مشقی سوالات و جوابات'] },
    ],
    'Sindhi': [
        { chapter: 'حمد', exercises: ['All', 'مشق'] },
        { chapter: 'نعت', exercises: ['All', 'مشق'] },
        { chapter: 'شاه عبدالطيف ڀٽائي', exercises: ['All', 'مشق'] },
        { chapter: 'اسان جو پيارو وطن', exercises: ['All', 'مشق'] },
        { chapter: 'سماجي بھلائي', exercises: ['All', 'مشق'] },
        { chapter: 'حوصلو نه هارجي', exercises: ['All', 'مشق'] },
        { chapter: 'محنت', exercises: ['All', 'مشق'] },
        { chapter: 'سٺا شهري', exercises: ['All', 'مشق'] },
        { chapter: 'هاري', exercises: ['All', 'مشق'] },
    ],
    'Pakistan Studies': [
        { chapter: 'Chapter 1: Ideological Basis of Pakistan', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 2: Making of Pakistan', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 3: Land and Climate of Pakistan', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 4: History of Pakistan (Part-I) (1947-1971)', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
        { chapter: 'Chapter 5: History of Pakistan (Part-II) (1971-Present)', exercises: ['All', 'MCQs', 'Short Questions & Answers', 'Long Questions & Answers'] },
    ],
    'Islamiyat': [
        { chapter: 'قرآن مجید اور حدیث نبوی', exercises: ['All', 'مشق'] },
        { chapter: 'ایمانیات و عبادات', exercises: ['All', 'مشق'] },
        { chapter: 'سیرت طیبہ', exercises: ['All', 'مشق'] },
        { chapter: 'اخلاق و آداب', exercises: ['All', 'مشق'] },
    ],
  };

  // Update chapter options when subject changes
  useEffect(() => {
    const newChapters = lessonsBySubject[subject]?.map(item => item.chapter) || [];
    setChapterOptions(['All', ...newChapters]);
    setChapter('All');
    setExercise('All');
  }, [subject]);
  
  // Update exercise options when chapter changes
  useEffect(() => {
    if (chapter === 'All') {
        setExerciseOptions(['All']);
    } else {
        const selectedChapterData = lessonsBySubject[subject]?.find(item => item.chapter === chapter);
        setExerciseOptions(selectedChapterData?.exercises || ['All']);
    }
    setExercise('All');
  }, [chapter, subject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  const handleClearChat = useCallback(() => {
    if (messages.length > 0 && window.confirm('Are you sure you want to clear this entire conversation? This action cannot be undone.')) {
      setMessages([]);
      const chatHistoryKey = getChatHistoryKey(historyId);
      localStorage.removeItem(chatHistoryKey);
    }
  }, [historyId, messages.length]);
  
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64String = dataUrl.split(',')[1];
            setAttachedImage({
                base64: base64String,
                mimeType: file.type,
                name: file.name
            });
        };
        reader.onerror = () => {
            setError('Failed to read the image file.');
        };
        reader.readAsDataURL(file);

        if(event.target) event.target.value = '';
    };

    const handleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Can be adapted based on language filter

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
        };
        
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setInput(input + finalTranscript + interimTranscript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
    
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopListening();
        };
    }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    stopListening();
    if ((!input.trim() && !attachedImage) || isLoading || !isOnline) return;

    const conversationHistory = [...messages];
    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    if (attachedImage) {
        userMessage.imageUrl = `data:${attachedImage.mimeType};base64,${attachedImage.base64}`;
    }
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    const currentUrl = sourceUrl;
    const currentImage = attachedImage;
    setInput('');
    setSourceUrl('');
    setAttachedImage(null);
    setIsLoading(true);
    setError(null);

    const botMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        text: '', 
        sender: 'bot', 
        sources: [],
        imageIsLoading: false,
    };
    setMessages(prev => [...prev, botMessage]);

    try {
      const stream = aiStreamFunction(currentInput, conversationHistory, subject, chapter, exercise, language, currentUrl, currentImage?.base64, currentImage?.mimeType, currentUserEmail, userProfileNotes);
      for await (const chunk of stream) {
        setMessages(prev => prev.map(msg => 
          msg.id === botMessage.id 
            ? { 
                ...msg, 
                text: msg.text + (chunk.text || ''),
                sources: chunk.sources ? [...(msg.sources || []), ...chunk.sources].filter((v,i,a)=>a.findIndex(t=>(t.uri === v.uri))===i) : msg.sources,
                imageUrl: chunk.image || msg.imageUrl,
                imageIsLoading: chunk.image ? false : (chunk.text?.includes('IMAGE_PROMPT:') ? true : msg.imageIsLoading),
              } 
            : msg
        ));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Error: ${errorMessage}`);
      setMessages(prev => prev.map(msg => 
        msg.id === botMessage.id 
          ? { ...msg, text: `Sorry, something went wrong. Please try again. \n\n**Error:** ${errorMessage}`, imageIsLoading: false } 
          : msg
      ));
    } finally {
      setIsLoading(false);
      // Final update to ensure loading state is off
      setMessages(prev => prev.map(msg => 
        msg.id === botMessage.id ? { ...msg, imageIsLoading: false } : msg
      ));
    }
  };
  
  const placeholderText = isOnline ? (isLoading ? 'Sike\'s AI is thinking...' : (isListening ? 'Listening...' : placeholder)) : 'You are offline. AI features are unavailable.';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
        <div className="flex-shrink-0 flex items-center justify-between flex-wrap gap-x-4 gap-y-2 p-3 border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm">
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
            {showFilters && (
              <>
                <Dropdown label="Subject" options={subjects} selected={subject} onSelect={setSubject} />
                <Dropdown label="Chapter" options={chapterOptions} selected={chapter} onSelect={setChapter} disabled={subject === 'All'} />
                <Dropdown label="Exercise" options={exerciseOptions} selected={exercise} onSelect={setExercise} disabled={chapter === 'All'} />
              </>
            )}
            <Dropdown label="Language" options={languages} selected={language} onSelect={setLanguage} />
            {extraControls}
          </div>
           <button
                onClick={handleClearChat}
                disabled={messages.length === 0}
                title="Clear conversation history"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Icons.Trash className="h-4 w-4" />
                <span className="hidden sm:inline">Clear Chat</span>
            </button>
        </div>
        <div id="chat-container" className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                {messages.length === 0 && (
                     <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
                            <Icons.Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{welcomeMessage.author}</p>
                            <p className="text-gray-600 dark:text-slate-300">{welcomeMessage.text}</p>
                        </div>
                    </div>
                )}
                {messages.map((msg) => <ChatMessage key={msg.id} message={msg} language={language} />)}
                {isLoading && messages[messages.length - 1]?.sender === 'bot' && !messages[messages.length - 1]?.text && (
                  <div className="flex items-start gap-4 mt-4">
                     <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white"><Icons.Sparkles className="h-6 w-6" /></div>
                     <div className="animate-pulse">Thinking...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
        <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
            <div className="max-w-4xl mx-auto">
                {!isOnline && (
                    <div className="text-center text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-md mb-3">
                        You are currently offline. History is available, but AI chat is disabled.
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    {showFilters && (
                      <div className="relative mb-2">
                         <Icons.Link className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                         <input
                             type="url"
                             value={sourceUrl}
                             onChange={(e) => setSourceUrl(e.target.value)}
                             placeholder="Optional: Paste a link to a specific exercise for a more accurate answer..."
                             disabled={isLoading || !isOnline}
                             className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                         />
                     </div>
                    )}
                    {attachedImage && (
                        <div className="relative mb-2 p-2 bg-slate-200 dark:bg-slate-700 rounded-lg inline-block">
                            <img src={`data:${attachedImage.mimeType};base64,${attachedImage.base64}`} alt={attachedImage.name} className="max-h-24 rounded" />
                            <button type="button" onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 p-1 bg-slate-600 text-white rounded-full hover:bg-slate-800 transition-colors">
                                <Icons.X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
                            placeholder={placeholderText}
                            disabled={isLoading || !isOnline}
                            rows={1}
                            className="w-full pl-12 pr-28 py-3 resize-none rounded-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        />
                         <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
                            <button 
                                type="button" 
                                onClick={handleVoiceInput}
                                disabled={isLoading || !isOnline}
                                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                aria-label={isListening ? "Stop listening" : "Start listening"}
                            >
                                {isListening ? <Icons.StopCircle className="h-5 w-5" /> : <Icons.Microphone className="h-5 w-5" />}
                            </button>
                         </div>
                         <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading || !isOnline}
                                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                aria-label="Attach an image"
                            >
                              <Icons.ScanText className="h-5 w-5" />
                            </button>
                            <button type="submit" disabled={isLoading || (!input.trim() && !attachedImage) || !isOnline} className="p-2 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                                <Icons.Send className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

interface PageProps {
    isOnline: boolean;
    currentUserEmail?: string;
    userProfileNotes?: string;
}

// Individual Page Components
const StudyHelperPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => <ChatComponent historyId="studyHelper" pageTitle="Study Helper" welcomeMessage={{author: 'Sikandar Ali Malik', text: "Welcome to the Study Helper! Ask me anything about your subjects, and I'll provide detailed text and visual explanations."}} placeholder="Ask for a concept or a diagram..." showFilters={true} isOnline={isOnline} aiStreamFunction={(prompt, history, sub, chap, ex, lang, url, imgBase64, imgMime) => streamStudyHelperResponse(prompt, history, sub, chap, ex, lang, url, imgBase64, imgMime, currentUserEmail, userProfileNotes)} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes} />;
const SimulationsPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => <ChatComponent historyId="simulations" pageTitle="Interactive Simulations" welcomeMessage={{author: 'Simulation Master', text: "Let's run a simulation. What scenario would you like to explore? (e.g., 'Simulate a journey through the solar system') "}} placeholder="Describe a scenario to simulate..." showFilters={false} isOnline={isOnline} aiStreamFunction={(prompt, history, _, __, ___, lang, ____, imgBase64, imgMime) => streamSimulationResponse(prompt, history, lang, imgBase64, imgMime, currentUserEmail, userProfileNotes)} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes} />;
const WritingPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => <ChatComponent historyId="writing" pageTitle="Creative Writing" welcomeMessage={{author: 'Creative Writing Assistant', text: "Ready to write something amazing? Give me a prompt for a story, novel, or a raw, intense scene."}} placeholder="e.g., Write a dark fantasy scene in a cursed forest..." showFilters={false} isOnline={isOnline} aiStreamFunction={(prompt, history, _, __, ___, lang, ____, imgBase64, imgMime) => streamWritingResponse(prompt, history, lang, imgBase64, imgMime, currentUserEmail, userProfileNotes)} currentUserEmail={currentUserEmail} userProfileNotes={userProfileNotes} />;

const GrammarPage: React.FC<PageProps> = ({ isOnline, currentUserEmail, userProfileNotes }) => {
    return (
        <ChatComponent 
            historyId="grammarHelper" 
            pageTitle="Grammar Chat" 
            welcomeMessage={{
                author: 'Grammar Coach', 
                text: "Welcome to the interactive Grammar Chat! Paste any English text here, and I'll help you correct it and understand the rules. Let's improve your writing together."
            }} 
            placeholder="Paste your text here for interactive feedback..." 
            showFilters={false}
            isOnline={isOnline} 
            aiStreamFunction={(prompt, history, _, __, ___, lang, ____, imgBase64, imgMime) => streamGrammarResponse(prompt, history, _, __, ___, 'English', ____, imgBase64, imgMime, currentUserEmail, userProfileNotes)} 
            currentUserEmail={currentUserEmail} 
            userProfileNotes={userProfileNotes}
        />
    );
};

const AIChatPage: React.FC<PageProps & { userProfileNotes?: string }> = ({ isOnline, currentUserEmail, userProfileNotes }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const [chatMode, setChatMode] = useState('General');

    const isCommander = useMemo(() => currentUserEmail === 'sikandarmalik415@gmail.com', [currentUserEmail]);

    const chatModes = useMemo(() => {
        const modes = ['General', 'Writing Spirit', 'Islamic Scholar', 'Teacher', 'Game Developer'];
        if (isCommander) {
            modes.push('Mobile Tech Commander');
        }
        return modes;
    }, [isCommander]);

    useEffect(() => {
        if (!chatModes.includes(chatMode)) {
            setChatMode('General');
        }
    }, [chatModes, chatMode]);

    const conversationsKey = currentUserEmail ? getConversationsKey(currentUserEmail) : '';

    useEffect(() => {
        if (conversationsKey) {
            try {
                const savedConversations = localStorage.getItem(conversationsKey);
                const parsed = savedConversations ? JSON.parse(savedConversations) : [];
                setConversations(parsed.sort((a: Conversation, b: Conversation) => b.lastUpdated - a.lastUpdated));
            } catch (e) {
                console.error("Failed to load conversations:", e);
                setConversations([]);
            }
        }
    }, [conversationsKey]);

    const saveConversations = useCallback((updatedConversations: Conversation[]) => {
        if (conversationsKey) {
            try {
                localStorage.setItem(conversationsKey, JSON.stringify(updatedConversations));
            } catch (e) {
                console.error("Failed to save conversations:", e);
            }
        }
    }, [conversationsKey]);

    const currentMessages = useMemo(() => {
        if (!currentConversationId) return [];
        const currentConvo = conversations.find(c => c.id === currentConversationId);
        return currentConvo ? currentConvo.messages : [];
    }, [currentConversationId, conversations]);

    const handleNewChat = () => {
        setCurrentConversationId(null);
    };
    
    const handleDeleteConversation = (id: string) => {
        if (window.confirm("Are you sure you want to delete this conversation?")) {
            const updatedConversations = conversations.filter(c => c.id !== id);
            setConversations(updatedConversations);
            saveConversations(updatedConversations);
            if (currentConversationId === id) {
                setCurrentConversationId(null);
            }
        }
    };
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages, isLoading]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64String = dataUrl.split(',')[1];
            setAttachedImage({ base64: base64String, mimeType: file.type, name: file.name });
        };
        reader.readAsDataURL(file);
        if(event.target) event.target.value = '';
    };

    const handleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setInput(input + finalTranscript + interimTranscript);
        };
        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    useEffect(() => {
        return () => stopListening();
    }, []);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        stopListening();
        if ((!input.trim() && !attachedImage) || isLoading || !isOnline) return;

        let conversationId = currentConversationId;
        let isNewConversation = !conversationId;
        
        if (isNewConversation) {
            conversationId = Date.now().toString();
            setCurrentConversationId(conversationId);
        }

        const userMessage: Message = { id: `${conversationId}-${Date.now()}`, text: input, sender: 'user' };
        if (attachedImage) {
            userMessage.imageUrl = `data:${attachedImage.mimeType};base64,${attachedImage.base64}`;
        }
        
        const currentInput = input;
        const currentImage = attachedImage;
        setInput('');
        setAttachedImage(null);
        setIsLoading(true);
        setError(null);

        const botMessage: Message = { id: `${conversationId}-${Date.now() + 1}`, text: '', sender: 'bot' };
        
        // Update state and storage
        setConversations(prev => {
            let updated;
            if (isNewConversation) {
                const newConversation: Conversation = {
                    id: conversationId!,
                    title: "New Chat",
                    messages: [userMessage, botMessage],
                    lastUpdated: Date.now()
                };
                updated = [newConversation, ...prev];
            } else {
                updated = prev.map(c => c.id === conversationId ? { ...c, messages: [...c.messages, userMessage, botMessage], lastUpdated: Date.now() } : c);
            }
            // Sort to bring the latest to the top
            updated.sort((a,b) => b.lastUpdated - a.lastUpdated);
            saveConversations(updated);
            return updated;
        });
        
        const conversationHistory = conversations.find(c => c.id === conversationId)?.messages.slice(0, -2) || [];
        
        try {
            const stream = streamAIChatResponse(currentInput, conversationHistory, currentImage?.base64, currentImage?.mimeType, currentUserEmail, userProfileNotes, chatMode);
            let firstChunkReceived = false;
            let fullBotResponse = '';

            for await (const chunk of stream) {
                fullBotResponse += chunk.text || '';
                setConversations(prev => {
                    const updated = prev.map(c => {
                        if (c.id === conversationId) {
                            const updatedMessages = c.messages.map(msg => 
                                msg.id === botMessage.id 
                                    ? { ...msg, text: fullBotResponse, sources: chunk.sources ? [...(msg.sources || []), ...chunk.sources].filter((v,i,a)=>a.findIndex(t=>(t.uri === v.uri))===i) : msg.sources } 
                                    : msg
                            );
                            return { ...c, messages: updatedMessages };
                        }
                        return c;
                    });
                    saveConversations(updated); // Save on each update
                    return updated;
                });

                if (isNewConversation && !firstChunkReceived && fullBotResponse.length > 20) {
                    firstChunkReceived = true;
                    generateConversationTitle(currentInput, fullBotResponse).then(title => {
                         setConversations(prev => {
                            const updated = prev.map(c => c.id === conversationId ? { ...c, title } : c);
                            saveConversations(updated);
                            return updated;
                        });
                    });
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Error: ${errorMessage}`);
            setConversations(prev => prev.map(c => {
                 if (c.id === conversationId) {
                    const updatedMessages = c.messages.map(msg => 
                        msg.id === botMessage.id 
                            ? { ...msg, text: `Sorry, something went wrong. Please try again. \n\n**Error:** ${errorMessage}` } 
                            : msg
                    );
                    return { ...c, messages: updatedMessages };
                }
                return c;
            }));
        } finally {
            setIsLoading(false);
        }
    };
    
    const placeholderText = isOnline ? (isLoading ? 'Sike\'s AI is thinking...' : (isListening ? 'Listening...' : "Ask me anything...")) : 'You are offline. AI features are unavailable.';
    
    return (
        <div className="flex h-full">
            <ConversationSidebar 
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={setCurrentConversationId}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <div className="flex flex-col h-full flex-1 bg-white dark:bg-slate-900">
                <div className="flex-shrink-0 flex items-center gap-4 p-3 border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">AI Mode:</label>
                    <div className="w-52">
                        <Dropdown 
                            options={chatModes}
                            selected={chatMode}
                            onSelect={setChatMode}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        {currentMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Icons.Sparkles className="h-16 w-16 text-cyan-500 mb-4" />
                                <h2 className="text-2xl font-bold">How can I help you today?</h2>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">Select a mode above to get started.</p>
                            </div>
                        )}
                        {currentMessages.map((msg) => <ChatMessage key={msg.id} message={msg} language={'English'} />)}
                        {isLoading && currentMessages.length > 0 && currentMessages[currentMessages.length - 1]?.sender === 'bot' && !currentMessages[currentMessages.length - 1]?.text && (
                          <div className="flex items-start gap-4 mt-4">
                             <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white"><Icons.Sparkles className="h-6 w-6" /></div>
                             <div className="animate-pulse">Thinking...</div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
                <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSubmit}>
                            {attachedImage && (
                                <div className="relative mb-2 p-2 bg-slate-200 dark:bg-slate-700 rounded-lg inline-block">
                                    <img src={`data:${attachedImage.mimeType};base64,${attachedImage.base64}`} alt={attachedImage.name} className="max-h-24 rounded" />
                                    <button type="button" onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 p-1 bg-slate-600 text-white rounded-full hover:bg-slate-800 transition-colors">
                                        <Icons.X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            <div className="relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
                                    placeholder={placeholderText}
                                    disabled={isLoading || !isOnline}
                                    rows={1}
                                    className="w-full pl-12 pr-28 py-3 resize-none rounded-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                />
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
                                    <button type="button" onClick={handleVoiceInput} disabled={isLoading || !isOnline} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`} aria-label={isListening ? "Stop listening" : "Start listening"}>
                                        {isListening ? <Icons.StopCircle className="h-5 w-5" /> : <Icons.Microphone className="h-5 w-5" />}
                                    </button>
                                </div>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !isOnline} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors" aria-label="Attach an image">
                                      <Icons.ScanText className="h-5 w-5" />
                                    </button>
                                    <button type="submit" disabled={isLoading || (!input.trim() && !attachedImage) || !isOnline} className="p-2 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                                        <Icons.Send className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConversationSidebar: React.FC<{
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}> = ({ conversations, currentConversationId, onSelectConversation, onNewChat, onDeleteConversation, isOpen, setIsOpen }) => {
    return (
        <>
            <div className={`flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700/50 flex flex-col h-full transition-all duration-300 ${isOpen ? 'w-64' : 'w-0'}`}>
                <div className="flex-shrink-0 p-2 flex items-center justify-between">
                    <button onClick={onNewChat} className="flex-1 flex items-center gap-2 mr-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <Icons.Plus className="h-5 w-5"/>
                        New Chat
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icons.PanelLeftClose className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {conversations.map(convo => (
                        <div key={convo.id} className="group relative">
                            <button
                                onClick={() => onSelectConversation(convo.id)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors ${currentConversationId === convo.id ? 'bg-cyan-100 dark:bg-cyan-900/50' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                {convo.title}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteConversation(convo.id); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Icons.Trash className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {!isOpen && (
                <button onClick={() => setIsOpen(true)} className="absolute top-20 left-2 z-10 p-2 rounded-md bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700">
                    <Icons.PanelLeftOpen className="h-5 w-5" />
                </button>
            )}
        </>
    );
};

const TranslatorPage: React.FC<PageProps> = ({ isOnline }) => {
    const [sourceText, setSourceText] = useState('');
    const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sourceLanguage, setSourceLanguage] = useState('English');
    const [targetLanguage, setTargetLanguage] = useState('Urdu');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);
    const [fontSize, setFontSize] = useState(1); // 1 = normal, 0 = small, 2 = large
    const [isCopied, setIsCopied] = useState(false);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64String = dataUrl.split(',')[1];
            setAttachedImage({ base64: base64String, mimeType: file.type, name: file.name });
            setSourceText(''); // Clear text when image is uploaded
            setError(null);
        };
        reader.onerror = () => setError('Failed to read the image file.');
        reader.readAsDataURL(file);
        if(event.target) event.target.value = '';
    };

    const handleTranslate = async () => {
        if ((!sourceText.trim() && !attachedImage) || !isOnline) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            let translation;
            if (attachedImage) {
                translation = await getTranslatorResponseFromImage(attachedImage.base64, attachedImage.mimeType, sourceLanguage, targetLanguage);
            } else {
                translation = await getTranslatorResponse(sourceText, sourceLanguage, targetLanguage);
            }
            setResult(translation);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (!result || !result.mainTranslation) return;
        navigator.clipboard.writeText(result.mainTranslation).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => console.error("Failed to copy:", err));
    };

    const fontSizeClasses = ['text-sm', 'text-base', 'text-lg'];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                 {!isOnline && (
                    <div className="text-center text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg mb-4">
                        You are currently offline. The translator requires an internet connection.
                    </div>
                )}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl">
                        <h2 className="text-xl font-semibold mb-4">Translator</h2>
                        <textarea
                            className="w-full h-40 p-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                            placeholder={attachedImage ? "Translating from uploaded image..." : "Enter text to translate..."}
                            value={sourceText}
                            onChange={(e) => { setSourceText(e.target.value); setAttachedImage(null); }}
                            disabled={!isOnline || !!attachedImage}
                        />
                        <div className="mt-4">
                            {attachedImage ? (
                                <div className="relative p-2 bg-slate-200 dark:bg-slate-700 rounded-lg inline-block">
                                    <img src={`data:${attachedImage.mimeType};base64,${attachedImage.base64}`} alt={attachedImage.name} className="max-h-24 rounded" />
                                    <button type="button" onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 p-1 bg-slate-600 text-white rounded-full hover:bg-slate-800 transition-colors">
                                        <Icons.X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline">
                                    <Icons.ScanText className="h-5 w-5" />
                                    Or translate text from an image
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">From</label>
                                <Dropdown options={['English', 'Urdu', 'Sindhi']} selected={sourceLanguage} onSelect={setSourceLanguage} disabled={!isOnline} />
                            </div>
                            <div className="px-2">
                                <Icons.ArrowRight className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">To</label>
                                <Dropdown options={['Urdu', 'Sindhi', 'English']} selected={targetLanguage} onSelect={setTargetLanguage} disabled={!isOnline} />
                            </div>
                        </div>
                        <button onClick={handleTranslate} disabled={isLoading || (!sourceText.trim() && !attachedImage) || !isOnline} className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition">
                            {isLoading ? <><Icons.Spinner className="animate-spin h-5 w-5" /> Translating...</> : <><Icons.Translator className="h-5 w-5" /> Translate</>}
                        </button>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Result</h2>
                            <div className="flex items-center gap-1 p-1 rounded-md bg-slate-200 dark:bg-slate-700">
                                <button onClick={() => setFontSize(0)} className={`px-2 py-0.5 rounded ${fontSize === 0 ? 'bg-white dark:bg-slate-900' : ''}`}><Icons.TextSize className="h-4 w-4" /></button>
                                <button onClick={() => setFontSize(1)} className={`px-2 py-0.5 rounded ${fontSize === 1 ? 'bg-white dark:bg-slate-900' : ''}`}><Icons.TextSize className="h-5 w-5" /></button>
                                <button onClick={() => setFontSize(2)} className={`px-2 py-0.5 rounded ${fontSize === 2 ? 'bg-white dark:bg-slate-900' : ''}`}><Icons.TextSize className="h-6 w-6" /></button>
                            </div>
                        </div>
                        <div className={`prose dark:prose-invert max-w-none transition-all duration-300 ${fontSizeClasses[fontSize]}`}>
                            {isLoading && <p className="flex items-center gap-2 text-slate-500"><Icons.Spinner className="animate-spin h-5 w-5" /> Thinking...</p>}
                            {error && <p className="text-red-500 dark:text-red-400"><strong>Error:</strong> {error}</p>}
                            {result && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h3 className="!mt-0">Translation</h3>
                                        <button onClick={handleCopy} disabled={!result.mainTranslation} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 disabled:opacity-50 transition-colors">
                                          {isCopied ? (
                                            <>
                                              <Icons.Check className="h-4 w-4 text-green-500" /> 
                                              <span className="text-green-500">Copied!</span>
                                            </>
                                          ) : (
                                            <>
                                              <Icons.Copy className="h-4 w-4" />
                                              <span>Copy</span>
                                            </>
                                          )}
                                        </button>
                                    </div>

                                    <p>{result.mainTranslation}</p>
                                    <h3>Word-by-Word Breakdown</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-300 dark:border-slate-600">
                                                    <th className="p-2">Original Word</th>
                                                    <th className="p-2">Translation</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.wordByWord?.map((item: any, index: number) => (
                                                    <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                                                        <td className="p-2">{item.original}</td>
                                                        <td className="p-2">{item.translation}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                            {!isLoading && !error && !result && <p className="text-slate-500">Your translation will appear here.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AboutContactPage: React.FC = () => (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md">
                <div className="prose dark:prose-invert max-w-none">
                     <h1>About Sike's Tutor Center</h1>
                    <h2>About the Creator</h2>
                    <p>This app was created by <strong>Sikandar Ali</strong>, also known as Sike Ali or Shakal Khan Malik, the founder of Sike’s Tutor Center.</p>
                    <h3>Life & Background:</h3>
                    <p>He lives in Sindh, Pakistan, where he teaches as a private teacher in his village school and through tuition classes. His passion is to bring quality education to children, especially those from underprivileged areas.</p>
                    <h3>Teaching:</h3>
                    <p>He teaches Physics, Chemistry, Math, English, Urdu, and Sindhi, helping students from Class 1 to 12 (Sindh Text Book Board, Jamshoro). He also prepares strong exercises, notes, and exam-style papers.</p>
                    <h3>Hobbies & Passions:</h3>
                    <ul>
                        <li>Loves writing stories and novels (pen name: Sike Ali).</li>
                        <li>Enjoys gaming and reviewing games (runs a YouTube channel Sike Games Review).</li>
                        <li>Aims to combine technology + education, creating apps like this one to make learning fun and accessible.</li>
                    </ul>
                    <h3>Vision:</h3>
                    <p>His dream is to use AI, apps, and creative teaching to make learning easy, modern, and enjoyable for every student in Sindh and beyond.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md">
                <h1 className="text-3xl font-bold mb-4">Contact & Feedback</h1>
                <p className="text-slate-600 dark:text-slate-300 mb-6">If you are using this AI, you are welcome to share your feedback with Sike so he can make the app better for your learning needs.</p>
                <div className="space-y-4">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2"><Icons.Mail className="h-5 w-5 text-cyan-500" /> Emails</h2>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                            <li><a href="mailto:sikandarmalik685@gmail.com" className="text-cyan-600 dark:text-cyan-400 hover:underline">sikandarmalik685@gmail.com</a></li>
                            <li><a href="mailto:sikeji415@gmail.com" className="text-cyan-600 dark:text-cyan-400 hover:underline">sikeji415@gmail.com</a></li>
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2"><Icons.Link className="h-5 w-5 text-cyan-500" /> Social Links</h2>
                         <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                            <li>YouTube: <a href="https://www.youtube.com/@SikeGamesReview" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">Sike Games Review</a></li>
                            <li>Facebook: <a href="https://www.facebook.com/SikeGamesReview" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">Facebook Page</a></li>
                            <li>Instagram: <a href="https://www.instagram.com/sike_games.25" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">@sike_games.25</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
);


// Exam Page and its Sub-components
const ExamPage: React.FC<PageProps> = ({ isOnline }) => {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [examState, setExamState] = useState<'setup' | 'taking' | 'report'>('setup');
  const [examSetup, setExamSetup] =useState({ subject: 'Physics', chapter: 'Chapter 10: Simple Harmonic Motion and Waves', examType: 'MCQs', language: ['English'], duration: 30 });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [report, setReport] = useState<ExamReport | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inProgressExam, setInProgressExam] = useState<InProgressExamSession | null>(null);

  useEffect(() => {
      if (!studentProfile) return;
      try {
        const savedSession = localStorage.getItem(getInProgressExamKey(studentProfile.rollNo));
        if (savedSession) {
          setInProgressExam(JSON.parse(savedSession));
        }
      } catch (e) {
        console.error("Failed to load in-progress exam:", e);
        if(studentProfile) localStorage.removeItem(getInProgressExamKey(studentProfile.rollNo));
      }
  }, [studentProfile]);

  const startExam = async (setupDetails: any) => {
    if (!studentProfile) return;
    setExamSetup(setupDetails);
    setIsLoading(true);
    setError(null);
    try {
      const generatedQuestions = await generateExamQuestions(setupDetails.subject, setupDetails.chapter, setupDetails.examType, setupDetails.language);
      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error("The AI failed to generate any questions. Please try different options.");
      }
      const initialAnswers = Array(generatedQuestions.length).fill(null).map((_, index) => ({ question: generatedQuestions[index].question, answer: '' }));
      setQuestions(generatedQuestions);
      setUserAnswers(initialAnswers);
      
      const session: InProgressExamSession = {
        questions: generatedQuestions,
        userAnswers: initialAnswers,
        timeLeft: setupDetails.duration * 60,
        studentInfo: studentProfile,
        examSetup: setupDetails,
      };
      localStorage.setItem(getInProgressExamKey(studentProfile.rollNo), JSON.stringify(session));

      setExamState('taking');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred while generating the exam.");
      setExamState('setup');
    } finally {
      setIsLoading(false);
    }
  };
  
  const submitExam = async (finalAnswers: UserAnswer[]) => {
    if (!studentProfile) return;
    setUserAnswers(finalAnswers);
    setIsLoading(true);
    setError(null);
    setExamState('report');
    try {
        localStorage.removeItem(getInProgressExamKey(studentProfile.rollNo));
        const generatedReport = await evaluateExamAnswers(questions, finalAnswers, studentProfile, examSetup);
        setReport(generatedReport);
        try {
            const EXAM_HISTORY_KEY = getExamHistoryKey(studentProfile.rollNo);
            const savedHistory = localStorage.getItem(EXAM_HISTORY_KEY);
            const history = savedHistory ? JSON.parse(savedHistory) : [];
            history.unshift(generatedReport);
            localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
        } catch (e) {
            console.error("Failed to save exam history:", e);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred while evaluating the exam.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetExam = () => {
      setExamState('setup');
      setQuestions([]);
      setUserAnswers([]);
      setReport(null);
      setError(null);
      setIsLoading(false);
      if (studentProfile) localStorage.removeItem(getInProgressExamKey(studentProfile.rollNo));
  };

  const resumeCurrentExam = () => {
    if (inProgressExam) {
      setExamSetup(inProgressExam.examSetup);
      setQuestions(inProgressExam.questions);
      setUserAnswers(inProgressExam.userAnswers);
      setExamState('taking');
    }
  };

  const startNewExam = () => {
    if (window.confirm("Are you sure? Your previous exam progress will be lost.") && studentProfile) {
      localStorage.removeItem(getInProgressExamKey(studentProfile.rollNo));
      setInProgressExam(null);
    }
  };

  if (!studentProfile) {
    return <ProfileCreationForExam onProfileCreated={setStudentProfile} />;
  }

  if (examState === 'setup') {
    return <ExamSetupComponent onStartExam={startExam} isLoading={isLoading} error={error} initialSetup={examSetup} isOnline={isOnline} inProgressExam={inProgressExam} onResumeExam={resumeCurrentExam} onStartNewExam={startNewExam} />;
  }
  
  if (examState === 'taking') {
    return <ExamTakingComponent questions={questions} duration={examSetup.duration} onSubmit={submitExam} initialAnswers={userAnswers} language={examSetup.language[0]} initialTimeLeft={inProgressExam?.timeLeft} studentInfo={studentProfile} examSetup={examSetup} inProgressKey={getInProgressExamKey(studentProfile.rollNo)} />;
  }
  
  if (examState === 'report') {
    return <ExamReportComponent report={report} isLoading={isLoading} error={error} onReset={resetExam} />;
  }

  return null;
};

const ProfileCreationForExam: React.FC<{ onProfileCreated: (profile: StudentProfile) => void }> = ({ onProfileCreated }) => {
    const [profileData, setProfileData] = useState({ name: '', className: 'X', schoolName: '', rollNo: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onProfileCreated(profileData);
    };

    return (
        <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-900 p-4">
            <div className="max-w-md w-full bg-slate-50 dark:bg-slate-800/60 p-8 rounded-2xl shadow-lg text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white mb-4">
                    <Icons.FileText className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold">Student Details for Exam</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Please enter your details to start the exam. This is required for your report card.</p>
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <input type="text" name="name" value={profileData.name} onChange={handleChange} placeholder="Full Name" required className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-cyan-500 focus:border-cyan-500" />
                    <input type="text" name="rollNo" value={profileData.rollNo} onChange={handleChange} placeholder="Roll No. / GR No. (This is your ID)" required className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-cyan-500 focus:border-cyan-500" />
                    <input type="text" name="className" value={profileData.className} onChange={handleChange} placeholder="Class (e.g., X)" required className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-cyan-500 focus:border-cyan-500" />
                    <input type="text" name="schoolName" value={profileData.schoolName} onChange={handleChange} placeholder="School Name" required className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-cyan-500 focus:border-cyan-500" />
                    <button type="submit" className="w-full py-3 mt-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition">Continue to Exam Setup</button>
                </form>
            </div>
        </div>
    );
};


const ExamSetupComponent: React.FC<{
    onStartExam: (setup: any) => void;
    isLoading: boolean;
    error: string | null;
    initialSetup: any;
    isOnline: boolean;
    inProgressExam: InProgressExamSession | null;
    onResumeExam: () => void;
    onStartNewExam: () => void;
}> = ({ onStartExam, isLoading, error, initialSetup, isOnline, inProgressExam, onResumeExam, onStartNewExam }) => {
    const [setup, setSetup] = useState(initialSetup);
    
    const [chapterOptions, setChapterOptions] = useState<string[]>([]);

    const handleLanguageChange = (lang: string) => {
        setSetup((prev: any) => {
            const newLangs = prev.language.includes(lang)
                ? prev.language.filter((l: string) => l !== lang)
                : [...prev.language, lang];
            // Ensure at least one language is always selected
            if (newLangs.length === 0) {
                return prev;
            }
            return { ...prev, language: newLangs };
        });
    };

    const subjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Sindhi', 'Pakistan Studies', 'Islamiyat'];
    const languages = ['English', 'Urdu', 'Sindhi'];
    const examTypes = ['MCQs', 'Short Questions', 'Long Questions', 'Mixed Paper'];
    const durations = [15, 30, 60, 90, 120];

    const lessonsBySubject: Record<string, { chapter: string; exercises: string[] }[]> = {
    'Physics': [
        { chapter: 'Chapter 10: Simple Harmonic Motion and Waves', exercises: [] },
        { chapter: 'Chapter 11: Sound', exercises: [] },
    ],
    'Chemistry': [
        { chapter: 'Chapter 9: Chemical Equilibrium', exercises: [] },
        { chapter: 'Chapter 10: Acids, Bases and Salts', exercises: [] },
    ],
    // Add all other subjects and chapters here as defined previously
  };


    useEffect(() => {
        const newChapters = lessonsBySubject[setup.subject]?.map(item => item.chapter) || [];
        setChapterOptions(['All', ...newChapters]);
        if (!newChapters.includes(setup.chapter) && setup.chapter !== 'All') {
            setSetup(s => ({...s, chapter: 'All'}));
        }
    }, [setup.subject]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOnline) return;
        onStartExam(setup);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 flex items-center justify-center">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-800/60 p-8 rounded-2xl shadow-lg">
                {!isOnline && (
                    <div className="text-center text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg mb-4">
                        You are currently offline. Exam generation requires an internet connection.
                    </div>
                )}
                {inProgressExam ? (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Exam in Progress</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">You have an unfinished exam for {inProgressExam.examSetup.subject}.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onClick={onResumeExam} className="w-full sm:w-auto flex-1 py-3 px-6 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition">Resume Exam</button>
                            <button onClick={onStartNewExam} className="w-full sm:w-auto flex-1 py-3 px-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition">Start New Exam</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <h1 className="text-3xl font-bold text-center mb-6">Exam Setup</h1>
                        {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-4" role="alert">{error}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                                <Dropdown options={subjects} selected={setup.subject} onSelect={(s) => setSetup({...setup, subject: s})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chapter</label>
                                <Dropdown options={chapterOptions} selected={setup.chapter} onSelect={(c) => setSetup({...setup, chapter: c})} disabled={setup.subject === 'All'} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                                <Dropdown options={examTypes} selected={setup.examType} onSelect={(t) => setSetup({...setup, examType: t})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (minutes)</label>
                                <Dropdown options={durations.map(String)} selected={String(setup.duration)} onSelect={(d) => setSetup({...setup, duration: Number(d)})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Language(s)</label>
                                <div className="flex flex-wrap gap-2">
                                    {languages.map(lang => (
                                        <button
                                            type="button"
                                            key={lang}
                                            onClick={() => handleLanguageChange(lang)}
                                            className={`px-4 py-2 text-sm rounded-full font-semibold transition-colors ${
                                                setup.language.includes(lang)
                                                    ? 'bg-cyan-600 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading || !isOnline} className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition">
                            {isLoading ? <><Icons.Spinner className="animate-spin h-5 w-5" /> Generating Exam...</> : 'Start Exam'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

// FIX: Refactored component to fix stale closure bug in exam timer and improve submission logic.
const ExamTakingComponent: React.FC<{
    questions: Question[];
    duration: number;
    onSubmit: (answers: UserAnswer[]) => void;
    initialAnswers: UserAnswer[];
    language: string;
    initialTimeLeft?: number;
    studentInfo: StudentProfile;
    examSetup: any;
    inProgressKey: string;
}> = ({ questions, duration, onSubmit, initialAnswers, language, initialTimeLeft, studentInfo, examSetup, inProgressKey }) => {
    const [currentAnswers, setCurrentAnswers] = useState<UserAnswer[]>(initialAnswers);
    const [timeLeft, setTimeLeft] = useState(initialTimeLeft || duration * 60);
    // FIX: Changed NodeJS.Timeout to number, as setInterval in browser environments returns a number.
    const timerRef = useRef<number | null>(null);

    // Use a ref to hold the submission function to avoid stale closures in setInterval.
    const submitFn = useRef(() => {});
    submitFn.current = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        onSubmit(currentAnswers);
    };

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                    }
                    submitFn.current(); // Auto-submit when time is up
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []); // Empty dependency array is correct here because submitFn.current is always up-to-date.
    
    useEffect(() => {
        const session: InProgressExamSession = {
            questions, userAnswers: currentAnswers, timeLeft, studentInfo, examSetup
        };
        localStorage.setItem(inProgressKey, JSON.stringify(session));
    }, [timeLeft, currentAnswers, questions, studentInfo, examSetup, inProgressKey]);

    const handleAnswerChange = (questionIndex: number, answer: string) => {
        setCurrentAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[questionIndex] = { ...newAnswers[questionIndex], answer };
            return newAnswers;
        });
    };

    const handleSubmit = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (window.confirm('Are you sure you want to submit your exam?')) {
            submitFn.current();
        } else {
             // If user cancels, restart the timer with the same auto-submit logic.
             timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        submitFn.current();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getLocalizedQuestion = (questionText: string) => {
        const parts = questionText.split(' / ');
        const langIndex = ['English', 'Urdu', 'Sindhi'].indexOf(language);
        return parts[langIndex] || parts[0];
    };
    
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-b-lg shadow-md mb-6 z-10 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Exam in Progress</h1>
                    <div className="text-xl font-semibold bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg">{formatTime(timeLeft)}</div>
                </div>
                <div className="space-y-6">
                    {questions.map((q, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-sm">
                            <div className="flex justify-between items-start gap-2">
                                <p className="font-semibold mb-3">Question {index + 1}:</p>
                                <CopyButton textToCopy={getLocalizedQuestion(q.question)} title="Copy question" />
                            </div>
                            <p className="mb-4">{getLocalizedQuestion(q.question)}</p>
                            {q.type === 'MCQ' && q.options && (
                                <div className="space-y-2">
                                    {q.options.map((option, optIndex) => (
                                        <label key={optIndex} className="flex items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition">
                                            <input
                                                type="radio"
                                                name={`question-${index}`}
                                                value={option}
                                                checked={currentAnswers[index]?.answer === option}
                                                onChange={() => handleAnswerChange(index, option)}
                                                className="h-4 w-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                                            />
                                            <span className="ml-3 text-sm">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {(q.type === 'SHORT' || q.type === 'LONG') && (
                                <textarea
                                    value={currentAnswers[index]?.answer || ''}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    rows={q.type === 'SHORT' ? 3 : 6}
                                    className="w-full p-2 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-cyan-500"
                                    placeholder="Type your answer here..."
                                />
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={handleSubmit} className="mt-8 w-full py-3 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition">
                    Submit Exam
                </button>
            </div>
        </div>
    );
};

const ExamReportComponent: React.FC<{
    report: ExamReport | null;
    isLoading: boolean;
    error: string | null;
    onReset: () => void;
}> = ({ report, isLoading, error, onReset }) => {
    if (isLoading) {
        return <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Icons.Spinner className="animate-spin h-10 w-10 mb-4 text-cyan-500" />
            <h2 className="text-xl font-semibold">Evaluating Your Exam...</h2>
            <p className="text-slate-500 dark:text-slate-400">Please wait while the AI grades your answers.</p>
        </div>;
    }

    if (error) {
         return <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Icons.AlertTriangle className="h-10 w-10 mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-red-500">Evaluation Failed</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md my-2">{error}</p>
            <button onClick={onReset} className="mt-4 px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold">Try Again</button>
        </div>;
    }
    
    if (!report) {
         return <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-xl font-semibold">No Report Available</h2>
            <p className="text-slate-500 dark:text-slate-400">The exam report could not be loaded.</p>
            <button onClick={onReset} className="mt-4 px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold">Take a New Exam</button>
        </div>;
    }
    
    const gradeColor = report.results.percentage >= 80 ? 'text-green-500' : report.results.percentage >= 60 ? 'text-yellow-500' : 'text-red-500';

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div id="printable-report" className="bg-white dark:bg-slate-800/60 p-8 rounded-2xl shadow-lg">
                    <h1 className="text-3xl font-bold text-center mb-2">Exam Report Card</h1>
                    <p className="text-center text-slate-500 dark:text-slate-400 mb-6">Sike's Tutor Center</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6 border-y border-slate-200 dark:border-slate-700 py-4">
                        <div><strong>Student:</strong> {report.studentInfo.name}</div>
                        <div><strong>Roll No:</strong> {report.studentInfo.rollNo}</div>
                        <div><strong>Class:</strong> {report.studentInfo.className}</div>
                        <div><strong>School:</strong> {report.studentInfo.schoolName}</div>
                        <div><strong>Subject:</strong> {report.examSetup.subject}</div>
                        <div><strong>Chapter:</strong> {report.examSetup.chapter}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                            <div className="text-3xl font-bold">{report.results.marksObtained} / {report.results.totalMarks}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Score</div>
                        </div>
                         <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                            <div className={`text-3xl font-bold ${gradeColor}`}>{report.results.percentage.toFixed(1)}%</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Percentage</div>
                        </div>
                         <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                            <div className={`text-3xl font-bold ${gradeColor}`}>{report.results.grade}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Grade</div>
                        </div>
                         <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                            <div className="text-3xl font-bold">{report.examSetup.duration}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Mins</div>
                        </div>
                    </div>
                    
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-2">Overall Feedback</h2>
                        <p className="text-slate-600 dark:text-slate-300">{report.results.overallFeedback}</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Answer Breakdown</h2>
                        <div className="space-y-4">
                            {report.results.breakdown.map((item, index) => (
                                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold">{index + 1}. {item.question}</p>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                            {item.isCorrect ? 
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Correct</span> :
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Incorrect</span>
                                            }
                                            <CopyButton textToCopy={item.question} title="Copy question"/>
                                        </div>
                                    </div>
                                    <div className="text-sm mt-2 space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <p><strong>Your Answer:</strong> <span className="text-slate-600 dark:text-slate-300">{item.userAnswer || 'Not answered'}</span></p>
                                            <CopyButton textToCopy={item.userAnswer} title="Copy your answer" />
                                        </div>
                                        {!item.isCorrect && 
                                            <div className="flex justify-between items-start gap-2">
                                                <p><strong>Correct Answer:</strong> <span className="text-slate-600 dark:text-slate-300">{item.modelAnswer}</span></p>
                                                <CopyButton textToCopy={item.modelAnswer} title="Copy correct answer" />
                                            </div>
                                        }
                                        {!item.isCorrect && 
                                            <div className="flex justify-between items-start gap-2">
                                                <p><strong>Feedback:</strong> <span className="text-slate-600 dark:text-slate-300">{item.feedback}</span></p>
                                                <CopyButton textToCopy={item.feedback} title="Copy feedback" />
                                            </div>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                 <div className="mt-8 flex gap-4 justify-center">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                        <Icons.Printer className="h-5 w-5" /> Print
                    </button>
                    <button onClick={onReset} className="px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition">
                        Take Another Exam
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardPage: React.FC<PageProps & { setPage: (page: string) => void }> = ({ isOnline, setPage }) => {
    const [rollNo, setRollNo] = useState('');
    const [history, setHistory] = useState<ExamReport[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [weakestSubject, setWeakestSubject] = useState<string | null>(null);

    const loadHistory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rollNo.trim()) {
            setError('Please enter a valid Roll Number.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const savedHistory = localStorage.getItem(getExamHistoryKey(rollNo));
            const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
            setHistory(parsedHistory);

            if (parsedHistory.length > 0) {
                // Calculate weakest subject
                const subjectScores: Record<string, { total: number; obtained: number }> = {};
                parsedHistory.forEach((report: ExamReport) => {
                    const subject = report.examSetup.subject;
                    if (!subjectScores[subject]) {
                        subjectScores[subject] = { total: 0, obtained: 0 };
                    }
                    subjectScores[subject].total += report.results.totalMarks;
                    subjectScores[subject].obtained += report.results.marksObtained;
                });
                
                let minPercentage = 101;
                let weakSubject = null;
                for (const subject in subjectScores) {
                    const percentage = (subjectScores[subject].obtained / subjectScores[subject].total) * 100;
                    if (percentage < minPercentage) {
                        minPercentage = percentage;
                        weakSubject = subject;
                    }
                }
                setWeakestSubject(weakSubject);
            } else {
                setWeakestSubject(null);
            }

        } catch (err) {
            setError("Failed to load or parse exam history.");
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const chartData = history.map(r => ({ name: new Date(parseInt(r.id)).toLocaleDateString(), score: r.results.percentage })).reverse();
    
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md mb-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">Exam Center</h1>
                            <p className="text-slate-500 dark:text-slate-400">Track your performance or start a new exam.</p>
                        </div>
                        <button 
                          onClick={() => setPage('exam')}
                          className="w-full sm:w-auto flex-shrink-0 px-6 py-3 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition flex items-center justify-center gap-2"
                        >
                          <Icons.FileText className="h-5 w-5" />
                          Start New Exam
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md mb-6">
                     <h2 className="text-xl font-bold mb-4">View Your History</h2>
                    <form onSubmit={loadHistory} className="flex gap-2">
                        <input
                            type="text"
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value)}
                            placeholder="Enter Your Roll No."
                            className="flex-grow px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-cyan-500"
                        />
                        <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 disabled:opacity-50">
                            {isLoading ? 'Loading...' : 'View'}
                        </button>
                    </form>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                
                {history.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                           <div className="md:col-span-1 bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md">
                                <h2 className="font-semibold mb-2">Key Stats</h2>
                               <div className="space-y-3 text-sm">
                                   <p><strong>Total Exams Taken:</strong> {history.length}</p>
                                   {weakestSubject && <p><strong>Weakest Subject:</strong> <span className="font-bold text-yellow-500">{weakestSubject}</span></p>}
                               </div>
                           </div>
                           <div className="md:col-span-2 bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md">
                               <h2 className="font-semibold mb-4">Performance Over Time</h2>
                               <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis domain={[0, 100]} unit="%" fontSize={12} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="score" stroke="#0891b2" strokeWidth={2} activeDot={{ r: 8 }} />
                                    </LineChart>
                               </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-bold mb-4">Exam History</h2>
                            <div className="space-y-3">
                                {history.map(report => (
                                    <div key={report.id} className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{report.examSetup.subject} - {report.examSetup.examType}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(parseInt(report.id)).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                             <p className="font-bold">{report.results.percentage.toFixed(1)}% ({report.results.grade})</p>
                                             <p className="text-xs text-slate-500 dark:text-slate-400">{report.results.marksObtained}/{report.results.totalMarks} Marks</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : !isLoading && (
                    <div className="text-center py-10">
                      <p className="text-slate-500 dark:text-slate-400">Enter your Roll No. above to see your past exam results.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatMessage: React.FC<{ message: Message; language: string }> = ({ message, language }) => {
  const [ttsState, setTtsState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('default');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const isUser = message.sender === 'user';
  
  useEffect(() => {
    if (contentRef.current && !isUser) {
        const isDarkMode = document.documentElement.classList.contains('dark');
        contentRef.current.querySelectorAll('pre').forEach(pre => {
            if (pre.querySelector('.code-copy-btn')) return; // Avoid duplicates

            const codeText = pre.querySelector('code')?.innerText || pre.innerText;

            const button = document.createElement('button');
            button.className = `code-copy-btn absolute top-2 right-2 p-1.5 rounded-md transition-colors`;
            if (isDarkMode) {
                button.className += ' text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-slate-200';
            } else {
                button.className += ' text-slate-500 bg-slate-200 hover:bg-slate-300 hover:text-slate-700';
            }
            button.title = 'Copy code';
            const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            const checkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
            
            button.innerHTML = copyIconSVG;

            button.addEventListener('click', () => {
                navigator.clipboard.writeText(codeText).then(() => {
                    button.innerHTML = checkIconSVG;
                    if (isDarkMode) button.classList.add('text-green-400'); else button.classList.add('text-green-600');
                    setTimeout(() => {
                        button.innerHTML = copyIconSVG;
                        if (isDarkMode) button.classList.remove('text-green-400'); else button.classList.remove('text-green-600');
                    }, 2000);
                });
            });
            
            pre.style.position = 'relative';
            pre.appendChild(button);
        });
    }
  }, [message.text, isUser]);

  useEffect(() => {
    const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => {
        window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  const getLangCode = (lang: string) => {
    switch(lang) {
        case 'Urdu': return 'ur-PK';
        case 'Sindhi': return 'sd-IN';
        case 'English':
        default: return 'en-US';
    }
  };

  const filteredVoices = useMemo(() => {
    if (voices.length === 0) return [];
    const targetLangCode = getLangCode(language);
    const primaryLang = targetLangCode.split('-')[0];
    return voices.filter(voice => voice.lang.startsWith(primaryLang));
  }, [voices, language]);

  useEffect(() => {
    if (selectedVoiceURI !== 'default' && !filteredVoices.find(v => v.voiceURI === selectedVoiceURI)) {
      setSelectedVoiceURI('default');
    }
  }, [filteredVoices, selectedVoiceURI]);

  const findBestVoice = (lang: string): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;
    const targetLangCode = getLangCode(lang);
    const targetPrimaryLang = targetLangCode.split('-')[0];
    let bestVoice = voices.find(voice => voice.lang === targetLangCode);
    if (bestVoice) return bestVoice;
    bestVoice = voices.find(voice => voice.lang.startsWith(targetPrimaryLang));
    if (bestVoice) return bestVoice;
    if (lang === 'Sindhi') {
        bestVoice = voices.find(voice => voice.lang === 'hi-IN');
        if (bestVoice) return bestVoice;
    }
    return null;
  };

  const handleTTS = () => {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.error("Speech Synthesis is not supported in this browser.");
      return;
    }
    
    if (ttsState === 'playing') {
      synth.pause();
      setTtsState('paused');
    } else if (ttsState === 'paused') {
      synth.resume();
      setTtsState('playing');
    } else if (ttsState === 'stopped') {
      synth.cancel();
      const textToSpeak = message.text.replace(/[*#`_]/g, '');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.rate = playbackRate;
      if (selectedVoiceURI !== 'default') {
          const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
          if (selectedVoice) utterance.voice = selectedVoice;
      } else {
          const bestVoice = findBestVoice(language);
          if (bestVoice) utterance.voice = bestVoice;
      }
      utterance.lang = utterance.voice?.lang || getLangCode(language);

      utterance.onend = () => {
        setTtsState('stopped');
        utteranceRef.current = null;
      };
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          console.error('SpeechSynthesis Error:', e.error);
        }
        setTtsState('stopped');
        utteranceRef.current = null;
      };
      
      utteranceRef.current = utterance;
      synth.speak(utterance);
      setTtsState('playing');
    }
  };

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setTtsState('stopped');
    utteranceRef.current = null;
  };

  const handleCopy = () => {
      if (!message.text) return;
      navigator.clipboard.writeText(message.text).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => console.error("Failed to copy text:", err));
  };
  
  const langClass = language === 'Urdu' ? 'font-urdu' : language === 'Sindhi' ? 'font-sindhi' : '';
  
  const voiceOptions = useMemo(() => ['default', ...filteredVoices.map(v => v.voiceURI)], [filteredVoices]);
  const voiceDisplayMap = useMemo(() => ({
    default: 'Default Voice',
    ...Object.fromEntries(filteredVoices.map(v => [v.voiceURI, v.name]))
  }), [filteredVoices]);
  
  const rateOptions = [0.75, 1, 1.5, 2];
  const rateDisplayMap = { 0.75: '0.75x', 1: '1x', 1.5: '1.5x', 2: '2x' };

  return (
    <div className={`flex items-start gap-4 mt-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
          <Icons.Sparkles className="h-6 w-6" />
        </div>
      )}
      <div className={`max-w-xl flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
         {message.text && (
            <div className={`flex flex-wrap items-center gap-2 mb-1 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <>
                  <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200 dark:bg-slate-700">
                      <button onClick={handleTTS} title={ttsState === 'playing' ? "Pause" : "Listen"} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                          {ttsState === 'playing' ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                      </button>
                      {ttsState !== 'stopped' && (
                          <button onClick={stopTTS} title="Stop" className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                              <Icons.Stop className="h-4 w-4" />
                          </button>
                      )}
                  </div>
                  {filteredVoices.length > 0 && (
                    <>
                      <div className="min-w-[150px] max-w-[200px]">
                          <Dropdown
                              options={voiceOptions}
                              selected={selectedVoiceURI}
                              onSelect={(uri) => setSelectedVoiceURI(uri as string)}
                              displayValueMap={voiceDisplayMap}
                          />
                      </div>
                      <div className="w-24">
                          <Dropdown
                              options={rateOptions}
                              selected={playbackRate}
                              onSelect={(rate) => setPlaybackRate(Number(rate))}
                              displayValueMap={rateDisplayMap}
                          />
                      </div>
                    </>
                  )}
                </>
              )}
              <button onClick={handleCopy} title={isCopied ? "Copied!" : "Copy"} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  {isCopied ? <Icons.Check className="h-4 w-4 text-green-500" /> : <Icons.Copy className="h-4 w-4" />}
              </button>
            </div>
        )}
        <div ref={contentRef} className={`px-4 py-3 rounded-xl ${isUser ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-white'}`}>
          {message.imageIsLoading && (
            <div className="flex items-center justify-center h-48 w-48 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse">
                <Icons.Spinner className="h-8 w-8 text-slate-400" />
            </div>
          )}
          {message.imageUrl && <img src={message.imageUrl} alt="Generated visual" className="rounded-md mb-2 max-w-full" />}
          <div
            className={`prose dark:prose-invert max-w-none ${langClass}`}
            dangerouslySetInnerHTML={{ __html: (window as any).marked.parse(message.text) }}
          />
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
                {message.sources.map((source, index) => <SourceBubble key={index} source={source} />)}
            </div>
        )}
      </div>
       {isUser && (
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          <Icons.User className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};


const SourceBubble: React.FC<{ source: Source }> = ({ source }) => (
  <a
    href={source.uri}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
  >
    <Icons.ExternalLink className="h-3 w-3" />
    <span>{source.title || 'Source'}</span>
  </a>
);

const Dropdown: React.FC<{
  label?: string;
  options: (string | number)[];
  selected: string | number;
  onSelect: (option: any) => void;
  disabled?: boolean;
  displayValueMap?: { [key: string | number]: string | number };
}> = ({ label, options, selected, onSelect, disabled = false, displayValueMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const getDisplayLabel = (value: string | number) => {
    return displayValueMap?.[value] ?? value;
  };

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      {label && <span className="mr-2 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full inline-flex justify-between items-center min-w-[120px] rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-3 py-1.5 bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">{getDisplayLabel(selected)}</span>
        <Icons.ChevronDown className="-mr-1 ml-2 h-5 w-5" />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 z-20">
          <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar" role="menu" aria-orientation="vertical">
            {options.map(option => (
              <a
                href="#"
                key={option}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(option);
                  setIsOpen(false);
                }}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600"
                role="menuitem"
              >
                {getDisplayLabel(option)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProfilePage: React.FC<{
    currentNotes: string;
    onSave: (notes: string) => void;
}> = ({ currentNotes, onSave }) => {
    const [notes, setNotes] = useState(currentNotes);

    const handleSave = () => {
        onSave(notes);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800/60 p-6 rounded-xl shadow-md">
                    <h1 className="text-2xl font-bold mb-2">My Profile & Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Teach the AI about you. Write down your preferences, writing style, or any custom rules you want the AI to follow at all times. This is your AI's long-term memory.
                    </p>
                    <textarea
                        className="w-full h-80 p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        placeholder="e.g., Always refer to me as 'Captain'. My favorite topics are space exploration and ancient history. When I ask for a story, make it a sci-fi comedy..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <button onClick={handleSave} className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition">
                        Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
