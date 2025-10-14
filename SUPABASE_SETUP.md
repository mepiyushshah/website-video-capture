# Supabase Integration Setup Guide

This guide will help you integrate Supabase with your website video capture application.

## Features

- **Dual Database Support**: Works with both Supabase (cloud) and SQLite (local)
- **Automatic Fallback**: Falls back to SQLite if Supabase is not configured
- **Supabase Auth**: Uses Supabase's built-in authentication system
- **Row Level Security**: Secure data access with PostgreSQL RLS policies
- **User Credits System**: Track and manage user credits
- **Session Management**: Automatic session handling with Supabase

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. This project's dependencies installed

## Setup Steps

### 1. Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `website-video-capture` (or your preferred name)
   - Database Password: (choose a strong password)
   - Region: (select closest to your users)
4. Wait for the project to be provisioned (takes 1-2 minutes)

### 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find three important values:
   - **Project URL**: Your Supabase project URL
   - **anon/public key**: For client-side operations
   - **service_role key**: For server-side admin operations (keep this secret!)

### 3. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   PORT=3000
   NODE_ENV=development
   ```

### 4. Run Database Migrations

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase-migration.sql` and paste it into the editor
5. Click **Run** to execute the migration

This will create:
- `users` table with credits system
- `sessions` table for custom sessions
- `captures` table for video capture history
- Row Level Security policies
- Automatic triggers for user creation
- Indexes for better performance

### 5. Verify the Setup

1. In Supabase dashboard, go to **Database** → **Tables**
2. You should see three tables:
   - `users`
   - `sessions`
   - `captures`

### 6. Test the Integration

1. Restart your server:
   ```bash
   npm start
   ```

2. You should see:
   ```
   🔐 Using Supabase for authentication
   🚀 Server running at http://localhost:3000
   ```

3. Try registering a new user at http://localhost:3000/auth.html

## Database Schema

### Users Table
```sql
- id: UUID (primary key, references auth.users)
- email: TEXT (unique)
- credits: INTEGER (default: 100)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Sessions Table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to users)
- session_token: TEXT (unique)
- created_at: TIMESTAMP
- expires_at: TIMESTAMP
```

### Captures Table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to users)
- url: TEXT
- filename: TEXT
- status: TEXT
- settings: JSONB
- created_at: TIMESTAMP
- completed_at: TIMESTAMP
```

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**Users Table:**
- Users can view their own profile
- Users can update their own profile

**Sessions Table:**
- Users can view their own sessions
- Users can delete their own sessions

**Captures Table:**
- Users can view their own captures
- Users can create new captures
- Users can update their own captures
- Users can delete their own captures

### Authentication

- Passwords are never stored (handled by Supabase Auth)
- Secure session tokens with automatic expiration
- Email validation and confirmation
- Password strength requirements (minimum 6 characters)

## API Changes

The authentication API remains the same. The system automatically uses Supabase when configured:

### Register
```javascript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Login
```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Logout
```javascript
POST /api/auth/logout
```

### Get Current User
```javascript
GET /api/auth/me
```

## Switching Between Supabase and SQLite

The application automatically detects which database to use:

- **With Supabase**: Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- **Without Supabase**: Leave the Supabase variables empty or remove them

To switch back to SQLite:
1. Remove or comment out the Supabase variables in `.env`
2. Restart the server
3. You'll see: `🔐 Using SQLite for authentication`

## Troubleshooting

### "Using SQLite for authentication" when you want Supabase

**Solution:** Check that:
1. `.env` file exists in the project root
2. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
3. No extra spaces or quotes around the values
4. Restart the server after making changes

### "Invalid API key" error

**Solution:**
1. Go to Supabase dashboard → Settings → API
2. Copy the keys again (they may have been truncated)
3. Update your `.env` file
4. Restart the server

### "Table does not exist" error

**Solution:**
1. Make sure you ran the migration script in Supabase SQL Editor
2. Check that the tables exist in Database → Tables
3. Verify RLS policies are enabled

### Users can't register or login

**Solution:**
1. Check browser console for errors
2. Verify your API keys are correct
3. Check Supabase Auth settings:
   - Go to Authentication → Settings
   - Ensure "Enable email confirmations" is disabled for development
4. Check the server logs for detailed error messages

## Development vs Production

### Development
- Use `.env` file for configuration
- Disable email confirmations in Supabase Auth settings
- Use test data

### Production
- Set environment variables in your hosting platform (Vercel, Heroku, etc.)
- Enable email confirmations
- Use production Supabase project
- Enable HTTPS cookies (set `secure: true` in session config)

## Benefits of Using Supabase

1. **Scalability**: Cloud-hosted PostgreSQL that scales with your app
2. **Security**: Built-in RLS, authentication, and authorization
3. **Real-time**: Add real-time features easily with Supabase subscriptions
4. **Backups**: Automatic database backups
5. **Admin Panel**: Easy data management through Supabase dashboard
6. **Free Tier**: Generous free tier for development and small projects

## Next Steps

1. Set up email templates in Supabase for password reset and confirmation
2. Add social login providers (Google, GitHub, etc.)
3. Implement real-time features (live capture status updates)
4. Set up database backups and monitoring
5. Configure custom SMTP for email delivery

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: [Your GitHub Issues Link]
