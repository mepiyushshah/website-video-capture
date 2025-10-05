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
      const timeout = (this.settings.timeout || 30) * 1000;
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: timeout 
      });

      // Wait for dynamic content to load
      const waitTime = (this.settings.waitTime || 2) * 1000;
      await this.page.waitForTimeout(waitTime);

      // Take a screenshot for thumbnail
      const screenshotPath = path.join(this.outputDir, outputFilename.replace('.mp4', '_thumb.png'));
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Get the total height of the page
      const totalHeight = await this.page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
      });

      console.log(`📏 Page height: ${totalHeight}px`);

      // High-quality smooth scroll from top to bottom
      const scrollDuration = (this.settings.scrollDuration || 10) * 1000;
      const scrollSteps = 200; // More steps for smoother video
      const stepDuration = scrollDuration / scrollSteps;

      console.log('🎯 Starting high-quality smooth scroll capture...');

      // Start at the very top
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.page.waitForTimeout(500);

      for (let i = 0; i <= scrollSteps; i++) {
        const scrollPosition = (i / scrollSteps) * totalHeight;
        
        // Use requestAnimationFrame for smoother scrolling
        await this.page.evaluate((pos) => {
          return new Promise((resolve) => {
            const startTime = performance.now();
            const startPos = window.pageYOffset;
            const distance = pos - startPos;
            const duration = 100; // 100ms per step for smoothness
            
            function animateScroll(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Easing function for smooth motion
              const easeInOutCubic = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              
              window.scrollTo(0, startPos + distance * easeInOutCubic);
              
              if (progress < 1) {
                requestAnimationFrame(animateScroll);
              } else {
                resolve();
              }
            }
            
            requestAnimationFrame(animateScroll);
          });
        }, scrollPosition);

        // Wait for the scroll step to complete
        await this.page.waitForTimeout(stepDuration);
      }

      // Wait a bit more at the bottom
      await this.page.waitForTimeout(1000);

      console.log('✅ Video capture completed!');

      // Get the video path
      const videoPath = await this.page.video().path();
      
      // Move the video to the desired location
      const finalPath = path.join(this.outputDir, outputFilename);
      fs.renameSync(videoPath, finalPath);

      console.log(`🎥 Video saved to: ${finalPath}`);
      
      // Apply quality improvements if ffmpeg is available
      await this.enhanceVideoQuality(finalPath);
      
      return finalPath;

    } catch (error) {
      console.error('❌ Error during capture:', error);
      throw error;
    }
  }

  async enhanceVideoQuality(videoPath) {
    try {
      const { spawn } = require('child_process');
      
      // Check if ffmpeg is available
      const ffmpegCheck = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
      
      await new Promise((resolve, reject) => {
        ffmpegCheck.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            console.log('📝 FFmpeg not available, skipping quality enhancement');
            resolve();
          }
        });
      });

      console.log('🎨 Enhancing video quality...');
      
      const tempPath = videoPath.replace('.mp4', '_enhanced.mp4');
      
      // High-quality ffmpeg processing
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '18', // High quality (lower = better quality)
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-vf', 'scale=1920:1080:flags=lanczos', // Upscale to 1080p with high-quality scaling
        '-r', '30', // 30 FPS
        '-y', // Overwrite output
        tempPath
      ]);

      await new Promise((resolve, reject) => {
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            // Replace original with enhanced version
            fs.renameSync(tempPath, videoPath);
            console.log('✨ Video quality enhanced successfully!');
            resolve();
          } else {
            console.log('⚠️ Quality enhancement failed, using original video');
            resolve();
          }
        });
        
        ffmpeg.on('error', () => {
          console.log('⚠️ FFmpeg not available, using original video');
          resolve();
        });
      });

    } catch (error) {
      console.log('⚠️ Quality enhancement skipped:', error.message);
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
