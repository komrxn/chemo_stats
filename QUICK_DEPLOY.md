# ⚡ Quick Deploy (5 Minutes)

## 1️⃣ Push to GitHub

```bash
cd "/Users/macbro/Desktop/Dad's/kkh-analysis"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kkh-analysis.git
git push -u origin main
```

## 2️⃣ Deploy Backend → [render.com](https://render.com)

1. Sign in with GitHub
2. New **Web Service** → Select repo
3. Settings:
   - Root: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - Plan: **Free**
4. Environment Variable:
   - `FRONTEND_URL` = `https://temp.com` (update later)
5. Deploy → Copy URL

## 3️⃣ Deploy Frontend → [vercel.com](https://vercel.com)

1. Sign in with GitHub
2. New Project → Select repo
3. Settings:
   - Framework: `Vite`
   - Root: `frontend`
4. Environment Variable:
   - `VITE_API_URL` = `https://YOUR-BACKEND.onrender.com`
5. Deploy → Copy URL

## 4️⃣ Update Backend CORS

1. Render dashboard → Environment
2. Update `FRONTEND_URL` = `https://YOUR-APP.vercel.app`
3. Save (auto-redeploy)

## ✅ Done!

- Frontend: `https://YOUR-APP.vercel.app`
- Backend: `https://YOUR-BACKEND.onrender.com`
- API Docs: `https://YOUR-BACKEND.onrender.com/docs`

📖 **Full guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)


