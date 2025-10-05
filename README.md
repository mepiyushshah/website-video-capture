# Website Video Capture Tool

A modern web application that captures smooth-scrolling videos of websites using Playwright, with a beautiful IDE-inspired interface.

## Features

- 🎬 **Smooth Video Capture**: Records websites with smooth scrolling at 30 FPS
- 🎨 **Modern Interface**: IDE-inspired design with dark theme and yellow frame
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎥 **Video Player**: Built-in video player with controls
- 📁 **File Management**: Organize and manage captured videos
- 🤖 **AI Assistant**: Interactive AI suggestions and help
- ⚡ **Real-time Status**: Live capture progress and status updates

## Technical Specifications

- **Resolution**: 1280x720 pixels
- **Frame Rate**: 30 FPS
- **Scroll Duration**: 10 seconds (smooth scrolling)
- **Browser**: Chromium (headless)
- **Format**: MP4 video output

## Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright Browsers**:
   ```bash
   npx playwright install chromium
   ```

3. **Start the Server**:
   ```bash
   node server.js
   ```

4. **Open in Browser**:
   Navigate to `http://localhost:3000`

## Usage

### Capturing a Website Video

1. Click the **"Start Capture"** button in the main interface
2. Enter the website URL you want to capture
3. Specify the output filename (optional)
4. Click **"Start Capture"** to begin the process
5. The system will:
   - Navigate to the website
   - Smoothly scroll from top to bottom
   - Record the entire process at 30 FPS
   - Save the video to the `captures/` directory

### Video Player Controls

- **Play/Pause**: Click the play button or use spacebar
- **Volume**: Adjust volume with the volume control
- **Fullscreen**: Click the expand button for fullscreen viewing
- **File Explorer**: Click on video files in the left sidebar to load them

### AI Assistant

The AI Assistant panel provides helpful suggestions:
- **Capture a new website**: Start a new video capture
- **Edit video settings**: Modify capture parameters
- **Add smooth transitions**: Enhance video quality

## API Endpoints

- `POST /api/capture` - Start a new video capture
- `GET /api/videos` - List all captured videos
- `DELETE /api/videos/:filename` - Delete a specific video

## File Structure

```
├── capture.js          # Main capture script using Playwright
├── server.js           # Express server with API endpoints
├── index.html          # Main web interface
├── styles.css          # Modern CSS styling
├── script.js           # Frontend JavaScript
├── package.json        # Dependencies and scripts
├── captures/           # Directory for captured videos
└── README.md          # This file
```

## Customization

### Changing Capture Settings

Edit `capture.js` to modify:
- **Resolution**: Change `viewport: { width: 1280, height: 720 }`
- **Frame Rate**: Adjust scroll timing and steps
- **Scroll Duration**: Modify `scrollDuration` variable
- **Output Format**: Change video encoding settings

### UI Customization

Edit `styles.css` to customize:
- **Colors**: Modify the color scheme
- **Layout**: Adjust spacing and sizing
- **Animations**: Add custom transitions
- **Typography**: Change fonts and text styling

## Troubleshooting

### Common Issues

1. **Playwright Installation**:
   ```bash
   npx playwright install --force
   ```

2. **Permission Errors**:
   ```bash
   chmod +x capture.js
   ```

3. **Port Already in Use**:
   Change the port in `server.js` (line 3)

4. **Video Not Playing**:
   Check browser console for errors
   Ensure video files are in the `captures/` directory

### Performance Tips

- **Large Websites**: Increase scroll duration for very long pages
- **Memory Usage**: Close other applications during capture
- **Network**: Ensure stable internet connection for target websites

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

## License

MIT License - feel free to use and modify as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review browser console for errors
- Ensure all dependencies are installed
- Verify Playwright is properly configured
