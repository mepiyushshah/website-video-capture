// Video Player Controls
let isPlaying = false;
let currentVideo = null;
let currentMockup = 'none';

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing application...');

    // Clear any existing error messages
    clearAllMessages();

    // Check if user is logged in
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
        showLoginModal();
        return; // Don't initialize the rest of the app if not logged in
    }

    initializeVideoPlayer();
    setupEventListeners();
    loadVideoList();
    // Don't show sidebar initially - it will appear after first capture
    console.log('✅ Application initialized successfully');
});

function initializeVideoPlayer() {
    currentVideo = document.getElementById('mainVideo');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    
    // Check if there are any videos available
    checkForVideos();
}

function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');

    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
        console.log('✅ Play/Pause button listener added');
    } else {
        console.log('❌ Play/Pause button not found');
    }

    // Custom video controls
    setupCustomVideoControls();
    
    // Video events
    if (currentVideo) {
        currentVideo.addEventListener('loadedmetadata', updateVideoInfo);
        currentVideo.addEventListener('timeupdate', updateTimeDisplay);
        currentVideo.addEventListener('play', () => {
            isPlaying = true;
            updatePlayPauseButton();
        });
        currentVideo.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayPauseButton();
        });
        currentVideo.addEventListener('ended', () => {
            isPlaying = false;
            updatePlayPauseButton();
        });
        currentVideo.addEventListener('error', (e) => {
            console.error('Video error:', e);
            showErrorMessage('Error loading video');
        });
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Command+K or Ctrl+K for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            focusSearchBar();
        }
        // Space for play/pause
        else if (e.code === 'Space' && currentVideo) {
            e.preventDefault();
            togglePlayPause();
        }
    });
    
    // Video control buttons
    const volumeBtn = document.querySelector('.video-controls .control-btn:nth-child(2)');
    const fullscreenBtn = document.querySelector('.video-controls .control-btn:nth-child(3)');
    
    if (volumeBtn) {
        volumeBtn.addEventListener('click', toggleMute);
    }
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // File explorer clicks
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        item.addEventListener('click', function() {
            const fileName = this.querySelector('span').textContent;
            loadVideo(fileName);
        });
    });
    
    // AI suggestions
    const suggestions = document.querySelectorAll('.suggestion');
    suggestions.forEach(suggestion => {
        suggestion.addEventListener('click', function() {
            const text = this.querySelector('span').textContent;
            handleAISuggestion(text);
        });
    });
    
    // Navigation tabs
    const navTabs = document.querySelectorAll('.nav-center .nav-btn');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabText = this.querySelector('span').textContent;
            handleNavTab(tabText);
        });
    });
    
    // Sidebar navigation
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            handleSidebarNavigation(section);
        });
    });
    
    // Search functionality
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.blur();
                searchInput.value = '';
                handleSearch();
            }
        });
    }
}

function togglePlayPause() {
    if (!currentVideo) return;
    
    if (isPlaying) {
        currentVideo.pause();
    } else {
        currentVideo.play();
    }
}

function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const icon = playPauseBtn.querySelector('i');
    
    if (isPlaying) {
        icon.className = 'fas fa-pause';
    } else {
        icon.className = 'fas fa-play';
    }
}

function updateVideoInfo() {
    if (!currentVideo) return;
    
    const duration = formatTime(currentVideo.duration);
    document.getElementById('videoDuration').textContent = duration;
}

function updateTimeDisplay() {
    // This could be used to update a time display if needed
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '--:--';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function loadVideo(fileName) {
    const videoPath = `captures/${fileName}`;

    if (currentVideo) {
        currentVideo.src = videoPath;
        currentVideo.load();

        // Hide placeholder and show video
        const videoPlaceholder = document.getElementById('videoPlaceholder');
        videoPlaceholder.style.display = 'none';
        currentVideo.style.display = 'block';

        // Show video controls when video is loaded
        const videoHeaderControls = document.getElementById('videoHeaderControls');
        if (videoHeaderControls) {
            videoHeaderControls.style.display = 'flex';
        }

        // Show timeline controls
        const videoTimeline = document.getElementById('videoTimeline');
        if (videoTimeline) {
            videoTimeline.classList.add('active');
        }

        // Update file selection in explorer
        updateFileSelection(fileName);

        // Auto-play video when loaded
        currentVideo.addEventListener('loadeddata', function autoPlayHandler() {
            currentVideo.play().catch(err => {
                console.log('Autoplay prevented:', err);
            });
            isPlaying = true;
            updatePlayPauseButton();
            // Remove this event listener after first use
            currentVideo.removeEventListener('loadeddata', autoPlayHandler);
        });
    }
}

function updateFileSelection(fileName) {
    // Remove active class from all file items
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to selected file
    fileItems.forEach(item => {
        if (item.querySelector('span').textContent === fileName) {
            item.classList.add('active');
        }
    });
}

function checkForExistingVideos() {
    // This would typically check the server for existing videos
    // For now, we'll simulate it
    const videoFiles = ['website-capture.mp4', 'demo-video.mp4'];
    
    videoFiles.forEach(fileName => {
        // Check if video exists by trying to load it
        const testVideo = new Video();
        testVideo.src = `captures/${fileName}`;
        testVideo.addEventListener('loadeddata', () => {
            console.log(`Video found: ${fileName}`);
        });
        testVideo.addEventListener('error', () => {
            console.log(`Video not found: ${fileName}`);
        });
    });
}

function handleAISuggestion(suggestion) {
    switch(suggestion) {
        case 'Capture a new website':
            startCapture();
            break;
        case 'Edit video settings':
            showSettings();
            break;
        case 'Add smooth transitions':
            showTransitions();
            break;
        default:
            console.log('AI suggestion:', suggestion);
    }
}

function handleNavTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.nav-center .nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked tab
    const clickedTab = Array.from(document.querySelectorAll('.nav-center .nav-btn')).find(btn => 
        btn.querySelector('span').textContent === tabName
    );
    if (clickedTab) {
        clickedTab.classList.add('active');
    }
    
    // Handle tab functionality
    switch(tabName) {
        case 'Video Player':
            showVideoPlayer();
            break;
        case 'Preview':
            showPreview();
            break;
        case 'Design':
            showDesign();
            break;
    }
}

function handleSidebarNavigation(section) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked menu item
    const clickedItem = document.querySelector(`[data-section="${section}"]`);
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    // Handle section functionality
    switch(section) {
        case 'dashboard':
            showDashboard();
            break;
        case 'playground':
            showPlayground();
            break;
        case 'api-keys':
            showApiKeys();
            break;
        case 'history':
            showHistory();
            break;
    }
}

