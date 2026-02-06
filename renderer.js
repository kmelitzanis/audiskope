// Audio context and elements
let audioContext;
let audioBuffer;
let audioSource;
let currentFilePath = null;
let isPlaying = false;
let startTime = 0;
let pauseTime = 0;
let animationId = null;

// Canvas elements
const waveformCanvas = document.getElementById('waveform-canvas');
const spectrogramCanvas = document.getElementById('spectrogram-canvas');
const waveformCtx = waveformCanvas.getContext('2d');
const spectrogramCtx = spectrogramCanvas.getContext('2d');

// UI elements
const dropZone = document.getElementById('drop-zone');
const waveformContainer = document.getElementById('waveform-container');
const spectrogramContainer = document.getElementById('spectrogram-container');
const playbackControls = document.getElementById('playback-controls');
const fileInfo = document.getElementById('file-info');
const fileDuration = document.getElementById('file-duration');
const playBtn = document.getElementById('play-btn');
const timelineSlider = document.getElementById('timeline-slider');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');

// Settings
let settings = {
  fftSize: 2048,
  windowSize: 512,
  colorScheme: 'serato',
  intensity: 70
};

// Initialize
init();

function init() {
  setupEventListeners();
  setupTitleBarButtons();
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
}

function setupEventListeners() {
  // File open button
  document.getElementById('open-file-btn').addEventListener('click', openFileDialog);

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const filePath = window.electronAPI.getFilePath(files[0]);
      loadAudioFile(filePath);
    }
  });

  // Playback controls
  playBtn.addEventListener('click', togglePlayback);
  
  timelineSlider.addEventListener('input', (e) => {
    if (audioBuffer) {
      const seekTime = (e.target.value / 100) * audioBuffer.duration;
      seekTo(seekTime);
    }
  });

  // Settings
  document.getElementById('fft-size').addEventListener('change', (e) => {
    settings.fftSize = parseInt(e.target.value);
    if (audioBuffer) updateVisualization();
  });

  document.getElementById('window-size').addEventListener('change', (e) => {
    settings.windowSize = parseInt(e.target.value);
    if (audioBuffer) updateVisualization();
  });

  document.getElementById('color-scheme').addEventListener('change', (e) => {
    settings.colorScheme = e.target.value;
    if (audioBuffer) updateVisualization();
  });

  document.getElementById('intensity').addEventListener('input', (e) => {
    settings.intensity = parseInt(e.target.value);
    if (audioBuffer) updateVisualization();
  });
}

function setupTitleBarButtons() {
  document.getElementById('minimize-btn').addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });

  document.getElementById('maximize-btn').addEventListener('click', () => {
    window.electronAPI.maximizeWindow();
  });

  document.getElementById('close-btn').addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
}

async function openFileDialog() {
  const filePath = await window.electronAPI.openFileDialog();
  if (filePath) {
    loadAudioFile(filePath);
  }
}

async function loadAudioFile(filePath) {
  try {
    // Read file through IPC
    const fileData = await window.electronAPI.readFile(filePath);
    
    // Initialize audio context if needed
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Decode audio
    audioBuffer = await audioContext.decodeAudioData(fileData.buffer);
    currentFilePath = filePath;

    // Update UI
    updateFileInfo(fileData.name, audioBuffer.duration);
    showVisualization();
    updateVisualization();
    drawWaveform();

  } catch (error) {
    console.error('Error loading audio file:', error);
    alert('Error loading audio file. Please make sure it\'s a valid audio format.');
  }
}

function updateFileInfo(fileName, duration) {
  document.querySelector('.file-name').textContent = fileName;
  fileDuration.textContent = formatTime(duration);
  totalTimeDisplay.textContent = formatTime(duration);
}

function showVisualization() {
  dropZone.style.display = 'none';
  waveformContainer.style.display = 'block';
  spectrogramContainer.style.display = 'block';
  playbackControls.style.display = 'flex';
}

function resizeCanvases() {
  // Waveform canvas
  waveformCanvas.width = waveformContainer.clientWidth;
  waveformCanvas.height = waveformContainer.clientHeight;

  // Spectrogram canvas
  spectrogramCanvas.width = spectrogramContainer.clientWidth;
  spectrogramCanvas.height = spectrogramContainer.clientHeight;

  // Redraw if we have audio
  if (audioBuffer) {
    drawWaveform();
    updateVisualization();
  }
}

