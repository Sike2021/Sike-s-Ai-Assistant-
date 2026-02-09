import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { Dropdown, CopyButton, LoadingSpinner } from './Shared';
import { PageProps, StudentProfile, Question, UserAnswer, ExamReport, InProgressExamSession } from '../types';
import { generateExamQuestions, evaluateExamAnswers } from '../services/geminiService';
import { getInProgressExamKey, getExamHistoryKey } from '../utils/appUtils';

export const ExamPage: React.FC<PageProps> = ({ isOnline }) => {
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
  };


    useEffect(() => {
        const newChapters = lessonsBySubject[setup.subject]?.map(item => item.chapter) || [];
        setChapterOptions(['All', ...newChapters]);
        if (!newChapters.includes(setup.chapter) && setup.chapter !== 'All') {
            setSetup((s: any) => ({...s, chapter: 'All'}));
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
                                <Dropdown options={subjects} selected={setup.subject} onSelect={(s: string) => setSetup({...setup, subject: s})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chapter</label>
                                <Dropdown options={chapterOptions} selected={setup.chapter} onSelect={(c: string) => setSetup({...setup, chapter: c})} disabled={setup.subject === 'All'} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                                <Dropdown options={examTypes} selected={setup.examType} onSelect={(t: string) => setSetup({...setup, examType: t})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (minutes)</label>
                                <Dropdown options={durations.map(String)} selected={String(setup.duration)} onSelect={(d: string) => setSetup({...setup, duration: Number(d)})} />
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
                        <div className="mt-6">
                            {isLoading ? (
                                <LoadingSpinner label="SigNify is composing your paper..." />
                            ) : (
                                <button type="submit" disabled={!isOnline} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition">
                                    Start Exam
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

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
    const timerRef = useRef<number | null>(null);

    const submitFn = useRef(() => {});
    submitFn.current = () => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
        }
        onSubmit(currentAnswers);
    };

    useEffect(() => {
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        window.clearInterval(timerRef.current);
                    }
                    submitFn.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
        };
    }, []);
    
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
            window.clearInterval(timerRef.current);
        }
        if (window.confirm('Are you sure you want to submit your exam?')) {
            submitFn.current();
        } else {
             timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) window.clearInterval(timerRef.current);
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
            <LoadingSpinner label="SigNify is marking your scripts..." />
            <p className="text-slate-500 dark:text-slate-400 mt-4">Please wait while the AI grades your answers.</p>
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
                        {/* DO add comment above each fix. */}
                        {/* Fix: Added missing opening bracket to h2 tag on line 563 */}
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