function showDashboard() {
    console.log('Showing Dashboard');
    // Dashboard functionality will be implemented here
}

function showPlayground() {
    console.log('Showing Playground');
    // Playground functionality will be implemented here
}

function showApiKeys() {
    console.log('Showing API Keys');
    // API Keys functionality will be implemented here
}

function showHistory() {
    console.log('Showing History');
    // History functionality will be implemented here
}

function showVideoPlayer() {
    // Hide other panels
    document.getElementById('previewPanel')?.style.setProperty('display', 'none');
    document.getElementById('designPanel')?.style.setProperty('display', 'none');
    
    // Ensure sidebar is visible
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = 'flex';
    }
    
    // Show video player (default view)
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.style.display = 'flex';
    }
}

function showPreview() {
    // Hide other panels
    document.getElementById('designPanel')?.style.setProperty('display', 'none');
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.style.display = 'none';
    }
    
    // Ensure sidebar is visible
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = 'flex';
    }
    
    // Show preview panel
    let previewPanel = document.getElementById('previewPanel');
    if (!previewPanel) {
        previewPanel = createPreviewPanel();
    }
    previewPanel.style.display = 'flex';
}

function showDesign() {
    // Hide other panels
    document.getElementById('previewPanel')?.style.setProperty('display', 'none');
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.style.display = 'none';
    }
    
    // Ensure sidebar is visible
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = 'flex';
    }
    
    // Show design panel
    let designPanel = document.getElementById('designPanel');
    if (!designPanel) {
        designPanel = createDesignPanel();
    }
    designPanel.style.display = 'flex';
}

function startCapture() {
    const modal = document.getElementById('captureModal');
    modal.style.display = 'flex';

    // Load current settings into quick settings dropdowns
    loadQuickSettings();

    // Trigger animation after display is set
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeCaptureModal() {
    const modal = document.getElementById('captureModal');
    modal.classList.remove('show');
    
    // Hide modal after animation
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

async function startCaptureProcess() {
    const url = document.getElementById('websiteUrl').value;
    let filename = document.getElementById('outputName').value;

    if (!url) {
        alert('Please enter a valid URL');
        return;
    }

    // Auto-generate filename from URL if not provided
    if (!filename || filename.trim() === '') {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '').replace(/\./g, '-');
            const timestamp = Date.now();
            filename = `${domain}-${timestamp}.mp4`;
        } catch (e) {
            filename = `capture-${Date.now()}.mp4`;
        }
    }

    // Reset abort flag
    captureAborted = false;

    // Close modal
    closeCaptureModal();

    // Show loading state with website URL
    showLoadingState(url);

    // Start realistic progress tracking
    let captureStartTime = Date.now();

    try {
        // Get current settings from localStorage
        const settings = JSON.parse(localStorage.getItem('videoSettings') || '{}');

        // Start the capture request
        const capturePromise = fetch('/api/capture', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, filename, settings })
        });

        // Update progress based on realistic timing
        currentProgressInterval = setInterval(() => {
            // Check if capture was aborted
            if (captureAborted) {
                if (currentProgressInterval) {
                    clearInterval(currentProgressInterval);
                    currentProgressInterval = null;
                }
                return;
            }

            const elapsed = Date.now() - captureStartTime;
            let progress = 0;
            let stepTitle = '';
            let stepDetail = '';
            let stepNumber = 1;

            if (elapsed < 3000) {
                // First 3 seconds: Browser initialization
                progress = (elapsed / 3000) * 15;
                stepTitle = 'Initializing Browser';
                stepDetail = `Loading ${new URL(url).hostname}...`;
                stepNumber = 1;
            } else if (elapsed < 5000) {
                // Next 2 seconds: Page analysis
                progress = 15 + ((elapsed - 3000) / 2000) * 10;
                stepTitle = 'Analyzing Page';
                stepDetail = 'Measuring content dimensions...';
                stepNumber = 2;
            } else if (elapsed < 25000) {
                // Next 20 seconds: Main capture (longest phase)
                progress = 25 + ((elapsed - 5000) / 20000) * 60;
                stepTitle = 'Recording Video';
                stepDetail = 'Capturing smooth scroll animation...';
                stepNumber = 3;
            } else {
                // Final processing
                progress = 85 + ((elapsed - 25000) / 5000) * 10;
                stepTitle = 'Processing Video';
                stepDetail = 'Optimizing and saving video file...';
                stepNumber = 4;
            }

            updateProgress(Math.min(progress, 95), stepTitle, stepDetail, stepNumber);
        }, 500);

        const response = await capturePromise;

        // Check if aborted before processing response
        if (captureAborted) {
            return;
        }

        const result = await response.json();

        // Clear progress interval
        if (currentProgressInterval) {
            clearInterval(currentProgressInterval);
            currentProgressInterval = null;
        }

        if (result.success) {
            // Show completion
            updateProgress(100, 'Processing Video', 'Video saved successfully!', 4);
            markStepComplete(4);

            setTimeout(() => {
                hideLoadingState();
                showSuccessMessage(`Video captured successfully: ${filename}`);

                // Hide explorer panel and show editor panel
                const explorerPanel = document.getElementById('explorerPanel');
                const editorPanel = document.getElementById('editorPanel');
                if (explorerPanel) {
                    explorerPanel.style.display = 'none';
                }
                if (editorPanel) {
                    editorPanel.style.display = 'flex';
                }

                // Initialize editor controls
                initializeVideoEditor();

                // Refresh video list
                loadVideoList().then(() => {
                    // Load the new video
                    loadVideo(filename);
                });
            }, 1000);
        } else {
            hideLoadingState();
            showErrorMessage(`Capture failed: ${result.error}`);
        }
    } catch (error) {
        if (currentProgressInterval) {
            clearInterval(currentProgressInterval);
            currentProgressInterval = null;
        }

        // Don't show error if capture was aborted
        if (!captureAborted) {
            hideLoadingState();
            console.error('Capture error:', error);
            showErrorMessage(`Failed to capture video. Please check server connection.`);
        }
    }
}

