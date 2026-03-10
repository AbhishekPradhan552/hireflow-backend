export interface User {
  id: string;
  email: string;
  orgId: string;
  role: 'OWNER' | 'ADMIN' | 'RECRUITER' | 'VIEWER';
  createdAt?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  status: string;
  aiStatus: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JobMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JobsResponse {
  data: Job[];
  meta: JobMeta;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  jobId: string;
  orgId: string;
  createdAt: string;
  hybridScore?: number;
  parseStatus?: string;
  resumeCount?: number;
  resumes?: Resume[];
}

export interface CandidatesResponse {
  data: Candidate[];
  meta: JobMeta;
}

export interface Resume {
  id: string;
  originalName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  parseStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  aiStatus: 'PENDING' | 'EMBEDDING' | 'SCORING' | 'COMPLETED' | 'FAILED';
  semanticScore?: number;
  hybridScore?: number;
  matchedSkills: string[];
  missingSkills: string[];
  parsedAt?: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface JobStats {
  jobId: string;
  totalCandidates: number;
  parsedResumes: number;
  pendingResumes: number;
  averageScore: number;
  topScore: number;
}

export interface Pipeline {
  jobId: string;
  pipeline: {
    APPLIED: number;
    SCREENING: number;
    INTERVIEW: number;
    HIRED: number;
    REJECTED: number;
  };
}

export interface Subscription {
  plan: 'FREE' | 'PRO' | 'TEAM';
  status: 'INACTIVE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
}

export interface OrgUsage {
  resumesParsed: number;
  limit: number;
}
