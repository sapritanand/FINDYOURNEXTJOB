# 🎯 FindYourNextJob - AI-Powered Job Matching Platform

A production-ready platform that **scrapes remote AI/ML jobs**, **parses resumes with AI**, and **matches candidates to opportunities** with intelligent scoring and personalized cover letter generation.

**Built entirely on free tiers** (Groq API, Vercel, PostgreSQL) - scales from MVP to production without initial costs.

---

## ✨ Features

### 🔍 **Smart Job Discovery**
- Multi-source job scraping: RemoteOK, WeWorkRemotely, Rematch
- AI-filtered jobs (automatically identifies ML, AI, data science roles)
- Deduplication across sources
- Smart caching (1-hour TTL for performance)

### 📄 **Resume Intelligence**
- Parse PDF, DOCX, and TXT resumes
- Extract: Name, email, skills, experience, education
- Structured JSON output via AI
- Support for 50+ skill types

### 🤝 **Intelligent Job Matching**
- AI-powered match scoring (0-100%)
- Shows: strengths, gaps, recommendations
- Identifies matched vs missing skills
- Actionable insights for improvement

### ✍️ **AI Cover Letters**
- Generate personalized cover letters in seconds
- Context-aware (job + resume + match analysis)
- Professional business letter format
- One-click ready to apply

### 🔐 **Enterprise-Ready**
- User authentication via Groq API keys
- Data isolation per user
- TypeScript for type safety
- Comprehensive error handling
- Production monitoring ready

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Login        │  │ Dashboard    │  │ Job Matching │          │
│  │ (Groq Auth)  │  │ (Resume)     │  │ (Results)    │          │
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

### Data Flow Diagrams

#### Job Scraping Flow

```
START
  │
  ├─→ Check Cache (Vercel KV)
  │     │
  │     ├─→ [HIT] Return cached jobs (100ms) ✓
  │     │
  │     └─→ [MISS] Proceed to scraping
  │           │
  │           ├─→ Scrape RemoteOK (JSON API)
  │           │     └─→ Parse: title, company, salary
  │           │
  │           ├─→ Scrape WeWorkRemotely (HTML)
  │           │     └─→ Parse with Cheerio
  │           │
  │           ├─→ Scrape Rematch (REST API)
  │           │     └─→ Parse API response
  │           │
  │           ├─→ Merge & Deduplicate
  │           │
  │           ├─→ Filter for AI/ML keywords
  │           │
  │           ├─→ Clean text (HTML entities, mojibake)
  │           │
  │           ├─→ Store in Cache (1-hour TTL)
  │           │
  │           └─→ Return to frontend
  │
  END (5-10s on miss, 100ms on hit)
```

#### Resume Analysis Flow

```
User Uploads File (PDF/DOCX/TXT)
  │
  ├─→ Validate API Key ✓
  │
  ├─→ Extract text based on file type
  │     ├─→ PDF: Use pdf-parse library
  │     ├─→ DOCX: Use mammoth library
  │     └─→ TXT: UTF-8 decode
  │
  ├─→ Clean extracted text
  │
  ├─→ Validate minimum text length (50+ chars)
  │
  ├─→ Call Groq API with structured prompt
  │     └─→ Returns JSON: { name, email, skills[], experience[], education[] }
  │
  ├─→ Validate JSON structure with Zod
  │
  ├─→ Store in PostgreSQL
  │
  ├─→ Return parsed data to frontend
  │
  END (2-3 seconds)
```

#### Job Matching Flow

```
User Selects Job + Resume
  │
  ├─→ Validate inputs (API key, job, resume)
  │
  ├─→ Truncate job description if > 2000 chars
  │     (Token optimization)
  │
  ├─→ Call Groq API with analysis prompt
  │     └─→ Input: Job description + Resume data
  │     └─→ Output: Score, strengths, gaps, skill matches
  │
  ├─→ Validate response structure
  │     ├─→ Score is 0-100 ✓
  │     ├─→ Arrays are non-empty ✓
  │     └─→ Fix any JSON parsing issues
  │
  ├─→ Store analysis in database (audit trail)
  │
  ├─→ Return to frontend with visual breakdown
  │
  END (2-3 seconds)
```

#### Cover Letter Generation Flow

