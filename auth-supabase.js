const { supabase, supabaseAdmin, isSupabaseConfigured } = require('./supabase-client');

// Supabase authentication functions
const authSupabase = {
    // Register a new user
    register: async (email, password) => {
        try {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }

            // Validate password strength
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Sign up with Supabase Auth
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true // Auto-confirm email for development
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    throw new Error('Email already registered');
                }
                throw error;
            }

            return {
                success: true,
                userId: data.user.id,
                message: 'User registered successfully'
            };
        } catch (error) {
            throw error;
        }
    },

    // Login user
    login: async (email, password) => {
        try {
            // Sign in with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw new Error('Invalid email or password');
            }

            // Get user profile
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
            }

            return {
                success: true,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    credits: userProfile?.credits || 100
                },
                sessionToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: new Date(data.session.expires_at * 1000)
            };
        } catch (error) {
            throw error;
        }
    },

    // Verify session token
    verifySession: async (sessionToken) => {
        try {
            // Get user from token
            const { data, error } = await supabase.auth.getUser(sessionToken);

            if (error || !data.user) {
                return null;
            }

            // Get user profile
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
                return {
                    id: data.user.id,
                    email: data.user.email,
                    credits: 100
                };
            }

            return {
                id: data.user.id,
                email: data.user.email,
                credits: userProfile?.credits || 100
            };
        } catch (error) {
            console.error('Error verifying session:', error);
            return null;
        }
    },

    // Logout user
    logout: async (sessionToken) => {
        try {
            // Sign out from Supabase
            await supabase.auth.signOut();
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            throw error;
        }
    },

    // Get user by ID
    getUserById: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    // Update user credits
    updateCredits: async (userId, credits) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ credits })
                .eq('id', userId);

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Error updating credits:', error);
            throw error;
        }
    },

    // Clean up expired sessions (handled by Supabase automatically)
    cleanupSessions: () => {
        // Supabase handles session cleanup automatically
        console.log('Session cleanup is handled by Supabase');
    }
};

module.exports = authSupabase;
