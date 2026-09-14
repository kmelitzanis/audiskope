import { execFile, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { nativeTool } from './nativePaths';
const ffmpeg = nativeTool('ffmpeg');
const ffprobe = nativeTool('ffprobe');
const MAX_PCM = 256 * 1024 * 1024;
export async function readAudioFile(input: string) {
    if (typeof input !== 'string' || !path.isAbsolute(input))
        throw new Error('Select a local audio file.');
    const filePath = path.resolve(input), stat = await fs.promises.stat(filePath);
    if (!stat.isFile())
        throw new Error('Select a file, not a folder.');
    const info = JSON.parse(await new Promise<string>((resolve, reject) => {
        execFile(ffprobe, ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-select_streams', 'a:0', '-show_streams', '-show_format', '-of', 'json', filePath], { timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (e, stdout) => e ? reject(new Error('Could not read this audio format or the file is damaged.')) : resolve(stdout));
    }));
    const stream = info.streams?.[0];
    if (!stream)
        throw new Error('This file contains no audio stream.');
    const sampleRate = Number(stream.sample_rate), channels = Number(stream.channels);
    const duration = Number(stream.duration || info.format?.duration) || 0;
    if (!Number.isInteger(sampleRate) || sampleRate < 3000 || sampleRate > 384000 || !Number.isInteger(channels) || channels < 1 || channels > 32)
        throw new Error('Unsupported sample rate or channel count.');
    if (duration * sampleRate * channels * 4 > MAX_PCM)
        throw new Error('Audio exceeds the 256 MB decoded limit per file.');
    const codec = String(stream.codec_name || 'unknown');
    const bitDepth = /^(pcm_|flac$|alac$|wavpack$|ape$)/.test(codec) ? Number(stream.bits_per_raw_sample) || Number(stream.bits_per_sample) || null : null;
    const streamRate = Number(stream.bit_rate) || null;
    const metadata = { codec, codecDescription: String(stream.codec_long_name || codec), sampleRate, channels, bitDepth,
        bitrate: streamRate || Number(info.format?.bit_rate) || null, bitrateKind: streamRate ? 'stream' : 'container average', duration, format: String(info.format?.format_name || ''), size: stat.size };
    const data = await new Promise<Buffer>((resolve, reject) => {
        const child = spawn(ffmpeg, ['-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-i', filePath, '-map', '0:a:0', '-vn', '-sn', '-dn', '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        const chunks: Buffer[] = [];
        let size = 0, failure: Error | null = null;
        const timeout = setTimeout(() => { failure = new Error('Audio decoding timed out.'); child.kill(); }, 120000);
        child.stdout.on('data', (chunk: Buffer) => { size += chunk.length; if (size > MAX_PCM) {
            failure = new Error('Audio exceeds the 256 MB decoded limit per file.');
            child.kill();
        }
        else
            chunks.push(chunk); });
        child.stderr.resume();
        child.on('error', () => { clearTimeout(timeout); reject(new Error('The bundled audio decoder could not start.')); });
        child.on('close', code => { clearTimeout(timeout); if (failure || code !== 0 || !size)
            reject(failure || new Error('Could not decode this audio file.'));
        else
            resolve(Buffer.concat(chunks)); });
    });
    if (data.length % (channels * 4))
        throw new Error('Incomplete decoded audio.');
    metadata.duration = data.length / (channels * 4 * sampleRate);
    return { data, metadata, name: path.basename(filePath), path: filePath };
}
