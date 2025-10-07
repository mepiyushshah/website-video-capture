const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('.'));
app.use('/captures', express.static('captures'));

// Parse JSON bodies
app.use(express.json());

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
    const { filename, background } = req.body;

    if (!filename || !background) {
        return res.status(400).json({ error: 'Filename and background are required' });
    }

    try {
        const inputPath = path.join(__dirname, 'captures', filename);

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({ error: 'Video not found' });
        }

        console.log(`🎨 Rendering video with background: ${filename}`);

        // Generate output filename
        const outputFilename = filename.replace('.mp4', '_rendered.mp4');
        const outputPath = path.join(__dirname, 'captures', outputFilename);

        // Render video with background
        await renderVideoWithBackground(inputPath, outputPath, background);

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

async function renderVideoWithBackground(inputPath, outputPath, background) {
    return new Promise((resolve, reject) => {
        console.log('🎬 Starting FFmpeg render...');

        // Get video dimensions first
        const probeProcess = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
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

            const [videoWidth, videoHeight] = probeOutput.trim().split(',').map(Number);
            console.log(`📺 Video dimensions: ${videoWidth}x${videoHeight}`);

            // Parse background
            let filterComplex = '';

            if (background.type === 'gradient') {
                // Create gradient background
                const colors = parseGradientColors(background.value);
                filterComplex = `color=${colors[0]}:s=1920x1080[bg];[bg]gradients=colors='${colors.join(':')}':type=${background.direction || 'linear'}:s=1920x1080[grad];[grad][0:v]overlay=(W-w)/2:(H-h)/2`;
            } else if (background.type === 'solid') {
                // Create solid color background
                const color = background.value.replace('#', '0x');
                filterComplex = `color=${color}:s=1920x1080[bg];[bg][0:v]overlay=(W-w)/2:(H-h)/2`;
            } else {
                reject(new Error('Unknown background type'));
                return;
            }

            // Run FFmpeg to composite video with background
            const ffmpegArgs = [
                '-i', inputPath,
                '-f', 'lavfi', '-i', `color=${parseBackgroundColor(background)}:s=1920x1080:d=0.1`,
                '-filter_complex', `[1:v][0:v]scale2ref=w=oh*mdar:h=ih[bg][vid];[bg]setsar=1[bg];[bg][vid]overlay=(W-w)/2:(H-h)/2:format=auto`,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-movflags', '+faststart',
                '-y',
                outputPath
            ];

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
        return background.value.replace('#', '0x');
    } else if (background.type === 'gradient') {
        // For gradients, we'll use a complex filter
        const match = background.value.match(/linear-gradient\([^,]+,\s*([^,]+)/);
        if (match) {
            return match[1].trim().replace('#', '0x');
        }
        return '0x1a1a1a';
    }
    return '0x1a1a1a';
}

function parseGradientColors(gradientString) {
    const matches = gradientString.match(/#[0-9a-f]{6}/gi);
    return matches ? matches.map(c => c.replace('#', '0x')) : ['0x1a1a1a', '0x2a2a2a'];
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Captures directory: ${path.join(__dirname, 'captures')}`);
    console.log(`🎬 Ready to capture website videos!`);
});

module.exports = app;
