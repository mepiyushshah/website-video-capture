const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const auth = require('./auth');

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

// Serve static files
app.use(express.static('.'));
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

        res.clearCookie('sessionToken');
        req.session.destroy();

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
    const { url, filename, settings } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        console.log(`🎬 Starting capture of: ${url}`);
        
        // Create a temporary settings file
        const settingsFile = path.join(__dirname, 'temp-settings.json');
        fs.writeFileSync(settingsFile, JSON.stringify(settings || {}));
        
        // Run the capture script with settings
        const captureProcess = spawn('node', ['capture.js', url, filename, settingsFile], {
            stdio: 'pipe'
        });
        
        let output = '';
        let errorOutput = '';
        
        captureProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log(data.toString());
        });
        
        captureProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(data.toString());
        });
        
        captureProcess.on('close', (code) => {
            // Clean up temporary settings file
            if (fs.existsSync(settingsFile)) {
                fs.unlinkSync(settingsFile);
            }
            
            if (code === 0) {
                res.json({ 
                    success: true, 
                    message: 'Video captured successfully',
                    filename: filename,
                    output: output
                });
            } else {
                res.status(500).json({ 
                    error: 'Capture failed', 
                    details: errorOutput 
                });
            }
        });
        
    } catch (error) {
        console.error('Capture error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
    const { filename, background, padding, mockup } = req.body;

    if (!filename || !background) {
        return res.status(400).json({ error: 'Filename and background are required' });
    }

    try {
        const inputPath = path.join(__dirname, 'captures', filename);

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({ error: 'Video not found' });
        }

        console.log(`🎨 Rendering video with background: ${filename}`, { background, padding, mockup });

        // Generate output filename
        const outputFilename = filename.replace('.mp4', '_rendered.mp4');
        const outputPath = path.join(__dirname, 'captures', outputFilename);

        // Render video with background and mockup
        await renderVideoWithBackground(inputPath, outputPath, background, padding || 40, mockup || 'none');

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

async function renderVideoWithBackground(inputPath, outputPath, background, padding = 40, mockup = 'none') {
    return new Promise((resolve, reject) => {
        console.log('🎬 Starting FFmpeg render...', { background, padding, mockup });

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

        probeProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Failed to probe video'));
                return;
            }

            const [videoWidth, videoHeight, duration] = probeOutput.trim().split(',');
            console.log(`📺 Video dimensions: ${videoWidth}x${videoHeight}, duration: ${duration}s`);

            // Calculate output dimensions with padding
            const outputWidth = 1920;
            const outputHeight = 1080;

            // Calculate mockup bar height
            const mockupBarHeight = mockup === 'chrome' ? 40 : mockup === 'safari' ? 44 : 0;
            const effectivePadding = mockup !== 'none' ? padding : padding;
            const videoContentHeight = mockup !== 'none' ? outputHeight - mockupBarHeight - effectivePadding * 2 : outputHeight - effectivePadding * 2;

            let ffmpegArgs = [];

            if (background.type === 'gradient') {
                // Extract gradient colors
                const colors = parseGradientColors(background.value);
                console.log('🎨 Gradient colors:', colors);

                // Create gradient using geq filter
                let filterComplex = `[1:v][2:v]blend=all_expr='A*(1-Y/${outputHeight})+B*(Y/${outputHeight})'[bg];` +
                    `[0:v]scale=w=${outputWidth-padding*2}:h=${videoContentHeight}:force_original_aspect_ratio=decrease[scaled];`;

                if (mockup !== 'none') {
                    // Add mockup bar
                    const barColor = mockup === 'chrome' ? '0xe8eaed' : '0xf6f6f6';
                    const buttonColor = mockup === 'chrome' ? '0x27c93f' : '0x28c840';
                    const buttonY = mockup === 'chrome' ? 10 : 14;
                    const videoYPos = mockupBarHeight + padding;

                    filterComplex += `[bg]drawbox=x=0:y=0:w=${outputWidth}:h=${mockupBarHeight}:color=${barColor}:t=fill[bg_with_bar];`;
                    // Add traffic lights (close, minimize, maximize buttons)
                    filterComplex += `[bg_with_bar]drawbox=x=16:y=${buttonY}:w=12:h=12:color=0xff5f56:t=fill,` +
                        `drawbox=x=34:y=${buttonY}:w=12:h=12:color=0xffbd2e:t=fill,` +
                        `drawbox=x=52:y=${buttonY}:w=12:h=12:color=${buttonColor}:t=fill[bg_final];` +
                        `[bg_final][scaled]overlay=(W-w)/2:${videoYPos}[outv]`;
                } else {
                    filterComplex += `[bg][scaled]overlay=(W-w)/2:(H-h)/2[outv]`;
                }

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
            } else {
                // Solid color background
                const color = parseBackgroundColor(background);
                console.log('🎨 Solid color:', color);

                let filterComplex = `[0:v]scale=w=${outputWidth-padding*2}:h=${videoContentHeight}:force_original_aspect_ratio=decrease[scaled];`;

                if (mockup !== 'none') {
                    // Add mockup bar
                    const barColor = mockup === 'chrome' ? '0xe8eaed' : '0xf6f6f6';
                    const buttonColor = mockup === 'chrome' ? '0x27c93f' : '0x28c840';
                    const buttonY = mockup === 'chrome' ? 10 : 14;
                    const videoYPos = mockupBarHeight + padding;

                    filterComplex += `[1:v]drawbox=x=0:y=0:w=${outputWidth}:h=${mockupBarHeight}:color=${barColor}:t=fill[bg_with_bar];`;
                    // Add traffic lights
                    filterComplex += `[bg_with_bar]drawbox=x=16:y=${buttonY}:w=12:h=12:color=0xff5f56:t=fill,` +
                        `drawbox=x=34:y=${buttonY}:w=12:h=12:color=0xffbd2e:t=fill,` +
                        `drawbox=x=52:y=${buttonY}:w=12:h=12:color=${buttonColor}:t=fill[bg_final];` +
                        `[bg_final][scaled]overlay=(W-w)/2:${videoYPos}[outv]`;
                } else {
                    filterComplex += `[1:v][scaled]overlay=(W-w)/2:(H-h)/2[outv]`;
                }

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

            console.log('🎨 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            let errorOutput = '';

            ffmpegProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffmpegProcess.on('close', (code) => {
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

// Serve the main page (protected)
app.get('/', (req, res) => {
    const sessionToken = req.cookies.sessionToken || req.session.token;

    // Check if user is authenticated
    if (!sessionToken || !auth.verifySession(sessionToken)) {
        return res.redirect('/auth.html');
    }

    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve auth page
app.get('/auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Captures directory: ${path.join(__dirname, 'captures')}`);
    console.log(`🎬 Ready to capture website videos!`);
});

module.exports = app;
