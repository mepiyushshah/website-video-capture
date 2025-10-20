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
        '--force-device-scale-factor=2',
        '--disable-blink-features=AutomationControlled',
        '--disable-http2'
      ]
    });

    const context = await this.browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2, // High DPI for crisp video
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      recordVideo: {
        dir: this.outputDir,
        size: { width, height },
        mode: 'retain-on-failure'
      },
      // High quality settings
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      forcedColors: 'none',
      // Stealth settings
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      geolocation: { longitude: -74.006, latitude: 40.7128 },
      hasTouch: false,
      isMobile: false,
      javaScriptEnabled: true
    });

    this.page = await context.newPage();

    // Hide webdriver and automation detection
    await this.page.addInitScript(() => {
      // Overwrite the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Mock chrome object
      window.chrome = {
        runtime: {}
      };

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

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

      // Wait for initial content to load and lazy-loaded images
      const waitTime = (this.settings.waitTime || 5) * 1000;
      await this.page.waitForTimeout(waitTime);

      // AGGRESSIVELY remove popups, cookie banners, and modals
      await this.page.evaluate(() => {
        // Remove ALL fixed and absolute positioned elements that might block
        const removeOverlays = () => {
          document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const position = style.position;

            // Remove fixed/absolute elements that are large overlays
            if (position === 'fixed' || position === 'absolute') {
              const zIndex = parseInt(style.zIndex) || 0;
              const height = el.offsetHeight;
              const width = el.offsetWidth;

              // If it's a large overlay with high z-index, remove it
              if (zIndex > 100 && (height > 200 || width > 300)) {
                el.remove();
              }
            }
          });

          // Force body to be scrollable
          document.body.style.overflow = 'auto !important';
          document.documentElement.style.overflow = 'auto !important';

          // Remove modal backdrops
          document.querySelectorAll('[class*="modal" i], [class*="overlay" i], [class*="backdrop" i]').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
              el.remove();
            }
          });
        };

        removeOverlays();

        // Run again after a short delay in case modals appeared
        setTimeout(removeOverlays, 500);
      });

      // Wait a bit for any animations after dismissing popups
      await this.page.waitForTimeout(1000);

      // Take a screenshot for thumbnail
      const screenshotPath = path.join(this.outputDir, outputFilename.replace('.mp4', '_thumb.png'));
      await this.page.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Start at the very top
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(500);

      console.log('🎯 Starting perfect continuous smooth scroll...');

      // PERFECT SCROLL LOGIC - Continuous smooth scrolling until bottom
      const scrollResult = await this.page.evaluate(async () => {
        return new Promise((resolve) => {
          const SCROLL_SPEED = 500; // pixels per second (comfortable viewing speed)
          const FPS = 60; // 60 frames per second for ultra smooth
          const FRAME_TIME = 1000 / FPS; // milliseconds per frame
          const PIXELS_PER_FRAME = SCROLL_SPEED / FPS; // how much to scroll each frame

          let scrollCount = 0;
          let lastScrollY = window.scrollY;
          let stuckCount = 0;
          const MAX_STUCK = 60; // If stuck for 60 frames (1 second), we're at bottom

          const startTime = Date.now();

          function scrollStep() {
            const currentScrollY = window.scrollY;
            const currentPageHeight = document.documentElement.scrollHeight;
            const viewportHeight = window.innerHeight;
            const maxScrollY = currentPageHeight - viewportHeight;

            // Check if scroll position hasn't changed
            if (currentScrollY === lastScrollY) {
              stuckCount++;

              // Only stop if we're truly stuck for long enough AND at bottom
              if (stuckCount >= MAX_STUCK) {
                // Double-check we're really at bottom
                const distanceFromBottom = currentPageHeight - (currentScrollY + viewportHeight);

                if (distanceFromBottom <= 10) {
                  // Confirmed: stuck for 1 second AND within 10px of bottom
                  const totalTime = (Date.now() - startTime) / 1000;
                  resolve({
                    totalScrolled: currentScrollY,
                    duration: totalTime,
                    frames: scrollCount
                  });
                  return;
                } else if (stuckCount >= MAX_STUCK * 5) {
                  // Stuck for 5 seconds but not at bottom - something's wrong, stop anyway
                  const totalTime = (Date.now() - startTime) / 1000;
                  resolve({
                    totalScrolled: currentScrollY,
                    duration: totalTime,
                    frames: scrollCount
                  });
                  return;
                }
              }
            } else {
              stuckCount = 0; // Reset stuck counter if we moved
            }

            lastScrollY = currentScrollY;

            // Scroll down by calculated pixels
            window.scrollBy({
              top: PIXELS_PER_FRAME,
              left: 0,
              behavior: 'auto' // Instant, no smooth (we control smoothness)
            });

            scrollCount++;

            // Continue scrolling
            setTimeout(scrollStep, FRAME_TIME);
          }

          // Start the scroll loop
          scrollStep();
        });
      });

      console.log(`✅ Scroll completed!`);
      console.log(`📊 Stats: ${scrollResult.totalScrolled}px scrolled in ${scrollResult.duration.toFixed(1)}s (${scrollResult.frames} frames)`);

      // Small pause at the end
      await this.page.waitForTimeout(500);

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
      const scrollDurationSec = scrollResult.duration; // Use actual duration from scroll

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
