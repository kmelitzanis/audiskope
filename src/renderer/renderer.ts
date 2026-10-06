import { SpectrumView, fullView, frequencyAt, zoomRange, panRange, clamp, preciseTime } from './utils/spectrumView';
import { AppSettings, ColorScheme, SpectrogramData, AudioMetadata, FileData } from './types';
import { processWaveform, WaveformBands } from './utils/waveformProcessor';
import { sampleScheme, rampStops, WAVEFORM_STOPS } from './utils/palette';
import { formatTime } from './utils/helpers';
import { analyzeSpectrum } from './utils/fftProcessor';
import { WebGLSpectrogramRenderer } from './utils/webglRenderer';
// State
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let audioSource: AudioBufferSourceNode | null = null;
let isPlaying = false;
let startTime = 0;
let pauseTime = 0;
let animationId: number | null = null;
let spectrogramData: SpectrogramData | null = null;
let isProcessing = false;
let isLoading = false;
let view: SpectrumView = fullView();
let uploadedData: SpectrogramData | null = null;
let waveformBands: WaveformBands | null = null;
type SlotKey = 'A' | 'B';
interface AudioSlot {
    name: string;
    buffer: AudioBuffer;
    metadata: AudioMetadata;
    waveform: WaveformBands;
    spectrum: SpectrogramData;
    fftSize: number;
}
const slots: Record<SlotKey, AudioSlot | null> = { A: null, B: null };
let activeSlot: SlotKey = 'A';
let comparisonMode = false;
let comparisonRenderer: WebGLSpectrogramRenderer | null = null;
let comparisonUploaded: SpectrogramData | null = null;
function otherKey(): SlotKey { return activeSlot === 'A' ? 'B' : 'A'; }
function splitEnabled(): boolean { return comparisonMode && !!slots.A && !!slots.B; }
function displayDuration(): number { return splitEnabled() ? Math.max(slots.A!.buffer.duration, slots.B!.buffer.duration) : audioBuffer?.duration || 1; }
function displayNyquist(): number { return splitEnabled() ? Math.max(slots.A!.buffer.sampleRate, slots.B!.buffer.sampleRate) / 2 : (audioBuffer?.sampleRate || 48000) / 2; }
// Processors
let glRenderer: WebGLSpectrogramRenderer | null = null;
// Settings
const settings: AppSettings = {
    fftSize: 2048,
    colorScheme: '3band',
};
// DOM Elements - initialized after DOM ready
let elements: {
    dropZone: HTMLElement;
    vizContainer: HTMLElement;
    waveformCanvas: HTMLCanvasElement;
    spectrogramCanvas: HTMLCanvasElement;
    fileName: HTMLElement;
    fileDuration: HTMLElement;
    playBtn: HTMLButtonElement;
    timeline: HTMLInputElement;
    timelineProgress: HTMLElement;
    currentTime: HTMLElement;
    totalTime: HTMLElement;
    waveformOverlay: HTMLElement;
    loading: HTMLElement;
    openFileBtn: HTMLElement;
    fftSelect: HTMLSelectElement;
    colorSelect: HTMLSelectElement;
};
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
function init(): void {
    console.log('Initializing Audiskope...');
    // Get DOM elements
    elements = {
        dropZone: document.getElementById('drop-zone')!,
        vizContainer: document.getElementById('viz-container')!,
        waveformCanvas: document.getElementById('waveform-canvas') as HTMLCanvasElement,
        spectrogramCanvas: document.getElementById('spectrogram-canvas') as HTMLCanvasElement,
        fileName: document.getElementById('file-name')!,
        fileDuration: document.getElementById('file-duration')!,
        playBtn: document.getElementById('play-btn') as HTMLButtonElement,
        timeline: document.getElementById('timeline-slider') as HTMLInputElement,
        timelineProgress: document.getElementById('timeline-progress')!,
        currentTime: document.getElementById('current-time')!,
        totalTime: document.getElementById('total-time')!,
        waveformOverlay: document.getElementById('waveform-overlay')!,
        loading: document.getElementById('loading-indicator')!,
        openFileBtn: document.getElementById('open-file-btn')!,
        fftSelect: document.getElementById('fft-size') as HTMLSelectElement,
        colorSelect: document.getElementById('color-scheme') as HTMLSelectElement
    };
    try {
        const saved = JSON.parse(localStorage.getItem('audiskope.settings') || '{}');
        if (saved && [512, 1024, 2048, 4096, 8192].includes(saved.fftSize))
            settings.fftSize = saved.fftSize;
        if (saved && ['3band', 'fire', 'ice'].includes(saved.colorScheme))
            settings.colorScheme = saved.colorScheme;
    }
    catch { /* Invalid or unavailable storage uses the default settings. */ }
    elements.fftSelect.value = String(settings.fftSize);
    elements.colorSelect.value = settings.colorScheme;
    updatePalette();
    // Initialize WebGL renderer
    try {
        glRenderer = new WebGLSpectrogramRenderer(elements.spectrogramCanvas, renderSpectrogram);
        comparisonRenderer = new WebGLSpectrogramRenderer(document.getElementById('comparison-canvas') as HTMLCanvasElement, renderSpectrogram);
    }
    catch (e) {
        console.error('WebGL not supported:', e);
        document.getElementById('status')!.textContent = 'WebGL is unavailable, so the spectrogram cannot be drawn.';
    }
    setupEventListeners();
    handleResize();
    window.addEventListener('resize', handleResize);
}
function setupEventListeners(): void {
    setupSpectrumInteraction();
    setupSpectrumInteraction(true);
    document.getElementById('slot-a')!.addEventListener('click', () => selectSlot('A'));
    document.getElementById('slot-b')!.addEventListener('click', () => selectSlot('B'));
    document.getElementById('open-b-btn')!.addEventListener('click', () => openFile('B'));
    document.getElementById('compare-btn')!.addEventListener('click', () => {
        if (isLoading || isProcessing) return;
        comparisonMode = !comparisonMode;
        if (!comparisonMode && activeSlot === 'B') {
            stop();
            if (!slots.A) { slots.A = slots.B; slots.B = null; }
            activeSlot = 'A';
            activateCurrentSlot();
        }
        view = fullView();
        updateSlotUI();
        handleResize();
        refreshView();
    });
    document.getElementById('save-btn')!.addEventListener('click', saveImage);
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            openFile();
        }
        else if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            togglePlayback();
        }
    });
    elements.waveformCanvas.addEventListener('click', (e) => {
        if (audioBuffer)
            seekTo(e.offsetX / elements.waveformCanvas.clientWidth * audioBuffer.duration);
    });
    // Open file button
    elements.openFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFile();
    });
    // Drop zone click
    elements.dropZone.addEventListener('click', (e) => {
        e.preventDefault();
        openFile();
    });
    // Drag and drop
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.add('drag-over');
    });
    elements.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('drag-over');
    });
    elements.dropZone.addEventListener('drop', handleFileDrop);
    // Document-level drop
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer?.files.length) {
            handleFileDrop(e);
        }
    });
    // Playback controls
    elements.playBtn.addEventListener('click', togglePlayback);
    elements.timeline.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (audioBuffer) {
            const time = (parseFloat(target.value) / 100) * audioBuffer.duration;
            seekTo(time);
        }
    });
    // Settings
    elements.fftSelect.addEventListener('change', async (e) => {
        const target = e.target as HTMLSelectElement;
        settings.fftSize = parseInt(target.value, 10);
        saveSettings();
        if (audioBuffer && !isProcessing) {
            await processSpectrogram();
        }
    });
    elements.colorSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        settings.colorScheme = target.value as ColorScheme;
        saveSettings();
        updatePalette();
        renderSpectrogram();
        drawWaveform();
    });
}
async function openFile(target: SlotKey = activeSlot): Promise<void> {
    if (isLoading || isProcessing)
        return;
    console.log('Opening file dialog...');
    try {
        const filePath = await window.api.openFileDialog();
        console.log('Selected file:', filePath);
        if (filePath) {
            await loadAudio(() => window.api.readFile(filePath), target);
        }
    }
    catch (error) {
        console.error('Error opening file:', error);
    }
}
async function handleFileDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer?.files || []).slice(0, comparisonMode ? 2 : 1);
    if (!files.length)
        return;
    const target = e.target instanceof Element ? e.target : null;
    const key: SlotKey = target?.closest('#slot-b') ? 'B' : target?.closest('#slot-a') ? 'A' : target?.closest('#comparison-section') ? otherKey() : activeSlot;
    await loadAudio(() => window.api.readDroppedFile(files[0]), files.length > 1 ? 'A' : key);
    if (files[1])
        await loadAudio(() => window.api.readDroppedFile(files[1]), 'B');
}
async function loadAudio(read: () => Promise<FileData>, target: SlotKey = activeSlot): Promise<void> {
    if (isProcessing || isLoading)
        return;
    isLoading = true;
    showLoading(true);
    try {
        const fileData = await read();
        if (!audioContext)
            audioContext = new AudioContext();
        const meta = fileData.metadata, samples = new Float32Array(fileData.buffer);
        const frames = samples.length / meta.channels;
        const decoded = audioContext.createBuffer(meta.channels, frames, meta.sampleRate);
        for (let c = 0; c < meta.channels; c++) {
            const output = decoded.getChannelData(c);
            for (let i = 0; i < frames; i++)
                output[i] = samples[i * meta.channels + c];
        }
        const [waveform, spectrum] = await Promise.all([processWaveform(decoded.getChannelData(0), decoded.sampleRate), analyzeSpectrum(decoded.getChannelData(0), settings.fftSize)]);
        stop();
        slots[target] = { name: fileData.name, buffer: decoded, metadata: meta, waveform, spectrum, fftSize: settings.fftSize };
        activeSlot = target;
        view = fullView();
        activateCurrentSlot();
        elements.dropZone.style.display = 'none';
        elements.vizContainer.style.display = 'flex';
        handleResize();
        refreshView();
        elements.playBtn.disabled = false;
        elements.timeline.disabled = false;
        document.getElementById('status')!.textContent = 'Analysis complete';
    }
    catch (error) {
        console.error('Error loading audio:', error);
        document.getElementById('status')!.textContent = error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : 'Could not load this audio file.';
    }
    finally {
        isLoading = false;
        showLoading(false);
    }
}
function describeMetadata(m: AudioMetadata): string {
    const depth = m.bitDepth ? `${m.bitDepth}-bit` : 'bit depth N/A';
    const rate = m.bitrate ? `${Math.round(m.bitrate / 1000)} kbps${m.bitrateKind === 'stream' ? '' : ' avg (file)'}` : 'bitrate unknown';
    return `${m.codec.toUpperCase()} · ${rate} · ${depth} · ${(m.sampleRate / 1000).toFixed(1)} kHz · ${m.channels === 1 ? 'Mono' : m.channels === 2 ? 'Stereo' : m.channels + ' channels'}`;
}
function activateCurrentSlot(): void {
    const slot = slots[activeSlot];
    if (!slot)
        return;
    audioBuffer = slot.buffer;
    waveformBands = slot.waveform;
    spectrogramData = slot.spectrum;
    elements.fileName.textContent = slot.name;
    elements.fileName.classList.add('loaded');
    elements.fileDuration.textContent = formatTime(slot.buffer.duration);
    elements.totalTime.textContent = formatTime(slot.buffer.duration);
    document.getElementById('file-details')!.textContent = describeMetadata(slot.metadata);
    document.getElementById('file-details')!.title = `${slot.metadata.codecDescription} · Original source metadata · ${(slot.metadata.size / 1048576).toFixed(2)} MB`;
    document.getElementById('analysis-details')!.textContent = `${slot.fftSize} SAMPLES · ${(slot.buffer.sampleRate / slot.fftSize).toFixed(1)} Hz / BIN · CH 1`;
    updateSlotUI();
}
function updateSlotUI(): void {
    for (const key of ['A', 'B'] as SlotKey[]) {
        const b = document.getElementById('slot-' + key.toLowerCase())!;
        b.classList.toggle('selected', key === activeSlot);
        b.setAttribute('aria-pressed', String(key === activeSlot));
        document.getElementById('slot-' + key.toLowerCase() + '-name')!.textContent = slots[key]?.name || 'Load file';
        b.title = slots[key] ? describeMetadata(slots[key]!.metadata) : `Load file ${key}`;
    }
    document.getElementById('compare-bar')!.hidden = !comparisonMode;
    document.getElementById('compare-btn')!.setAttribute('aria-pressed', String(comparisonMode));
    document.getElementById('compare-btn')!.textContent = comparisonMode ? 'Exit comparison' : 'Compare 2 files';
    document.getElementById('comparison-section')!.hidden = !splitEnabled();
    document.getElementById('primary-label')!.textContent = `${activeSlot} · ${slots[activeSlot]?.name || ''}`;
    document.getElementById('secondary-label')!.textContent = `${otherKey()} · ${slots[otherKey()]?.name || ''}`;
    document.getElementById('open-b-btn')!.textContent = slots.B ? 'Replace B' : 'Load B';
}
function selectSlot(key: SlotKey): void {
    if (isLoading || isProcessing)
        return;
    if (!slots[key]) {
        void openFile(key);
        return;
    }
    if (key === activeSlot)
        return;
    const time = isPlaying && audioContext ? audioContext.currentTime - startTime : pauseTime, resume = isPlaying;
    if (isPlaying)
        pause();
    activeSlot = key;
    activateCurrentSlot();
    pauseTime = Math.min(time, audioBuffer!.duration);
    handleResize();
    refreshView();
    updateTimeDisplay(pauseTime);
    if (resume && pauseTime < audioBuffer!.duration)
        play();
}
async function processSpectrogram(): Promise<void> {
    if (!audioBuffer || isProcessing)
        return;
    isProcessing = true;
    showLoading(true);
    try {
        const staged: {
            slot: AudioSlot;
            spectrum: SpectrogramData;
        }[] = [];
        for (const slot of [slots.A, slots.B])
            if (slot)
                staged.push({ slot, spectrum: await analyzeSpectrum(slot.buffer.getChannelData(0), settings.fftSize) });
        for (const item of staged) {
            item.slot.spectrum = item.spectrum;
            item.slot.fftSize = settings.fftSize;
        }
        activateCurrentSlot();
        refreshView();
        document.getElementById('status')!.textContent = 'Analysis complete';
    }
    catch (error) {
        settings.fftSize = slots[activeSlot]?.fftSize || 2048;
        elements.fftSelect.value = String(settings.fftSize);
        saveSettings();
        document.getElementById('status')!.textContent = 'Analysis failed. Try a smaller FFT size.';
    }
    finally {
        isProcessing = false;
        showLoading(false);
    }
}
function renderSpectrogram(): void {
    if (!spectrogramData)
        return;
    const colorIndex = ['3band', 'fire', 'ice'].indexOf(settings.colorScheme);
    if (glRenderer) {
        glRenderer.resize();
        if (uploadedData !== spectrogramData) {
            glRenderer.setData(spectrogramData.frames, spectrogramData.numFrames, spectrogramData.bufferLength);
            uploadedData = spectrogramData;
        }
        glRenderer.render(colorIndex, audioBuffer?.sampleRate || 48000, view, displayNyquist(), displayDuration() / audioBuffer!.duration, audioBuffer!.duration);
    }
    const other = slots[otherKey()];
    if (splitEnabled() && other && comparisonRenderer) {
        comparisonRenderer.resize();
        if (comparisonUploaded !== other.spectrum) {
            comparisonRenderer.setData(other.spectrum.frames, other.spectrum.numFrames, other.spectrum.bufferLength);
            comparisonUploaded = other.spectrum;
        }
        comparisonRenderer.render(colorIndex, other.buffer.sampleRate, view, displayNyquist(), displayDuration() / other.buffer.duration, other.buffer.duration);
    }
}
function drawWaveform(): void {
    if (!audioBuffer)
        return;
    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, width, height);
    if (!waveformBands || !width || !height)
        return;
    const count = waveformBands.low.length;
    const amp = height / 2;
    const bands = [waveformBands.low, waveformBands.mid, waveformBands.high];
    const envelopes = Array.from({ length: width }, (_, x) => {
        const start = Math.floor(x * count / width);
        const end = Math.min(count, Math.max(start + 1, Math.ceil((x + 1) * count / width)));
        return bands.map(values => {
            let energy = 0;
            for (let i = start; i < end; i++)
                energy += values[i] * values[i];
            return Math.sqrt(energy / Math.max(1, end - start));
        });
    });
    // Layer colors come from the same palette function the spectrogram shader
    // uses, so the waveform always matches the spectrum above it.
    const [outerColor, bodyColor, detailColor] = WAVEFORM_STOPS.map(stop => sampleScheme(settings.colorScheme, stop));
    // Band RMS drives the nested layers; never swap their order per pixel.
    for (let x = 0; x < width; x++) {
        const values = envelopes[x].map((v, band) => v * 0.6 + envelopes[Math.max(0, x - 1)][band] * 0.2 +
            envelopes[Math.min(width - 1, x + 1)][band] * 0.2);
        const [low, mid, high] = values;
        const energy = Math.hypot(low, mid, high);
        const outer = Math.min(0.95, energy * 1.65) * (amp - 1);
        if (outer < 0.15)
            continue;
        const sum = low + mid + high + 1e-9;
        const body = outer * (0.32 + 0.4 * low / sum);
        const detail = Math.min(body * 0.38, outer * high / sum * 0.32);
        for (const [color, extent] of [
            [outerColor, outer], [bodyColor, body], [detailColor, detail]
        ] as [
            string,
            number
        ][]) {
            if (extent < 0.1)
                continue;
            ctx.fillStyle = color;
            ctx.fillRect(x, amp - extent, 1, extent * 2);
        }
    }
}
function handleResize(): void {
    if (!elements)
        return;
    // The WebGL renderers size their own canvases when they draw.
    const waveformSection = elements.waveformCanvas?.parentElement;
    if (waveformSection && elements.waveformCanvas) {
        elements.waveformCanvas.width = Math.round(waveformSection.clientWidth * (window.devicePixelRatio || 1));
        elements.waveformCanvas.height = Math.round(waveformSection.clientHeight * (window.devicePixelRatio || 1));
    }
    if (audioBuffer) {
        drawWaveform();
        updateAxes();
        renderSpectrogram();
    }
}
function showLoading(show: boolean): void {
    if (elements?.loading) {
        elements.loading.style.display = show ? 'flex' : 'none';
        elements.fftSelect.disabled = show;
        for (const id of ['slot-a', 'slot-b', 'open-b-btn', 'compare-btn'])
            (document.getElementById(id) as HTMLButtonElement).disabled = show;
        (document.getElementById('save-btn') as HTMLButtonElement).disabled = show || !spectrogramData || !glRenderer;
        document.getElementById('comparison-tooltip')!.hidden = true;
        document.getElementById('spectrum-tooltip')!.hidden = true;
        for (const id of ['zoom-in', 'zoom-out', 'zoom-reset'])
            (document.getElementById(id) as HTMLButtonElement).disabled = show || !spectrogramData;
        (elements.openFileBtn as HTMLButtonElement).disabled = show;
    }
}
function togglePlayback(): void {
    if (!audioBuffer)
        return;
    isPlaying ? pause() : play();
}
function play(): void {
    if (!audioContext || !audioBuffer)
        return;
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(error => console.error('Could not resume audio output:', error));
    }
    if (pauseTime >= audioBuffer.duration)
        pauseTime = 0;
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioContext.destination);
    audioSource.start(0, pauseTime);
    startTime = audioContext.currentTime - pauseTime;
    isPlaying = true;
    elements.playBtn.classList.add('playing');
    elements.playBtn.setAttribute('aria-label', 'Pause');
    audioSource.onended = () => {
        if (isPlaying)
            stop();
    };
    updatePlayback();
}
function pause(): void {
    if (audioSource && audioContext) {
        audioSource.onended = null;
        audioSource.stop();
        pauseTime = audioContext.currentTime - startTime;
    }
    isPlaying = false;
    elements.playBtn.classList.remove('playing');
    elements.playBtn.setAttribute('aria-label', 'Play');
    if (animationId)
        cancelAnimationFrame(animationId);
}
function stop(): void {
    if (audioSource)
        audioSource.onended = null;
    try {
        audioSource?.stop();
    }
    catch { }
    isPlaying = false;
    pauseTime = 0;
    startTime = 0;
    elements.playBtn.classList.remove('playing');
    elements.playBtn.setAttribute('aria-label', 'Play');
    elements.timeline.value = '0';
    elements.timelineProgress.style.width = '0%';
    elements.currentTime.textContent = '0:00';
    elements.waveformOverlay.style.width = '0%';
    updatePlayhead(0);
    if (animationId)
        cancelAnimationFrame(animationId);
}
function seekTo(time: number): void {
    if (!audioBuffer)
        return;
    const wasPlaying = isPlaying;
    if (isPlaying)
        pause();
    pauseTime = Math.max(0, Math.min(time, audioBuffer.duration));
    if (wasPlaying)
        play();
    else
        updateTimeDisplay(pauseTime);
}
function updatePlayback(): void {
    if (!isPlaying || !audioBuffer || !audioContext)
        return;
    const current = audioContext.currentTime - startTime;
    if (current >= audioBuffer.duration) {
        stop();
        return;
    }
    updateTimeDisplay(current);
    animationId = requestAnimationFrame(updatePlayback);
}
function updateTimeDisplay(time: number): void {
    elements.currentTime.textContent = formatTime(time);
    const progress = audioBuffer ? time / audioBuffer.duration * 100 : 0;
    elements.timeline.value = String(progress);
    elements.timelineProgress.style.width = `${progress}%`;
    elements.waveformOverlay.style.width = `${progress}%`;
    updatePlayhead(time);
}
function updateAxes(): void {
    if (!audioBuffer)
        return;
    const axis = document.getElementById('freq-axis')!;
    axis.replaceChildren();
    const panels = splitEnabled() ? 2 : 1;
    const ticks = Math.max(1, Math.min(5, Math.floor(axis.clientHeight / panels / 32)));
    for (let p = 0; p < panels; p++)
        for (let i = 0; i <= ticks; i++) {
            const label = document.createElement('span');
            label.textContent = (frequencyAt(view.y0 + (view.y1 - view.y0) * i / ticks, displayNyquist()) / 1000).toFixed(2);
            label.style.top = `${(p + i / ticks) / panels * 100}%`;
            if (i === 0)
                label.style.transform = 'translateY(0)';
            if (i === ticks)
                label.style.transform = 'translateY(-100%)';
            axis.append(label);
        }
    document.querySelectorAll('#time-axis span').forEach((label, i) => {
        label.textContent = preciseTime(displayDuration() * (view.x0 + (view.x1 - view.x0) * i / 5));
    });
}
function updatePlayhead(time: number): void {
    const fraction = audioBuffer ? time / displayDuration() : 0;
    const head = document.getElementById('spectrum-playhead')!;
    head.style.left = `${(fraction - view.x0) / (view.x1 - view.x0) * 100}%`;
    head.hidden = fraction < view.x0 || fraction > view.x1;
    const otherHead = document.getElementById('comparison-playhead')!;
    otherHead.style.left = head.style.left;
    otherHead.hidden = head.hidden;
}
function refreshView(): void {
    (document.getElementById('spectrum-tooltip') as HTMLElement).hidden = true;
    document.getElementById('comparison-tooltip')!.hidden = true;
    updateAxes();
    renderSpectrogram();
    updatePlayhead(isPlaying && audioContext ? audioContext.currentTime - startTime : pauseTime);
    document.getElementById('zoom-level')!.textContent = `${(1 / (view.x1 - view.x0)).toFixed(1)}×`;
}
function setupSpectrumInteraction(secondary = false): void {
    const canvas = secondary ? document.getElementById('comparison-canvas') as HTMLCanvasElement : elements.spectrogramCanvas;
    const tooltip = document.getElementById(secondary ? 'comparison-tooltip' : 'spectrum-tooltip')!;
    const ready = () => !!audioBuffer && !!spectrogramData && !isProcessing && !isLoading;
    const zoom = (factor: number, x = 0.5, y = 0.5, vertical = false) => {
        if (!ready())
            return;
        if (vertical)
            [view.y0, view.y1] = zoomRange(view.y0, view.y1, y, factor);
        else
            [view.x0, view.x1] = zoomRange(view.x0, view.x1, x, factor);
        refreshView();
    };
    const reset = () => { view = fullView(); refreshView(); };
    if (!secondary)
        document.getElementById('zoom-in')!.addEventListener('click', () => zoom(2));
    if (!secondary)
        document.getElementById('zoom-out')!.addEventListener('click', () => zoom(0.5));
    if (!secondary)
        document.getElementById('zoom-reset')!.addEventListener('click', reset);
    canvas.addEventListener('dblclick', reset);
    canvas.addEventListener('wheel', e => {
        if (!ready())
            return;
        e.preventDefault();
        const box = canvas.getBoundingClientRect();
        zoom(Math.exp(-clamp(e.deltaY, -100, 100) * 0.006), clamp((e.clientX - box.left) / box.width), clamp((e.clientY - box.top) / box.height), e.shiftKey);
    }, { passive: false });
    let drag: {
        x: number;
        y: number;
        view: SpectrumView;
    } | null = null;
    canvas.addEventListener('pointerdown', e => {
        if (!ready() || e.button !== 0)
            return;
        drag = { x: e.clientX, y: e.clientY, view: { ...view } };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('panning');
        tooltip.hidden = true;
    });
    const endDrag = () => { drag = null; canvas.classList.remove('panning'); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('lostpointercapture', endDrag);
    canvas.addEventListener('pointerleave', () => { tooltip.hidden = true; });
    canvas.addEventListener('pointermove', e => {
        if (!ready())
            return;
        const box = canvas.getBoundingClientRect();
        if (drag) {
            [view.x0, view.x1] = panRange(drag.view.x0, drag.view.x1, -(e.clientX - drag.x) / box.width * (drag.view.x1 - drag.view.x0));
            [view.y0, view.y1] = panRange(drag.view.y0, drag.view.y1, -(e.clientY - drag.y) / box.height * (drag.view.y1 - drag.view.y0));
            refreshView();
            return;
        }
        const slot = slots[secondary ? otherKey() : activeSlot];
        if (!slot)
            return;
        const buffer = slot.buffer, data = slot.spectrum;
        const x = clamp((e.clientX - box.left) / box.width), y = clamp((e.clientY - box.top) / box.height);
        const time = (view.x0 + x * (view.x1 - view.x0)) * displayDuration();
        const hz = frequencyAt(view.y0 + y * (view.y1 - view.y0), displayNyquist());
        if (time > buffer.duration || hz > buffer.sampleRate / 2)
            tooltip.textContent = `${preciseTime(time)} · ${hz.toFixed(1)} Hz · No data`;
        else {
            const windowSeconds = data.bufferLength * 2 / buffer.sampleRate;
            const frameFraction = buffer.duration > windowSeconds ? clamp((time - windowSeconds / 2) / (buffer.duration - windowSeconds)) : 0;
            const frame = Math.round(frameFraction * (data.numFrames - 1));
            const bin = Math.min(data.bufferLength - 1, Math.floor(hz / (buffer.sampleRate / 2) * data.bufferLength));
            const value = data.frames[frame][bin];
            const db = value <= 0 ? '≤ −100' : value >= 1 ? '≥ 0' : (value * 100 - 100).toFixed(1);
            tooltip.textContent = `${secondary ? otherKey() : activeSlot} · ${preciseTime(time)} · ${hz.toFixed(1)} Hz · ${db} dBFS\nFFT bin: ${(bin * buffer.sampleRate / (data.bufferLength * 2)).toFixed(1)} Hz · CH 1`;
        }
        tooltip.hidden = false;
        tooltip.style.left = `${clamp(e.clientX - box.left + 12, 0, Math.max(0, box.width - tooltip.offsetWidth - 4))}px`;
        tooltip.style.top = `${clamp(e.clientY - box.top + 18, 0, Math.max(0, box.height - tooltip.offsetHeight - 4))}px`;
    });
    canvas.addEventListener('keydown', e => {
        if (!ready())
            return;
        if (e.key === '+' || e.key === '=')
            zoom(2);
        else if (e.key === '-')
            zoom(0.5);
        else if (e.key === '0')
            reset();
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            [view.x0, view.x1] = panRange(view.x0, view.x1, (e.key === 'ArrowLeft' ? -0.1 : 0.1) * (view.x1 - view.x0));
            refreshView();
        }
        else
            return;
        e.preventDefault();
    });
}
function saveSettings(): void {
    try {
        localStorage.setItem('audiskope.settings', JSON.stringify(settings));
    }
    catch {
        document.getElementById('status')!.textContent = 'Preferences could not be saved.';
    }
}
function updatePalette(): void {
    document.getElementById('color-scheme')!.title = settings.colorScheme === '3band'
        ? 'Tri-band intensity: blue quiet detail, orange body, white peaks.'
        : 'Spectrogram intensity palette';
    document.getElementById('color-ramp')!.title = 'Intensity: −100 to 0 dBFS';
    const ramp = rampStops(settings.colorScheme).map(({ offset, color }) => `${color} ${(offset * 100).toFixed(1)}%`).join(',');
    document.getElementById('color-ramp')!.style.background = `linear-gradient(to top,${ramp})`;
}
function saveImage(): void {
    if (!audioBuffer || !spectrogramData || !glRenderer)
        return;
    const output = document.createElement('canvas');
    output.width = 1600;
    output.height = 960;
    const ctx = output.getContext('2d')!;
    ctx.fillStyle = '#111214';
    ctx.fillRect(0, 0, 1600, 960);
    ctx.fillStyle = '#e5e7e9';
    ctx.font = '22px sans-serif';
    ctx.fillText(elements.fileName.textContent || 'Audiskope', 64, 40, 1450);
    ctx.fillStyle = '#8a9098';
    ctx.font = '14px monospace';
    ctx.fillText(`${document.getElementById('file-details')!.textContent} · FFT ${settings.fftSize} · Hann · Channel 1 · linear frequency`, 64, 68);
    const panels = splitEnabled() ? 2 : 1, panelHeight = 780 / panels;
    for (let p = 0; p < panels; p++) {
        const canvas = p === 0 ? elements.spectrogramCanvas : document.getElementById('comparison-canvas') as HTMLCanvasElement;
        const slot = slots[p === 0 ? activeSlot : otherKey()]!;
        ctx.drawImage(canvas, 64, 100 + p * panelHeight, 1430, panelHeight);
        ctx.strokeStyle = '#3a4047';
        ctx.strokeRect(64, 100 + p * panelHeight, 1430, panelHeight);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`${p === 0 ? activeSlot : otherKey()} · ${slot.name} · ${describeMetadata(slot.metadata)}`, 74, 120 + p * panelHeight, 1400);
        ctx.fillStyle = '#aab5c0';
        ctx.font = '12px monospace';
        for (let i = 0; i <= 5; i++)
            ctx.fillText((frequencyAt(view.y0 + (view.y1 - view.y0) * i / 5, displayNyquist()) / 1000).toFixed(2), 4, 107 + p * panelHeight + (panelHeight - 14) * i / 5);
    }
    for (let i = 0; i <= 5; i++) {
        ctx.fillText(preciseTime(displayDuration() * (view.x0 + (view.x1 - view.x0) * i / 5)), 64 + 272 * i, 906);
        ctx.fillText(String(-20 * i), 1525, 105 + 155 * i);
    }
    ctx.fillText('kHz', 12, 87);
    ctx.fillText('dBFS', 1510, 87);
    const gradient = ctx.createLinearGradient(0, 880, 0, 100);
    for (const { offset, color } of rampStops(settings.colorScheme))
        gradient.addColorStop(offset, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(1505, 100, 10, 780);
    ctx.fillStyle = '#697682';
    ctx.fillText(settings.colorScheme === '3band' ? 'AUDISKOPE / TRI-BAND INTENSITY: BLUE / ORANGE / WHITE' : 'AUDISKOPE / AUDIO SPECTRUM ANALYZER', 64, 944);
    const link = document.createElement('a');
    link.download = `${(elements.fileName.textContent || 'audiskope').replace(/\.[^.]+$/, '')}-spectrum.png`;
    link.href = output.toDataURL('image/png');
    link.click();
}