function showLoadingState(websiteUrl) {
    // Hide the sidebar during capture for better UX
    const sidebar = document.getElementById('mainSidebar');
    if (sidebar) {
        sidebar.style.display = 'none';
    }

    // Hide only the placeholder content (icon, text) but keep the container visible
    const placeholderContent = document.querySelector('.placeholder-content');
    if (placeholderContent) {
        // Hide the icon, h3, and p elements
        const icon = placeholderContent.querySelector('i');
        const h3 = placeholderContent.querySelector('h3');
        const p = placeholderContent.querySelector('p');
        if (icon) icon.style.display = 'none';
        if (h3) h3.style.display = 'none';
        if (p) p.style.display = 'none';
    }

    // Transform the Start Capture button to show shadcn-inspired recording status card
    const captureBtn = document.querySelector('.capture-btn');
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.style.position = 'relative';
        captureBtn.style.overflow = 'visible';
        captureBtn.style.background = 'transparent';
        captureBtn.style.border = 'none';
        captureBtn.style.cursor = 'not-allowed';
        captureBtn.style.minWidth = '100%';
        captureBtn.style.height = 'auto';
        captureBtn.style.padding = '0';
        captureBtn.style.boxShadow = 'none';
        captureBtn.style.transform = 'none';
        captureBtn.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                backdrop-filter: blur(40px) saturate(180%);
                -webkit-backdrop-filter: blur(40px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.18);
                border-radius: 20px;
                padding: 32px;
                width: 520px;
                max-width: 90vw;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            ">
                <!-- Header -->
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: hsl(142.1 76.2% 36.3% / 0.15);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <svg style="width: 20px; height: 20px; color: hsl(142.1 70.6% 45.3%);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div style="flex: 1;">
                        <div style="
                            font-size: 18px;
                            font-weight: 600;
                            color: hsl(0 0% 98%);
                            margin-bottom: 2px;
                            letter-spacing: -0.02em;
                        ">Recording in Progress</div>
                        <div style="
                            font-size: 14px;
                            color: hsl(240 5% 64.9%);
                        " id="captureStepText">Initializing capture...</div>
                    </div>
                </div>

                <!-- Progress Section -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="
                            font-size: 13px;
                            font-weight: 500;
                            color: hsl(0 0% 98%);
                        " id="captureStepTitle">Step 1 of 4: Initializing Browser</span>
                        <span style="
                            font-size: 13px;
                            font-weight: 600;
                            color: hsl(142.1 70.6% 45.3%);
                            tabular-nums: 1;
                        " id="captureProgress">0%</span>
                    </div>

                    <!-- Progress Bar -->
                    <div style="
                        width: 100%;
                        height: 8px;
                        background: hsl(240 3.7% 15.9%);
                        border-radius: 9999px;
                        overflow: hidden;
                        position: relative;
                    ">
                        <div id="captureBtnProgress" style="
                            height: 100%;
                            width: 0%;
                            background: linear-gradient(90deg, hsl(142.1 76.2% 36.3%), hsl(142.1 70.6% 45.3%));
                            border-radius: 9999px;
                            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                        "></div>
                    </div>
                </div>

                <!-- Time Estimate & Cancel Button -->
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    justify-content: space-between;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 12px 16px;
                        background: hsl(240 3.7% 15.9% / 0.5);
                        border-radius: 8px;
                        border: 1px solid hsl(240 3.7% 15.9%);
                        flex: 1;
                    ">
                        <svg style="width: 16px; height: 16px; color: hsl(240 5% 64.9%);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span style="
                            font-size: 13px;
                            color: hsl(240 5% 64.9%);
                        " id="captureTimeEstimate">Estimated time remaining: ~30s</span>
                    </div>

                    <button onclick="cancelCapture()" style="
                        padding: 12px 20px;
                        background: transparent;
                        border: 1px solid hsl(0 84.2% 60.2%);
                        color: hsl(0 84.2% 60.2%);
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                        white-space: nowrap;
                    " onmouseover="this.style.background='hsl(0 84.2% 60.2% / 0.1)'" onmouseout="this.style.background='transparent'">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    }

    // Update status panel with detailed progress tracking
    const statusPanel = document.getElementById('statusPanel');
    if (!statusPanel) {
        console.log('Status panel not found, skipping status update');
        return;
    }

    const domain = websiteUrl ? new URL(websiteUrl).hostname : 'website';

    statusPanel.innerHTML = `
        <div class="capture-progress-container">
            <div class="progress-header">
                <h4>📹 Capture Progress</h4>
                <div class="overall-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="overallProgress" style="width: 0%"></div>
                    </div>
                    <span class="progress-text" id="progressText">0%</span>
                </div>
            </div>

            <div class="status-step active" id="step1">
                <div class="step-icon">
                    <div class="status-spinner"><div class="spinner"></div></div>
                </div>
                <div class="step-content">
                    <span class="step-title">Initializing Browser</span>
                    <span class="step-detail">Loading ${domain}...</span>
                </div>
                <div class="step-status">⏳</div>
            </div>

            <div class="status-step" id="step2">
                <div class="step-icon">⏳</div>
                <div class="step-content">
                    <span class="step-title">Analyzing Page</span>
                    <span class="step-detail">Measuring content dimensions...</span>
                </div>
                <div class="step-status">⏳</div>
            </div>

            <div class="status-step" id="step3">
                <div class="step-icon">⏳</div>
                <div class="step-content">
                    <span class="step-title">Recording Video</span>
                    <span class="step-detail">Capturing smooth scroll animation...</span>
                </div>
                <div class="step-status">⏳</div>
            </div>

            <div class="status-step" id="step4">
                <div class="step-icon">⏳</div>
                <div class="step-content">
                    <span class="step-title">Processing Video</span>
                    <span class="step-detail">Optimizing and saving...</span>
                </div>
                <div class="step-status">⏳</div>
            </div>
        </div>
    `;

    // Initialize progress tracking - will be updated by real capture progress
    updateProgress(0, 'Initializing capture...', 'Starting browser and preparing page');
}

function hideLoadingState() {
    // Show the sidebar after capture completes
    const sidebar = document.getElementById('mainSidebar');
    if (sidebar) {
        sidebar.style.display = 'flex';
    }

    // Show the placeholder content again (icon, text)
    const placeholderContent = document.querySelector('.placeholder-content');
    if (placeholderContent) {
        const icon = placeholderContent.querySelector('i');
        const h3 = placeholderContent.querySelector('h3');
        const p = placeholderContent.querySelector('p');
        if (icon) icon.style.display = '';
        if (h3) h3.style.display = '';
        if (p) p.style.display = '';
    }

    // Reset the Start Capture button to its original state
    const captureBtn = document.querySelector('.capture-btn');
    if (captureBtn) {
        captureBtn.disabled = false;
        captureBtn.style.background = '';
        captureBtn.style.border = '';
        captureBtn.style.padding = '';
        captureBtn.style.minWidth = '';
        captureBtn.style.height = '';
        captureBtn.style.cursor = '';
        captureBtn.style.overflow = '';
        captureBtn.innerHTML = '<span>Start Capture</span>';
    }

    const statusPanel = document.getElementById('statusPanel');
    if (statusPanel) {
        statusPanel.innerHTML = `
            <div class="status-item ready-state">
                <div class="ready-icon">
                    <i class="fas fa-check-circle" style="color: #00aa00;"></i>
                </div>
                <div class="ready-content">
                    <span class="ready-title">Ready to Capture</span>
                    <span class="ready-detail">Click 'Start Capture' to begin recording</span>
                </div>
            </div>
        `;
    }
}

