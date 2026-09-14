export interface AudioMetadata {
    codec: string;
    codecDescription: string;
    sampleRate: number;
    channels: number;
    bitDepth: number | null;
    bitrate: number | null;
    bitrateKind: string;
    duration: number;
    format: string;
    size: number;
}
export interface FileData {
    buffer: ArrayBuffer;
    metadata: AudioMetadata;
    name: string;
    path: string;
}
export interface ElectronAPI {
    openFileDialog: () => Promise<string | null>;
    readFile: (filePath: string) => Promise<FileData>;
    getDroppedFilePath: (file: File) => string;
    window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
    };
}
export interface SpectrogramData {
    frames: Float32Array[];
    numFrames: number;
    bufferLength: number;
}
export type ColorScheme = 'fire' | 'ice' | '3band';
export interface AppSettings {
    fftSize: number;
    colorScheme: ColorScheme;
}
declare global {
    interface Window {
        api: ElectronAPI;
    }
}
