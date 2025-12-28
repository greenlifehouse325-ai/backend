# 🚂 Railway Deployment Guide

## Prerequisites
- GitHub repository connected to Railway
- Supabase project with database schema applied

## Quick Deploy

### 1. Connect Repository
1. Go to [Railway](https://railway.app)
2. Create new project → **Deploy from GitHub repo**
3. Select `greenlifehouse325-ai/backend`

### 2. Configure Environment Variables

In Railway dashboard → **Variables**, add:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `PORT` | `3001` | ✅ |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` | ✅ |
| `SUPABASE_URL` | `https://xxx.supabase.co` | ✅ |
| `SUPABASE_ANON_KEY` | `eyJ...` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | ✅ |
| `JWT_SECRET` | `min-32-chars-random-string` | ✅ |
| `JWT_EXPIRATION` | `15m` | Optional |
| `JWT_REFRESH_EXPIRATION` | `7d` | Optional |

> **Tip**: Generate JWT_SECRET with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Deploy Settings

Railway will auto-detect from `railway.json`:
- **Build Command**: `npm run build`
- **Start Command**: `npm run start:prod`
- **Health Check**: `/api/health`

### 4. Verify Deployment

After deploy completes, test:
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-12-28T...",
  "environment": "production"
}
```

## Environment Variables for Railway

Copy this to Railway Variables (Raw Editor):

```
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JWT_SECRET=your-32-char-minimum-secret-here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

## Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure `package.json` has correct scripts
- Verify TypeScript compiles: `npm run build`

### 502 Bad Gateway
- Check if `PORT` is set (Railway provides `PORT` automatically)
- Verify health endpoint works: `/api/health`
- Check Railway deploy logs for errors

### Database Connection Error
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Ensure database schema is applied

## Update Deployment

Push to `main` branch will auto-deploy:
```bash
git add .
git commit -m "update: your changes"
git push origin main
```

## Custom Domain

1. Railway Dashboard → Settings → Domains
2. Add custom domain
3. Update DNS records as instructed
4. Update `CORS_ORIGIN` with new domain
