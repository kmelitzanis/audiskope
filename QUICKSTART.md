# Quick Start Guide

## Getting Started with Audiskope

### Installation

1. **Clone or Download** the repository
   ```bash
   git clone https://github.com/kmelitzanis/audiskope.git
   cd audiskope
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   npm start
   ```

### First Use

1. **Launch Audiskope** - The application will open with a dark interface
2. **Load an Audio File** - Either:
   - Click the green "Open Audio File" button
   - Drag and drop an audio file onto the window
3. **View Analysis** - The spectrogram and waveform will be automatically generated
4. **Play Audio** - Click the play button to hear the audio and see the playback position

### Supported Formats

- **MP3** - MPEG Audio Layer 3
- **WAV** - Waveform Audio File Format
- **FLAC** - Free Lossless Audio Codec
- **M4A** - MPEG-4 Audio
- **OGG** - Ogg Vorbis
- **AAC** - Advanced Audio Coding

### Controls Explained

#### FFT Size
- Controls the frequency resolution
- **Higher values** (4096, 8192): Better frequency detail, slower processing
- **Lower values** (512, 1024): Faster processing, less frequency detail
- **Recommended**: 2048 (default)

#### Window Size
- Controls the time resolution
- **Higher values**: Better frequency resolution, less time detail
- **Lower values**: Better time resolution, less frequency detail
- **Recommended**: 512 (default)

#### Color Scheme
- **Serato** (Default): Green-yellow gradient, DJ software inspired
- **Fire**: Black → Red → Orange → Yellow → White
- **Ice**: Black → Blue → Cyan → White
- **Mono**: Grayscale intensity

#### Intensity
- Controls the brightness/contrast of the spectrogram
- Range: 0-100
- **Default**: 70

### Tips

- **For detailed frequency analysis**: Use larger FFT size (4096 or 8192)
- **For beat/rhythm analysis**: Use smaller window size (256 or 128)
- **For classical music**: Try the "Ice" or "Mono" color scheme
- **For electronic music**: Try the "Serato" or "Fire" color scheme
- **Drag the timeline** to seek to any position in the audio

### Keyboard Shortcuts

Currently, the application is mouse-driven. Future versions may include keyboard shortcuts.

### Building Distributions

To create a standalone executable:

```bash
# For your current platform
npm run build

# For specific platforms
npm run build:mac    # Creates .dmg for macOS
npm run build:win    # Creates installer for Windows
npm run build:linux  # Creates AppImage for Linux
```

The built applications will be in the `dist/` folder.

### Troubleshooting

**Problem**: Audio file won't load
- **Solution**: Make sure the file is a supported format and not corrupted

**Problem**: Spectrogram is too dark/bright
- **Solution**: Adjust the Intensity slider

**Problem**: Can't see frequency details
- **Solution**: Increase the FFT size to 4096 or 8192

**Problem**: Application won't start
- **Solution**: Make sure you've run `npm install` first

### System Requirements

- **Operating System**: Windows 10+, macOS 10.13+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 200MB for application + space for audio files

### Performance Notes

- Large audio files (>10 minutes) may take a few seconds to analyze
- Higher FFT sizes require more processing power
- The application uses hardware acceleration when available
