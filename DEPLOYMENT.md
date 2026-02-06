# Deployment Guide

This guide explains how to build and distribute Audiskope for different platforms.

## Prerequisites

Before building, ensure you have:
- Node.js 14 or higher
- npm or yarn
- Git

## Installation

```bash
git clone https://github.com/kmelitzanis/audiskope.git
cd audiskope
npm install
```

## Development

Run the application in development mode:

```bash
npm start
```

This launches the Electron application without creating a distributable package.

## Building for Distribution

### Build for Current Platform

```bash
npm run build
```

This creates a distributable package for your current operating system in the `dist/` folder.

### Build for Specific Platforms

#### macOS
```bash
npm run build:mac
```

Output: `dist/Audiskope-1.0.0.dmg`

**Requirements:**
- Must be run on macOS
- Xcode Command Line Tools installed

#### Windows
```bash
npm run build:win
```

Output: `dist/Audiskope Setup 1.0.0.exe`

**Requirements:**
- Can be built on any platform
- Wine recommended for Linux/macOS

#### Linux
```bash
npm run build:linux
```

Output: `dist/Audiskope-1.0.0.AppImage`

**Requirements:**
- Can be built on any platform
- fuse recommended for testing on Linux

## Build Configuration

The build configuration is in `package.json` under the `build` key:

```json
{
  "build": {
    "appId": "com.audiskope.app",
    "productName": "Audiskope",
    "mac": {
      "category": "public.app-category.music",
      "target": ["dmg"]
    },
    "win": {
      "target": ["nsis"]
    },
    "linux": {
      "target": ["AppImage"],
      "category": "Audio"
    }
  }
}
```

## Distribution Files

After building, you'll find:

### macOS
- **File**: `Audiskope-1.0.0.dmg`
- **Size**: ~100-150 MB
- **Installation**: Drag to Applications folder
- **Minimum OS**: macOS 10.13+

### Windows
- **File**: `Audiskope Setup 1.0.0.exe`
- **Size**: ~80-120 MB
- **Installation**: Run installer
- **Minimum OS**: Windows 10+

### Linux
- **File**: `Audiskope-1.0.0.AppImage`
- **Size**: ~100-140 MB
- **Installation**: Make executable and run
- **Minimum OS**: Most modern distributions

## Code Signing (Optional)

### macOS Code Signing

1. Get an Apple Developer certificate
2. Add to `package.json`:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (XXXXXXXXXX)"
    }
  }
}
```

3. Build with:
```bash
npm run build:mac
```

### Windows Code Signing

1. Get a code signing certificate
2. Add to `package.json`:

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

## Auto-Update Configuration (Optional)

To enable auto-updates, you can configure electron-updater:

1. Install:
```bash
npm install electron-updater
```

2. Add to `main.js`:
```javascript
const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

3. Configure in `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "kmelitzanis",
      "repo": "audiskope"
    }
  }
}
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/*
```

## Publishing

### GitHub Releases

1. Create a git tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. Create a GitHub Release
3. Upload the built files from `dist/`

### npm (if publishing as module)

```bash
npm publish
```

## Troubleshooting

### Build Errors

**Problem**: "Cannot find module 'electron'"
```bash
npm install
```

**Problem**: "EACCES: permission denied"
```bash
sudo chown -R $(whoami) ~/.npm
```

**Problem**: macOS build fails
```bash
xcode-select --install
```

### Size Optimization

To reduce bundle size:

1. Remove unused dependencies
2. Enable compression in electron-builder:

```json
{
  "build": {
    "compression": "maximum",
    "asar": true
  }
}
```

## Testing Builds

Before distributing:

1. **Functionality Test**: All features work
2. **Installation Test**: Clean install on target OS
3. **Uninstallation Test**: Removes cleanly
4. **Performance Test**: Loads files quickly
5. **Security Test**: CodeQL scan passed

## Distribution Checklist

- [ ] Version number updated in `package.json`
- [ ] CHANGELOG updated
- [ ] All features tested
- [ ] Build created for target platforms
- [ ] Installers tested on clean systems
- [ ] Code signed (if applicable)
- [ ] Release notes prepared
- [ ] GitHub release created
- [ ] Files uploaded

## Support

For build issues, check:
- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Documentation](https://www.electronjs.org/)
- Project Issues page

## License

Audiskope is released under the MIT License. See LICENSE file for details.
