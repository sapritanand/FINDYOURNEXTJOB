// lib/types.ts

export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string;
  tags: string[];
  source: string;
  scrapedAt?: Date;
}

export interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  summary?: string;
}

export interface Experience {
  company: string;
  title: string;
  duration: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
}

export interface MatchAnalysis {
  score: number; // 0-100
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  keySkillsMatch: {
    matched: string[];
    missing: string[];
  };
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  matchScore: number;
  matchAnalysis: MatchAnalysis;
  coverLetter?: string;
  status: 'pending' | 'applied' | 'interview' | 'rejected' | 'offer';
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
