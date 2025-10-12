const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Initialize database
const dbPath = path.join(__dirname, 'users.db');
const db = new Database(dbPath);

// Create users table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        credits INTEGER DEFAULT 100
    )
`);

// Create sessions table
db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

// User authentication functions
const auth = {
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

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into database
            const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
            const result = stmt.run(email, hashedPassword);

            return {
                success: true,
                userId: result.lastInsertRowid,
                message: 'User registered successfully'
            };
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('Email already registered');
            }
            throw error;
        }
    },

    // Login user
    login: async (email, password) => {
        try {
            // Find user by email
            const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
            const user = stmt.get(email);

            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                throw new Error('Invalid email or password');
            }

            // Generate session token
            const sessionToken = generateSessionToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Store session
            const sessionStmt = db.prepare(
                'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)'
            );
            sessionStmt.run(user.id, sessionToken, expiresAt.toISOString());

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    credits: user.credits
                },
                sessionToken,
                expiresAt
            };
        } catch (error) {
            throw error;
        }
    },

    // Verify session token
    verifySession: (sessionToken) => {
        try {
            const stmt = db.prepare(`
                SELECT u.*, s.expires_at
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_token = ?
            `);
            const result = stmt.get(sessionToken);

            if (!result) {
                return null;
            }

            // Check if session is expired
            const expiresAt = new Date(result.expires_at);
            if (expiresAt < new Date()) {
                // Delete expired session
                const deleteStmt = db.prepare('DELETE FROM sessions WHERE session_token = ?');
                deleteStmt.run(sessionToken);
                return null;
            }

            return {
                id: result.id,
                email: result.email,
                credits: result.credits
            };
        } catch (error) {
            console.error('Error verifying session:', error);
            return null;
        }
    },

    // Logout user
    logout: (sessionToken) => {
        try {
            const stmt = db.prepare('DELETE FROM sessions WHERE session_token = ?');
            stmt.run(sessionToken);
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            throw error;
        }
    },

    // Get user by ID
    getUserById: (userId) => {
        const stmt = db.prepare('SELECT id, email, credits, created_at FROM users WHERE id = ?');
        return stmt.get(userId);
    },

    // Update user credits
    updateCredits: (userId, credits) => {
        const stmt = db.prepare('UPDATE users SET credits = ? WHERE id = ?');
        stmt.run(credits, userId);
    },

    // Clean up expired sessions
    cleanupSessions: () => {
        const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
        stmt.run(new Date().toISOString());
    }
};

// Generate random session token
function generateSessionToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

// Clean up expired sessions periodically (every hour)
setInterval(() => {
    auth.cleanupSessions();
}, 60 * 60 * 1000);

module.exports = auth;
