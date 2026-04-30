# 🚀 Quick Start Guide - FindYourNextJob

## What You Got
A complete, production-ready job matching platform built with:
- Next.js 14, React, TypeScript, Tailwind CSS
- Groq API (free LLaMA 3.3 70B)
- Vercel (hosting, Postgres, Redis)

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd findyournextjob
npm install
```

### 2. Get Groq API Key (FREE!)
1. Visit: https://console.groq.com/keys
2. Sign up (no credit card needed)
3. Create API key
4. Copy the key (starts with `gsk_...`)

### 3. Set Up Vercel (FREE!)
1. Visit: https://vercel.com
2. Sign up with GitHub
3. Create new project
4. In Storage tab:
   - Create Postgres database
   - Create KV (Redis) store
5. Copy all environment variables shown

### 4. Configure Environment
```bash
# Create .env.local from template
cp .env.local.example .env.local

# Paste your Vercel database credentials into .env.local
# (You got these in step 3)
```

### 5. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 6. Run Locally
```bash
npm run dev
```

Open http://localhost:3000 🎉

### 7. Use the App
1. Enter your Groq API key
2. Upload your resume
3. Click "Refresh Jobs"
4. Click "Match" on interesting jobs
5. Generate cover letters!

## Deploy to Production

### Option 1: Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts, add environment variables
```

### Option 2: Vercel Dashboard
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

Your app will be live at: `https://your-project.vercel.app`

## What's Included

✅ Multi-source job scraping (RemoteOK, WeWorkRemotely)
✅ AI resume parsing (PDF, DOCX, TXT)
✅ Smart job matching with % scores
✅ Personalized cover letter generation
✅ Application tracking
✅ Beautiful, responsive UI
✅ All on free tiers!

## Files Overview

```
findyournextjob/
├── app/                    # Next.js pages & API routes
├── components/             # React components
├── lib/                    # Business logic
├── prisma/                 # Database schema
├── README.md              # Full documentation
├── DEPLOYMENT.md          # Deployment checklist
└── PROJECT_OVERVIEW.md    # Technical deep dive
```

## Need Help?

1. **Check README.md** - Full documentation
2. **Check DEPLOYMENT.md** - Step-by-step deployment
3. **Check PROJECT_OVERVIEW.md** - Technical details

## Common Issues

**"Module not found"**
```bash
rm -rf node_modules .next
npm install
```

**"Database connection failed"**
- Verify .env.local has correct Vercel credentials
- Run `npx prisma db push` again

**Build fails**
```bash
npm run build  # Check for errors locally first
```

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test with your real resume
3. ✅ Use it for job searching!
4. ✅ Add to your portfolio
5. ✅ Record demo video

## Portfolio Tips

**Resume Bullet Point:**
"Built FindYourNextJob with LLaMA 3.3, Next.js, and Vercel - automated resume-to-job matching for 1000+ daily postings"

**LinkedIn:**
Share your deployed app with #BuildInPublic

**GitHub:**
Add screenshots and demo video to README

---

**Ready? Run `npm install` and let's go!** 🚀
