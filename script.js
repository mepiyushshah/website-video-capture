// Video Player Controls
let isPlaying = false;
let currentVideo = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing application...');
    
    // Check if user is logged in
    if (!isLoggedIn()) {
        showLoginModal();
    }
    
    initializeVideoPlayer();
    setupEventListeners();
    loadVideoList();
    ensureSidebarVisible();
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
        
        // Update file selection in explorer
        updateFileSelection(fileName);
        
        // Reset play state
        isPlaying = false;
        updatePlayPauseButton();
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
    const filename = document.getElementById('outputName').value;

    if (!url) {
        alert('Please enter a valid URL');
        return;
    }

    // Close modal
    closeCaptureModal();

    // Show loading state with website URL
    showLoadingState(url);

    // Start realistic progress tracking
    let progressInterval;
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
        progressInterval = setInterval(() => {
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
        const result = await response.json();

        // Clear progress interval
        if (progressInterval) {
            clearInterval(progressInterval);
        }

        if (result.success) {
            // Show completion
            updateProgress(100, 'Processing Video', 'Video saved successfully!', 4);
            markStepComplete(4);

            setTimeout(() => {
                hideLoadingState();
                showSuccessMessage(`Video captured successfully: ${filename}`);

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
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        hideLoadingState();
        showErrorMessage(`Network error: ${error.message}`);
    }
}

function showLoadingState(websiteUrl) {
    // Show recording indicator with enhanced details
    const recordingIndicator = document.getElementById('recordingIndicator');
    if (recordingIndicator) {
        recordingIndicator.style.display = 'flex';
        recordingIndicator.innerHTML = `
            <div class="recording-pulse"></div>
            <i class="fas fa-record-vinyl"></i>
            <div class="recording-details">
                <span class="recording-title">RECORDING IN PROGRESS</span>
                <span class="recording-url">${websiteUrl || 'Preparing...'}</span>
            </div>
        `;
    }

    // Update status panel with detailed progress tracking
    const statusPanel = document.getElementById('statusPanel');
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
    // Hide recording indicator
    const recordingIndicator = document.getElementById('recordingIndicator');
    if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
    }

    const statusPanel = document.getElementById('statusPanel');
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

// Real progress tracking functions
function updateProgress(percentage, stepTitle, stepDetail, stepNumber = 1) {
    // Update overall progress bar
    const progressFill = document.getElementById('overallProgress');
    const progressText = document.getElementById('progressText');
    if (progressFill && progressText) {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${Math.round(percentage)}%`;
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

async function loadVideoList() {
    try {
        const response = await fetch('/api/videos');
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
        console.error('Failed to load video list:', error);
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
    document.getElementById('scrollDuration').value = settings.scrollDuration || 10;
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
    document.getElementById('scrollDurationValue').textContent = value + 's';
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
window.startCapture = startCapture;
window.closeCaptureModal = closeCaptureModal;
window.startCaptureProcess = startCaptureProcess;
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
function isLoggedIn() {
    return localStorage.getItem('userLoggedIn') === 'true';
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
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

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    // Simple authentication (in real app, this would be server-side)
    if (email === 'your@your.com' && password === 'password') {
        // Set login status
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        
        if (rememberMe) {
            localStorage.setItem('rememberUser', 'true');
        }
        
        showMessage('Login successful! Welcome to CaptureStudio', 'success');
        closeLoginModal();
        
        // Update user info in header
        updateUserInfo(email);
    } else {
        showMessage('Invalid email or password', 'error');
    }
}

function updateUserInfo(email) {
    const userEmailElement = document.querySelector('.user-email');
    if (userEmailElement) {
        userEmailElement.textContent = email;
    }
}

function logout() {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('rememberUser');
    
    showMessage('Logged out successfully', 'info');
    showLoginModal();
}

// Add logout functionality to logout button
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// Make functions globally available
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;
window.logout = logout;
