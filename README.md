# Audiskope

Cross-platform Audio Visualizer with Spectrogram Analysis

![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/electron-28.0.0-blue)

## Overview

Audiskope is a modern, minimal audio visualizer built with Electron. Inspired by tools like [Spek](https://www.spek.cc/) and featuring a Serato DJ-inspired design, it provides powerful audio analysis capabilities in a clean, intuitive interface.

## Features

- **Multi-format Support**: Analyze MP3, WAV, FLAC, M4A, OGG, and AAC audio files
- **Real-time Spectrogram**: FFT-based frequency analysis with customizable parameters
- **Waveform Display**: Visual representation of audio amplitude over time
- **Audio Playback**: Built-in player with timeline scrubbing
- **Customizable Visualization**: 
  - Adjustable FFT size (512 - 8192)
  - Variable window size
  - Multiple color schemes (Fire, Ice, Mono, Serato)
  - Intensity control
- **Drag & Drop**: Easy file loading
- **Cross-platform**: Works on Windows, macOS, and Linux

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/kmelitzanis/audiskope.git
cd audiskope

# Install dependencies
npm install

# Run the application
npm start
```

## Building

Build standalone executables for your platform:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

## Usage

1. **Open an audio file**: Click "Open Audio File" or drag and drop a file into the window
2. **Analyze**: The spectrogram and waveform will be automatically generated
3. **Customize**: Adjust FFT size, window size, color scheme, and intensity to your preference
4. **Playback**: Use the play button and timeline to navigate through your audio

## Color Schemes

- **Serato**: Green-to-yellow gradient (default)
- **Fire**: Black-to-red-to-yellow-to-white
- **Ice**: Blue-to-cyan-to-white
- **Mono**: Grayscale

## Technology Stack

- **Electron**: Cross-platform desktop application framework
- **Web Audio API**: Audio processing and analysis
- **Canvas API**: Real-time visualization rendering
- **Node.js**: File system operations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [Spek](https://www.spek.cc/)
- UI design influenced by Serato DJ
- Built with Electron and Web Audio API 
