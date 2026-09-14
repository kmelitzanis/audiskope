import * as path from 'path';
export function nativeTool(name: 'ffmpeg' | 'ffprobe'): string {
    const resources = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    const base = resources && __dirname.includes('app.asar')
        ? path.join(resources, 'audio-tools')
        : path.join(__dirname, '../../native', `${process.platform}-${process.arch}`);
    return path.join(base, name + (process.platform === 'win32' ? '.exe' : ''));
}
