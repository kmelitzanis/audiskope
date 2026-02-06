# Audiskope Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│                        (index.html)                          │
│  ┌─────────────┐  ┌────────────────────────────────────┐   │
│  │  Controls   │  │     Visualization Canvas           │   │
│  │   Panel     │  │  ┌──────────────────────────────┐  │   │
│  │             │  │  │   Waveform Display           │  │   │
│  │  • Open     │  │  └──────────────────────────────┘  │   │
│  │  • Settings │  │  ┌──────────────────────────────┐  │   │
│  │  • Colors   │  │  │   Spectrogram Display        │  │   │
│  │             │  │  │   (FFT Visualization)        │  │   │
│  └─────────────┘  │  └──────────────────────────────┘  │   │
│                   └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ DOM Events
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Renderer Process Layer                      │
│                     (renderer.js)                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   UI Event   │  │    Audio     │  │ Visualization│     │
│  │   Handlers   │  │  Processing  │  │   Rendering  │     │
│  │              │  │              │  │              │     │
│  │ • File Open  │  │ • Decode     │  │ • FFT        │     │
│  │ • Play/Pause │  │ • Buffer     │  │ • Waveform   │     │
│  │ • Settings   │  │ • Playback   │  │ • Canvas     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  Web Audio API          Canvas API                          │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ AudioContext │      │ 2D Context   │                    │
│  │ AudioBuffer  │      │ Drawing Ops  │                    │
│  └──────────────┘      └──────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ window.electronAPI
                           │ (Context Bridge)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Preload Script Layer                      │
│                      (preload.js)                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Context Bridge (Security Layer)          │    │
│  │                                                     │    │
│  │  • openFileDialog()                                │    │
│  │  • readFile(path)                                  │    │
│  │  • minimizeWindow() / maximizeWindow()            │    │
│  │  • closeWindow()                                   │    │
│  │  • getFilePath(file)                               │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ IPC (Inter-Process Communication)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Process Layer                        │
│                        (main.js)                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Window     │  │     IPC      │  │     File     │     │
│  │  Management  │  │   Handlers   │  │   System     │     │
│  │              │  │              │  │              │     │
│  │ • Create     │  │ • open-file  │  │ • Read File  │     │
│  │ • Minimize   │  │ • read-file  │  │ • Dialog     │     │
│  │ • Maximize   │  │ • window-*   │  │              │     │
│  │ • Close      │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  Electron APIs                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  BrowserWindow, dialog, ipcMain, fs, path          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Operating System                         │
│            (Windows / macOS / Linux)                         │
│                                                              │
│  • File System Access                                        │
│  • Audio Hardware                                            │
│  • Window Management                                         │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### File Loading Flow
```
User Action (Click/Drag) 
  → UI Event Handler (renderer.js)
  → window.electronAPI.openFileDialog() (preload.js)
  → IPC to Main Process
  → File Dialog (main.js)
  → File Path Selection
  → window.electronAPI.readFile(path)
  → IPC to Main Process
  → fs.readFileSync (main.js)
  → ArrayBuffer returned
  → AudioContext.decodeAudioData (renderer.js)
  → AudioBuffer created
  → Visualization Generated
```

### Audio Processing Flow
```
AudioBuffer
  ↓
Extract Channel Data
  ↓
Perform FFT (sliding window)
  ↓
Calculate Magnitude Spectrum
  ↓
Map to Color (based on scheme)
  ↓
Render to Canvas
  ↓
Display to User
```

### Playback Flow
```
Play Button Click
  ↓
Create AudioBufferSource
  ↓
Connect to AudioContext.destination
  ↓
Start playback
  ↓
requestAnimationFrame loop
  ↓
Update timeline position
  ↓
Display current time
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│                   (Sandboxed)                                │
│                                                              │
│  • No Node.js APIs                                           │
│  • No File System Access                                     │
│  • Context Isolation: ON                                     │
│  • Can only use window.electronAPI                           │
└─────────────────────────────────────────────────────────────┘
                           │
                    Controlled Bridge
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Preload Script                            │
│              (Limited API Exposure)                          │
│                                                              │
│  • contextBridge.exposeInMainWorld()                         │
│  • Only specific functions exposed                           │
│  • No direct Node.js access for renderer                     │
└─────────────────────────────────────────────────────────────┘
                           │
                      Secure IPC
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Main Process                              │
│               (Full Privileges)                              │
│                                                              │
│  • Full Node.js APIs                                         │
│  • File System Access                                        │
│  • System Integration                                        │
│  • Validates all requests from renderer                      │
└─────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
main.js
├── electron (app, BrowserWindow, dialog, ipcMain)
├── path
└── fs

preload.js
└── electron (contextBridge, ipcRenderer)

renderer.js
├── Web Audio API (AudioContext, AnalyserNode)
├── Canvas API (2D Context)
└── window.electronAPI (via contextBridge)

index.html
├── styles.css
└── renderer.js
```

## Build Process

```
Source Code
  ↓
npm run build
  ↓
Electron Builder
  ├── macOS    → .dmg installer
  ├── Windows  → .exe installer (NSIS)
  └── Linux    → .AppImage
```

## Color Scheme System

```
Audio Magnitude (0-255)
  ↓
Apply Intensity Multiplier
  ↓
┌─────────────────────────────────┐
│     Color Scheme Mapping        │
├─────────────────────────────────┤
│ Serato: Green → Yellow → Orange│
│ Fire:   Black → Red → Yellow   │
│ Ice:    Black → Blue → White   │
│ Mono:   Black → White          │
└─────────────────────────────────┘
  ↓
RGB Color Value
  ↓
Canvas fillStyle
  ↓
Rendered Pixel
```

## Performance Considerations

1. **FFT Computation**: O(n log n) - performed once on load
2. **Canvas Rendering**: Batch operations for efficiency
3. **Audio Playback**: Hardware-accelerated via Web Audio API
4. **UI Updates**: requestAnimationFrame for smooth 60fps
5. **Memory**: AudioBuffer kept in RAM for instant playback

## Future Architecture Enhancements

- Worker threads for FFT computation
- WebGL for faster rendering
- Streaming analysis for large files
- Cache layer for repeated operations
