
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: Source[];
  imageUrls?: string[];
  imageIsLoading?: boolean;
}

export interface NotebookSource {
    id: string;
    name: string;
    content: string;
    size: number;
    type: string;
}

export interface VaultFile extends NotebookSource {
    uploadedAt: number;
    summary?: string;
    tasks?: VaultTask[];
}

export interface VaultTask {
    id: string;
    text: string;
    status: 'pending' | 'completed' | 'in-progress';
    priority: 'low' | 'medium' | 'high';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export type SubscriptionTier = 'free' | 'study' | 'pro';

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  notes?: string;
  lastActive?: number;
  subscription?: {
    tier: SubscriptionTier;
    expiry: number;
  };
}

export interface Source {
  uri: string;
  title: string;
}

export interface TranslatorResponse {
    mainTranslation: string;
    wordByWord: {
        original: string;
        translation: string;
    }[];
}

export interface GrammarEvaluation {
  rating: number;
  feedback: string;
  correctedText: string;
}

export interface PageProps {
    isOnline: boolean;
    currentUserEmail?: string | null;
    userProfileNotes?: string;
}

// Added missing exam related types
export interface StudentProfile {
    name: string;
    className: string;
    schoolName: string;
    rollNo: string;
}

export interface Question {
    question: string;
    type: string;
    options?: string[];
    modelAnswer?: string;
}

export interface UserAnswer {
    question: string;
    answer: string;
}

export interface ExamReport {
    id: string;
    studentInfo: StudentProfile;
    examSetup: any;
    results: {
        marksObtained: number;
        totalMarks: number;
        percentage: number;
        grade: string;
        overallFeedback: string;
        breakdown: {
            question: string;
            userAnswer: string;
            modelAnswer: string;
            isCorrect: boolean;
            feedback: string;
        }[];
    };
}

export interface InProgressExamSession {
    questions: Question[];
    userAnswers: UserAnswer[];
    timeLeft: number;
    studentInfo: StudentProfile;
    examSetup: any;
}
