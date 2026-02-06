# Changelog

All notable changes to the Audiskope project will be documented in this file.

## [1.0.0] - 2024

### Added - Initial Release

#### Core Application
- **Electron Framework**: Cross-platform desktop application built with Electron 28.0.0
- **Frameless Window**: Custom title bar with minimize, maximize, and close buttons
- **Dark Theme**: Minimal Serato DJ-inspired interface with green accent colors

#### Audio Processing
- **Multi-Format Support**: Load and analyze MP3, WAV, FLAC, M4A, OGG, and AAC files
- **Web Audio API Integration**: Native browser-based audio decoding and processing
- **FFT Analysis**: Fast Fourier Transform for frequency analysis
- **Configurable FFT Size**: Choose from 512, 1024, 2048, 4096, or 8192 bins
- **Adjustable Window Size**: Select 128, 256, 512, or 1024 sample windows

#### Visualization
- **Spectrogram Display**: Time-frequency representation of audio content
  - Frequency range: 20 Hz to 20 kHz
  - Logarithmic frequency scale
  - Real-time color mapping based on magnitude
- **Waveform Display**: Amplitude visualization across full audio duration
- **Color Schemes**: Four built-in color palettes
  - Serato (default): Green-yellow gradient
  - Fire: Warm red-orange-yellow spectrum
  - Ice: Cool blue-cyan-white spectrum
  - Mono: Grayscale intensity
- **Intensity Control**: Adjustable brightness/contrast slider (0-100)
- **Frequency Labels**: Clear frequency markers on spectrogram

#### Playback
- **Built-in Audio Player**: Play audio files directly in the application
- **Timeline Scrubbing**: Seek to any position by dragging the timeline
- **Time Display**: Current and total duration shown
- **Play/Pause Control**: Large, accessible play button

#### User Interface
- **Drag and Drop**: Drop audio files directly onto the window
- **File Dialog**: Standard file picker with format filtering
- **Responsive Layout**: Adapts to window resizing
- **File Information Display**: Shows filename and duration

#### Build System
- **Electron Builder**: Configured for cross-platform builds
- **macOS Support**: DMG installer generation
- **Windows Support**: NSIS installer generation
- **Linux Support**: AppImage format

#### Documentation
- **README**: Comprehensive project overview and feature list
- **Quick Start Guide**: Step-by-step usage instructions
- **Screenshots Guide**: Layout and feature descriptions
- **License**: MIT License

### Technical Details

#### Architecture
- **Main Process** (main.js): Electron window management and IPC handlers
- **Renderer Process** (renderer.js): Audio processing and visualization logic
- **Isolated Audio Processing**: FFT computed separately from UI thread
- **Canvas-based Rendering**: High-performance 2D graphics

#### Dependencies
- electron: ^28.0.0
- electron-builder: ^24.9.0

#### File Structure
```
audiskope/
├── main.js              # Electron main process
├── renderer.js          # Audio analysis and visualization
├── index.html           # Application UI structure
├── styles.css           # Serato-inspired styling
├── package.json         # Project configuration
├── README.md            # Project documentation
├── QUICKSTART.md        # Usage guide
├── SCREENSHOTS.md       # Visual reference
└── .gitignore           # Git ignore rules
```

### Features in Detail

#### Spectrogram Generation
- Uses FFT to decompose audio into frequency components
- Processes audio in overlapping windows (hop size = FFT size / 4)
- Computes magnitude spectrum for each time window
- Maps magnitude values to colors based on selected scheme
- Renders on HTML5 canvas for smooth visualization

#### Color Mapping
- **Serato Scheme**: 
  - Low intensity: Dark/black
  - Mid intensity: Green gradient
  - High intensity: Yellow-orange highlights
- Dynamic intensity scaling via user control
- Smooth color transitions for professional appearance

#### Performance Optimizations
- Efficient FFT implementation
- Canvas batch rendering
- Responsive UI during processing
- Automatic canvas resizing

### Known Limitations

- FFT computation is performed in JavaScript (may be slow for very large files)
- Real-time analysis during playback not implemented (static analysis only)
- Limited to files that can fit in browser memory
- No export functionality for spectrogram images

### Future Enhancements (Potential)

- Real-time frequency analysis during playback
- Zoom and pan controls for detailed inspection
- Export spectrogram as image (PNG/JPEG)
- Batch processing multiple files
- Additional color schemes
- Frequency range selection
- Peak frequency detection and labeling
- Audio file metadata display
- Keyboard shortcuts
- Playlist support
- Compare two audio files side-by-side

---

## Version History

- **v1.0.0** (Initial Release) - Full-featured audio visualizer with spectrogram and waveform display
