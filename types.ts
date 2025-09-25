
// FIX: Define types for the application to ensure type safety.
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: Source[];
  imageUrl?: string;
  imageIsLoading?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export interface UserProfile {
  notes: string;
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
  rating: number; // A score out of 10
  feedback: string; // Detailed feedback on the text
  correctedText: string; // The corrected version of the text
}

export interface Question {
  question: string;
  type: 'MCQ' | 'SHORT' | 'LONG';
  options?: string[];
  modelAnswer: string;
}

export interface UserAnswer {
  question: string;
  answer: string;
}

export interface StudentProfile {
  name: string;
  className: string;
  schoolName: string;
  rollNo: string;
}

export interface ExamReport {
  id:string;
  studentInfo: StudentProfile;
  examSetup: {
    subject: string;
    chapter: string;
    examType: string;
    language: string[];
    duration: number;
  };
  results: {
    totalMarks: number;
    marksObtained: number;
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
  examSetup: {
    subject: string;
    chapter: string;
    examType: string;
    language: string[];
    duration: number;
  };
}