// Global variable to track capture cancellation
let captureAborted = false;
let currentProgressInterval = null;

function cancelCapture() {
    if (confirm('Are you sure you want to cancel the recording?')) {
        captureAborted = true;

        // Clear any active progress intervals
        if (currentProgressInterval) {
            clearInterval(currentProgressInterval);
            currentProgressInterval = null;
        }

        hideLoadingState();
        showErrorMessage('Video capture cancelled by user');
    }
}

// Real progress tracking functions
function updateProgress(percentage, stepTitle, stepDetail, stepNumber = 1) {
    // Update overall progress bar
    const progressFill = document.getElementById('overallProgress');
    const progressText = document.getElementById('progressText');
    if (progressFill && progressText) {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${Math.round(percentage)}%`;
    }

    // Update the capture button progress (new shadcn-inspired design)
    const captureBtnProgress = document.getElementById('captureBtnProgress');
    const captureProgressText = document.getElementById('captureProgress');
    const captureStepText = document.getElementById('captureStepText');
    const captureStepTitle = document.getElementById('captureStepTitle');
    const captureTimeEstimate = document.getElementById('captureTimeEstimate');

    if (captureBtnProgress && captureProgressText) {
        captureBtnProgress.style.width = `${percentage}%`;
        captureProgressText.textContent = `${Math.round(percentage)}%`;
    }

    if (captureStepText) {
        captureStepText.textContent = stepDetail;
    }

    if (captureStepTitle) {
        captureStepTitle.textContent = `Step ${stepNumber} of 4: ${stepTitle}`;
    }

    // Calculate and update time estimate
    if (captureTimeEstimate) {
        const remainingPercentage = 100 - percentage;
        const estimatedSeconds = Math.ceil((remainingPercentage / 100) * 30); // Assume ~30s total

        if (percentage >= 95) {
            captureTimeEstimate.textContent = 'Almost done...';
        } else if (estimatedSeconds <= 5) {
            captureTimeEstimate.textContent = 'Just a few seconds...';
        } else {
            captureTimeEstimate.textContent = `Estimated time remaining: ~${estimatedSeconds}s`;
        }
    }

    // Update current step
    updateStepStatus(stepNumber, stepTitle, stepDetail, true, false);

    // Mark previous steps as complete
    for (let i = 1; i < stepNumber; i++) {
        markStepComplete(i);
    }

    // Reset future steps
    for (let i = stepNumber + 1; i <= 4; i++) {
        resetStep(i);
    }
}

function markStepComplete(stepNum) {
    const stepElement = document.getElementById(`step${stepNum}`);
    if (!stepElement) return;

    stepElement.classList.remove('active');
    stepElement.classList.add('complete');
    stepElement.querySelector('.step-icon').innerHTML = '<i class="fas fa-check-circle" style="color: #00aa00;"></i>';
    stepElement.querySelector('.step-status').innerHTML = '✅';
}

function updateStepStatus(stepNum, title, detail, isActive, isComplete) {
    const stepElement = document.getElementById(`step${stepNum}`);
    if (!stepElement) return;

    stepElement.classList.remove('active', 'complete');

    if (isComplete) {
        stepElement.classList.add('complete');
        stepElement.querySelector('.step-icon').innerHTML = '<i class="fas fa-check-circle" style="color: #00aa00;"></i>';
        stepElement.querySelector('.step-status').innerHTML = '✅';
    } else if (isActive) {
        stepElement.classList.add('active');
        stepElement.querySelector('.step-icon').innerHTML = '<div class="status-spinner"><div class="spinner"></div></div>';
        stepElement.querySelector('.step-status').innerHTML = '⏳';
    }

    if (title) stepElement.querySelector('.step-title').textContent = title;
    if (detail) stepElement.querySelector('.step-detail').textContent = detail;
}

function resetStep(stepNum) {
    const stepElement = document.getElementById(`step${stepNum}`);
    if (!stepElement) return;

    stepElement.classList.remove('active', 'complete');
    stepElement.querySelector('.step-icon').innerHTML = '⏳';
    stepElement.querySelector('.step-status').innerHTML = '⏳';
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showMessage(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger slide-in animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

function clearAllMessages() {
    // Remove all existing toast messages
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
}

function ensureSidebarVisible() {
    // Make sure the sidebar is visible
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = 'flex';
    }
}

async function loadVideoList() {
    try {
        const response = await fetch('/api/videos');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Update file explorer with actual videos
        const fileTree = document.querySelector('.file-tree');
        const existingFiles = fileTree.querySelectorAll('.file-item');
        existingFiles.forEach(item => item.remove());

        data.videos.forEach(video => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="fas fa-video"></i>
                <span>${video.name}</span>
            `;
            fileItem.addEventListener('click', () => loadVideo(video.name));
            fileTree.appendChild(fileItem);
        });

        // If there are videos, load the first one
        if (data.videos.length > 0) {
            loadVideo(data.videos[0].name);
        }
    } catch (error) {
        console.log('Note: Video list could not be loaded from server. Using local videos.');
        // Don't show error toast on initial load - this is expected when using local files
    }
}

function checkForVideos() {
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const videoElement = document.getElementById('mainVideo');
    
    // Check if there's a video source
    if (videoElement.src && videoElement.src !== '') {
        videoPlaceholder.style.display = 'none';
        videoElement.style.display = 'block';
    } else {
        videoPlaceholder.style.display = 'flex';
        videoElement.style.display = 'none';
    }
}

function showSettings() {
    const sidebar = document.getElementById('settingsSidebar');
    sidebar.style.display = 'flex';
    loadCurrentSettings();
}

function showTransitions() {
    // Switch to effects tab in settings
    showSettings();
    switchTab('effects');
}

// Settings Sidebar Functions
function closeSettingsSidebar() {
    const sidebar = document.getElementById('settingsSidebar');
    sidebar.style.display = 'none';
}

