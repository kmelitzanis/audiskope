# Contributing to Audiskope

Thank you for your interest in contributing to Audiskope! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites
- Node.js 14 or higher
- npm or yarn
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/audiskope.git
   cd audiskope
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the application:
   ```bash
   npm start
   ```

## Project Structure

```
audiskope/
├── main.js              # Electron main process
├── renderer.js          # Audio processing and visualization
├── preload.js           # Secure IPC bridge
├── index.html           # UI structure
├── styles.css           # Styling
├── package.json         # Project configuration
└── docs/
    ├── README.md
    ├── QUICKSTART.md
    ├── SCREENSHOTS.md
    ├── CHANGELOG.md
    └── PROJECT_SUMMARY.md
```

## Code Style

### JavaScript
- Use ES6+ features
- Use const/let instead of var
- Prefer async/await over callbacks
- Use meaningful variable names
- Add comments for complex logic

### CSS
- Use consistent indentation (2 spaces)
- Group related properties
- Use hex colors (e.g., #00ff88)
- Follow BEM naming for complex components

## Making Changes

### Feature Development

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Test thoroughly
4. Commit with descriptive messages:
   ```bash
   git commit -m "Add feature: description"
   ```

### Bug Fixes

1. Create a bugfix branch:
   ```bash
   git checkout -b fix/bug-description
   ```

2. Fix the issue
3. Add tests if applicable
4. Commit with reference to issue:
   ```bash
   git commit -m "Fix: issue description (closes #123)"
   ```

## Testing

Currently, the project uses manual testing. When adding new features:

1. Test all supported audio formats (MP3, WAV, FLAC, M4A, OGG, AAC)
2. Test on multiple platforms if possible
3. Verify UI responsiveness
4. Check console for errors

## Security

- Never disable context isolation
- Always use the preload script for IPC
- Don't expose Node.js APIs to renderer
- Validate all user inputs
- Keep dependencies updated

## Submitting Changes

1. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request with:
   - Clear description of changes
   - Screenshots for UI changes
   - Reference to related issues
   - Test results

## Areas for Contribution

### High Priority
- Real-time spectrogram during playback
- Export functionality (PNG/JPEG)
- Zoom and pan controls
- Performance optimizations

### Medium Priority
- Additional color schemes
- Keyboard shortcuts
- More FFT window functions
- Audio file metadata display

### Low Priority
- Playlist support
- Batch processing
- Compare mode (two files)
- Custom themes

## Pull Request Guidelines

- Keep changes focused and atomic
- Update documentation if needed
- Maintain backward compatibility
- Follow existing code style
- Test on your platform

## Reporting Issues

When reporting bugs, include:
- Operating system and version
- Node.js and Electron versions
- Steps to reproduce
- Expected vs actual behavior
- Audio file format (if applicable)
- Console errors/logs

## Getting Help

- Check existing documentation
- Search closed issues
- Open a new issue with "Question" label
- Be specific and provide context

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be acknowledged in:
- CHANGELOG.md
- Project README
- Release notes

Thank you for contributing to Audiskope!
