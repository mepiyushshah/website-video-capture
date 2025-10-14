require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase environment variables not set. Using local SQLite database.');
}

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate URL format
const isValidUrl = (url) => {
    if (!url) return false;
    // Check if it's a placeholder or invalid URL
    if (url.includes('your_supabase') || url.includes('your-project-id')) return false;
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
};

// Client for frontend operations (using anon key)
const supabase = isValidUrl(supabaseUrl) && supabaseAnonKey && !supabaseAnonKey.includes('your_supabase')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Admin client for backend operations (using service role key)
const supabaseAdmin = isValidUrl(supabaseUrl) && supabaseServiceKey && !supabaseServiceKey.includes('your_supabase')
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

module.exports = {
    supabase,
    supabaseAdmin,
    isSupabaseConfigured: () => !!supabase && !!supabaseAdmin
};
