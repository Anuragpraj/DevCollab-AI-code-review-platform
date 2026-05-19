export interface User {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  token: string;
}

export interface AuthorInfo {
  id: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

export interface AiResultSummary {
  summary: string;
  overallScore: number;
  bugCount: number;
  securityIssueCount: number;
  bestPracticeCount: number;
  processingTimeMs: number;
  createdAt: string;
}

export interface CommentInfo {
  id: number;
  content: string;
  lineNumber?: number;
  type: 'HUMAN' | 'AI_BUG' | 'AI_SECURITY' | 'AI_BEST_PRACTICE' | 'AI_SUGGESTION';
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  author?: AuthorInfo;
  createdAt: string;
}

export type ReviewStatus =
  | 'PENDING'
  | 'AI_REVIEWING'
  | 'AI_DONE'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'MERGED';

export interface Review {
  id: number;
  title: string;
  description?: string;
  codeContent: string;
  language: string;
  status: ReviewStatus;
  author: AuthorInfo;
  aiScore?: number;
  aiResult?: AiResultSummary;
  comments: CommentInfo[];
  commentCount: number;
  githubPrUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagedReviewResponse {
  reviews: Review[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DashboardStats {
  totalReviews: number;
  myReviews: number;
  avgScore?: number;
  totalComments: number;
  scoreHistory: Array<{ date: string; avgScore: number; reviewCount: number }>;
  reviewsByLanguage: Record<string, number>;
  issuesByType: Record<string, number>;
  topReviewers: Array<{ username: string; fullName: string; reviewCount: number; avgScore?: number }>;
}
