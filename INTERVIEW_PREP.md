# Advanced Interview Preparation Guide
## AI-Powered Job Matcher Project

---

## TABLE OF CONTENTS
1. [Project Deep Dive](#project-deep-dive)
2. [Technical Architecture](#technical-architecture)
3. [Implementation Details](#implementation-details)
4. [Advanced Technical Questions](#advanced-technical-questions)
5. [System Design Questions](#system-design-questions)
6. [Problem-Solving Scenarios](#problem-solving-scenarios)
7. [LLM & AI Integration](#llm--ai-integration)
8. [Performance Optimization](#performance-optimization)
9. [Scalability & DevOps](#scalability--devops)
10. [Code Quality & Best Practices](#code-quality--best-practices)
11. [Behavioral Questions](#behavioral-questions)

---

## PROJECT DEEP DIVE

### 1. Project Overview

**What the Project Does:**
- Scrapes AI/ML remote job listings from multiple sources (RemoteOK, WeWorkRemotely, Rematch)
- Extracts structured data from user resumes (PDF, DOCX, TXT)
- Matches resumes against job descriptions using AI
- Generates personalized cover letters for matched positions
- Caches results to optimize costs and performance

**Why This Project Matters for Advanced Roles:**
1. **Full-Stack Architecture**: Demonstrates understanding of frontend, backend, database, caching, and AI
2. **Serverless Design**: Shows knowledge of modern cloud deployment (Vercel)
3. **AI/LLM Integration**: Practical experience with prompt engineering and LLM APIs
4. **Production Considerations**: Error handling, timeouts, rate limiting, caching strategies
5. **Cost Optimization**: Built entirely on free tiers (Groq API, Vercel, Redis)

---

## TECHNICAL ARCHITECTURE

### 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Login Page   │  │ Dashboard    │  │ Job Matching │          │
│  │ (GroqLogin)  │  │ (Main UI)    │  │ Results      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND API LAYER (Vercel Serverless)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /auth        │  │ /scrape-jobs │  │/analyze-     │          │
│  │              │  │              │  │ resume       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ /match-jobs  │  │ /generate-   │                            │
│  │              │  │ cover-letter │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
   ┌────────────┐    ┌────────────┐    ┌────────────┐
   │Groq API    │    │Vercel KV   │    │Vercel      │
   │(LLaMA 3.3) │    │(Redis)     │    │PostgreSQL  │
   └────────────┘    └────────────┘    └────────────┘
```

### 3. Data Flow

**Resume Analysis Flow:**
```
User Uploads File (PDF/DOCX/TXT)
    ↓
File Buffer Created → Extracted Text
    ↓
Groq API: Parse Resume (Structured JSON)
    ↓
Parsed Data Stored in Prisma DB
    ↓
Return to Frontend: Name, Skills, Experience, Education
```

**Job Scraping Flow:**
```
Trigger /scrape-jobs API
    ↓
Check Vercel KV Cache (1-hour TTL)
    ↓
If Cache Miss:
  → Scrape RemoteOK API (JSON endpoint)
  → Scrape WeWorkRemotely (Cheerio HTML parsing)
  → Scrape Rematch API
    ↓
Clean & Standardize Job Data
    ↓
Store in Vercel KV Cache
    ↓
Return Aggregated Jobs to Frontend
```

**Job Matching Flow:**
```
User Selects Job & Resume
    ↓
Groq API: Match Analysis
  Input: Job Description + Resume Data
  Output: Match Score (0-100), Strengths, Gaps, Recommendations
    ↓
Store Result in DB (for future reference)
    ↓
Display to User with Detailed Breakdown
```

---

## IMPLEMENTATION DETAILS

### 4. Frontend Implementation

**Key Components:**

#### GroqLogin.tsx
- **Purpose**: User authentication via Groq API key
- **Implementation**:
  - Form input for API key
  - Validation endpoint: `POST /api/auth`
  - Stores API key in session/local storage
  - Redirect to dashboard on success

#### ResumeUpload.tsx
- **File Types Supported**: PDF, DOCX, TXT
- **Validation**: File size limits, type checking
- **Processing**:
  - Create FormData with file
  - POST to `/api/analyze-resume` with `X-Groq-API-Key` header
  - Parse AI response
  - Display extracted resume data
- **Error Handling**: Network failures, unsupported formats, extraction failures

#### JobCard.tsx
- **Displays**: Job title, company, location, salary
- **Features**:
  - Click to view full description
  - Display match percentage (if matched)
  - Show matching strengths and gaps
  - Link to original job URL

#### JobDetailsModal.tsx
- **Shows Full Job Description**
- **Displays Match Analysis** (if available):
  - Match score
  - Matched skills
  - Skill gaps
  - Recommendations
- **Action Buttons**: Apply, Generate Cover Letter

#### JobFilters.tsx & JobSort.tsx
- **Filter Options**: Source, match score range, salary range
- **Sort Options**: Match score, salary, date posted

### 5. Backend API Implementation

#### POST /api/auth
```typescript
// Route: app/api/auth/route.ts
Purpose: Validate Groq API key
Input: { apiKey: string }
Process:
  1. Call Groq API with provided key (test call)
  2. Validate response
  3. Store user + API key in Prisma DB (if new user)
  4. Return user session token
Output: { userId, sessionToken, status: 'authenticated' }
Error Handling: Invalid key returns 401, API down returns 503
```

#### POST /api/scrape-jobs
```typescript
// Route: app/api/scrape-jobs/route.ts
Purpose: Aggregate remote job listings
Input: { source?: 'remoteok' | 'weworkremotely' | 'rematch' | 'all' }
Process:
  1. Check Vercel KV cache (key: 'jobs:all' | 'jobs:source')
  2. If cache hit: return cached data
  3. If cache miss:
     a. Call scrapeRemoteOK()
     b. Call scrapeWeWorkRemotely()
     c. Call scrapeRematch()
     d. Merge results, remove duplicates
     e. Store in Vercel KV with 1-hour TTL
  4. Return jobs array
Output: { jobs: Job[], timestamp, source, cacheHit: boolean }
Timeout: 30 seconds (abort if exceeded)
```

#### POST /api/analyze-resume
```typescript
// Route: app/api/analyze-resume/route.ts
Purpose: Extract structured data from resume file
Input: FormData { file: File, X-Groq-API-Key: header }
Process:
  1. Validate API key against DB
  2. Extract file buffer
  3. Parse based on file type:
     - PDF: pdf-parse library
     - DOCX: mammoth library
     - TXT: raw UTF-8
  4. Call Groq API with structured prompt
  5. Clean AI response (remove markdown, parse JSON)
  6. Validate JSON structure
  7. Save to Prisma DB
Output: { resumeId, fileName, parsedData: { name, email, skills[], experience[], education[] } }
Errors: 401 if invalid API key, 400 if file format unsupported, 500 if extraction fails
```

#### POST /api/match-jobs
```typescript
// Route: app/api/match-jobs/route.ts
Purpose: Score and analyze resume-to-job fit
Input: { 
  jobDescription: string, 
  resumeData: object,
  jobTitle?: string,
  company?: string,
  X-Groq-API-Key: header 
}
Process:
  1. Validate inputs (length, type)
  2. Truncate job description if > 2000 chars (token optimization)
  3. Call Groq API with analysis prompt
  4. Parse JSON response
  5. Validate score (0-100), arrays exist
  6. Store result in DB for auditing
Output: { 
  score: number,
  strengths: string[],
  gaps: string[],
  recommendations: string[],
  keySkillsMatch: { matched: [], missing: [] }
}
Error Handling: Graceful JSON parsing with fallback structure
```

#### POST /api/generate-cover-letter
```typescript
// Route: app/api/generate-cover-letter/route.ts
Purpose: Generate personalized cover letter
Input: {
  resumeData: object,
  jobDescription: string,
  jobTitle: string,
  company: string,
  X-Groq-API-Key: header
}
Process:
  1. Validate all inputs
  2. Call Groq with specific cover letter prompt
  3. Include match analysis context
  4. Generate professional letter
  5. Store in DB (optional for future reference)
Output: { coverLetter: string, generatedAt: timestamp }
Format: Professional business letter with greeting, body, closing
```

### 6. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  groqApiKey String  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  resumes   Resume[]
  analyses  Analysis[]
}

model Resume {
  id        String   @id @default(cuid())
  userId    String
  fileName  String
  content   String   @db.Text
  parsedData Json
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  analyses  Analysis[]
}

model Analysis {
  id           String   @id @default(cuid())
  userId       String
  resumeId     String
  jobTitle     String
  company      String
  jobDescription String @db.Text
  matchScore   Int
  analysis     Json
  coverLetter  String?  @db.Text
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
  resume       Resume   @relation(fields: [resumeId], references: [id])
}

model Job {
  id           String   @id @default(cuid())
  title        String
  company      String
  location     String
  description  String   @db.Text
  url          String
  salary       String?
  source       String   // 'remoteok', 'weworkremotely', 'rematch'
  sourceJobId  String   @unique
  tags         String[] @default([])
  scrapedAt    DateTime @default(now())
  expiresAt    DateTime
}
```

### 7. Job Scraping Implementation

#### Web Scraping Techniques Used:

**RemoteOK (JSON API):**
```typescript
// Uses axios to fetch JSON endpoint
axios.get('https://remoteok.com/api')
// Response is array of job objects
// Filter for AI/ML keywords
// Map to standardized Job structure
```

**WeWorkRemotely (HTML Parsing):**
```typescript
// Uses Cheerio for DOM parsing
const $ = cheerio.load(htmlResponse)
// Select elements: '.feature', '.title', '.company'
// Extract text and href attributes
// Build job objects from HTML structure
```

**Rematch (RESTful API):**
```typescript
// Query API with search parameters
axios.get('https://rematch.jobs/api/jobs', {
  params: {
    search: 'machine learning OR AI OR data scientist',
    limit: 20
  }
})
```

#### Data Cleaning Process:

**Text Normalization:**
1. **HTML Entity Decoding**: `he.decode()` - Converts `&amp;` to `&`
2. **Mojibake Fixing**: Custom function to handle corrupted characters
3. **Emoji Removal**: Strip broken emoji sequences
4. **Unicode Normalization**: Handle different UTF-8 encodings
5. **Spam Removal**: Filter out common spam patterns
6. **Whitespace Normalization**: Remove extra spaces, normalize line breaks

---

## ADVANCED TECHNICAL QUESTIONS

### 8. Core Architecture & Design Patterns

#### Q1: Why use Vercel Serverless instead of traditional servers?
**Complete Answer:**
- **Cost**: Pay-per-invocation (free tier covers most use cases), no idle server costs
- **Scalability**: Auto-scales based on demand, no provisioning needed
- **Deployment**: Push to GitHub = automatic deployment (CI/CD built-in)
- **Cold Starts**: Acceptable for job scraping API (not real-time latency-critical)
- **Edge Runtime**: Auth endpoint runs on edge (globally distributed, minimal latency)
- **Monitoring**: Vercel provides built-in logs and error tracking

**Trade-offs:**
- Functions have 10-second execution limit on free tier (upgraded to 900s for paid)
- No persistent connections to database (connection pooling important)
- Limited to Node.js/Python (no custom binaries)

**For This Project**: Ideal because scraping is periodic/on-demand, not high-frequency. Database queries are fast.

---

#### Q2: Explain the caching strategy and why Redis (Vercel KV) was chosen

**Caching Strategy:**
```
1-Hour TTL Cache for Scraped Jobs:
├── Key: 'jobs:all' or 'jobs:{source}'
├── Value: Array of 60-80 jobs
├── Hit Ratio: ~90% (job listings don't change frequently)
└── Benefits: 
    ├── Reduces API calls to external job sites
    ├── Faster response times (<100ms for cache hit vs 5-10s for scrape)
    └── Stays within free tier rate limits
```

**Why Redis (Vercel KV)?**
- **Managed Service**: No infrastructure to manage
- **Integration**: Native integration with Vercel deployments
- **Pricing**: Free tier with 5GB storage
- **Performance**: Sub-millisecond response times
- **Data Types**: Supports strings, hashes, lists, sets (scalable if needed)

**Cache Invalidation Strategy:**
- Time-based (1 hour TTL) - simple and effective
- Manual invalidation endpoint (trigger re-scrape when needed)
- Source-specific caching (don't re-scrape if one source fails)

---

#### Q3: How does the AI/LLM integration handle failures and edge cases?

**Timeout Handling:**
```typescript
// 30-second timeout for Groq API calls
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
);
const response = await Promise.race([apiPromise, timeoutPromise]);
```
- Prevents indefinite hangs
- Returns error to user immediately
- Logs error for monitoring

**JSON Parsing Resilience:**
```typescript
// Multiple cleanup attempts
1. Remove markdown code fences: ```json ... ```
2. Remove all backticks
3. Try parsing with each cleaned version
4. Return structured error if all fail
```
- LLM sometimes returns markdown-wrapped JSON
- Custom cleaning removes these wrappers
- Fallback to error response if parsing still fails

**Input Validation:**
- Job description must be string, length > 0
- Resume data must be object with expected fields
- Truncate long job descriptions to 2000 chars (token optimization)
- Handle circular references in JSON.stringify()

---

### 9. TypeScript & Type Safety

#### Q4: How does TypeScript improve maintainability and catch errors?

**Type Definitions (lib/types.ts):**
```typescript
interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string;
  tags: string[];
  source: 'remoteok' | 'weworkremotely' | 'rematch';
}

interface ResumeData {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience: Experience[];
  education: Education[];
  summary: string | null;
}
```

**Benefits:**
1. **Compile-time Error Detection**: TypeScript catches type mismatches before runtime
2. **IntelliSense**: IDE provides autocomplete and hints
3. **Refactoring Safety**: Rename field = all usages highlighted as errors
4. **Documentation**: Types serve as inline documentation
5. **API Contracts**: API request/response types are explicit

**Example: Preventing Common Bugs**
```typescript
// ❌ Without types: job.sal could be typo for job.salary
const salary = job.sal; // No error, returns undefined

// ✅ With types: TypeScript catches the typo
const salary = job.sal; // Error: Property 'sal' does not exist

// ✅ Type-safe access
const salary = job.salary; // ✓ Correct
```

---

#### Q5: Explain the API request/response type pattern used

**Pattern:**
```typescript
// Request type
interface MatchJobsRequest {
  jobDescription: string;
  resumeData: ResumeData;
  jobTitle?: string;
  company?: string;
}

// Response type
interface MatchJobsResponse {
  score: number; // 0-100
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  keySkillsMatch: {
    matched: string[];
    missing: string[];
  };
}

// API handler
export async function POST(request: NextRequest): Promise<NextResponse<MatchJobsResponse>> {
  // Type-safe request parsing
  const body: MatchJobsRequest = await request.json();
  
  // Process with types guaranteed
  const response: MatchJobsResponse = { /* ... */ };
  
  return NextResponse.json(response);
}
```

**Benefits:**
- Frontend knows exactly what properties are available
- Backend ensures correct response structure
- No runtime guessing about field names or types

---

## SYSTEM DESIGN QUESTIONS

### 10. Scaling & Architecture Decisions

#### Q6: How would you scale this system to handle 1M users?

**Current Limitations:**
- Single Groq API key per user (could be bottleneck)
- PostgreSQL free tier: 256MB storage (insufficient)
- Job scraping runs sequentially (slow)
- No request queuing or load balancing

**Scaling Strategy:**

**1. Job Scraping (Horizontal Scaling)**
```
Current: Sequential API calls (5-10 seconds)
├── Scrape RemoteOK
├── Scrape WeWorkRemotely
└── Scrape Rematch

Scaled: Parallel scraping with timeout
├── Promise.all([
│   ├── scrapeRemoteOK()
│   ├── scrapeWeWorkRemotely()
│   └── scrapeRematch()
│ ])
└── Max time: 5 seconds (fastest of slowest)

Further scaled: Distributed job scraping
├── Deploy scraper as separate service
├── Run on schedule (cron job every 30 min)
├── Store in PostgreSQL (not Redis)
└── CDN cache for popular queries
```

**2. Database Scaling**
```
Free Tier (256MB) → Paid Tier (multi-GB)
Single Database → Database Replication
├── Primary (write)
└── Replica (read)

Partitioning Strategy:
├── Jobs table: Partition by source
├── Analyses table: Partition by date
└── Resumes table: Partition by user_id
```

**3. Resume Analysis Bottleneck**
```
Problem: Each resume analysis = Groq API call (~1 second)
1M concurrent users = 1M sequential API calls

Solution 1: Queue System
├── Use Bull or RabbitMQ
├── Jobs go to queue
├── Workers process in batches
├── Return results when ready (WebSocket updates)

Solution 2: Batch Processing
├── Process 10 resumes in single Groq call
├── Return structured responses
├── Reduced latency by 50%

Solution 3: Distributed Processing
├── Multiple Groq API keys
├── Load balance across keys
├── Round-robin scheduling
```

**4. LLM API Rate Limiting**
```
Groq Free Tier: 14,400 requests/day = ~6/second

Mitigation:
├── Implement request queue
├── Prioritize user requests over background tasks
├── Cache resume analyses (1 hour)
├── Cache job matches (if same resume/job seen before)
└── Upgrade to paid tier for production
```

**5. Frontend Optimization**
```
Current: All state in React components
Scaled: Implement caching layer
├── Service Workers for offline support
├── IndexedDB for local storage
├── Incremental UI updates (pagination)
└── Lazy load job listings
```

**Architecture After Scaling:**
```
├── Frontend: Next.js on Vercel Edge Network
├── API Layer: Multiple Vercel regions
├── Job Scraper Service: Separate serverless functions
├── Message Queue: Redis Streams or Bull
├── Database: PostgreSQL with replication
├── Cache Layer: 
│   ├── Redis KV (session cache, recent analyses)
│   └── CDN (static job listings)
├── LLM Integration: Multiple API keys, queue system
└── Monitoring: Sentry for errors, DataDog for metrics
```

---

#### Q7: How would you handle API rate limits from Groq?

**Rate Limit Strategy:**

```typescript
// 1. Token Bucket Algorithm
class TokenBucket {
  private tokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;
  private maxTokens: number;

  constructor(maxTokens: number = 6, refillRate: number = 0.1) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    this.refill();
    
    while (this.tokens < 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.refill();
    }
    
    this.tokens--;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensAdded = timePassed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensAdded);
    this.lastRefill = now;
  }
}

// 2. Usage
const bucket = new TokenBucket(6, 0.1); // 6 tokens, 1 per 10 seconds

async function callGroqWithRateLimit(resumeText: string) {
  await bucket.waitForToken();
  return groqClient.parseResume(resumeText);
}
```

**Exponential Backoff for Retries:**
```typescript
async function callWithRetry(fn, maxRetries = 3, initialDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) { // Rate limit error
        const delay = initialDelay * Math.pow(2, i); // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

**Queue-Based Approach:**
```typescript
// Use Bull (Redis-backed job queue)
const analyzeQueue = new Queue('resume-analysis');

// Producer: Add to queue
await analyzeQueue.add({ resumeId, resumeText }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
});

// Consumer: Process with rate limiting
analyzeQueue.process(async (job) => {
  const { resumeId, resumeText } = job.data;
  return groqClient.parseResume(resumeText);
});
```

---

### 11. Data Design Questions

#### Q8: Explain the database schema design choices

**Why Prisma?**
- Type-safe queries (TypeScript integration)
- Schema as single source of truth
- Automatic migrations
- Better query building vs raw SQL
- Built-in connection pooling

**Schema Analysis:**

**User Model**
```prisma
model User {
  id        String   @id @default(cuid())
  groqApiKey String  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
- Uses CUID for IDs (better distributed performance vs auto-increment)
- `groqApiKey @unique`: Allows user lookup by API key
- Timestamps for audit trail

**Resume Model**
```prisma
model Resume {
  id        String   @id @default(cuid())
  userId    String
  fileName  String
  content   String   @db.Text
  parsedData Json
  user      User     @relation(fields: [userId], references: [id])
}
```
- `content @db.Text`: Store full resume text for re-parsing if needed
- `parsedData Json`: Store extracted structured data (name, skills, education)
- Foreign key to User: Ensures data isolation

**Analysis Model**
```prisma
model Analysis {
  id           String   @id @default(cuid())
  jobDescription String @db.Text
  matchScore   Int
  analysis     Json
  coverLetter  String?  @db.Text
}
```
- Audit trail: Store all match analyses for ML training
- Nullable `coverLetter`: Only filled if user requested
- JSON field for flexible analysis structure (extensible)

**Performance Considerations:**
```typescript
// Index on userId for fast lookups
@unique([userId])

// Compound index for date range queries
@@index([userId, createdAt])

// Full-text search index on job descriptions
@@fulltext([description])
```

---

#### Q9: How would you handle duplicate jobs from different sources?

**Deduplication Strategy:**

```typescript
// 1. Content-based deduplication (fuzzy matching)
function isSimilarJob(job1: Job, job2: Job): boolean {
  // Normalize strings
  const normalize = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Compare title and company
  const titleMatch = similarity(normalize(job1.title), normalize(job2.title));
  const companyMatch = similarity(normalize(job1.company), normalize(job2.company));
  
  return titleMatch > 0.8 && companyMatch > 0.8;
}

// 2. Function to calculate string similarity
function similarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// 3. Deduplication during scraping
function deduplicateJobs(jobs: Job[]): Job[] {
  const unique: Job[] = [];
  
  for (const job of jobs) {
    const isDuplicate = unique.some(existing => isSimilarJob(existing, job));
    if (!isDuplicate) {
      unique.push(job);
    }
  }
  
  return unique;
}
```

**Database Approach:**
```sql
-- Create unique constraint on content hash
ALTER TABLE jobs ADD COLUMN content_hash VARCHAR(64);
CREATE UNIQUE INDEX idx_job_hash ON jobs(content_hash);

-- In application code
import crypto from 'crypto';

function getJobHash(job: Job): string {
  const content = `${job.title}|${job.company}|${job.location}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

**Cache Strategy:**
```typescript
// Store seen job hashes in Redis (1-hour TTL)
const seenJobs = new Set<string>();

async function filterDuplicates(jobs: Job[]): Promise<Job[]> {
  const cached = await redis.get('seen:jobs');
  const seenJobs = new Set(JSON.parse(cached || '[]'));
  
  const newJobs = jobs.filter(job => {
    const hash = getJobHash(job);
    return !seenJobs.has(hash);
  });
  
  // Update cache
  const allHashes = [...seenJobs, ...newJobs.map(getJobHash)];
  await redis.setex('seen:jobs', 3600, JSON.stringify(Array.from(allHashes)));
  
  return newJobs;
}
```

---

## PROBLEM-SOLVING SCENARIOS

### 12. Real-World Challenges

#### Q10: A user reports that resume parsing fails with a PDF that another user's PDF works fine. How do you debug?

**Debugging Process:**

```typescript
// 1. Add comprehensive logging
async function analyzeResume(file: File) {
  console.log(`[DEBUG] File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
  
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`[DEBUG] Buffer created, size: ${buffer.length}`);
    
    const data = await pdf(buffer);
    console.log(`[DEBUG] PDF parsed, text length: ${data.text.length}`);
    console.log(`[DEBUG] First 500 chars: ${data.text.substring(0, 500)}`);
    
    if (data.text.trim().length < 50) {
      console.warn('[WARN] Extracted text is too short');
      return null;
    }
    
    // Continue parsing...
  } catch (error) {
    console.error('[ERROR] Resume parsing failed', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
```

**Common Issues & Solutions:**

```
Issue 1: PDF is scanned image (not text)
├── Detection: extracted text < 50 chars
├── Solution: 
│   ├── Inform user: "Resume appears to be scanned image"
│   ├── Suggest OCR tool: https://cloudconvert.com
│   └── Alternative: Manual entry form

Issue 2: PDF has unusual encoding
├── Detection: garbled characters in extracted text
├── Solution:
│   ├── Try different PDF libraries: pdfjs-dist, pdf.js
│   ├── Attempt character re-encoding
│   └── Fallback: Ask user to convert to text

Issue 3: PDF is encrypted/password-protected
├── Detection: pdf-parse throws encryption error
├── Solution:
│   ├── Error message: "PDF is password-protected"
│   ├── Suggest: Remove password and retry
│   └── Alternative: Use DOCX or TXT format

Issue 4: DOCX uses complex formatting
├── Detection: mammoth extracts minimal text
├── Solution:
│   ├── Try library: docx-parser
│   ├── Fallback: Convert DOCX to PDF first
│   └── Alternative: TXT format
```

**Testing Strategy:**
```typescript
// Create test suite with problematic files
const testFiles = [
  'simple-resume.pdf',      // Plain text PDF
  'scanned-resume.pdf',     // Scanned image
  'encrypted.pdf',          // Password protected
  'complex.docx',           // Heavily formatted
  'resume.txt',             // Plain text
];

for (const filename of testFiles) {
  console.log(`Testing: ${filename}`);
  const file = fs.readFileSync(`./test-files/${filename}`);
  const result = await analyzeResume(file);
  console.log(`Result:`, result);
}
```

---

#### Q11: Job scraping suddenly returns 0 results. What could be wrong?

**Troubleshooting Checklist:**

```typescript
async function scrapeWithDiagnostics() {
  console.log('[DIAG] Scraping started at', new Date().toISOString());
  
  // 1. Check network connectivity
  try {
    const healthCheck = await axios.get('https://google.com', { timeout: 5000 });
    console.log('[OK] Network connectivity: OK');
  } catch (error) {
    console.error('[FAIL] Network connectivity: FAILED');
    return null;
  }
  
  // 2. Check individual sources
  try {
    const remoteOKResponse = await axios.get('https://remoteok.com/api', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    console.log('[OK] RemoteOK API: Responded, jobs:', remoteOKResponse.data.length);
  } catch (error) {
    console.error('[FAIL] RemoteOK API:', error.code, error.message);
  }
  
  // 3. Check filtering logic
  const allJobs = remoteOKResponse.data;
  const filteredJobs = allJobs.filter(job => {
    const text = `${job.position} ${job.description}`.toLowerCase();
    return AI_KEYWORDS.some(term => text.includes(term));
  });
  console.log(`[DIAG] Filtered: ${allJobs.length} → ${filteredJobs.length} jobs`);
  
  // 4. Check Cheerio parsing for HTML sites
  const wwrResponse = await axios.get('https://weworkremotely.com/...');
  const $ = cheerio.load(wwrResponse.data);
  const jobElements = $('.feature, article');
  console.log('[DIAG] WeWorkRemotely selectors found:', jobElements.length);
  
  // 5. Check cache
  const cachedJobs = await redis.get('jobs:all');
  console.log('[DIAG] Cache hit:', !!cachedJobs);
  
  return filteredJobs;
}
```

**Likely Causes & Fixes:**

```
Cause 1: API response format changed
├── Indicator: API responds but returns 0 jobs
├── Investigation:
│   ├── Log actual API response
│   ├── Check if response structure changed
│   └── Compare with past successful responses
└── Fix:
   ├── Update API URL or endpoint
   ├── Adjust JSON parsing logic
   └── Add error alerting for format changes

Cause 2: Website updated (for scraped sites)
├── Indicator: Cheerio finds 0 elements
├── Investigation:
│   ├── Check if HTML selectors still exist
│   ├── Compare with browser DevTools
│   └── Check if site behind CloudFlare
└── Fix:
   ├── Update CSS selectors
   ├── Use Puppeteer/Playwright if JavaScript-rendered
   └── Check rate limiting

Cause 3: Keyword filter too strict
├── Indicator: API returns jobs but filtered list is 0
├── Investigation:
│   ├── Log job titles before/after filter
│   ├── Check keyword list (AI_KEYWORDS)
│   └── Examine actual job titles vs keywords
└── Fix:
   ├── Expand keyword list
   ├── Use fuzzy matching
   └── Implement keyword weighting

Cause 4: IP rate limited by job sites
├── Indicator: Requests timeout or return 429
├── Investigation:
│   ├── Check HTTP response code
│   ├── See rate limit headers
│   └── Test with VPN
└── Fix:
   ├── Add request delays (1-2 seconds between)
   ├── Rotate User-Agent headers
   ├── Use proxy service
   └── Reduce scrape frequency

Cause 5: Cache corrupted
├── Indicator: Always returns old cached results
├── Investigation:
   ├── Check Redis connection
│   ├── Inspect cache key and TTL
│   └── Verify cache expiration
└── Fix:
   ├── Flush cache: redis.flushAll()
   ├── Restart scraper
   └── Check TTL settings
```

---

## LLM & AI INTEGRATION

### 13. Prompt Engineering & LLM Integration

#### Q12: Explain the prompt engineering approach for resume parsing

**Resume Parsing Prompt:**
```typescript
const prompt = `You are an expert resume parser. Extract structured information from the following resume and return ONLY valid JSON (no markdown, no explanation).

Resume:
${resumeText}

Return JSON with this exact structure:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "skills": ["array of skills"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "duration": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string"
    }
  ],
  "summary": "string or null"
}`;
```

**Prompt Engineering Principles Applied:**

```
1. ROLE DEFINITION
   ✓ "You are an expert resume parser"
   ✓ Establishes context and expertise
   ✓ LLM adapts behavior to role

2. CLEAR INSTRUCTIONS
   ✓ "Extract structured information"
   ✓ "Return ONLY valid JSON"
   ✓ "no markdown, no explanation"
   ✓ Explicit about output format

3. EXAMPLE STRUCTURE
   ✓ Provides exact JSON schema
   ✓ Shows data types (string, array, null)
   ✓ Demonstrates expected structure
   ✓ Reduces hallucinations

4. NEGATIVE CONSTRAINTS
   ✓ "ONLY valid JSON" - prevents markdown
   ✓ "No markdown" - explicit prohibition
   ✓ "No explanation" - prevents extra text

5. INPUT/OUTPUT SEPARATION
   ✓ Clear "Resume:" label
   ✓ Shows where input goes
   ✓ Prevents token waste
```

**Job Matching Prompt:**
```typescript
const prompt = `You are an expert career advisor. Analyze the fit between this job and resume. Return ONLY valid JSON.

Job Description:
${jobDescription}

Resume Data:
${resumeData}

Return JSON with this exact structure:
{
  "score": 85,
  "strengths": ["array of 3-5 specific strengths"],
  "gaps": ["array of 2-4 specific gaps"],
  "recommendations": ["array of 3-5 actionable recommendations"],
  "keySkillsMatch": {
    "matched": ["array of required skills candidate has"],
    "missing": ["array of required skills candidate lacks"]
  }
}

Score should be 0-100 based on overall fit.`;
```

**Why These Prompts Work:**

| Principle | Benefit |
|-----------|---------|
| **Role Definition** | LLM uses domain expertise, reduces generic answers |
| **Structured Output** | JSON format is parseable, no ambiguity |
| **Example Schema** | Prevents wrong data types, reduces hallucinations |
| **Explicit Prohibitions** | Prevents markdown wrapper issues, unexpected text |
| **Conciseness** | Reduces token usage (cheaper, faster) |
| **Clear Boundaries** | Input/output separation prevents confusion |

---

#### Q13: How do you handle LLM hallucinations or incorrect outputs?

**Hallucination Types & Mitigation:**

```typescript
// 1. Incomplete Data Hallucination
// Problem: LLM returns: { "name": "John", "skills": [] }
//          Missing actual skills even though resume lists them

// Solution: Validation with fallback
interface ParsedResume {
  name: string | null;
  email: string | null;
  skills: string[];
  // ... other fields
}

function validateParsedResume(data: any): ParsedResume {
  // Ensure skills array is not empty
  if (!Array.isArray(data.skills) || data.skills.length === 0) {
    console.warn('No skills extracted, attempting regex extraction');
    const skillsMatch = resumeText.match(/Skills?:?\s*([^.]+)/i);
    data.skills = skillsMatch 
      ? skillsMatch[1].split(',').map(s => s.trim())
      : [];
  }
  
  // Validate score is 0-100
  if (data.score < 0 || data.score > 100) {
    console.warn(`Invalid score: ${data.score}, clamping to 0-100`);
    data.score = Math.max(0, Math.min(100, data.score));
  }
  
  return data;
}

// 2. Fabricated Information Hallucination
// Problem: LLM creates skills/experience not in resume
// Example: Resume mentions "Python" → LLM adds "C++", "Kubernetes"

// Solution: Constraint in prompt + validation
const constrainedPrompt = `Extract ONLY information that appears in the resume.
Do NOT infer, add, or assume any skills or experience not explicitly mentioned.
If information is ambiguous, return null or empty array.`;

// Validation: Check hallucinated skills don't appear in resume
function validateNoHallucinations(parsed: ParsedResume, original: string): boolean {
  const resumeLower = original.toLowerCase();
  
  return parsed.skills.every(skill => {
    const skillLower = skill.toLowerCase();
    const found = resumeLower.includes(skillLower);
    
    if (!found) {
      console.warn(`Hallucinated skill: "${skill}" not found in resume`);
    }
    return found;
  });
}

// 3. Formatting Hallucination
// Problem: LLM returns malformed JSON, extra fields

// Solution: Strict schema validation
import { z } from 'zod';

const ResumeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  skills: z.array(z.string()).min(0),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    duration: z.string(),
    description: z.string(),
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    year: z.string(),
  })),
  summary: z.string().nullable(),
});

// Validate and fix
try {
  const validated = ResumeSchema.parse(parsed);
  return validated;
} catch (error) {
  console.error('Schema validation failed:', error);
  // Attempt to fix common issues
  return fixCommonHallucinations(parsed);
}

// 4. Confidence Scoring
// Solution: Return confidence alongside results
interface MatchAnalysis {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  strengths: string[];
  reasoning: string; // Why we're confident
}

function assessConfidence(analysis: any): MatchAnalysis {
  let confidence = 'high';
  
  // Lower confidence if:
  // - Resume has few skills
  if (analysis.keySkillsMatch?.matched.length === 0) {
    confidence = 'low';
  }
  
  // - Score is borderline
  if (analysis.score > 40 && analysis.score < 60) {
    confidence = 'medium';
  }
  
  // - Unusual patterns
  if (analysis.strengths.length === 0 || analysis.gaps.length === 0) {
    confidence = 'low';
  }
  
  return {
    ...analysis,
    confidence,
    reasoning: `Based on ${analysis.keySkillsMatch?.matched.length} matched skills`,
  };
}
```

**Mitigation Strategies:**

| Hallucination | Detection | Mitigation |
|---|---|---|
| **Missing Data** | Arrays are empty when they shouldn't be | Extract with regex fallback, validate minimum fields |
| **Fabricated Info** | Fields don't appear in original resume | Constraint prompt, cross-check with source text |
| **Bad Formatting** | JSON parse errors | Schema validation with Zod, manual cleanup |
| **Out-of-Range Values** | Score > 100 or < 0 | Clamp values, validate ranges |
| **Type Errors** | Field is array but should be string | Enforce types with Zod, coerce when possible |

---

## PERFORMANCE OPTIMIZATION

### 14. Frontend & Backend Performance

#### Q14: How would you optimize API response times?

**Current Performance Issues:**
```
/scrape-jobs: 5-10 seconds (web scraping overhead)
/analyze-resume: 2-3 seconds (Groq API + file processing)
/match-jobs: 2-3 seconds (Groq API)
```

**Optimization Strategy:**

```typescript
// 1. PARALLEL PROCESSING
// ❌ Current (Sequential): 5 + 2 + 2 = 9 seconds
// ✅ Optimized (Parallel): max(5, 2, 2) = 5 seconds

async function scrapeJobsOptimized(): Promise<Job[]> {
  // Scrape all sources in parallel
  const [remoteOK, weWorkRemotely, rematch] = await Promise.all([
    scrapeRemoteOK(),
    scrapeWeWorkRemotely(),
    scrapeRematch(),
  ]);
  
  return deduplicateJobs([...remoteOK, ...weWorkRemotely, ...rematch]);
}

// 2. CACHING
// Cache all scraped jobs for 1 hour
async function scrapeJobsWithCache(): Promise<Job[]> {
  const cached = await redis.get('jobs:all');
  
  if (cached) {
    console.log('[CACHE HIT] Returning cached jobs');
    return JSON.parse(cached);
  }
  
  console.log('[CACHE MISS] Scraping jobs...');
  const jobs = await scrapeJobsOptimized();
  
  await redis.setex('jobs:all', 3600, JSON.stringify(jobs));
  return jobs;
}

// 3. SELECTIVE FIELD LOADING
// Don't load full job descriptions unless needed
interface JobPreview {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
}

interface JobFull extends JobPreview {
  description: string;
  tags: string[];
}

async function getJobPreviews(): Promise<JobPreview[]> {
  // Return only essential fields
  return jobs.map(job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
  }));
}

// Full description loaded on demand
async function getJobDetails(jobId: string): Promise<JobFull> {
  return await db.jobs.findUnique({ where: { id: jobId } });
}

// 4. STREAMING RESPONSES
// Stream resume parsing as it completes
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Extract text
        controller.enqueue(encoder.encode('data: {"stage":"extracting"}\n\n'));
        const resumeText = await extractFromFile(file);
        
        // Step 2: Parse resume
        controller.enqueue(encoder.encode('data: {"stage":"parsing"}\n\n'));
        const parsed = await groqClient.parseResume(resumeText);
        
        // Step 3: Save to DB
        controller.enqueue(encoder.encode('data: {"stage":"saving"}\n\n'));
        const resume = await prisma.resume.create({ data: parsed });
        
        // Final result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(resume)}\n\n`));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// 5. CDN OPTIMIZATION
// Cache static resources
import { imageOptimizer } from 'next/image';

export default function JobCard({ job }: { job: Job }) {
  return (
    <img
      src={job.logo}
      loading="lazy" // Lazy load images
      width={40}
      height={40}
      alt={job.company}
    />
  );
}

// 6. DATABASE QUERY OPTIMIZATION
// Use indexes and select specific columns
async function getUserResumes(userId: string) {
  return await prisma.resume.findMany({
    where: { userId },
    select: { // Only select needed fields
      id: true,
      fileName: true,
      createdAt: true,
      // Don't load large 'content' field
    },
    orderBy: { createdAt: 'desc' },
    take: 10, // Pagination
  });
}

// 7. REDUCE PAYLOAD SIZE
// Compress API responses
import compression from 'compression';

app.use(compression()); // Gzip responses

// Reduce JSON size
interface MatchAnalysisOptimized {
  s: number; // score
  st: string[]; // strengths
  g: string[]; // gaps
  r: string[]; // recommendations
}

// 8. REQUEST DEBOUNCING/THROTTLING
// Prevent excessive API calls from frontend
function debounce(fn: Function, delay: number) {
  let timeoutId: NodeJS.Timeout;
  
  return function debounced(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const handleSearch = debounce((query: string) => {
  searchJobs(query);
}, 500); // Wait 500ms after typing stops
```

**Performance Gains:**
```
Before Optimization:
├── /scrape-jobs: 10s
├── /analyze-resume: 3s
├── /match-jobs: 3s
└── Total: ~16s per session

After Optimization:
├── /scrape-jobs: 0.1s (cache hit) / 5s (cache miss)
├── /analyze-resume: 3s
├── /match-jobs: 3s (but parallelizable)
└── Total: ~3s per session (88% improvement)

Caching Impact:
├── Session 1: 16s (all uncached)
├── Session 2-N: 0.1s (all cached)
└── Average (50 sessions): 0.33s per session
```

---

## SCALABILITY & DEVOPS

### 15. Deployment & Infrastructure

#### Q15: Explain the current deployment architecture and how you'd improve it

**Current Architecture:**
```
GitHub Repository
    ↓ (Push to main)
Vercel (Auto Deploy)
    ↓
    ├── Frontend: Next.js on Vercel Edge
    ├── API Routes: Serverless Functions
    ├── Database: Vercel Postgres
    └── Cache: Vercel KV (Redis)
```

**Current Advantages:**
- Zero-config deployment
- Automatic SSL/HTTPS
- Auto-scaling
- Global CDN
- Free tier for small projects
- Built-in CI/CD

**Current Limitations:**
- 30-second execution timeout per function
- Limited to single region (until upgraded)
- Cold starts for infrequent functions
- No persistent storage/state between invocations
- Limited to Vercel infrastructure

**Improved Architecture for Production:**

```
┌─────────────────────────────────────────────────────────┐
│                   LOAD BALANCING                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  CloudFlare / AWS CloudFront (Global CDN)        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Vercel  │    │ AWS     │    │GCP Cloud│
   │ Edge    │    │Lambda   │    │Run      │
   │(Regions)│    │         │    │         │
   └─────────┘    └─────────┘    └─────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Primary │    │ Replica │    │ Replica │
   │Database │    │Database │    │Database │
   │(Writes) │    │(Reads)  │    │(Reads)  │
   └─────────┘    └─────────┘    └─────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────────────────────────────────────┐
   │  Cache Layer                            │
   │  ├── Redis KV (Hot cache)               │
   │  ├── Memcached (Session cache)          │
   │  └── CDN Edge Cache (Static assets)     │
   └─────────────────────────────────────────┘
```

**Deployment Improvements:**

```typescript
// 1. ENVIRONMENT STRATEGY
// .env.local (development)
GROQ_API_KEY=testing_key
DATABASE_URL=postgresql://localhost/dev
REDIS_URL=redis://localhost:6379

// .env.staging
GROQ_API_KEY=prod_key_staging
DATABASE_URL=postgresql://staging-db.vercel.sh/prod
REDIS_URL=vercel-kv-staging

// .env.production
GROQ_API_KEY=prod_key
DATABASE_URL=postgresql://prod-db.vercel.sh/prod
REDIS_URL=vercel-kv-prod

// 2. TESTING BEFORE DEPLOYMENT
// Run in staging first
export const config = {
  deployment: {
    staging: 'https://staging-findyournextjob.vercel.app',
    production: 'https://findyournextjob.vercel.app',
  },
};

// 3. MONITORING & ALERTING
import Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});

export async function analyzeResume() {
  try {
    // ... implementation
  } catch (error) {
    Sentry.captureException(error, {
      tags: { api: 'analyze-resume' },
      level: 'error',
    });
    throw error;
  }
}

// 4. HEALTH CHECKS
export async function GET(request: NextRequest) {
  const checks = {
    api: false,
    database: false,
    cache: false,
  };
  
  try {
    // Check Groq API
    const groqTest = await groqClient.chat([{ role: 'user', content: 'ping' }]);
    checks.api = !!groqTest;
  } catch (error) {
    console.error('Groq API health check failed');
  }
  
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed');
  }
  
  try {
    // Check cache
    await redis.ping();
    checks.cache = true;
  } catch (error) {
    console.error('Cache health check failed');
  }
  
  const allHealthy = Object.values(checks).every(v => v);
  
  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}

// 5. AUTO-SCALING CONFIGURATION
// vercel.json
{
  "buildCommand": "next build",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  },
  "functions": {
    "app/api/scrape-jobs/route.ts": {
      "memory": 1024,
      "maxDuration": 60,
      "timeout": 60
    },
    "app/api/analyze-resume/route.ts": {
      "memory": 1024,
      "maxDuration": 60,
      "timeout": 60
    }
  }
}

// 6. OBSERVABILITY
import { performance } from 'perf_hooks';

function measurePerformance(name: string) {
  return async (req: NextRequest, res: NextResponse) => {
    const start = performance.now();
    
    const response = res;
    
    const duration = performance.now() - start;
    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
    
    // Send to monitoring service
    await fetch('https://metrics.example.com/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        name,
        duration,
        timestamp: Date.now(),
      }),
    });
    
    return response;
  };
}
```

---

## CODE QUALITY & BEST PRACTICES

### 16. Testing & Code Quality

#### Q16: How would you structure unit and integration tests?

**Test Strategy:**

```typescript
// 1. UNIT TESTS (using Jest)
// lib/text-cleaner.test.ts
import { fixMojibake, removeBrokenEmoji, cleanText } from './text-cleaner';

describe('Text Cleaner', () => {
  describe('fixMojibake', () => {
    it('should fix mojibake characters', () => {
      const input = 'ã€ŒMy Jobã€•'; // Japanese quote marks in wrong encoding
      const output = fixMojibake(input);
      expect(output).not.toContain('ã€');
    });
    
    it('should handle already correct text', () => {
      const input = 'Normal Text';
      expect(fixMojibake(input)).toBe('Normal Text');
    });
  });
  
  describe('removeBrokenEmoji', () => {
    it('should remove broken emoji sequences', () => {
      const input = 'Hello ❌️ World'; // Broken emoji
      const output = removeBrokenEmoji(input);
      expect(output).not.toContain('❌️');
    });
  });
  
  describe('cleanText', () => {
    it('should decode HTML entities', () => {
      expect(cleanText('Hello &amp; Goodbye')).toBe('Hello & Goodbye');
    });
    
    it('should trim whitespace', () => {
      expect(cleanText('  Hello  ')).toBe('Hello');
    });
  });
});

// 2. INTEGRATION TESTS
// __tests__/api/analyze-resume.test.ts
import { POST } from '@/app/api/analyze-resume/route';
import { NextRequest } from 'next/server';
import fs from 'fs';

describe('/api/analyze-resume', () => {
  let mockUser: any;
  
  beforeEach(async () => {
    // Setup test user
    mockUser = await db.user.create({
      data: { groqApiKey: 'test-key-123' },
    });
  });
  
  it('should parse a valid PDF resume', async () => {
    const pdfBuffer = fs.readFileSync('./test-files/sample.pdf');
    const file = new File([pdfBuffer], 'resume.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    const request = new NextRequest('http://localhost:3000/api/analyze-resume', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Groq-API-Key': mockUser.groqApiKey,
      },
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('resumeId');
    expect(data).toHaveProperty('parsedData');
    expect(data.parsedData).toHaveProperty('skills');
    expect(Array.isArray(data.parsedData.skills)).toBe(true);
  });
  
  it('should reject unsupported file types', async () => {
    const exeBuffer = Buffer.from('MZ'); // EXE header
    const file = new File([exeBuffer], 'virus.exe', { type: 'application/x-executable' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    const request = new NextRequest('http://localhost:3000/api/analyze-resume', {
      method: 'POST',
      body: formData,
      headers: { 'X-Groq-API-Key': mockUser.groqApiKey },
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Unsupported file type');
  });
  
  it('should return 401 for invalid API key', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);
    
    const request = new NextRequest('http://localhost:3000/api/analyze-resume', {
      method: 'POST',
      body: formData,
      headers: { 'X-Groq-API-Key': 'invalid-key' },
    });
    
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

// 3. END-TO-END TESTS
// e2e/job-matching.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Job Matching E2E', () => {
  test('should complete full workflow from login to job match', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('http://localhost:3000');
    expect(page.url()).toContain('login');
    
    // 2. Enter Groq API key
    await page.fill('input[type="password"]', process.env.TEST_GROQ_KEY);
    await page.click('button:has-text("Login")');
    
    // 3. Wait for dashboard
    await page.waitForURL('/dashboard');
    
    // 4. Upload resume
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-files/sample.pdf');
    
    // 5. Wait for parsing
    await page.waitForText('Skills extracted');
    
    // 6. Verify resume parsed
    const skillsList = page.locator('[data-testid="skills-list"]');
    const skillsText = await skillsList.textContent();
    expect(skillsText).toContain('Python');
    
    // 7. Click on a job
    await page.click('[data-testid="job-card"]:first-child');
    
    // 8. View matching analysis
    await page.click('button:has-text("Analyze Match")');
    
    // 9. Verify match score displayed
    const matchScore = page.locator('[data-testid="match-score"]');
    await expect(matchScore).toContainText(/\d+%/);
  });
});
```

**Test Coverage Targets:**
```
Unit Tests (lib/ functions): 80%+
├── Text cleaning: 90%
├── Type definitions: 100%
└── Utility functions: 85%

Integration Tests (API routes): 70%+
├── Auth validation: 90%
├── Resume parsing: 80%
├── Job matching: 75%
└── Error handling: 80%

E2E Tests: 50%+
├── Happy path workflows: 100%
├── Error scenarios: 40%
└── Edge cases: 30%

Overall Target: 75% code coverage
```

---

#### Q17: Explain error handling strategy

**Error Handling Layers:**

```typescript
// 1. API LEVEL ERROR HANDLING
export async function POST(request: NextRequest) {
  try {
    // Validate request
    const body = await request.json();
    if (!body.jobDescription) {
      return NextResponse.json(
        { error: 'jobDescription is required' },
        { status: 400 }
      );
    }
    
    // Process request
    const result = await matchJobToResume(body);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Log error with context
    console.error('[MATCH-JOBS-ERROR]', {
      message: error.message,
      stack: error.stack,
      userId: request.headers.get('X-User-ID'),
      timestamp: new Date().toISOString(),
    });
    
    // Return appropriate error response
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: error.retryAfter },
        { status: 429, headers: { 'Retry-After': error.retryAfter } }
      );
    }
    
    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 2. GROQ API ERROR HANDLING
async function callGroqWithErrorHandling(messages: any[]) {
  try {
    const response = await groqClient.chat(messages);
    return response;
  } catch (error) {
    // Handle specific Groq errors
    if (error.status === 429) {
      throw new RateLimitError('Groq API rate limited');
    }
    
    if (error.status === 401) {
      throw new AuthenticationError('Invalid Groq API key');
    }
    
    if (error.status === 503) {
      throw new ServiceUnavailableError('Groq API temporarily unavailable');
    }
    
    // Timeout error
    if (error.message.includes('timeout')) {
      throw new TimeoutError('Groq API request timed out');
    }
    
    // Unknown error
    throw new GroqApiError(`Groq API error: ${error.message}`);
  }
}

// 3. DATABASE ERROR HANDLING
async function saveResume(data: ResumeData) {
  try {
    return await prisma.resume.create({ data });
  } catch (error) {
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      throw new UniqueConstraintError('Resume already exists');
    }
    
    if (error.code === 'P2025') {
      throw new NotFoundError('User not found');
    }
    
    // Connection error
    if (error.code === 'ECONNREFUSED') {
      throw new DatabaseConnectionError('Failed to connect to database');
    }
    
    throw new DatabaseError(`Database error: ${error.message}`);
  }
}

// 4. ERROR RECOVERY STRATEGIES
async function handleScrapingFailure(source: string, error: Error) {
  console.error(`Scraping failed for ${source}:`, error);
  
  // Strategy 1: Return cached data if available
  const cached = await redis.get(`jobs:${source}`);
  if (cached) {
    console.log(`Falling back to cached data for ${source}`);
    return JSON.parse(cached);
  }
  
  // Strategy 2: Return partial data from other sources
  // (Already scraped RemoteOK, continue with others)
  
  // Strategy 3: Return empty array with warning
  return { jobs: [], warning: `Failed to scrape ${source}` };
}

// 5. USER-FRIENDLY ERROR MESSAGES
const errorMessages = {
  INVALID_API_KEY: 'Your Groq API key is invalid. Please check and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  FILE_TOO_LARGE: 'Resume file is too large (max 10MB). Please try a smaller file.',
  UNSUPPORTED_FORMAT: 'File format not supported. Please use PDF, DOCX, or TXT.',
  EXTRACTION_FAILED: 'Could not extract text from resume. Please check the file.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Something went wrong. Our team has been notified.',
};

// 6. ERROR TELEMETRY
interface ErrorTelemetry {
  errorType: string;
  message: string;
  stack: string;
  userId: string;
  api: string;
  timestamp: Date;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

async function reportError(error: Error, context: any) {
  const telemetry: ErrorTelemetry = {
    errorType: error.constructor.name,
    message: error.message,
    stack: error.stack,
    userId: context.userId,
    api: context.api,
    timestamp: new Date(),
    userAgent: context.userAgent,
    severity: error instanceof CriticalError ? 'critical' : 'medium',
  };
  
  // Send to error tracking service
  await fetch('https://sentry.io/api/...', {
    method: 'POST',
    body: JSON.stringify(telemetry),
  });
}
```

---

## BEHAVIORAL QUESTIONS

### 17. Soft Skills & Experience

#### Q18: Tell me about a time you had to debug a production issue

**Example Response:**
```
Situation:
Users reported that job scraping was consistently returning 0 results, 
but it was working 2 hours earlier.

Task:
Find and fix the issue within 30 minutes (business impact).

Action:
1. Checked Vercel error logs → Found timeout errors on scraping API
2. Added granular logging to each scraper:
   - RemoteOK: ✓ (responded in 2s)
   - WeWorkRemotely: ✗ (timeout after 10s)
   - Rematch: ✓ (responded in 1.5s)
3. Investigated WeWorkRemotely:
   - Found they deployed new HTML structure
   - CSS selectors (.feature, .company) no longer matched
4. Fixed CSS selectors by inspecting browser DevTools
5. Updated code and deployed

Result:
- Issue fixed in 25 minutes
- Added monitoring alerts for scraper failures
- Implemented fallback to cached data if scraper fails
- Prevented future similar issues

Learning:
- Web scraping is fragile (external sites can change anytime)
- Good monitoring is critical for production systems
- Fallback strategies matter
```

---

#### Q19: How do you approach learning a new technology?

**Example:**
```
When learning Groq API for this project:

1. Documentation Review
   - Read official API docs
   - Checked examples and quickstarts
   - Understood rate limits and pricing

2. Experimentation
   - Built small test script to call API
   - Tested with different prompts
   - Measured response times and token usage

3. Integration
   - Built wrapper class (GroqClient)
   - Added error handling and timeouts
   - Implemented retry logic

4. Optimization
   - Analyzed costs (free tier: 14,400 requests/day)
   - Optimized prompts to reduce tokens
   - Implemented caching to reduce API calls

5. Documentation
   - Created clear comments in code
   - Documented rate limits and costs
   - Shared learnings with team
```

---

#### Q20: Describe your approach to code maintainability

**Example:**
```
Code Maintainability Principles Applied:

1. CLEAR NAMING
   ✓ Function: parseResume (clear what it does)
   ✗ Function: processData (vague)
   
   ✓ Variable: extractedSkills
   ✗ Variable: arr, data

2. SINGLE RESPONSIBILITY
   ✓ cleanText() - only cleans text
   ✓ parseResume() - only parses resume
   ✗ parseAndSaveAndEmail() - too many responsibilities

3. TYPE SAFETY
   - TypeScript for compile-time checking
   - Zod for runtime validation
   - Clear interfaces for API contracts

4. ERROR HANDLING
   - Specific error types (ValidationError, RateLimitError)
   - Clear error messages for users
   - Logging with context

5. TESTING
   - Unit tests for utilities
   - Integration tests for APIs
   - E2E tests for workflows

6. DOCUMENTATION
   - README with setup instructions
   - Inline comments for complex logic
   - API documentation
   - Architecture diagrams

7. CONSISTENCY
   - Consistent code style (ESLint)
   - Consistent naming conventions
   - Consistent error handling patterns

Result: Easy for other developers to understand and modify code.
```

---

### 18. Technical Questions Continued

#### Q21: Explain your approach to optimizing for free/low-cost tiers

**Example from Project:**

```
Cost Optimization Strategy:

1. GROQ API ($0 - Free Tier)
   ├── Free: 14,400 requests/day (~6/second)
   ├── Optimization:
   │   ├── Cache resume analyses (1 hour)
   │   ├── Batch operations when possible
   │   ├── Truncate long inputs (2000 char limit)
   │   └── Reuse analyses for same resume
   └── Result: 90% reduction in API calls

2. VERCEL POSTGRES ($0 - Free Tier)
   ├── Free: 256MB storage
   ├── Optimization:
   │   ├── Only store essential data
   │   ├── Archive old analyses
   │   ├── Compress resume content
   │   └── Efficient schema design
   └── Result: Average user uses ~2-5MB

3. VERCEL KV/REDIS ($0 - Free Tier)
   ├── Free: 5GB storage
   ├── Optimization:
   │   ├── Cache only expensive operations
   │   ├── 1-hour TTL for job listings
   │   ├── Compress cached data (JSON → JSON.stringify)
   │   └── Evict old caches automatically
   └── Result: Dramatically faster response times

4. BANDWIDTH ($0 Edge Caching)
   ├── Use Vercel's built-in CDN
   ├── Serve static assets from edge
   ├── Gzip compression for responses
   └── Result: <100ms response times globally

Total Cost: $0 for MVP, <$50/month at scale
```

---

#### Q22: How do you ensure data privacy and security?

```typescript
// SECURITY MEASURES IMPLEMENTED

// 1. API KEY VALIDATION
// Never trust client; validate on every request
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('X-Groq-API-Key');
  
  const user = await prisma.user.findUnique({
    where: { groqApiKey: apiKey },
  });
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Continue with request...
}

// 2. DATA ISOLATION
// Users can only access their own data
export async function getResumes(userId: string) {
  return await prisma.resume.findMany({
    where: { userId }, // ← Always filter by user
  });
}

// 3. NO SENSITIVE DATA IN LOGS
console.log({
  userId: user.id, // ✓ OK
  apiKey: user.groqApiKey, // ✗ NEVER log API key
  resumeId: resume.id, // ✓ OK
  content: resume.content, // ✗ Don't log full resume
});

// 4. INPUT VALIDATION & SQL INJECTION PREVENTION
// ✓ Using Prisma (parameterized queries)
const user = await prisma.user.findUnique({
  where: { groqApiKey: apiKey }, // Safe: parameterized
});

// ✗ Don't do this (raw SQL):
// const user = await db.query(`SELECT * FROM users WHERE groq_api_key = '${apiKey}'`);

// 5. RATE LIMITING
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,    // Max 100 requests per minute
  keyGenerator: (req) => req.headers.get('X-Groq-API-Key'),
});

