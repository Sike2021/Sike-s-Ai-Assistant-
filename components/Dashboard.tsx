
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Icons } from './Icons';
import { PageProps, ExamReport } from '../types';
import { getExamHistoryKey } from '../utils/appUtils';

export const DashboardPage: React.FC<PageProps & { setPage: (page: string) => void }> = ({ isOnline, setPage }) => {
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
