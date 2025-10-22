const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const auth = require('./auth');
const { createCanvas } = require('canvas');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'capture-studio-secret-key-' + Math.random().toString(36),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: false // Set to true if using HTTPS
    }
}));

// Serve static files (but not HTML files at root)
app.use(express.static('.', {
    index: false,  // Don't serve index.html automatically
    extensions: ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf']
}));
app.use('/captures', express.static('captures'));

// Authentication middleware
const requireAuth = (req, res, next) => {
    const sessionToken = req.cookies.sessionToken || req.session.token;

    if (!sessionToken) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const user = auth.verifySession(sessionToken);
    if (!user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
};

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await auth.register(email, password);
        res.json(result);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await auth.login(email, password);

        // Set session token in cookie
        res.cookie('sessionToken', result.sessionToken, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: false
        });

        req.session.token = result.sessionToken;

        res.json({
            success: true,
            user: result.user,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    try {
        const sessionToken = req.cookies.sessionToken || req.session.token;

        if (sessionToken) {
            auth.logout(sessionToken);
        }

        // Clear all cookies
        res.clearCookie('sessionToken', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });

        // Destroy session
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
            });
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

app.get('/api/auth/me', (req, res) => {
    const sessionToken = req.cookies.sessionToken || req.session.token;

    if (!sessionToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = auth.verifySession(sessionToken);
    if (!user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    res.json({ user });
});

// API endpoint to start video capture
app.post('/api/capture', async (req, res) => {
    console.log('📥 Received capture request');
    console.log('Request body:', req.body);

    const { url, filename, settings } = req.body;

    if (!url) {
        console.log('❌ No URL provided');
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        console.log(`🎬 Starting capture of: ${url}`);
        console.log(`📝 Filename: ${filename}`);
        console.log(`⚙️ Settings:`, settings);

        // Create a temporary settings file
        const settingsFile = path.join(__dirname, 'temp-settings.json');
        fs.writeFileSync(settingsFile, JSON.stringify(settings || {}));
        console.log(`✅ Settings file created: ${settingsFile}`);

        // Run the capture script with settings
        console.log(`🚀 Spawning capture process...`);
        const captureProcess = spawn('node', ['capture.js', url, filename, settingsFile], {
            stdio: 'pipe'
        });

        let output = '';
        let errorOutput = '';

        captureProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log('📤 Capture stdout:', data.toString());
        });

        captureProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('📤 Capture stderr:', data.toString());
        });

        captureProcess.on('close', (code) => {
            console.log(`✅ Capture process exited with code: ${code}`);

            // Clean up temporary settings file
            if (fs.existsSync(settingsFile)) {
                fs.unlinkSync(settingsFile);
                console.log(`🗑️ Cleaned up settings file`);
            }

            if (code === 0) {
                console.log(`✅ Capture successful: ${filename}`);
                res.json({
                    success: true,
                    message: 'Video captured successfully',
                    filename: filename,
                    output: output
                });
            } else {
                console.log(`❌ Capture failed with code ${code}`);
                res.status(500).json({
                    error: 'Capture failed',
                    details: errorOutput
                });
            }
        });

        captureProcess.on('error', (err) => {
            console.error('❌ Capture process error:', err);
            res.status(500).json({ error: 'Failed to start capture process: ' + err.message });
        });

    } catch (error) {
        console.error('❌ Capture error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to get list of captured videos
app.get('/api/videos', (req, res) => {
    const capturesDir = path.join(__dirname, 'captures');
    
    if (!fs.existsSync(capturesDir)) {
        return res.json({ videos: [] });
    }
    
    try {
        const files = fs.readdirSync(capturesDir)
            .filter(file => file.endsWith('.mp4'))
            .map(file => ({
                name: file,
                path: `/captures/${file}`,
                size: fs.statSync(path.join(capturesDir, file)).size,
                created: fs.statSync(path.join(capturesDir, file)).birthtime
            }));
        
        res.json({ videos: files });
    } catch (error) {
        console.error('Error reading captures directory:', error);
        res.status(500).json({ error: 'Failed to read videos' });
    }
});

// API endpoint to delete a video
app.delete('/api/videos/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'captures', filename);

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Video deleted successfully' });
        } else {
            res.status(404).json({ error: 'Video not found' });
        }
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// API endpoint to render video with background
app.post('/api/render', async (req, res) => {
    const { filename, background, padding, mockup, url } = req.body;

    if (!filename || !background) {
        return res.status(400).json({ error: 'Filename and background are required' });
    }

    try {
        const inputPath = path.join(__dirname, 'captures', filename);

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({ error: 'Video not found' });
        }

        console.log(`🎨 Rendering video with background: ${filename}`, { background, padding, mockup, url });

        // Generate output filename
        const outputFilename = filename.replace('.mp4', '_rendered.mp4');
        const outputPath = path.join(__dirname, 'captures', outputFilename);

        // Render video with background and mockup
        await renderVideoWithBackground(inputPath, outputPath, background, padding || 0, mockup || 'none', url);

        res.json({
            success: true,
            message: 'Video rendered successfully',
            filename: outputFilename,
            path: `/captures/${outputFilename}`
        });

    } catch (error) {
        console.error('Render error:', error);
        res.status(500).json({ error: 'Failed to render video', details: error.message });
    }
});

// Generate browser mockup overlay image with Canvas
async function generateMockupOverlay(width, height, mockup, padding, url = '') {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Clear canvas with transparency
    ctx.clearRect(0, 0, width, height);

    if (mockup === 'none') {
        return null;
    }

    // Scale toolbar proportionally - make it visually balanced for 1080p output
    const mockupBarHeight = mockup === 'safari' ? 80 : 75;
    const borderRadius = mockup === 'safari' ? 18 : 15;
    const mockupX = padding;
    const mockupY = padding;
    const mockupWidth = width - padding * 2;
    const mockupHeight = height - padding * 2;

    // Draw rounded rectangle for browser frame
    const barColor = mockup === 'safari' ? '#f6f6f6' : '#e8eaed';

    // Draw top bar with rounded top corners
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.moveTo(mockupX + borderRadius, mockupY);
    ctx.lineTo(mockupX + mockupWidth - borderRadius, mockupY);
    ctx.quadraticCurveTo(mockupX + mockupWidth, mockupY, mockupX + mockupWidth, mockupY + borderRadius);
    ctx.lineTo(mockupX + mockupWidth, mockupY + mockupBarHeight);
    ctx.lineTo(mockupX, mockupY + mockupBarHeight);
    ctx.lineTo(mockupX, mockupY + borderRadius);
    ctx.quadraticCurveTo(mockupX, mockupY, mockupX + borderRadius, mockupY);
    ctx.closePath();
    ctx.fill();

    if (mockup === 'safari') {
        // Safari-specific elements
        const buttonSize = 18;
        const buttonSpacing = 12;
        const buttonStartX = mockupX + 24;
        const buttonY = mockupY + 28 + buttonSize/2;

        // Traffic light buttons (circular)
        ctx.fillStyle = '#ff5f56';
        ctx.beginPath();
        ctx.arc(buttonStartX + buttonSize/2, buttonY, buttonSize/2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffbd2e';
        ctx.beginPath();
        ctx.arc(buttonStartX + buttonSize + buttonSpacing + buttonSize/2, buttonY, buttonSize/2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#28c840';
        ctx.beginPath();
        ctx.arc(buttonStartX + (buttonSize + buttonSpacing) * 2 + buttonSize/2, buttonY, buttonSize/2, 0, Math.PI * 2);
        ctx.fill();

        // Icon settings - scaled properly for 1920x1080 export
        const centerY = mockupY + mockupBarHeight / 2;
        const scaleFactor = mockupBarHeight / 52; // Scale based on toolbar height (80px export vs 52px preview)
        const iconSize = Math.round(18 * scaleFactor); // Scale icons proportionally (~28px for 1080p)
        const iconGap = Math.round(14 * scaleFactor); // Scale gaps proportionally (~21px for 1080p)
        const iconColor = '#666666';
        const iconOpacity = 0.85;

        ctx.globalAlpha = iconOpacity;
        ctx.fillStyle = iconColor;
        ctx.strokeStyle = iconColor;

        // Starting position for icons (after traffic lights)
        let iconX = buttonStartX + (buttonSize + buttonSpacing) * 3 + Math.round(30 * scaleFactor);

        // 1. Squares2X2Icon (Heroicon) - Sidebar/Tabs - pixel-perfect recreation
        const gridSize = iconSize * 0.35; // Each square is 35% of icon size
        const gridGap = iconSize * 0.12; // Gap is 12% of icon size
        const gridStartX = iconX + (iconSize - gridSize * 2 - gridGap) / 2;
        const gridStartY = centerY - (gridSize * 2 + gridGap) / 2;

        // Draw 2x2 grid with rounded corners
        const cornerRadius = gridSize * 0.25;

        // Top-left square
        ctx.beginPath();
        ctx.roundRect(gridStartX, gridStartY, gridSize, gridSize, cornerRadius);
        ctx.fill();

        // Top-right square
        ctx.beginPath();
        ctx.roundRect(gridStartX + gridSize + gridGap, gridStartY, gridSize, gridSize, cornerRadius);
        ctx.fill();

        // Bottom-left square
        ctx.beginPath();
        ctx.roundRect(gridStartX, gridStartY + gridSize + gridGap, gridSize, gridSize, cornerRadius);
        ctx.fill();

        // Bottom-right square
        ctx.beginPath();
        ctx.roundRect(gridStartX + gridSize + gridGap, gridStartY + gridSize + gridGap, gridSize, gridSize, cornerRadius);
        ctx.fill();

        iconX += iconSize + iconGap;

        // 2. ChevronLeftIcon (Heroicon) - Back arrow
        ctx.lineWidth = Math.round(2.2 * scaleFactor);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(iconX + iconSize * 0.6, centerY - iconSize * 0.35);
        ctx.lineTo(iconX + iconSize * 0.25, centerY);
        ctx.lineTo(iconX + iconSize * 0.6, centerY + iconSize * 0.35);
        ctx.stroke();

        iconX += iconSize + iconGap;

        // 3. ChevronRightIcon (Heroicon) - Forward arrow
        ctx.beginPath();
        ctx.moveTo(iconX + iconSize * 0.4, centerY - iconSize * 0.35);
        ctx.lineTo(iconX + iconSize * 0.75, centerY);
        ctx.lineTo(iconX + iconSize * 0.4, centerY + iconSize * 0.35);
        ctx.stroke();

        iconX += iconSize + iconGap;

        // 4. ShieldCheckIcon (Heroicon) - Privacy shield with checkmark - pixel-perfect
        const shieldCenterX = iconX + iconSize / 2;
        const shieldCenterY = centerY;
        const shieldHeight = iconSize * 0.85;
        const shieldWidth = iconSize * 0.7;

        ctx.lineWidth = Math.round(1.8 * scaleFactor);
        ctx.fillStyle = iconColor;

        // Draw filled shield shape
        ctx.beginPath();
        ctx.moveTo(shieldCenterX, shieldCenterY - shieldHeight / 2);
        ctx.lineTo(shieldCenterX + shieldWidth / 2, shieldCenterY - shieldHeight / 2);
        ctx.quadraticCurveTo(
            shieldCenterX + shieldWidth / 2,
            shieldCenterY - shieldHeight / 3,
            shieldCenterX + shieldWidth / 2,
            shieldCenterY
        );
        ctx.quadraticCurveTo(
            shieldCenterX + shieldWidth / 2,
            shieldCenterY + shieldHeight / 3,
            shieldCenterX,
            shieldCenterY + shieldHeight / 2
        );
        ctx.quadraticCurveTo(
            shieldCenterX - shieldWidth / 2,
            shieldCenterY + shieldHeight / 3,
            shieldCenterX - shieldWidth / 2,
            shieldCenterY
        );
        ctx.quadraticCurveTo(
            shieldCenterX - shieldWidth / 2,
            shieldCenterY - shieldHeight / 3,
            shieldCenterX - shieldWidth / 2,
            shieldCenterY - shieldHeight / 2
        );
        ctx.lineTo(shieldCenterX, shieldCenterY - shieldHeight / 2);
        ctx.closePath();
        ctx.fill();

        // Draw checkmark on white background
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.round(1.5 * scaleFactor);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(shieldCenterX - shieldWidth * 0.2, shieldCenterY);
        ctx.lineTo(shieldCenterX - shieldWidth * 0.05, shieldCenterY + shieldHeight * 0.15);
        ctx.lineTo(shieldCenterX + shieldWidth * 0.25, shieldCenterY - shieldHeight * 0.15);
        ctx.stroke();

        // Reset color for next icons
        ctx.strokeStyle = iconColor;

        iconX += iconSize + iconGap;

        // URL Bar (centered) - CSS-matched with scaling
        const urlBarHeight = Math.round(28 * scaleFactor); // CSS: height 28px
        const urlBarY = centerY - urlBarHeight/2;
        const urlBarMargin = Math.round(20 * scaleFactor); // CSS: margin 0 20px
        const urlBarMaxWidth = Math.round(600 * scaleFactor); // CSS: max-width 600px
        const urlBarPadding = Math.round(12 * scaleFactor); // CSS: padding 0 12px

        // Calculate URL bar position (after left icons, before right icons)
        const rightIconsWidth = Math.round((iconSize * 2 + iconGap) * 1.5); // Space for 2 right icons
        const urlBarX = iconX + iconSize + urlBarMargin; // After last left icon + margin
        const availableWidth = mockupWidth - (urlBarX - mockupX) - rightIconsWidth - urlBarMargin;
        const urlBarWidth = Math.min(urlBarMaxWidth, availableWidth);

        // Draw URL bar background
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(urlBarX, urlBarY, urlBarWidth, urlBarHeight, Math.round(6 * scaleFactor)); // CSS: border-radius 6px
        ctx.fill();

        // Draw URL bar border - CSS: border 0.5px solid rgba(0, 0, 0, 0.12)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = Math.round(0.5 * scaleFactor);
        ctx.stroke();

        // Draw URL text
        if (url) {
            // Clean URL for display (remove protocol)
            let displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

            ctx.fillStyle = '#333'; // CSS: color #333
            ctx.font = `${Math.round(13 * scaleFactor)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial`; // CSS: font-size 13px
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Measure text and truncate if needed
            const maxTextWidth = urlBarWidth - urlBarPadding * 2 - Math.round(20 * scaleFactor); // Leave space for refresh icon
            let textWidth = ctx.measureText(displayUrl).width;

            if (textWidth > maxTextWidth) {
                while (textWidth > maxTextWidth && displayUrl.length > 3) {
                    displayUrl = displayUrl.slice(0, -4) + '...';
                    textWidth = ctx.measureText(displayUrl).width;
                }
            }

            ctx.fillText(displayUrl, urlBarX + urlBarPadding, centerY);
        }

        // Reset globalAlpha for URL bar content
        ctx.globalAlpha = 1.0;

        // 5. ArrowPathIcon (Heroicon) - Refresh button (inside URL bar, right side) - CSS-matched with scaling
        const refreshIconSize = Math.round(16 * scaleFactor); // CSS: width/height 16px
        const refreshX = urlBarX + urlBarWidth - refreshIconSize - urlBarPadding;
        const refreshCenterX = refreshX + refreshIconSize / 2;

        ctx.globalAlpha = 0.75; // CSS: opacity 0.75
        ctx.strokeStyle = iconColor; // CSS: color #666666
        ctx.lineWidth = Math.round(1.8 * scaleFactor);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Top circular arrow
        ctx.beginPath();
        ctx.arc(refreshCenterX, centerY, refreshIconSize * 0.35, 0.7 * Math.PI, 0.3 * Math.PI, false);
        ctx.stroke();

        // Arrow head (top right)
        ctx.fillStyle = iconColor;
        ctx.beginPath();
        ctx.moveTo(refreshCenterX + refreshIconSize * 0.3, centerY - refreshIconSize * 0.35);
        ctx.lineTo(refreshCenterX + refreshIconSize * 0.35, centerY - refreshIconSize * 0.2);
        ctx.lineTo(refreshCenterX + refreshIconSize * 0.2, centerY - refreshIconSize * 0.2);
        ctx.closePath();
        ctx.fill();

        // Bottom circular arrow
        ctx.beginPath();
        ctx.arc(refreshCenterX, centerY, refreshIconSize * 0.35, 1.3 * Math.PI, 1.7 * Math.PI, false);
        ctx.stroke();

        // Arrow head (bottom left)
        ctx.beginPath();
        ctx.moveTo(refreshCenterX - refreshIconSize * 0.3, centerY + refreshIconSize * 0.35);
        ctx.lineTo(refreshCenterX - refreshIconSize * 0.35, centerY + refreshIconSize * 0.2);
        ctx.lineTo(refreshCenterX - refreshIconSize * 0.2, centerY + refreshIconSize * 0.2);
        ctx.closePath();
        ctx.fill();

        // Reset context for right icons
        ctx.globalAlpha = iconOpacity; // CSS: opacity 0.85
        ctx.fillStyle = iconColor;
        ctx.strokeStyle = iconColor;

        // Calculate right icons starting position - CSS-matched with scaling
        // Right icons: Share + Plus with 14px gap, positioned from right edge with 16px padding
        const rightPadding = Math.round(16 * scaleFactor); // CSS: padding 0 16px
        const rightIconsX = mockupX + mockupWidth - rightPadding - (iconSize * 2 + iconGap);

        // 6. ArrowUpTrayIcon (Heroicon) - Share button
        const shareX = rightIconsX;
        const shareCenterX = shareX + iconSize / 2;

        ctx.lineWidth = Math.round(1.8 * scaleFactor);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Upward arrow shaft
        ctx.beginPath();
        ctx.moveTo(shareCenterX, centerY - iconSize * 0.35);
        ctx.lineTo(shareCenterX, centerY + iconSize * 0.2);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(shareCenterX - iconSize * 0.2, centerY - iconSize * 0.15);
        ctx.lineTo(shareCenterX, centerY - iconSize * 0.35);
        ctx.lineTo(shareCenterX + iconSize * 0.2, centerY - iconSize * 0.15);
        ctx.stroke();

        // Tray base
        ctx.lineWidth = Math.round(1.5 * scaleFactor);
        ctx.beginPath();
        ctx.moveTo(shareCenterX - iconSize * 0.3, centerY + iconSize * 0.2);
        ctx.lineTo(shareCenterX - iconSize * 0.3, centerY + iconSize * 0.3);
        ctx.quadraticCurveTo(
            shareCenterX - iconSize * 0.3,
            centerY + iconSize * 0.4,
            shareCenterX - iconSize * 0.2,
            centerY + iconSize * 0.4
        );
        ctx.lineTo(shareCenterX + iconSize * 0.2, centerY + iconSize * 0.4);
        ctx.quadraticCurveTo(
            shareCenterX + iconSize * 0.3,
            centerY + iconSize * 0.4,
            shareCenterX + iconSize * 0.3,
            centerY + iconSize * 0.3
        );
        ctx.lineTo(shareCenterX + iconSize * 0.3, centerY + iconSize * 0.2);
        ctx.stroke();

        // 7. PlusIcon (Heroicon) - Plus button (rightmost)
        const plusX = rightIconsX + iconSize + iconGap;
        const plusCenterX = plusX + iconSize / 2;

        ctx.lineWidth = Math.round(2 * scaleFactor);
        ctx.lineCap = 'round';

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(plusCenterX - iconSize * 0.3, centerY);
        ctx.lineTo(plusCenterX + iconSize * 0.3, centerY);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(plusCenterX, centerY - iconSize * 0.3);
        ctx.lineTo(plusCenterX, centerY + iconSize * 0.3);
        ctx.stroke();

        // Reset globalAlpha
        ctx.globalAlpha = 1.0;

    } else if (mockup === 'chrome') {
        // Chrome-specific elements (simpler design)
        const buttonSize = 18;
        const buttonSpacing = 12;
        const buttonStartX = mockupX + 24;
        const buttonY = mockupY + 26 + buttonSize/2;

        // Traffic light buttons
        ctx.fillStyle = '#ff5f56';
        ctx.beginPath();
        ctx.arc(buttonStartX + buttonSize/2, buttonY, buttonSize/2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffbd2e';
        ctx.beginPath();
        ctx.arc(buttonStartX + buttonSize + buttonSpacing + buttonSize/2, buttonY, buttonSize/2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#28c840';
        ctx.beginPath();
        ctx.arc(buttonStartX + (buttonSize + buttonSpacing) * 2 + buttonSize/2, buttonY, buttonSize/2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Save to temp file
    const overlayPath = path.join(__dirname, `mockup-overlay-${mockup}-${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(overlayPath, buffer);

    return overlayPath;
}

async function renderVideoWithBackground(inputPath, outputPath, background, padding = 0, mockup = 'none', url = '') {
    return new Promise(async (resolve, reject) => {
        console.log('🎬 Starting FFmpeg render...', { background, padding, mockup, url });

        // Get video dimensions and duration first
        const probeProcess = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,duration',
            '-of', 'csv=p=0',
            inputPath
        ]);

        let probeOutput = '';
        probeProcess.stdout.on('data', (data) => {
            probeOutput += data.toString();
        });

        probeProcess.on('close', async (code) => {
            if (code !== 0) {
                reject(new Error('Failed to probe video'));
                return;
            }

            const [videoWidth, videoHeight, duration] = probeOutput.trim().split(',');
            console.log(`📺 Video dimensions: ${videoWidth}x${videoHeight}, duration: ${duration}s`);

            // Calculate output dimensions with padding
            const outputWidth = 1920;
            const outputHeight = 1080;

            // Calculate mockup bar height - scaled for 1080p (80px for Safari, 75px for Chrome)
            const mockupBarHeight = mockup === 'safari' ? 80 : mockup === 'chrome' ? 75 : 0;
            const effectivePadding = mockup !== 'none' ? padding : padding;
            const videoContentHeight = mockup !== 'none' ? outputHeight - mockupBarHeight - effectivePadding * 2 : outputHeight - effectivePadding * 2;

            // Generate mockup overlay PNG if needed
            let mockupOverlayPath = null;
            if (mockup !== 'none') {
                console.log('🎨 Generating mockup overlay with Canvas...');
                mockupOverlayPath = await generateMockupOverlay(outputWidth, outputHeight, mockup, effectivePadding, url);
                console.log(`✅ Mockup overlay generated: ${mockupOverlayPath}`);
            }

            let ffmpegArgs = [];

            if (background.type === 'gradient') {
                // Extract gradient colors
                const colors = parseGradientColors(background.value);
                console.log('🎨 Gradient colors:', colors);

                // Create gradient using geq filter
                let filterComplex = `[1:v][2:v]blend=all_expr='A*(1-Y/${outputHeight})+B*(Y/${outputHeight})'[bg];`;

                if (mockup !== 'none' && mockupOverlayPath) {
                    const mockupBarWidth = outputWidth - effectivePadding * 2;
                    const videoYPos = mockupBarHeight + effectivePadding;

                    // Scale video to fill the mockup width completely
                    filterComplex += `[0:v]scale=w=${mockupBarWidth}:h=${videoContentHeight}:force_original_aspect_ratio=increase,crop=${mockupBarWidth}:${videoContentHeight}[scaled];`;

                    // Overlay video on background
                    filterComplex += `[bg][scaled]overlay=${effectivePadding}:${videoYPos}[bg_with_video];`;

                    // Overlay mockup PNG on top
                    filterComplex += `[bg_with_video][3:v]overlay=0:0[outv]`;

                    ffmpegArgs = [
                        '-i', inputPath,
                        '-f', 'lavfi', '-i', `color=c=${colors[0]}:s=${outputWidth}x${outputHeight}:d=${duration || 10}`,
                        '-f', 'lavfi', '-i', `color=c=${colors[1]}:s=${outputWidth}x${outputHeight}:d=${duration || 10}`,
                        '-loop', '1', '-i', mockupOverlayPath,
                        '-filter_complex',
                        filterComplex,
                        '-map', '[outv]',
                        '-map', '0:a?',
                        '-shortest',
                        '-c:v', 'libx264',
                        '-preset', 'medium',
                        '-crf', '23',
                        '-pix_fmt', 'yuv420p',
                        '-movflags', '+faststart',
                        '-y',
                        outputPath
                    ];
                } else {
                    filterComplex += `[0:v]scale=w=${outputWidth-padding*2}:h=${videoContentHeight}:force_original_aspect_ratio=decrease[scaled];`;
                    filterComplex += `[bg][scaled]overlay=(W-w)/2:(H-h)/2[outv]`;

                    ffmpegArgs = [
                        '-i', inputPath,
                        '-f', 'lavfi', '-i', `color=c=${colors[0]}:s=${outputWidth}x${outputHeight}:d=${duration || 10}`,
                        '-f', 'lavfi', '-i', `color=c=${colors[1]}:s=${outputWidth}x${outputHeight}:d=${duration || 10}`,
                        '-filter_complex',
                        filterComplex,
                        '-map', '[outv]',
                        '-map', '0:a?',
                        '-c:v', 'libx264',
                        '-preset', 'medium',
                        '-crf', '23',
                        '-pix_fmt', 'yuv420p',
                        '-movflags', '+faststart',
                        '-y',
                        outputPath
                    ];
                }
            } else {
                // Solid color background
                const color = parseBackgroundColor(background);
                console.log('🎨 Solid color:', color);

                let filterComplex = '';

                if (mockup !== 'none' && mockupOverlayPath) {
                    const mockupBarWidth = outputWidth - effectivePadding * 2;
                    const videoYPos = mockupBarHeight + effectivePadding;

                    // Scale video to fill the mockup width completely
                    filterComplex += `[0:v]scale=w=${mockupBarWidth}:h=${videoContentHeight}:force_original_aspect_ratio=increase,crop=${mockupBarWidth}:${videoContentHeight}[scaled];`;

                    // Overlay video on background
                    filterComplex += `[1:v][scaled]overlay=${effectivePadding}:${videoYPos}[bg_with_video];`;

                    // Overlay mockup PNG on top
                    filterComplex += `[bg_with_video][2:v]overlay=0:0[outv]`;

                    ffmpegArgs = [
                        '-i', inputPath,
                        '-f', 'lavfi', '-i', `color=c=${color}:s=${outputWidth}x${outputHeight}:d=${duration || 10}`,
                        '-loop', '1', '-i', mockupOverlayPath,
                        '-filter_complex',
                        filterComplex,
                        '-map', '[outv]',
                        '-map', '0:a?',
                        '-shortest',
                        '-c:v', 'libx264',
                        '-preset', 'medium',
                        '-crf', '23',
                        '-pix_fmt', 'yuv420p',
                        '-movflags', '+faststart',
                        '-y',
                        outputPath
                    ];
                } else {
                    filterComplex += `[0:v]scale=w=${outputWidth-padding*2}:h=${videoContentHeight}:force_original_aspect_ratio=decrease[scaled];`;
                    filterComplex += `[1:v][scaled]overlay=(W-w)/2:(H-h)/2[outv]`;

                    ffmpegArgs = [
                        '-i', inputPath,
                        '-f', 'lavfi', '-i', `color=c=${color}:s=${outputWidth}x${outputHeight}:d=${duration || 10}`,
                        '-filter_complex',
                        filterComplex,
                        '-map', '[outv]',
                        '-map', '0:a?',
                        '-c:v', 'libx264',
                        '-preset', 'medium',
                        '-crf', '23',
                        '-pix_fmt', 'yuv420p',
                        '-movflags', '+faststart',
                        '-y',
                        outputPath
                    ];
                }
            }

            console.log('🎨 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            let errorOutput = '';

            ffmpegProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffmpegProcess.on('close', (code) => {
                // Cleanup temp mockup overlay
                if (mockupOverlayPath && fs.existsSync(mockupOverlayPath)) {
                    fs.unlinkSync(mockupOverlayPath);
                    console.log(`🗑️ Cleaned up mockup overlay: ${mockupOverlayPath}`);
                }

                if (code === 0) {
                    console.log('✅ Video rendered successfully!');
                    resolve();
                } else {
                    console.error('FFmpeg error:', errorOutput.slice(-500));
                    reject(new Error('FFmpeg rendering failed'));
                }
            });

            ffmpegProcess.on('error', (err) => {
                reject(err);
            });
        });
    });
}

function parseBackgroundColor(background) {
    if (background.type === 'solid') {
        const color = background.value;
        // Handle hex colors
        if (color.startsWith('#')) {
            return color.replace('#', '0x');
        }
        // Handle rgb/rgba colors
        if (color.startsWith('rgb')) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const [, r, g, b] = match;
                const hex = ((parseInt(r) << 16) | (parseInt(g) << 8) | parseInt(b)).toString(16).padStart(6, '0');
                return `0x${hex}`;
            }
        }
        return '0x1a1a1a';
    } else if (background.type === 'gradient') {
        // For gradients, extract the first color
        const match = background.value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const [, r, g, b] = match;
            const hex = ((parseInt(r) << 16) | (parseInt(g) << 8) | parseInt(b)).toString(16).padStart(6, '0');
            return `0x${hex}`;
        }
        // Try hex color
        const hexMatch = background.value.match(/#[0-9a-f]{6}/i);
        if (hexMatch) {
            return hexMatch[0].replace('#', '0x');
        }
        return '0x1a1a1a';
    }
    return '0x1a1a1a';
}

function parseGradientColors(gradientString) {
    // Try to match hex colors first
    const hexMatches = gradientString.match(/#[0-9a-f]{6}/gi);
    if (hexMatches && hexMatches.length >= 2) {
        return hexMatches.slice(0, 2).map(c => c.replace('#', '0x'));
    }

    // Try to match rgb colors
    const rgbMatches = [...gradientString.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    if (rgbMatches && rgbMatches.length >= 2) {
        return rgbMatches.slice(0, 2).map(match => {
            const [, r, g, b] = match;
            const hex = ((parseInt(r) << 16) | (parseInt(g) << 8) | parseInt(b)).toString(16).padStart(6, '0');
            return `0x${hex}`;
        });
    }

    return ['0x1a1a1a', '0x2a2a2a'];
}

// ========================================
// Subscription API Endpoints
// ========================================

// Get current subscription
app.get('/api/subscription/current', requireAuth, (req, res) => {
    try {
        // For now, return default free plan
        // TODO: Fetch from database based on req.user
        const subscription = {
            plan: 'starter',
            planName: 'Starter',
            price: 0,
            features: [
                '5 videos per month',
                '1080p quality',
                'Basic backgrounds',
                'Browser mockups',
                'Standard support'
            ],
            usage: {
                videosCreated: 0,
                videosLimit: 5
            }
        };

        res.json(subscription);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Get billing history
app.get('/api/subscription/billing-history', requireAuth, (req, res) => {
    try {
        // For now, return empty billing history
        // TODO: Fetch from database based on req.user
        const billingHistory = {
            history: []
            // Example:
            // history: [
            //     {
            //         date: '2024-10-01',
            //         description: 'Pro Plan - Monthly',
            //         amount: 29.00,
            //         status: 'Paid',
            //         invoiceUrl: '/api/invoices/12345'
            //     }
            // ]
        };

        res.json(billingHistory);
    } catch (error) {
        console.error('Error fetching billing history:', error);
        res.status(500).json({ error: 'Failed to fetch billing history' });
    }
});

// Select a new plan
app.post('/api/subscription/select-plan', requireAuth, async (req, res) => {
    try {
        const { plan } = req.body;

        if (!plan) {
            return res.status(400).json({ error: 'Plan is required' });
        }

        // Validate plan
        const validPlans = ['starter', 'pro', 'enterprise'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        // For now, just return success
        // TODO: Implement actual payment processing (Stripe, etc.)
        console.log(`User ${req.user.email} selected plan: ${plan}`);

        if (plan === 'starter') {
            // Downgrade to free plan
            res.json({
                success: true,
                message: 'Successfully downgraded to Starter plan'
            });
        } else {
            // For paid plans, return a checkout URL (mock for now)
            res.json({
                success: true,
                checkoutUrl: `/checkout?plan=${plan}`,
                message: 'Redirecting to checkout...'
            });
        }
    } catch (error) {
        console.error('Error selecting plan:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

// Cancel subscription
app.post('/api/subscription/cancel', requireAuth, async (req, res) => {
    try {
        // TODO: Implement subscription cancellation
        console.log(`User ${req.user.email} cancelled subscription`);

        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Get payment methods
app.get('/api/subscription/payment-methods', requireAuth, (req, res) => {
    try {
        // TODO: Fetch payment methods from database
        const paymentMethods = {
            methods: []
            // Example:
            // methods: [
            //     {
            //         id: 'pm_123',
            //         type: 'card',
            //         last4: '4242',
            //         brand: 'visa',
            //         expiryMonth: 12,
            //         expiryYear: 2025,
            //         isDefault: true
            //     }
            // ]
        };

        res.json(paymentMethods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
});

// Serve the landing page (public)
app.get('/', (req, res) => {
    // Always show homepage for testing
    res.sendFile(path.join(__dirname, 'home.html'));
});

// Serve the dashboard (protected)
app.get('/dashboard', (req, res) => {
    const sessionToken = req.cookies.sessionToken || req.session.token;

    // Check if user is authenticated
    if (!sessionToken || !auth.verifySession(sessionToken)) {
        return res.redirect('/auth.html');
    }

    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve auth page
app.get('/auth.html', (req, res) => {
    const sessionToken = req.cookies.sessionToken || req.session.token;

    // If already authenticated, redirect to dashboard
    if (sessionToken && auth.verifySession(sessionToken)) {
        return res.redirect('/dashboard');
    }

    res.sendFile(path.join(__dirname, 'auth.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Captures directory: ${path.join(__dirname, 'captures')}`);
    console.log(`🎬 Ready to capture website videos!`);
});

module.exports = app;