function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function loadCurrentSettings() {
    // Load settings from localStorage or use defaults
    const settings = JSON.parse(localStorage.getItem('videoSettings') || '{}');
    
    // Set form values
    document.getElementById('resolution').value = settings.resolution || '1280x720';
    document.getElementById('fps').value = settings.fps || '30';
    document.getElementById('scrollDuration').value = settings.scrollDuration || 0;
    document.getElementById('scrollEasing').value = settings.scrollEasing || 'ease-in-out';
    document.getElementById('waitTime').value = settings.waitTime || 2;
    document.getElementById('timeout').value = settings.timeout || 30;
    
    // Effects
    document.getElementById('fadeIn').checked = settings.fadeIn !== false;
    document.getElementById('fadeOut').checked = settings.fadeOut !== false;
    document.getElementById('zoomEffect').checked = settings.zoomEffect || false;
    document.getElementById('blurEffect').checked = settings.blurEffect || false;
    document.getElementById('transitionType').value = settings.transitionType || 'smooth';
    document.getElementById('transitionSpeed').value = settings.transitionSpeed || 'medium';
    document.getElementById('colorGrading').value = settings.colorGrading || 'none';
    document.getElementById('stabilization').value = settings.stabilization || 'medium';
    
    // Output settings
    document.getElementById('codec').value = settings.codec || 'h264';
    document.getElementById('bitrate').value = settings.bitrate || 8;
    document.getElementById('audioEnabled').checked = settings.audioEnabled !== false;
    document.getElementById('audioQuality').value = settings.audioQuality || 'medium';
    document.getElementById('autoSave').checked = settings.autoSave !== false;
    document.getElementById('previewMode').checked = settings.previewMode || false;
    
    // Update range value displays
    updateScrollDuration();
    updateWaitTime();
    updateTimeout();
    updateBitrate();
}

function saveSettings() {
    const settings = {
        // Capture settings
        resolution: document.getElementById('resolution').value,
        fps: document.getElementById('fps').value,
        scrollDuration: parseInt(document.getElementById('scrollDuration').value),
        scrollEasing: document.getElementById('scrollEasing').value,
        waitTime: parseInt(document.getElementById('waitTime').value),
        timeout: parseInt(document.getElementById('timeout').value),
        
        // Effects
        fadeIn: document.getElementById('fadeIn').checked,
        fadeOut: document.getElementById('fadeOut').checked,
        zoomEffect: document.getElementById('zoomEffect').checked,
        blurEffect: document.getElementById('blurEffect').checked,
        transitionType: document.getElementById('transitionType').value,
        transitionSpeed: document.getElementById('transitionSpeed').value,
        colorGrading: document.getElementById('colorGrading').value,
        stabilization: document.getElementById('stabilization').value,
        
        // Output settings
        codec: document.getElementById('codec').value,
        bitrate: parseInt(document.getElementById('bitrate').value),
        audioEnabled: document.getElementById('audioEnabled').checked,
        audioQuality: document.getElementById('audioQuality').value,
        autoSave: document.getElementById('autoSave').checked,
        previewMode: document.getElementById('previewMode').checked
    };
    
    // Save to localStorage
    localStorage.setItem('videoSettings', JSON.stringify(settings));
    
    // Show success message
    showSuccessMessage('Settings saved successfully!');
    
    // Close sidebar
    closeSettingsSidebar();
}

function resetSettings() {
    // Clear localStorage
    localStorage.removeItem('videoSettings');
    
    // Reload settings (will use defaults)
    loadCurrentSettings();
    
    showSuccessMessage('Settings reset to defaults!');
}

// Range value update functions
function updateScrollDuration() {
    const value = document.getElementById('scrollDuration').value;
    document.getElementById('scrollDurationValue').textContent = value === '0' ? 'Auto' : value + 's';
}

function updateWaitTime() {
    const value = document.getElementById('waitTime').value;
    document.getElementById('waitTimeValue').textContent = value + 's';
}

function updateTimeout() {
    const value = document.getElementById('timeout').value;
    document.getElementById('timeoutValue').textContent = value + 's';
}

function updateBitrate() {
    const value = document.getElementById('bitrate').value;
    document.getElementById('bitrateValue').textContent = value + ' Mbps';
}

