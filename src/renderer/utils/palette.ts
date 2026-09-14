import { ColorScheme } from '../types';

/**
 * TypeScript mirror of the spectrogram fragment shader's color functions
 * (see webglRenderer.ts). Keep the two in sync: the waveform, the level ramp
 * and the PNG legend all sample this so they match the rendered spectrum.
 */
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
const smoothstep = (edge0: number, edge1: number, v: number): number => {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export type RGB = [number, number, number];

function fireColor(v: number): RGB {
  if (v < 0.25) return [v * 4 * 0.4, 0, 0];
  if (v < 0.5) return [0.4 + (v - 0.25) * 2.4, (v - 0.25) * 1.2, 0];
  if (v < 0.75) return [1, 0.3 + (v - 0.5) * 2.8, 0];
  return [1, 1, (v - 0.75) * 4];
}

function iceColor(v: number): RGB {
  if (v < 0.33) return [0, 0, v * 3 * 0.5];
  if (v < 0.66) return [0, (v - 0.33) * 3 * 0.8, 0.5 + (v - 0.33) * 1.5];
  return [(v - 0.66) * 3, 0.8 + (v - 0.66) * 0.6, 1];
}

function triBandColor(v: number): RGB {
  if (v < 0.55) return mix([0.005, 0.012, 0.025], [0.10, 0.43, 0.88], Math.pow(v / 0.55, 1.8));
  if (v < 0.84) return mix([0.10, 0.43, 0.88], [1.0, 0.56, 0.07], smoothstep(0.55, 0.84, v));
  return mix([1.0, 0.56, 0.07], [1.0, 0.97, 0.90], smoothstep(0.84, 1.0, v));
}

const SCHEMES: Record<ColorScheme, (v: number) => RGB> = {
  '3band': triBandColor,
  fire: fireColor,
  ice: iceColor
};

/** Intensity (0–1, i.e. −100 to 0 dBFS) to an `rgb()` string for `scheme`. */
export function sampleScheme(scheme: ColorScheme, intensity: number): string {
  const [r, g, b] = SCHEMES[scheme](clamp01(intensity));
  return `rgb(${Math.round(clamp01(r) * 255)},${Math.round(clamp01(g) * 255)},${Math.round(clamp01(b) * 255)})`;
}

/**
 * Intensities the waveform's nested layers sample. They start above the
 * palette's near-black floor so the quiet outer envelope stays visible.
 */
export const WAVEFORM_STOPS: [number, number, number] = [0.5, 0.8, 1];

/** Evenly spaced stops covering the palette, for CSS ramps and canvas gradients. */
export function rampStops(scheme: ColorScheme, steps = 16): { offset: number; color: string }[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    offset: i / steps,
    color: sampleScheme(scheme, i / steps)
  }));
}
