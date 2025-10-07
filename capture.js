const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class WebsiteVideoCapture {
  constructor() {
    this.browser = null;
    this.page = null;
    this.outputDir = './captures';
  }

  async init(settings = {}) {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Parse resolution from settings
    const resolution = settings.resolution || '1280x720';
    const [width, height] = resolution.split('x').map(Number);

    // Launch browser with high-quality settings
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--enable-font-antialiasing',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--force-color-profile=srgb',
        '--high-dpi-support=1',
        '--force-device-scale-factor=2'
      ]
    });

    const context = await this.browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2, // High DPI for crisp video
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      recordVideo: {
        dir: this.outputDir,
        size: { width, height },
        mode: 'retain-on-failure'
      },
      // High quality settings
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      forcedColors: 'none'
    });

    this.page = await context.newPage();
    this.settings = settings;
  }

  async captureWebsite(url, outputFilename = 'website-capture.mp4') {
    try {
      console.log(`🎬 Starting video capture of: ${url}`);

      // Navigate to the website
      const timeout = (this.settings.timeout || 60) * 1000;
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeout
      });

      // Wait for dynamic content to load
      const waitTime = (this.settings.waitTime || 5) * 1000;
      await this.page.waitForTimeout(waitTime);

      // Take a screenshot for thumbnail
      const screenshotPath = path.join(this.outputDir, outputFilename.replace('.mp4', '_thumb.png'));
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      console.log('🔄 Loading full page content...');

      // Step 1: Scroll to bottom multiple times to load ALL content
      let previousHeight = 0;
      let currentHeight = await this.page.evaluate(() => document.documentElement.scrollHeight);
      let attempts = 0;
      const maxAttempts = 20;

      while (previousHeight !== currentHeight && attempts < maxAttempts) {
        previousHeight = currentHeight;

        // Scroll to bottom
        await this.page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight);
        });

        // Wait for content to load
        await this.page.waitForTimeout(1000);

        // Get new height
        currentHeight = await this.page.evaluate(() => document.documentElement.scrollHeight);
        attempts++;
      }

      console.log(`📏 Full page loaded: ${currentHeight}px (after ${attempts} attempts)`);

      // Step 2: Go back to top
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(1000);

      // Step 3: Calculate how much to scroll
      const pageInfo = await this.page.evaluate(() => {
        const totalHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = totalHeight - viewportHeight;

        return { totalHeight, viewportHeight, maxScroll };
      });

      console.log(`📐 Total: ${pageInfo.totalHeight}px, Viewport: ${pageInfo.viewportHeight}px, Will scroll: ${pageInfo.maxScroll}px`);

      // Step 4: Calculate scroll duration
      let scrollDuration;
      if (this.settings.scrollDuration && this.settings.scrollDuration > 0) {
        scrollDuration = this.settings.scrollDuration * 1000;
      } else {
        // 2 seconds per viewport height
        const viewportCount = Math.ceil(pageInfo.maxScroll / pageInfo.viewportHeight);
        scrollDuration = Math.max(10000, viewportCount * 2000);
      }

      console.log(`⏱️  Scroll duration: ${scrollDuration / 1000}s`);
      console.log('🎬 Recording smooth scroll from header to footer...');

      // Step 5: Scroll in small steps with proper timing for video capture
      // Use 100ms per step for reliable video capture at 25fps (Playwright default)
      const stepDelay = 100;
      const totalSteps = Math.ceil(scrollDuration / stepDelay);
      const pixelsPerStep = pageInfo.maxScroll / totalSteps;

      console.log(`📊 Scrolling ${totalSteps} steps, ${pixelsPerStep.toFixed(2)}px per step`);

      for (let step = 0; step <= totalSteps; step++) {
        const targetScroll = Math.min(Math.round(step * pixelsPerStep), pageInfo.maxScroll);

        await this.page.evaluate((scrollY) => {
          window.scrollTo(0, scrollY);
        }, targetScroll);

        // Wait for video frame to be captured + content to render
        await this.page.waitForTimeout(stepDelay);

        // Progress indicator
        if (step % 50 === 0) {
          const progress = ((step / totalSteps) * 100).toFixed(1);
          console.log(`📹 Progress: ${progress}%`);
        }
      }

      // Ensure we're at the exact bottom
      await this.page.evaluate((maxScroll) => {
        window.scrollTo(0, maxScroll);
      }, pageInfo.maxScroll);

      console.log('📹 Progress: 100% - Reached footer!');

      // Wait at footer
      await this.page.waitForTimeout(2000);

      console.log('✅ Video capture completed!');

      // Close the page to finalize the video file
      const videoPromise = this.page.video();
      await this.page.close();
      await this.browser.close();
      this.browser = null;
      this.page = null;

      // Wait for video to be fully written
      const videoPath = await videoPromise.path();
      console.log(`📹 Waiting for video file to finalize: ${videoPath}`);

      // Wait longer for the file to be properly finalized
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify file exists and is readable
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      const stats = fs.statSync(videoPath);
      console.log(`📊 Video file size: ${stats.size} bytes`);

      // Convert WebM to MP4 and add audio in one step
      const finalPath = path.join(this.outputDir, outputFilename);
      const scrollDurationSec = scrollDuration / 1000;

      console.log(`🎥 Converting video and adding audio...`);
      await this.convertAndAddAudio(videoPath, finalPath, scrollDurationSec);

      // Clean up the temporary WebM file
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }

      return finalPath;

    } catch (error) {
      console.error('❌ Error during capture:', error);
      throw error;
    }
  }

  async convertAndAddAudio(webmPath, outputPath, duration) {
    try {
      const { spawn } = require('child_process');

      // Check if ffmpeg is available
      const ffmpegCheck = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });

      const ffmpegAvailable = await new Promise((resolve) => {
        ffmpegCheck.on('close', (code) => {
          resolve(code === 0);
        });
        ffmpegCheck.on('error', () => {
          resolve(false);
        });
      });

      if (!ffmpegAvailable) {
        console.log('⚠️ FFmpeg not available, saving video without audio');
        fs.renameSync(webmPath, outputPath);
        return;
      }

      console.log('🎵 Generating scrolling sound effect...');

      // Generate scrolling audio directly in the conversion process
      // This combines: WebM->MP4 conversion + audio generation + merge in one command
      const convertProcess = spawn('ffmpeg', [
        // Input WebM video
        '-i', webmPath,
        // Generate scrolling sound using sine waves with modulation
        '-f', 'lavfi',
        '-i', `sine=frequency=150:duration=${duration}`,
        '-f', 'lavfi',
        '-i', `sine=frequency=80:duration=${duration}`,
        // Complex audio filter for realistic scrolling sound
        '-filter_complex',
        `[1:a][2:a]amix=inputs=2:duration=longest:normalize=0,volume=0.08,afade=t=in:st=0:d=0.5,afade=t=out:st=${duration - 0.5}:d=0.5,tremolo=f=4:d=0.6,asetrate=44100*0.95,aresample=44100[aout]`,
        // Map video and generated audio
        '-map', '0:v:0',
        '-map', '[aout]',
        // Video encoding settings
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        // Audio encoding settings
        '-c:a', 'aac',
        '-b:a', '128k',
        // Output settings
        '-shortest',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ], { stdio: 'pipe' });

      await new Promise((resolve) => {
        let errorOutput = '';

        convertProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        convertProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Video converted and audio added successfully!');
            resolve();
          } else {
            console.log('⚠️ Conversion failed, saving without audio');
            console.log('Error:', errorOutput.slice(-300));
            // Fallback: just convert to MP4 without audio
            fs.renameSync(webmPath, outputPath);
            resolve();
          }
        });

        convertProcess.on('error', (err) => {
          console.log('⚠️ Conversion error, saving without audio:', err.message);
          if (fs.existsSync(webmPath)) {
            fs.renameSync(webmPath, outputPath);
          }
          resolve();
        });
      });

    } catch (error) {
      console.log('⚠️ Audio processing failed:', error.message);
      // Fallback: save without audio
      if (fs.existsSync(webmPath)) {
        fs.renameSync(webmPath, outputPath);
      }
    }
  }


  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution function
async function main() {
  const capture = new WebsiteVideoCapture();
  
  try {
    // Load settings from file if provided
    let settings = {};
    if (process.argv[4]) {
      try {
        const settingsData = fs.readFileSync(process.argv[4], 'utf8');
        settings = JSON.parse(settingsData);
      } catch (error) {
        console.log('Using default settings');
      }
    }
    
    await capture.init(settings);
    
    // Get URL from command line arguments or use default
    const url = process.argv[2] || 'https://example.com';
    const outputFilename = process.argv[3] || `capture-${Date.now()}.mp4`;
    
    const videoPath = await capture.captureWebsite(url, outputFilename);
    
    console.log(`\n🎉 Success! Video captured and saved to: ${videoPath}`);
    console.log('📺 You can now view the video in the web interface.');
    
  } catch (error) {
    console.error('💥 Capture failed:', error);
    process.exit(1);
  } finally {
    await capture.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = WebsiteVideoCapture;