function createPreviewPanel() {
    const panel = document.createElement('div');
    panel.id = 'previewPanel';
    panel.className = 'preview-panel';
    panel.innerHTML = `
        <div class="preview-header">
            <h3>Video Preview</h3>
            <div class="preview-controls">
                <button class="control-btn" onclick="playPreview()">
                    <i class="fas fa-play"></i>
                </button>
                <button class="control-btn" onclick="pausePreview()">
                    <i class="fas fa-pause"></i>
                </button>
                <button class="control-btn" onclick="resetPreview()">
                    <i class="fas fa-undo"></i>
                </button>
            </div>
        </div>
        <div class="preview-content">
            <div class="preview-video">
                <video id="previewVideo" controls>
                    <source src="captures/website-capture.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
            <div class="preview-info">
                <h4>Preview Settings</h4>
                <div class="preview-options">
                    <div class="option-group">
                        <label>Playback Speed</label>
                        <select id="playbackSpeed">
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                    <div class="option-group">
                        <label>Quality</label>
                        <select id="previewQuality">
                            <option value="auto" selected>Auto</option>
                            <option value="720p">720p</option>
                            <option value="1080p">1080p</option>
                            <option value="4k">4K</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.querySelector('.main-content').appendChild(panel);
    return panel;
}

function createDesignPanel() {
    const panel = document.createElement('div');
    panel.id = 'designPanel';
    panel.className = 'design-panel';
    panel.innerHTML = `
        <div class="design-header">
            <h3>Design Studio</h3>
            <div class="design-tools">
                <button class="tool-btn active" onclick="selectTool('brush')">
                    <i class="fas fa-paint-brush"></i>
                </button>
                <button class="tool-btn" onclick="selectTool('text')">
                    <i class="fas fa-font"></i>
                </button>
                <button class="tool-btn" onclick="selectTool('shapes')">
                    <i class="fas fa-shapes"></i>
                </button>
                <button class="tool-btn" onclick="selectTool('effects')">
                    <i class="fas fa-magic"></i>
                </button>
            </div>
        </div>
        <div class="design-content">
            <div class="design-canvas">
                <div class="canvas-placeholder">
                    <i class="fas fa-image"></i>
                    <p>Design Canvas</p>
                    <button class="btn primary" onclick="loadVideoToCanvas()">
                        Load Video
                    </button>
                </div>
            </div>
            <div class="design-properties">
                <h4>Properties</h4>
                <div class="property-group">
                    <label>Color</label>
                    <input type="color" id="designColor" value="#007acc">
                </div>
                <div class="property-group">
                    <label>Opacity</label>
                    <input type="range" id="designOpacity" min="0" max="100" value="100">
                </div>
                <div class="property-group">
                    <label>Size</label>
                    <input type="range" id="designSize" min="1" max="100" value="50">
                </div>
            </div>
        </div>
    `;
    
    document.querySelector('.main-content').appendChild(panel);
    return panel;
}

// Video control functions
function toggleMute() {
    if (currentVideo) {
        currentVideo.muted = !currentVideo.muted;
        const volumeBtn = document.querySelector('.video-controls .control-btn:nth-child(2) i');
        if (volumeBtn) {
            volumeBtn.className = currentVideo.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        }
    }
}

function toggleFullscreen() {
    if (currentVideo) {
        if (currentVideo.requestFullscreen) {
            currentVideo.requestFullscreen();
        } else if (currentVideo.webkitRequestFullscreen) {
            currentVideo.webkitRequestFullscreen();
        } else if (currentVideo.msRequestFullscreen) {
            currentVideo.msRequestFullscreen();
        }
    }
}

function focusSearchBar() {
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

function handleSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const query = searchInput.value.toLowerCase().trim();
    
    // Search through file items
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        const fileName = item.querySelector('span').textContent.toLowerCase();
        if (query === '' || fileName.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Search through AI suggestions
    const suggestions = document.querySelectorAll('.suggestion');
    suggestions.forEach(suggestion => {
        const suggestionText = suggestion.querySelector('span').textContent.toLowerCase();
        if (query === '' || suggestionText.includes(query)) {
            suggestion.style.display = 'flex';
        } else {
            suggestion.style.display = 'none';
        }
    });
    
    // If search is for "capture" or "new", trigger capture modal
    if (query.includes('capture') || query.includes('new') || query.includes('record')) {
        setTimeout(() => {
            startCapture();
        }, 100);
    }
}

// Export functions for global access
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

window.startCapture = startCapture;
window.closeCaptureModal = closeCaptureModal;
window.startCaptureProcess = startCaptureProcess;
window.cancelCapture = cancelCapture;
window.showSettings = showSettings;
window.closeSettingsModal = closeSettingsModal;
window.switchTab = switchTab;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.updateScrollDuration = updateScrollDuration;
window.updateWaitTime = updateWaitTime;
window.updateTimeout = updateTimeout;
window.updateBitrate = updateBitrate;

// Login System Functions
async function isLoggedIn() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            updateUserInfo(data.user.email, data.user.credits);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

function showLoginModal() {
    // Redirect to auth page instead of showing modal
    window.location.href = '/auth.html';
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Login successful! Welcome to CaptureStudio', 'success');
            closeLoginModal();

            // Update user info in header
            updateUserInfo(data.user.email, data.user.credits);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function updateUserInfo(email, credits) {
    const userEmailElement = document.querySelector('.user-email');
    const userCreditsElement = document.querySelector('.user-credits');

    if (userEmailElement) {
        userEmailElement.textContent = email;
    }
    if (userCreditsElement && credits !== undefined) {
        userCreditsElement.textContent = `${credits} credits`;
    }
}

async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            // Redirect to home page (landing page) immediately
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even on error
        window.location.href = '/';
    }
}

// Add logout functionality to logout button
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// Video Editor Functions
function initializeVideoEditor() {
    const videoPlayer = document.getElementById('mainVideo');
    const videoWrapper = document.getElementById('videoWrapper');

    // Initialize mockup handlers
    initializeMockupHandlers();

    // Background tab switching
    const bgTabs = document.querySelectorAll('.bg-tab');
    const gradientSection = document.getElementById('gradientSection');
    const colorSection = document.getElementById('colorSection');

    bgTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            bgTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const type = tab.getAttribute('data-type');
            if (type === 'gradient') {
                gradientSection.style.display = 'block';
                colorSection.style.display = 'none';
                applyGradientBackground();
            } else if (type === 'color') {
                gradientSection.style.display = 'none';
                colorSection.style.display = 'block';
                applySolidBackground();
            } else if (type === 'image') {
                gradientSection.style.display = 'none';
                colorSection.style.display = 'none';
            }
        });
    });

    // Gradient color inputs
    const gradientColor1 = document.getElementById('gradientColor1');
    const gradientColor2 = document.getElementById('gradientColor2');

    if (gradientColor1 && gradientColor2) {
        [gradientColor1, gradientColor2].forEach(input => {
            input.addEventListener('input', (e) => {
                const colorCode = e.target.nextElementSibling;
                if (colorCode) {
                    colorCode.textContent = e.target.value;
                }
                applyGradientBackground();
            });
        });
    }

    // Solid color input - text field
    const bgColorInput = document.getElementById('bgColorInput');
    const bgColorPicker = document.getElementById('bgColorPicker');

    if (bgColorInput) {
        bgColorInput.addEventListener('input', (e) => {
            const colorValue = e.target.value.trim();
            // If it's a valid hex color, update the color picker
            if (colorValue.match(/^#[0-9A-Fa-f]{6}$/)) {
                if (bgColorPicker) {
                    bgColorPicker.value = colorValue;
                }
            }
            applySolidBackground();
        });
    }

    // Solid color input - color picker
    if (bgColorPicker) {
        bgColorPicker.addEventListener('input', (e) => {
            const colorValue = e.target.value;
            // Update the text input with the color picker value
            if (bgColorInput) {
                bgColorInput.value = colorValue;
            }
            applySolidBackground();
        });
    }

    // Gradient presets
    const gradientPresets = document.querySelectorAll('.gradient-preset');
    gradientPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            // Get colors from data attributes
            const color1 = preset.getAttribute('data-color1');
            const color2 = preset.getAttribute('data-color2');

            if (color1 && color2 && gradientColor1 && gradientColor2) {
                // Update the color inputs
                gradientColor1.value = color1;
                gradientColor2.value = color2;

                // Update the color code display
                const colorCode1 = gradientColor1.nextElementSibling;
                const colorCode2 = gradientColor2.nextElementSibling;
                if (colorCode1) colorCode1.textContent = color1;
                if (colorCode2) colorCode2.textContent = color2;

                // Apply the gradient to video wrapper
                if (videoWrapper) {
                    const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
                    videoWrapper.style.background = gradient;
                }
            }
        });
    });

    // Initialize animated gradient backgrounds
    const animatedGradients = document.querySelectorAll('.gradient-preset.animated-gradient');
    animatedGradients.forEach(preset => {
        const color1 = preset.getAttribute('data-color1');
        const color2 = preset.getAttribute('data-color2');
        if (color1 && color2) {
            preset.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        }
    });

    // Padding slider
    const paddingSlider = document.getElementById('paddingSlider');
    const paddingValue = document.getElementById('paddingValue');

    if (paddingSlider && paddingValue) {
        paddingSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            paddingValue.textContent = value;
            if (videoWrapper) {
                videoWrapper.style.padding = `${value}px`;
            }
        });
    }

}

function applyGradientBackground() {
    const gradientColor1 = document.getElementById('gradientColor1');
    const gradientColor2 = document.getElementById('gradientColor2');
    const videoWrapper = document.getElementById('videoWrapper');

    if (gradientColor1 && gradientColor2 && videoWrapper) {
        const gradient = `linear-gradient(135deg, ${gradientColor1.value} 0%, ${gradientColor2.value} 100%)`;
        videoWrapper.style.background = gradient;
    }
}

function applySolidBackground() {
    const bgColorInput = document.getElementById('bgColorInput');
    const videoWrapper = document.getElementById('videoWrapper');

    if (bgColorInput && videoWrapper) {
        const colorValue = bgColorInput.value.trim();
        // Apply the color directly - supports hex, rgb, rgba, named colors, etc.
        if (colorValue) {
            videoWrapper.style.background = colorValue;
        }
    }
}

function resetPadding() {
    const paddingSlider = document.getElementById('paddingSlider');
    const paddingValue = document.getElementById('paddingValue');
    const videoWrapper = document.getElementById('videoWrapper');

    if (paddingSlider && paddingValue && videoWrapper) {
        paddingSlider.value = 0;
        paddingValue.textContent = '0';
        videoWrapper.style.padding = '0px';
    }
}


async function renderVideo() {
    const renderBtn = document.getElementById('renderBtn');
    const renderProgress = document.getElementById('renderProgress');
    const renderProgressFill = document.getElementById('renderProgressFill');

    if (!currentVideo || !currentVideo.src) {
        showMessage('No video loaded. Please capture or load a video first.', 'error');
        return;
    }

    // Get current filename from video src
    const videoSrc = currentVideo.src;
    const filename = videoSrc.split('/').pop();

    // Get current background settings
    const videoWrapper = document.getElementById('videoWrapper');

    // Find the active background tab
    const activeTab = document.querySelector('.bg-tab.active');
    const activeType = activeTab ? activeTab.getAttribute('data-type') : 'color';

    let background = {
        type: 'solid',
        value: '#000000'
    };

    console.log('Active background type:', activeType);

    if (activeType === 'gradient') {
        // Get gradient colors
        const gradientColor1 = document.getElementById('gradientColor1');
        const gradientColor2 = document.getElementById('gradientColor2');

        if (gradientColor1 && gradientColor2) {
            background.type = 'gradient';
            background.value = `linear-gradient(135deg, ${gradientColor1.value}, ${gradientColor2.value})`;
            console.log('Gradient colors:', gradientColor1.value, gradientColor2.value);
        }
    } else if (activeType === 'color') {
        // Get solid color
        const bgColorInput = document.getElementById('bgColorInput');
        if (bgColorInput) {
            background.type = 'solid';
            background.value = bgColorInput.value;
            console.log('Solid color:', bgColorInput.value);
        }
    }

    // Get padding value
    const paddingSlider = document.getElementById('paddingSlider');
    const padding = paddingSlider ? parseInt(paddingSlider.value) : 0;

    // Get current mockup
    const mockup = getCurrentMockup();

    console.log('🎨 Starting render...', { background, padding, mockup });
    showMessage('Starting video export with background...', 'info');

    // Show progress with initial state
    renderBtn.disabled = true;
    renderBtn.style.opacity = '0.6';
    renderBtn.style.cursor = 'not-allowed';
    renderProgress.style.display = 'block';
    renderProgressFill.style.width = '0%';

    // Start render time tracking for realistic progress
    let renderStartTime = Date.now();
    let renderProgressInterval = setInterval(() => {
        const elapsed = Date.now() - renderStartTime;
        let progress = 0;

        // Simulate realistic rendering progress
        if (elapsed < 2000) {
            // First 2 seconds: Initial setup (0-20%)
            progress = (elapsed / 2000) * 20;
        } else if (elapsed < 8000) {
            // Next 6 seconds: Main rendering (20-80%)
            progress = 20 + ((elapsed - 2000) / 6000) * 60;
        } else {
            // After 8 seconds: Finalizing (80-95%)
            progress = 80 + ((elapsed - 8000) / 2000) * 15;
        }

        renderProgressFill.style.width = `${Math.min(progress, 95)}%`;
    }, 100);

    try {
        const response = await fetch('/api/render', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                background: background,
                padding: padding,
                mockup: mockup
            })
        });

        const data = await response.json();

        // Clear the progress interval
        if (renderProgressInterval) {
            clearInterval(renderProgressInterval);
        }

        if (response.ok) {
            renderProgressFill.style.width = '100%';

            // Download the rendered video
            const downloadLink = document.createElement('a');
            downloadLink.href = data.path;
            downloadLink.download = data.filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Trigger confetti celebration
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            // Change button to "Download Complete" with success styling
            renderBtn.style.background = '#10b981';
            renderBtn.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Download Complete!</span>
            `;

            setTimeout(() => {
                renderProgress.style.display = 'none';
                renderProgressFill.style.width = '0%';

                // Reset button to original state after 3 seconds
                renderBtn.style.background = '';
                renderBtn.style.opacity = '';
                renderBtn.style.cursor = '';
                renderBtn.innerHTML = `
                    <i class="fas fa-download"></i>
                    <span>Export with Background</span>
                `;
                renderBtn.disabled = false;
            }, 3000);

            console.log('✅ Video rendered successfully:', data.filename);
        } else {
            throw new Error(data.error || 'Render failed');
        }
    } catch (error) {
        // Clear the progress interval on error
        if (renderProgressInterval) {
            clearInterval(renderProgressInterval);
        }
        console.error('Render error:', error);
        showMessage('Failed to render video: ' + error.message, 'error');
        renderProgress.style.display = 'none';
        renderProgressFill.style.width = '0%';
        renderBtn.disabled = false;
        renderBtn.style.opacity = '';
        renderBtn.style.cursor = '';
    }
}