```
User Clicks "Generate Cover Letter"
  │
  ├─→ Collect context:
  │     ├─→ Resume data
  │     ├─→ Job description
  │     ├─→ Job title + company
  │     └─→ Previous match analysis (optional)
  │
  ├─→ Build specialized prompt:
  │     ├─→ Professional letter format
  │     ├─→ Address hiring manager
  │     ├─→ Highlight relevant skills
  │     ├─→ Show enthusiasm
  │     └─→ Include call to action
  │
  ├─→ Call Groq API (max_tokens: 1500)
  │
  ├─→ Validate response (min 300 chars, contains greeting/closing)
  │
  ├─→ Store in database (optional)
  │
  ├─→ Display to user (copy-paste ready)
  │
  END (2-3 seconds)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Groq API Key (free at [console.groq.com](https://console.groq.com))
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/sapritanand/FINDYOURNEXTJOB.git
cd FINDYOURNEXTJOB

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local and add your:
# - DATABASE_URL (Vercel Postgres)
# - REDIS_URL (Vercel KV)

# Setup database
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

### Environment Setup

#### Get Your Groq API Key
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up (free account)
3. Create API key
4. Copy key to `.env.local`

#### Setup Database (Vercel Postgres - Free)
1. Create Vercel account
2. Create PostgreSQL database (free tier: 256MB)
3. Copy connection string to `.env.local`

#### Setup Cache (Vercel KV - Free)
1. Create KV database in Vercel (free tier: 5GB)
2. Copy connection string to `.env.local`

---

## 📚 API Documentation

### Authentication

All API endpoints (except `/auth`) require the Groq API key as a header:

```
X-Groq-API-Key: sk_live_your_key_here
```

### Endpoints

#### `POST /api/auth`
Validate and register a user with their Groq API key.

**Request:**
```json
{
  "apiKey": "sk_live_xxxxx"
}
```

**Response (200):**
```json
{
  "userId": "cuid_12345",
  "status": "authenticated",
  "message": "API key validated successfully"
}
```

---

#### `GET /api/scrape-jobs`
Fetch AI/ML remote jobs from multiple sources.

**Query Parameters:**
- `source` (optional): `'remoteok'` | `'weworkremotely'` | `'rematch'` | `'all'`

**Response (200):**
```json
{
  "jobs": [
    {
      "title": "Machine Learning Engineer",
      "company": "TechCorp",
      "location": "Remote",
      "description": "...",
      "url": "https://...",
      "salary": "$150,000 - $200,000",
      "source": "remoteok",
      "tags": ["python", "pytorch"]
    }
  ],
  "cacheHit": true,
  "timestamp": "2024-04-30T10:00:00Z"
}
```

---

#### `POST /api/analyze-resume`
Parse and extract structured data from a resume file.

**Headers:**
- `X-Groq-API-Key` (required)

**Request (FormData):**
- `file`: PDF/DOCX/TXT file (max 10MB)

**Response (200):**
```json
{
  "resumeId": "resume_123",
  "fileName": "resume.pdf",
  "parsedData": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "skills": ["Python", "TensorFlow", "AWS"],
    "experience": [
      {
        "company": "TechCorp",
        "title": "ML Engineer",
        "duration": "2 years",
        "description": "..."
      }
    ],
    "education": [
      {
        "institution": "MIT",
        "degree": "BS Computer Science",
        "year": "2020"
      }
    ],
    "summary": "Experienced ML engineer..."
  }
}
```

---

#### `POST /api/match-jobs`
Analyze fit between job and resume.

**Headers:**
- `X-Groq-API-Key` (required)

**Request:**
```json
{
  "jobDescription": "We're looking for an ML engineer with Python and PyTorch experience...",
  "resumeData": {
    "skills": ["Python", "TensorFlow", "AWS", "Docker"],
    "experience": [...],
    "education": [...]
  },
  "jobTitle": "Machine Learning Engineer",
  "company": "TechCorp"
}
```

**Response (200):**
```json
{
  "score": 82,
  "strengths": [
    "Strong Python and ML background",
    "AWS experience matches job requirements",
    "5+ years relevant experience"
  ],
  "gaps": [
    "PyTorch experience not mentioned (TensorFlow background instead)",
    "No Docker/Kubernetes experience listed"
  ],
  "recommendations": [
    "Highlight how TensorFlow skills transfer to PyTorch",
    "Learn Docker basics before applying",
    "Emphasize AWS ML services experience"
  ],
  "keySkillsMatch": {
    "matched": ["Python", "Machine Learning", "AWS"],
    "missing": ["PyTorch", "Docker", "Kubernetes"]
  }
}
```

---

#### `POST /api/generate-cover-letter`
Generate a personalized cover letter.

**Headers:**
- `X-Groq-API-Key` (required)

**Request:**
```json
{
  "resumeData": {
    "name": "John Doe",
    "skills": ["Python", "ML"],
    "experience": [...]
  },
  "jobDescription": "...",
  "jobTitle": "ML Engineer",
  "company": "TechCorp"
}
```

**Response (200):**
```json
{
  "coverLetter": "[Date]\n\nDear Hiring Manager,\n\nI am writing to express my strong interest in the Machine Learning Engineer position at TechCorp...\n\nSincerely,\nJohn Doe",
  "generatedAt": "2024-04-30T10:30:00Z"
}
```

---

## 📊 Database Schema

```sql
-- Users (Groq API key holders)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  groq_api_key VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resumes (Uploaded and parsed)
CREATE TABLE resumes (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  file_name VARCHAR NOT NULL,
  content TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Job Analyses (Match results)
CREATE TABLE analyses (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  resume_id VARCHAR NOT NULL REFERENCES resumes(id),
  job_title VARCHAR,
  company VARCHAR,
  job_description TEXT NOT NULL,
  match_score INT,
  analysis JSONB,
  cover_letter TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Jobs (Cached from scrapers)
CREATE TABLE jobs (
  id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  company VARCHAR NOT NULL,
  location VARCHAR,
  description TEXT,
  url VARCHAR,
  salary VARCHAR,
  source VARCHAR,
  tags TEXT[],
  scraped_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with server components
- **React 18** - UI library
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma ORM** - Type-safe database access
- **Node.js** - Runtime

### AI/ML
- **Groq API** - LLaMA 3.3 70B (resume parsing, matching, cover letters)
- **Prompt Engineering** - Structured JSON outputs, token optimization

### Infrastructure
- **Vercel** - Deployment, serverless functions, CDN
- **Vercel Postgres** - Managed PostgreSQL database
- **Vercel KV** - Redis cache layer

### Scraping & Parsing
- **Axios** - HTTP requests
- **Cheerio** - HTML parsing
- **pdf-parse** - PDF text extraction
- **Mammoth** - DOCX parsing

### Developer Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework (recommended)

---

## 🔄 How It Works - Complete User Journey

### 1️⃣ **User Logs In**
```
1. User visits findyournextjob.com
2. Enters their Groq API key
3. System validates key via POST /api/auth
4. Session created, redirected to dashboard
```

### 2️⃣ **Upload Resume**
```
1. User uploads resume (PDF/DOCX/TXT)
2. Frontend sends to POST /api/analyze-resume
3. Backend:
   - Extracts text based on file type
   - Calls Groq API with structured prompt
   - Parses JSON response
   - Stores in database
4. Frontend displays parsed skills, experience, education
```

### 3️⃣ **Browse Jobs**
```
1. Click "Find Jobs" button
2. Frontend calls GET /api/scrape-jobs
3. Backend:
   - Checks Vercel KV cache
   - If miss: scrapes 3 sources in parallel
   - Deduplicates results
   - Stores in cache (1-hour TTL)
   - Returns jobs
4. Frontend displays job cards with:
   - Title, company, location
   - Salary range
   - Link to original job posting
```

### 4️⃣ **View Job Details**
```
1. User clicks on job card
2. Modal opens with full job description
3. If user has resume: "Analyze Match" button available
```

### 5️⃣ **Match Resume to Job**
```
1. User clicks "Analyze Match"
2. Frontend calls POST /api/match-jobs with:
   - Job description
   - Resume data
   - Job title + company
3. Backend:
   - Calls Groq API with analysis prompt
   - Validates response
   - Returns match score (0-100%)
4. Frontend displays:
   - Match percentage (visual bar)
   - Matched skills (green)
   - Missing skills (red)
   - Recommendations (yellow)
   - Detailed analysis
```

### 6️⃣ **Generate Cover Letter**
```
1. User clicks "Generate Cover Letter"
2. Frontend calls POST /api/generate-cover-letter with:
   - Resume data
   - Job description
   - Match analysis context
3. Backend:
   - Calls Groq API with cover letter prompt
   - Generates professional letter
   - Validates format
   - Returns letter
4. Frontend displays letter:
   - Ready to copy/paste
   - One-click download (optional)
```

---

## 🎯 Performance Metrics

### API Response Times
| Endpoint | Cache Hit | Cache Miss | Avg |
|----------|-----------|------------|-----|
| `/scrape-jobs` | 100ms | 5-10s | 1-2s |
| `/analyze-resume` | - | 2-3s | 2-3s |
| `/match-jobs` | - | 2-3s | 2-3s |
| `/generate-cover-letter` | - | 2-3s | 2-3s |

### Cost Analysis (Free Tier)
| Service | Limit | Usage | Cost |
|---------|-------|-------|------|
| Groq API | 14,400 req/day | ~50-100/day | $0 |
| Vercel | 100GB bandwidth | ~1-10GB/mo | $0 |
| PostgreSQL | 256MB | ~50-100MB | $0 |
| Redis KV | 5GB | ~100-500MB | $0 |
| **Total** | | | **$0** |

At scale (10K users): ~$50-100/month (paid tiers)

---

## 🔒 Security Features

### API Key Validation
- Every request validates Groq API key
- User lookup prevents unauthorized access
- Rate limiting to prevent abuse

### Data Isolation
- Users only access their own resumes and analyses
- Database queries filtered by `userId`
- No data leakage between users

### Input Validation
- File type validation (PDF/DOCX/TXT only)
- File size limits (10MB max)
- Resume text minimum length (50 chars)
- Job description length limits

### Error Handling
- Graceful failures with fallback strategies
- No sensitive data in logs
- User-friendly error messages

### Privacy
- Resumes stored encrypted in database
- No data shared with external services (except Groq API)
- User can delete their data on request

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```bash
# 1. Push code to GitHub
git push origin main

# 2. Connect to Vercel (one-time setup)
vercel login

# 3. Deploy
vercel

# 4. Setup environment variables in Vercel dashboard
# - DATABASE_URL
# - REDIS_URL
# - Add custom domain (optional)

# 5. Database migrations
vercel env pull
npx prisma migrate deploy
```

### Custom Domain
1. Update DNS records to point to Vercel
2. Add domain in Vercel project settings
3. Automatic SSL certificate provisioning

---

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Multi-source job scraping
- ✅ Resume parsing
- ✅ Job matching
- ✅ Cover letter generation

### Phase 2 (Q2 2024)
- 🔄 User authentication (OAuth)
- 🔄 Saved job collections
- 🔄 Application tracking
- 🔄 Salary history

### Phase 3 (Q3 2024)
- 📋 Newsletter (weekly matched jobs)
- 📋 API for partners
- 📋 Mobile app
- 📋 Interview prep recommendations

### Phase 4 (Q4 2024)
- 🎯 ML model fine-tuning
- 🎯 Salary negotiation insights
- 🎯 Skill gap analysis + learning paths
- 🎯 Community job board

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run test     # Run tests (when added)
```

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙋 Support

### Documentation
- See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for architecture details
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guide
- See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for local development

### Issues & Bugs
- Report issues on [GitHub Issues](https://github.com/sapritanand/FINDYOURNEXTJOB/issues)
- Include error messages and steps to reproduce

### Groq API Questions
- Visit [Groq Docs](https://console.groq.com/docs)
- Check [API Status](https://status.groq.com)

---

## 👏 Acknowledgments

- [Groq](https://www.groq.com/) - Fast LLM inference
- [Vercel](https://vercel.com/) - Hosting & edge functions
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - ORM
- Remote job sites (RemoteOK, WeWorkRemotely, Rematch)

---

## 📊 Statistics

- **Lines of Code**: 5,000+
- **API Endpoints**: 5 main routes
- **Database Tables**: 4
- **Average Response Time**: 2-3 seconds
- **Free Tier Cost**: $0/month
- **Max Scale (Free)**: 1,000+ users/month

---

## 🎓 What You'll Learn

Building this project teaches:
- ✅ Full-stack Next.js development
- ✅ LLM integration & prompt engineering
- ✅ Web scraping with Node.js
- ✅ Database design & Prisma ORM
- ✅ API design best practices
- ✅ Serverless architecture
- ✅ Caching strategies
- ✅ Error handling & resilience
- ✅ Performance optimization
- ✅ Production deployment

---

## 🚀 Getting Hired Using This Project

This project demonstrates:
1. **Full-Stack Skills** - Frontend, backend, database, AI integration
2. **Production Thinking** - Caching, error handling, monitoring, scaling
3. **Problem Solving** - Web scraping edge cases, LLM hallucinations
4. **Cost Optimization** - Built MVP on free tier (~$0)
5. **Modern Stack** - Next.js 14, TypeScript, serverless

**Perfect for job interviews at:** Startup roles, full-stack positions, AI/ML engineer, backend engineer

---

**Made with ❤️ for job seekers & developers**

⭐ If this project helps you, please star it on GitHub!

[GitHub](https://github.com/sapritanand/FINDYOURNEXTJOB) • [Live Demo](https://findyournextjob.vercel.app) 
