export interface Option {
  id: string;
  text: string;
  image_url?: string | null;
}

export interface Question {
  id: string;
  question_number: number;
  question_text: string;
  image_url?: string | null;
  options: Option[] | null;
  correct_answer: string[];
  explanation?: string;
  question_type: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface TestMeta {
  id: string;
  exam?: string;
  year?: number;
  shift?: string;
  title?: string;
  test_type?: string;
  questions: number;
  duration: number;
}

export type AnswerMap = Record<string, string>;

export type QuestionStatus =
  | "not_visited"
  | "not_answered"
  | "answered"
  | "marked_for_review"
  | "answered_and_marked_for_review"
  | "unanswered"
  | "review";

export type StatusMap = Record<string, QuestionStatus>;