// Make functions globally available
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;
window.logout = logout;
window.initializeVideoEditor = initializeVideoEditor;
window.resetPadding = resetPadding;
window.renderVideo = renderVideo;

// Custom Video Controls (Timeline)
function setupCustomVideoControls() {
    const video = document.getElementById('mainVideo');
    const playPauseControl = document.getElementById('playPauseControl');
    const timelineTrack = document.getElementById('timelineTrack');
    const timelineProgress = document.getElementById('timelineProgress');
    const timelineMarker = document.getElementById('timelineMarker');
    const timeDisplay = document.getElementById('timeDisplay');
    const volumeControl = document.getElementById('volumeControl');
    const fullscreenControl = document.getElementById('fullscreenControl');

    if (!video) return;

    // Play/Pause
    if (playPauseControl) {
        playPauseControl.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playPauseControl.querySelector('i').className = 'fas fa-pause';
            } else {
                video.pause();
                playPauseControl.querySelector('i').className = 'fas fa-play';
            }
        });
    }

    // Timeline progress and marker update
    video.addEventListener('timeupdate', () => {
        const percent = (video.currentTime / video.duration) * 100;

        if (timelineProgress) {
            timelineProgress.style.width = percent + '%';
        }

        if (timelineMarker) {
            timelineMarker.style.left = percent + '%';
        }

        // Update time display
        if (timeDisplay) {
            const currentMin = Math.floor(video.currentTime / 60);
            const currentSec = Math.floor(video.currentTime % 60);
            const durationMin = Math.floor(video.duration / 60);
            const durationSec = Math.floor(video.duration % 60);
            timeDisplay.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${durationMin}:${durationSec.toString().padStart(2, '0')}`;
        }
    });

    // Click on timeline track to seek
    if (timelineTrack) {
        timelineTrack.addEventListener('click', (e) => {
            const rect = timelineTrack.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            video.currentTime = percent * video.duration;
        });
    }

    // Volume toggle
    if (volumeControl) {
        volumeControl.addEventListener('click', () => {
            if (video.muted) {
                video.muted = false;
                volumeControl.querySelector('i').className = 'fas fa-volume-up';
            } else {
                video.muted = true;
                volumeControl.querySelector('i').className = 'fas fa-volume-mute';
            }
        });
    }

    // Fullscreen toggle
    if (fullscreenControl) {
        fullscreenControl.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                video.requestFullscreen();
                fullscreenControl.querySelector('i').className = 'fas fa-compress';
            } else {
                document.exitFullscreen();
                fullscreenControl.querySelector('i').className = 'fas fa-expand';
            }
        });
    }

    // Video ended
    video.addEventListener('ended', () => {
        if (playPauseControl) {
            playPauseControl.querySelector('i').className = 'fas fa-play';
        }
    });
}

// Mockup Handler Functions
function initializeMockupHandlers() {
    const mockupButtons = document.querySelectorAll('.mockup-btn');
    const videoWrapper = document.getElementById('videoWrapper');

    mockupButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const mockupType = this.getAttribute('data-mockup');

            // Remove active class from all buttons
            mockupButtons.forEach(b => b.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Apply mockup
            applyMockup(mockupType);

            // Store current mockup selection
            currentMockup = mockupType;
        });
    });

    // Set default to "none" active
    const noneBtn = document.querySelector('.mockup-btn[data-mockup="none"]');
    if (noneBtn) {
        noneBtn.classList.add('active');
    }
}

function applyMockup(mockupType) {
    const videoWrapper = document.getElementById('videoWrapper');
    const mainVideo = document.getElementById('mainVideo');

    // Remove existing mockup container
    const existingContainer = videoWrapper.querySelector('.video-mockup-container');
    if (existingContainer) {
        // Move video back to wrapper before removing container
        const videoElement = existingContainer.querySelector('#mainVideo');
        if (videoElement) {
            videoWrapper.insertBefore(videoElement, videoWrapper.firstChild);
        }
        existingContainer.remove();
    }

    if (mockupType === 'none') {
        // Reset video styles when no mockup
        mainVideo.style.borderRadius = '0';
        mainVideo.style.paddingTop = '0';
        return;
    }

    // Create mockup container (this will hold the video with black background)
    const mockupContainer = document.createElement('div');
    mockupContainer.className = 'video-mockup-container';
    mockupContainer.style.background = '#000000'; // Black background inside mockup

    // Add browser-specific class
    if (mockupType === 'chrome') {
        mockupContainer.classList.add('chrome');
    } else if (mockupType === 'safari') {
        mockupContainer.classList.add('safari');
    }

    // Create mockup element (the browser frame overlay)
    const mockupDiv = document.createElement('div');
    mockupDiv.className = 'browser-mockup';

    if (mockupType === 'chrome') {
        mockupDiv.classList.add('chrome-mockup');
    } else if (mockupType === 'safari') {
        mockupDiv.classList.add('safari-mockup');
    }

    // Move video into mockup container
    mockupContainer.appendChild(mainVideo);
    mockupContainer.appendChild(mockupDiv);

    // Add mockup container to wrapper at the beginning
    videoWrapper.insertBefore(mockupContainer, videoWrapper.firstChild);
}

function getCurrentMockup() {
    return currentMockup;
}

// Export function
window.getCurrentMockup = getCurrentMockup;

// Quick Settings Functions (in Capture Modal)
function loadQuickSettings() {
    const settings = JSON.parse(localStorage.getItem('videoSettings') || '{}');

    // Load resolution
    const resolution = settings.resolution || '1280x720';
    const resolutionSelect = document.getElementById('quickResolution');
    if (resolutionSelect) {
        resolutionSelect.value = resolution;
    }

    // Load FPS
    const fps = settings.fps || '30';
    const fpsSelect = document.getElementById('quickFps');
    if (fpsSelect) {
        fpsSelect.value = fps;
    }

    // Load scroll duration
    const scrollDuration = settings.scrollDuration || 0;
    const scrollDurationSelect = document.getElementById('quickScrollDuration');
    if (scrollDurationSelect) {
        scrollDurationSelect.value = scrollDuration.toString();
    }
}

function updateQuickSettings() {
    // Get current settings from localStorage
    const settings = JSON.parse(localStorage.getItem('videoSettings') || '{}');

    // Update with values from quick settings dropdowns
    const resolutionSelect = document.getElementById('quickResolution');
    const fpsSelect = document.getElementById('quickFps');
    const scrollDurationSelect = document.getElementById('quickScrollDuration');

    if (resolutionSelect) {
        settings.resolution = resolutionSelect.value;
    }
    if (fpsSelect) {
        settings.fps = fpsSelect.value;
    }
    if (scrollDurationSelect) {
        settings.scrollDuration = parseInt(scrollDurationSelect.value);
    }

    // Save back to localStorage
    localStorage.setItem('videoSettings', JSON.stringify(settings));

    console.log('Quick settings updated:', settings);
}

function openCaptureSettings() {
    // Save current quick settings before closing
    updateQuickSettings();

    // Close the capture modal
    closeCaptureModal();

    // Wait for modal to close, then open settings sidebar
    setTimeout(() => {
        showSettings();
    }, 300);
}

// Export new functions
window.loadQuickSettings = loadQuickSettings;
window.updateQuickSettings = updateQuickSettings;
window.openCaptureSettings = openCaptureSettings;