export async function POST(request: NextRequest) {
  const allowed = await rateLimiter.check(request);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  // Process request...
}

// 6. SECURE FILE UPLOAD
export async function POST(request: NextRequest) {
  const file = await request.formData().get('file');
  
  // Validate file type
  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  
  // Validate file size
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }
  
  // Scan for malware (in production)
  // await virusScanner.scan(file.buffer);
  
  // Process file...
}

// 7. ENVIRONMENT VARIABLES
// .env.local (never commit)
GROQ_API_KEY=sk_live_xxxxxx
DATABASE_URL=postgresql://user:pass@host/db

// In code: always use process.env
const groqKey = process.env.GROQ_API_KEY;
```

---

## FINAL TIPS FOR INTERVIEW

### Key Points to Emphasize:

1. **Full-Stack Ownership**: You built the entire system end-to-end
2. **Production Thinking**: Caching, error handling, scaling, monitoring
3. **Cost Optimization**: Built MVP on free tier while planning for scale
4. **AI/LLM Knowledge**: Practical experience with prompt engineering, token optimization
5. **Problem-Solving**: Debugged real issues (PDF parsing, web scraping changes, etc.)
6. **Code Quality**: TypeScript, testing, clear architecture
7. **Learning Mindset**: Researched and implemented new technologies

### Questions You Might Get Back:

- "Why not use X instead of Y?" → Be ready to explain trade-offs
- "How would you do X differently?" → Show flexibility and willingness to improve
- "Can you explain Y in more detail?" → Pick something technical and dive deep
- "What's the most challenging part?" → Show critical thinking, not just listing problems

### Practice Responses For:

- **Architectural decisions**: Explain trade-offs, not just benefits
- **Error scenarios**: Show resilience and fallback strategies
- **Scaling issues**: Think about bottlenecks, caching, queuing, partitioning
- **LLM integration**: Show prompt engineering knowledge, hallucination handling
- **Performance**: Think about latency, caching, parallelization

---

**Good luck with your interview! You have a strong project with excellent technical depth. Focus on explaining your reasoning clearly and showing you think about production concerns.** 🚀
