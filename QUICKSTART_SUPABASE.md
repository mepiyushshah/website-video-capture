# Quick Start: Supabase Integration

## Current Status

Your project now has **dual database support**:
- ✅ **SQLite** (currently active) - for local development
- ✅ **Supabase** (ready to use) - for cloud/production

The system automatically detects which database to use based on your configuration.

## What's Been Added

### New Files
1. **`.env`** - Environment variables configuration
2. **`.env.example`** - Template for environment variables
3. **`supabase-client.js`** - Supabase client initialization
4. **`auth-supabase.js`** - Supabase authentication implementation
5. **`supabase-migration.sql`** - Database migration script
6. **`SUPABASE_SETUP.md`** - Detailed setup guide

### Modified Files
1. **`auth.js`** - Now supports both SQLite and Supabase
2. **`package.json`** - Added Supabase dependencies

## How to Switch to Supabase

### Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Sign up and create a new project
3. Wait for provisioning (1-2 minutes)

### Step 2: Get Your Credentials
1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - Project URL
   - anon public key
   - service_role key

### Step 3: Update .env File
Edit `/Users/apple/Desktop/website-video-capture/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 4: Run Migration
1. Open Supabase dashboard → **SQL Editor**
2. Copy contents from `supabase-migration.sql`
3. Paste and run

### Step 5: Restart Server
```bash
# Kill the current server (Ctrl+C)
# Then restart:
npm start
```

You should see:
```
🔐 Using Supabase for authentication
```

## Features You Get with Supabase

### Security
- ✅ Row Level Security (RLS) policies
- ✅ Automatic session management
- ✅ Secure password hashing (handled by Supabase)
- ✅ Email validation

### Scalability
- ✅ Cloud-hosted PostgreSQL
- ✅ Automatic backups
- ✅ Horizontal scaling
- ✅ Connection pooling

### Additional Features
- ✅ Real-time subscriptions (ready to use)
- ✅ Storage for video files (can be added)
- ✅ Admin dashboard
- ✅ Built-in analytics

## Testing the Integration

### Current Setup (SQLite)
Your server is running at: http://localhost:3000

Try these:
1. Register: http://localhost:3000/auth.html
2. Login and capture videos
3. Check `users.db` for data

### After Switching to Supabase
1. Register a new account
2. Go to Supabase dashboard → **Table Editor** → **users**
3. See your user data in the cloud!

## Quick Commands

```bash
# Install dependencies (already done)
npm install

# Start server
npm start

# Check environment variables
cat .env

# View migration script
cat supabase-migration.sql
```

## What Database Am I Using?

Check the server startup message:
- `🔐 Using SQLite for authentication` → Local SQLite database
- `🔐 Using Supabase for authentication` → Cloud Supabase database

## Need Help?

1. **Read the detailed guide**: `SUPABASE_SETUP.md`
2. **Check logs**: Look for error messages in terminal
3. **Verify credentials**: Make sure API keys are correct
4. **Test connection**: Visit Supabase dashboard

## Benefits Comparison

| Feature | SQLite | Supabase |
|---------|--------|----------|
| Setup Time | ✅ Instant | ⏱️ 5 minutes |
| Cost | ✅ Free | ✅ Free (generous tier) |
| Scalability | ⚠️ Limited | ✅ Unlimited |
| Backups | ❌ Manual | ✅ Automatic |
| Real-time | ❌ No | ✅ Yes |
| Admin UI | ❌ No | ✅ Yes |
| Security | ⚠️ Basic | ✅ Advanced (RLS) |
| Production Ready | ⚠️ Small apps only | ✅ Yes |

## Next Steps

1. **For Development**: Keep using SQLite (no setup needed)
2. **For Production**: Switch to Supabase (follow steps above)
3. **For Both**: Use Supabase in production, SQLite for local dev

## Example: Full Workflow

```bash
# 1. Development (using SQLite)
npm start
# → 🔐 Using SQLite for authentication

# 2. Setup Supabase
# - Create account
# - Create project
# - Update .env file
# - Run migration

# 3. Production (using Supabase)
npm start
# → 🔐 Using Supabase for authentication

# 4. Deploy (example with Vercel)
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel deploy
```

## Troubleshooting

### "Using SQLite" but I want Supabase
- Check `.env` file exists
- Verify credentials are correct (no placeholders)
- Restart server after changing `.env`

### Can't connect to Supabase
- Check project is active in Supabase dashboard
- Verify API keys are copied correctly
- Check firewall/network settings

### Migration errors
- Make sure you're in the correct project
- Run migrations in SQL Editor (not terminal)
- Check for syntax errors

## Your server is ready!

Your project is currently running at: **http://localhost:3000**

Currently using: **SQLite** (no setup required)
