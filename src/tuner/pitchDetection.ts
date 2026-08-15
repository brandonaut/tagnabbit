// Pitch detection: McLeod Pitch Method (normalized square difference function) with a
// decimated coarse pass followed by a full-rate refine pass.

// Detection range: the barbershop voice range.
export const MIN_HZ = 65
export const MAX_HZ = 1050
export const FFT_SIZE = 2048
// Only fundamentals below MAX_HZ matter, so the signal is decimated before the coarse
// correlation pass — 16x less work for an O(n²) search. The 8-tap boxcar prefilter has
// a null at exactly the post-decimation Nyquist and stays below -13 dB above it.
export const DECIM = 4
export const BOXCAR = 8
export const DECIMATED_SIZE = Math.floor((FFT_SIZE - BOXCAR) / DECIM)
// Coarse peaks resolve to DECIM full-rate samples, so the true peak is within ±DECIM/2
// decimated samples; this window has ample margin.
export const REFINE_HALF_WIDTH = 16
// Take the first NSDF peak within this fraction of the global maximum rather than the
// global maximum itself. Once the function is properly normalized, every integer multiple
// of the true period is a peak of comparable height, so a plain argmax lands on an
// arbitrary subharmonic and reports a pitch one or two octaves low.
export const PEAK_RATIO = 0.9
// NSDF clarity at the chosen peak: 1 is perfectly periodic. Breath and room noise fall far
// below this.
export const CLARITY = 0.45
export const RMS_FLOOR = 0.001
// Extra lags searched past each end of the range so peaks at the extremes still have
// neighbours for the local-maximum test.
export const LAG_MARGIN = 2

// 8-tap boxcar antialias filter applied as a running sum, keeping every DECIM-th output.
// O(1) per output sample. The output is unscaled — only the argmax of the correlation
// matters downstream, and the confidence test runs against the full-rate signal.
export function decimate(src: Float32Array, dst: Float32Array): void {
  let sum = 0
  for (let i = 0; i < BOXCAR; i++) sum += src[i]
  dst[0] = sum
  let base = 0
  for (let out = 1; out < dst.length; out++) {
    for (let k = 0; k < DECIM; k++) {
      sum += src[base + BOXCAR] - src[base]
      base++
    }
    dst[out] = sum
  }
}

// power[k] = sum of squares of buf[0..k), so the NSDF denominator over any lag's overlap
// window is one subtraction rather than a second inner loop.
export function buildPower(buf: Float32Array, size: number, power: Float32Array): void {
  power[0] = 0
  for (let i = 0; i < size; i++) power[i + 1] = power[i] + buf[i] * buf[i]
}

// Normalized square difference function (McLeod). Bounded to [-1, 1] and 1 at perfect
// periodicity, so peak heights are comparable across lags and across input levels. A raw
// correlation sum is neither: it attenuates long lags, which biases toward reporting a
// pitch an octave high whenever the fundamental is weak relative to the 2nd harmonic —
// the common case for low bass on a phone mic.
export function nsdf(
  buf: Float32Array,
  size: number,
  lo: number,
  hi: number,
  power: Float32Array,
  out: Float32Array,
): void {
  for (let lag = lo; lag <= hi; lag++) {
    const n = size - lag
    let r = 0
    for (let j = 0; j < n; j++) r += buf[j] * buf[j + lag]
    const m = power[n] + power[size] - power[lag]
    out[lag - lo] = m > 0 ? (2 * r) / m : 0
  }
}

// The first peak within PEAK_RATIO of the tallest one, as an index into `out`. Taking the
// tallest peak outright is wrong: multiples of the true period score just as high once the
// function is normalized, so an argmax picks a subharmonic more or less at random.
export function firstStrongPeak(out: Float32Array, count: number): number {
  let tallest = 0
  for (let i = 0; i < count; i++) if (out[i] > tallest) tallest = out[i]
  if (tallest <= 0) return -1
  const threshold = tallest * PEAK_RATIO
  for (let i = 1; i < count - 1; i++) {
    if (out[i] > out[i - 1] && out[i] >= out[i + 1] && out[i] >= threshold) return i
  }
  return -1
}

// Recompute at full sample rate in a narrow window around the coarse peak, then
// parabolic-interpolate. Interpolating on the decimated peak alone is far too coarse: a
// 1050 Hz fundamental is only ~11 decimated samples per period, which carries ~15¢ of
// systematic bias. The window holds a single peak, so a plain argmax is right here.
export function refinePeak(
  buf: Float32Array,
  size: number,
  center: number,
  minLag: number,
  maxLag: number,
  power: Float32Array,
  scratch: Float32Array,
): { lag: number; clarity: number } {
  const lo = Math.max(minLag, center - REFINE_HALF_WIDTH)
  const hi = Math.min(maxLag, center + REFINE_HALF_WIDTH)
  nsdf(buf, size, lo, hi, power, scratch)
  let best = Number.NEGATIVE_INFINITY
  let at = lo
  for (let lag = lo; lag <= hi; lag++) {
    if (scratch[lag - lo] > best) {
      best = scratch[lag - lo]
      at = lag
    }
  }
  if (at <= lo || at >= hi) return { lag: at, clarity: best }
  const left = scratch[at - lo - 1]
  const mid = scratch[at - lo]
  const right = scratch[at - lo + 1]
  const denom = 2 * (2 * mid - left - right)
  return { lag: denom === 0 ? at : at + (right - left) / denom, clarity: best }
}

export interface DetectBuffers {
  decimated: Float32Array
  power: Float32Array
  coarsePower: Float32Array
  coarse: Float32Array
  scratch: Float32Array
}

export function detectPitch(buf: Float32Array, b: DetectBuffers, sampleRate: number): number {
  const size = buf.length
  buildPower(buf, size, b.power)
  if (b.power[size] / size < RMS_FLOOR) return -1 // reject breath and room noise

  decimate(buf, b.decimated)
  const coarseSize = b.decimated.length
  const coarseRate = sampleRate / DECIM
  // LAG_MARGIN past each end of the range: a peak sitting on the very first or last lag
  // has no neighbour to be compared against, so the local-maximum test cannot see it and
  // the pitch at that edge of the range gets missed entirely.
  const coarseLo = Math.max(2, Math.floor(coarseRate / MAX_HZ) - LAG_MARGIN)
  const coarseHi = Math.min(coarseSize - 2, Math.ceil(coarseRate / MIN_HZ) + LAG_MARGIN)
  buildPower(b.decimated, coarseSize, b.coarsePower)
  nsdf(b.decimated, coarseSize, coarseLo, coarseHi, b.coarsePower, b.coarse)
  const peak = firstStrongPeak(b.coarse, coarseHi - coarseLo + 1)
  if (peak < 0) return -1

  const { lag, clarity } = refinePeak(
    buf,
    size,
    (coarseLo + peak) * DECIM,
    Math.max(2, Math.floor(sampleRate / MAX_HZ) - LAG_MARGIN * DECIM),
    Math.min(size - 2, Math.ceil(sampleRate / MIN_HZ) + LAG_MARGIN * DECIM),
    b.power,
    b.scratch,
  )
  if (lag <= 0 || clarity < CLARITY) return -1
  return sampleRate / lag
}
