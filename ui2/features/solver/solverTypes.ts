export interface TopicalPaper { qpId: string; msId?: string; title: string }
export interface YearlyPaper { paperId: string; year: number; session: string; variant?: string; title: string; component?: string; audioPath?: string }
export type Library = Record<string, Record<string, Record<string, TopicalPaper[]>>>;
export type YearlyLibrary = Record<string, Record<string, Record<string, YearlyPaper[]>>>;
export type SubjectMeta = Record<string, Record<string, { mcqComponent?: string }>>;

export interface McqQuestion { questionNumber: string; image: string; optionLetters: string[]; correctAnswer?: string | null; _origin?: { paperId: string; subject: string; chapter: string | null } }
export interface DigitizeResult { questions: McqQuestion[]; ambiguousAnswerKey?: unknown[] }
export interface StructuredItem { questionNumber: string; qImage: string; msImage: string | null }

/** What a result needs to remember about the paper being attempted (null for a manual upload, which is never tracked). */
export interface AttemptMeta { subject: string; chapter: string | null; paperId: string }

export interface LineFeedback { step: string; correct: boolean; mistake?: string; correctAlternative?: string }
export interface MarkBreakdown { markLabel?: string; awarded: boolean; evidence?: string; whatWasNeeded?: string }
export interface StyleItem { device?: string; present: boolean; evidence?: string }
export interface GradeResult {
  questionNumber: string;
  ungradable?: boolean;
  reason?: string;
  marksAwarded: number;
  marksAvailable: number;
  remark?: string;
  studentAnswerVerbatim?: string;
  lineFeedback?: LineFeedback[];
  markBreakdown?: MarkBreakdown[];
  styleChecklist?: StyleItem[];
  fullMarkAnswer?: string;
  lowConfidence?: boolean;
}

export interface AttemptRow { id?: string; account_id: string; subject: string; chapter: string | null; paper_id: string; mode: string; score: number | null; total_questions: number; time_taken_seconds: number | null; submitted_at?: string }
export interface RankEntry { accountId: string; name: string; attempts: number; avgPercent?: number; totalCorrect?: number; uniquePapers?: number; uniqueQuestions?: number }
export interface Scope { byAvgPercent: RankEntry[]; byTotalCorrect: RankEntry[] }
export interface Leaderboard { overall: RankEntry[]; bySubject: Record<string, Scope>; byChapter: Record<string, Record<string, Scope>>; byPaper: Record<string, Scope> }
export interface QuestionResponse { question_number: string; marks_awarded: number | null; marks_available: number | null; remark?: string; flagged?: boolean; student_answer?: string; correct_answer?: string; line_feedback?: LineFeedback[]; mark_breakdown?: MarkBreakdown[]; style_checklist?: StyleItem[]; full_mark_answer?: string }
