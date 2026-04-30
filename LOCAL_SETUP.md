# 🚀 LOCAL SETUP GUIDE - Step by Step

Follow these steps EXACTLY to run the project locally before deploying to Vercel.

---

## ✅ Prerequisites (Install These First)

### 1. Node.js (Version 18 or higher)
**Check if you have it:**
```bash
node --version
```

**Don't have it?** Download from: https://nodejs.org/
- Choose "LTS" version
- Install and restart your terminal

### 2. Git (Optional but recommended)
**Check if you have it:**
```bash
git --version
```

**Don't have it?** Download from: https://git-scm.com/

---

## 📦 STEP 1: Extract the Project

1. Download `findyournextjob.zip`
2. Extract it to a folder (e.g., `C:\Projects\findyournextjob` or `~/Projects/findyournextjob`)
3. Open terminal/command prompt in that folder

**Windows:** Right-click folder → "Open in Terminal" or "Git Bash Here"
**Mac/Linux:** Right-click folder → "New Terminal at Folder"

---

## 🔑 STEP 2: Get Your FREE Groq API Key

1. Go to: **https://console.groq.com/keys**
2. Click "Sign Up" (it's FREE, no credit card needed!)
3. After signing in, click "Create API Key"
4. Name it: "FindYourNextJob"
5. **Copy the key** (starts with `gsk_...`)
6. **Save it somewhere safe** - you'll need it in Step 5!

---

## 💾 STEP 3: Set Up FREE Database (Vercel)

Even for local development, we'll use Vercel's free database (it's the easiest way).

### 3.1 Create Vercel Account
1. Go to: **https://vercel.com/signup**
2. Sign up with GitHub (easiest) or email
3. Verify your email

### 3.2 Create Postgres Database
1. Go to: https://vercel.com/dashboard
2. Click **"Storage"** tab at the top
3. Click **"Create Database"**
4. Choose **"Postgres"**
5. Name: `findyournextjob-db`
6. Region: Choose closest to you (e.g., `US East` if you're in US)
7. Click **"Create"**
8. You'll see a screen with environment variables - **KEEP THIS OPEN!**

### 3.3 Create KV Store (Redis)
1. Still in Storage tab, click **"Create Database"** again
2. Choose **"KV"** (Redis)
3. Name: `findyournextjob-cache`
4. Click **"Create"**
5. **KEEP THIS OPEN TOO!**

---

## ⚙️ STEP 4: Configure Environment Variables

1. In your project folder, find the file: `.env.local.example`
2. **Rename it to**: `.env.local` (remove the `.example`)
3. Open `.env.local` in a text editor (Notepad, VS Code, etc.)

4. **Copy values from Vercel:**
   
   From your **Postgres** database tab:
   ```
   POSTGRES_URL="copy from Vercel"
   POSTGRES_PRISMA_URL="copy from Vercel"
   POSTGRES_URL_NON_POOLING="copy from Vercel"
   POSTGRES_USER="copy from Vercel"
   POSTGRES_HOST="copy from Vercel"
   POSTGRES_PASSWORD="copy from Vercel"
   POSTGRES_DATABASE="copy from Vercel"
   ```

   From your **KV** store tab:
   ```
   KV_URL="copy from Vercel"
   KV_REST_API_URL="copy from Vercel"
   KV_REST_API_TOKEN="copy from Vercel"
   KV_REST_API_READ_ONLY_TOKEN="copy from Vercel"
   ```

5. **Save the file**

---

## 📦 STEP 5: Install Dependencies

Open terminal in your project folder and run:

```bash
npm install
```

This will take 2-3 minutes. You'll see a lot of text - that's normal!

**Troubleshooting:**
- If you see "npm: command not found" → Install Node.js (Step 1)
- If you see permission errors on Mac/Linux → Try `sudo npm install`

---

## 🗄️ STEP 6: Initialize Database

Run these commands ONE BY ONE:

```bash
npx prisma generate
```
*(This creates the database client)*

```bash
npx prisma db push
```
*(This creates the database tables)*

You should see: ✓ "Your database is now in sync with your Prisma schema"

---

## 🚀 STEP 7: Run Locally!

```bash
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

**Open your browser** and go to: **http://localhost:3000**

---

## 🎉 STEP 8: Test the App!

### 8.1 Login
1. You'll see the login page
2. Paste your **Groq API key** (from Step 2)
3. Click "Continue"

### 8.2 Upload Resume
1. Click the upload area
2. Select your resume (PDF, DOCX, or TXT)
3. Click "Analyze Resume"
4. Wait 5-10 seconds - AI is parsing your resume!

### 8.3 Get Jobs
1. Click **"Refresh Jobs"** button
2. Wait 10-20 seconds (scraping takes time)
3. You should see remote AI/ML jobs appear!

### 8.4 Match Jobs
1. Click **"Match"** on any job
2. Wait 5-10 seconds
3. See your match score (0-100%)!

### 8.5 Generate Cover Letter
1. After matching, click on a job
2. Look for "Generate Cover Letter"
3. AI will write a personalized letter!

---

## ✅ Checklist - Is Everything Working?

- [ ] Login page loads
- [ ] Can enter Groq API key
- [ ] Can upload resume
- [ ] Resume gets parsed (shows skills, experience)
- [ ] Jobs appear when you click "Refresh Jobs"
- [ ] Can match jobs and see % score
- [ ] Can generate cover letters

**ALL checked?** You're ready! 🎉

---

## 🐛 Troubleshooting Common Issues

### Issue: "Module not found" errors
**Fix:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Issue: "Failed to connect to database"
**Fix:**
- Check `.env.local` has correct Vercel credentials
- Make sure you copied ALL variables from Vercel
- Try running `npx prisma db push` again

### Issue: "Invalid API key" when logging in
**Fix:**
- Make sure you copied the FULL Groq API key (starts with `gsk_`)
- Get a fresh key from console.groq.com/keys
- Check for extra spaces when pasting

### Issue: Jobs won't load
**Fix:**
- First time always takes 15-30 seconds (scraping 3 sites)
- Check your internet connection
- Try clicking "Refresh Jobs" again

### Issue: "Port 3000 already in use"
**Fix:**
```bash
# Kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

Or use a different port:
```bash
PORT=3001 npm run dev
```

### Issue: Resume upload fails
**Fix:**
- Make sure file is under 5MB
- Only PDF, DOCX, or TXT allowed
- Try a different resume format

---

## 📊 What to Test Locally

### Basic Flow
1. ✅ Login with Groq API key
2. ✅ Upload resume
3. ✅ See parsed resume data
4. ✅ Load jobs
5. ✅ Match a job
6. ✅ See match score
7. ✅ Generate cover letter

### Edge Cases
1. ✅ Try uploading different resume formats (PDF, DOCX, TXT)
2. ✅ Try matching multiple jobs
3. ✅ Logout and login again (data should persist)
4. ✅ Refresh page (everything should stay)

---

## 🚀 Ready to Deploy to Vercel?

Once everything works locally, follow: **`DEPLOYMENT.md`**

Quick deploy:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts - it will use your existing Postgres/KV!
```

---

## 💡 Quick Commands Reference

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production (test before deploying)
npm run build

# Start production server locally
npm run start

# Reset database (if needed)
npx prisma db push --force-reset

# View database in browser
npx prisma studio
```

---

## 🆘 Still Having Issues?

1. **Check the logs**: Look at terminal output for error messages
2. **Read the error**: Most errors tell you exactly what's wrong
3. **Google it**: Copy the error message and search
4. **Check files**: Make sure `.env.local` exists and has all variables

---

## 📹 Video Tutorial (If You Prefer Visual)

*You can record a quick 5-minute video showing:*
1. Extract zip
2. npm install
3. Set up .env.local
4. npm run dev
5. Test the app

---

## ✅ Success!

If you can:
- Login with Groq API key ✓
- Upload and parse resume ✓
- Load jobs ✓
- Match jobs with AI ✓
- Generate cover letters ✓

**You're ready to deploy to Vercel!** 🎉

Next step: Read **`DEPLOYMENT.md`** for production deployment.

---

**Need help?** All your questions are probably answered in:
- `README.md` - Full documentation
- `DEPLOYMENT.md` - Deploy to Vercel
- `PROJECT_OVERVIEW.md` - Technical details
