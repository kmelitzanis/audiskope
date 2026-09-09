export type FrequencyScale = 'linear' | 'log';
export interface SpectrumView { x0: number; x1: number; y0: number; y1: number }
export const fullView = (): SpectrumView => ({ x0: 0, x1: 1, y0: 0, y1: 1 });
export const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
// y=0 is the top of the plot. Log mode deliberately excludes DC.
export function frequencyAt(y: number, nyquist: number, scale: FrequencyScale): number {
  return scale === 'log' ? 20 * Math.pow(nyquist / 20, 1 - y) : nyquist * (1 - y);
}
export function zoomRange(lo: number, hi: number, anchor: number, factor: number): [number, number] {
  const span = clamp((hi - lo) / factor, 1 / 64, 1);
  const start = clamp(lo + (hi - lo) * anchor - span * anchor, 0, 1 - span);
  return [start, start + span];
}
export function panRange(lo: number, hi: number, delta: number): [number, number] {
  const start = clamp(lo + delta, 0, 1 - (hi - lo));
  return [start, start + hi - lo];
}
export function preciseTime(time: number): string {
  const ms = Math.round(time * 1000);
  return `${Math.floor(ms / 60000)}:${(Math.floor(ms / 1000) % 60).toString().padStart(2, '0')}.${(ms % 1000).toString().padStart(3, '0')}`;
}
