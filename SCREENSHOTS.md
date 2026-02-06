# Audiskope - Screenshots

## Main Interface

The main interface features:
- **Dark Theme**: Minimal black background with green accents (Serato-inspired)
- **Custom Title Bar**: Frameless window with minimize, maximize, and close buttons
- **Left Sidebar**: Control panel with file loading and visualization settings
- **Main Area**: Dual visualization with waveform on top and spectrogram below
- **Bottom Playback Controls**: Play/pause button with timeline scrubbing

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  AUDISKOPE                                    ─  □  ✕   │ Title Bar
├─────────────┬───────────────────────────────────────────┤
│             │                                           │
│  Controls   │           Drop Zone / Waveform            │
│   Panel     │                                           │
│             ├───────────────────────────────────────────┤
│  • Open     │                                           │
│  • FFT Size │                                           │
│  • Window   │          Spectrogram Display              │
│  • Colors   │                                           │
│  • Intensity│                                           │
│             │                                           │
│             │                                           │
├─────────────┴───────────────────────────────────────────┤
│  ▶  [═══════════════════════════════] 0:00 / 3:45      │ Playback
└─────────────────────────────────────────────────────────┘
```

## Features Highlighted

1. **File Loading**
   - Green "Open Audio File" button with folder icon
   - Drag and drop zone with dashed border
   - File info display showing filename and duration

2. **Spectrogram**
   - Frequency range: 20 Hz to 20 kHz
   - Time-based horizontal axis
   - Color-coded intensity based on selected scheme
   - Frequency labels on the left side

3. **Waveform**
   - Amplitude visualization
   - Green waveform on dark background
   - Full audio duration displayed

4. **Color Schemes**
   - **Serato** (default): Green-yellow gradient
   - **Fire**: Red-orange-yellow
   - **Ice**: Blue-cyan-white
   - **Mono**: Grayscale

## To capture actual screenshots:

Run the application with:
```bash
npm start
```

Then load an audio file to see the visualizations in action.