function drawWaveform() {
  const width = waveformCanvas.width;
  const height = waveformCanvas.height;
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  waveformCtx.fillStyle = '#141414';
  waveformCtx.fillRect(0, 0, width, height);

  waveformCtx.lineWidth = 1;
  waveformCtx.strokeStyle = '#00ff88';
  waveformCtx.beginPath();

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    
    for (let j = 0; j < step; j++) {
      const datum = data[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    waveformCtx.moveTo(i, (1 + min) * amp);
    waveformCtx.lineTo(i, (1 + max) * amp);
  }

  waveformCtx.stroke();
}

function updateVisualization() {
  const width = spectrogramCanvas.width;
  const height = spectrogramCanvas.height;
  const data = audioBuffer.getChannelData(0);
  
  spectrogramCtx.fillStyle = '#0a0a0a';
  spectrogramCtx.fillRect(0, 0, width, height);

  const fftSize = settings.fftSize;
  const hopSize = Math.floor(fftSize / 4);
  const numFrames = Math.floor((data.length - fftSize) / hopSize);
  const frameWidth = width / numFrames;

  // Create FFT analyzer
  const offlineContext = new OfflineAudioContext(1, data.length, audioBuffer.sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  
  const analyser = offlineContext.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0;
  
  source.connect(analyser);
  analyser.connect(offlineContext.destination);

  // Process audio in chunks
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Analyze and draw
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    const end = start + fftSize;
    
    if (end > data.length) break;

    // Perform FFT manually
    const frame = data.slice(start, end);
    const fftResult = performFFT(frame);
    
    // Draw frequency bins
    for (let j = 0; j < bufferLength && j < fftResult.length; j++) {
      const value = fftResult[j];
      const intensity = settings.intensity / 100;
      const magnitude = Math.min(255, value * intensity * 2);
      
      const color = getColorForValue(magnitude, settings.colorScheme);
      const x = i * frameWidth;
      const y = height - (j / bufferLength) * height;
      const binHeight = Math.max(1, height / bufferLength);

      spectrogramCtx.fillStyle = color;
      spectrogramCtx.fillRect(x, y - binHeight, Math.max(1, frameWidth), binHeight);
    }
  }
}

function performFFT(frame) {
  // Simple magnitude spectrum calculation
  const N = frame.length;
  const spectrum = new Array(N / 2);
  
  for (let k = 0; k < N / 2; k++) {
    let real = 0;
    let imag = 0;
    
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      real += frame[n] * Math.cos(angle);
      imag += frame[n] * Math.sin(angle);
    }
    
    spectrum[k] = Math.sqrt(real * real + imag * imag) / N;
  }
  
  return spectrum;
}

function getColorForValue(value, scheme) {
  const intensity = value / 255;
  
  switch (scheme) {
    case 'fire':
      if (intensity < 0.3) {
        return `rgb(${Math.floor(intensity * 3 * 255)}, 0, 0)`;
      } else if (intensity < 0.7) {
        return `rgb(255, ${Math.floor((intensity - 0.3) * 2.5 * 255)}, 0)`;
      } else {
        return `rgb(255, 255, ${Math.floor((intensity - 0.7) * 3.3 * 255)})`;
      }
    
    case 'ice':
      if (intensity < 0.5) {
        return `rgb(0, ${Math.floor(intensity * 2 * 255)}, ${Math.floor(intensity * 2 * 255)})`;
      } else {
        return `rgb(${Math.floor((intensity - 0.5) * 2 * 255)}, 255, 255)`;
      }
    
    case 'mono':
      return `rgb(${Math.floor(intensity * 255)}, ${Math.floor(intensity * 255)}, ${Math.floor(intensity * 255)})`;
    
    case 'serato':
    default:
      if (intensity < 0.2) {
        return '#0a0a0a';
      } else if (intensity < 0.4) {
        return `rgb(0, ${Math.floor(intensity * 255)}, ${Math.floor(intensity * 128)})`;
      } else if (intensity < 0.6) {
        return `rgb(0, ${Math.floor(intensity * 255)}, ${Math.floor(intensity * 200)})`;
      } else if (intensity < 0.8) {
        return `rgb(${Math.floor((intensity - 0.6) * 5 * 255)}, 255, ${Math.floor(intensity * 136)})`;
      } else {
        return `rgb(255, ${Math.floor(255 - (intensity - 0.8) * 5 * 128)}, ${Math.floor(intensity * 136)})`;
      }
  }
}

function togglePlayback() {
  if (!audioBuffer) return;

  if (isPlaying) {
    pause();
  } else {
    play();
  }
}

function play() {
  if (!audioContext || audioContext.state === 'suspended') {
    audioContext.resume();
  }

  audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(audioContext.destination);

  const offset = pauseTime || 0;
  audioSource.start(0, offset);
  startTime = audioContext.currentTime - offset;
  
  isPlaying = true;
  playBtn.classList.add('playing');
  
  updatePlaybackPosition();

  audioSource.onended = () => {
    if (isPlaying) {
      stop();
    }
  };
}

function pause() {
  if (audioSource) {
    audioSource.stop();
    pauseTime = audioContext.currentTime - startTime;
  }
  
  isPlaying = false;
  playBtn.classList.remove('playing');
  
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
}

function stop() {
  if (audioSource) {
    audioSource.stop();
  }
  
  isPlaying = false;
  pauseTime = 0;
  startTime = 0;
  playBtn.classList.remove('playing');
  timelineSlider.value = 0;
  currentTimeDisplay.textContent = '0:00';
  
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
}

function seekTo(time) {
  const wasPlaying = isPlaying;
  
  if (isPlaying) {
    pause();
  }
  
  pauseTime = time;
  
  if (wasPlaying) {
    play();
  } else {
    updateTimeDisplay(time);
  }
}

function updatePlaybackPosition() {
  if (!isPlaying || !audioBuffer) return;

  const currentTime = audioContext.currentTime - startTime;
  const progress = (currentTime / audioBuffer.duration) * 100;
  
  timelineSlider.value = progress;
  updateTimeDisplay(currentTime);

  animationId = requestAnimationFrame(updatePlaybackPosition);
}

function updateTimeDisplay(time) {
  currentTimeDisplay.textContent = formatTime(time);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
