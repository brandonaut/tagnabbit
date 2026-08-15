import { describe, expect, it } from "vitest"
import {
  buildPower,
  DECIMATED_SIZE,
  type DetectBuffers,
  decimate,
  detectPitch,
  FFT_SIZE,
  firstStrongPeak,
  MAX_HZ,
  MIN_HZ,
  nsdf,
  REFINE_HALF_WIDTH,
} from "./pitchDetection"

const SAMPLE_RATE = 48000

function makeBuffers(): DetectBuffers {
  return {
    decimated: new Float32Array(DECIMATED_SIZE),
    power: new Float32Array(FFT_SIZE + 1),
    coarsePower: new Float32Array(DECIMATED_SIZE + 1),
    coarse: new Float32Array(DECIMATED_SIZE),
    scratch: new Float32Array(REFINE_HALF_WIDTH * 2 + 1),
  }
}

function sineBuffer(freq: number, sampleRate: number, size: number, amplitude = 0.5) {
  const buf = new Float32Array(size)
  for (let i = 0; i < size; i++)
    buf[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate)
  return buf
}

describe("detectPitch", () => {
  it.each([
    MIN_HZ + 5,
    220,
    440,
    880,
    MAX_HZ - 50,
  ])("detects a clean %i Hz sine within 2%%", (freq) => {
    const buf = sineBuffer(freq, SAMPLE_RATE, FFT_SIZE)
    const result = detectPitch(buf, makeBuffers(), SAMPLE_RATE)
    expect(result).toBeGreaterThan(freq * 0.98)
    expect(result).toBeLessThan(freq * 1.02)
  })

  it("rejects silence", () => {
    const buf = new Float32Array(FFT_SIZE)
    expect(detectPitch(buf, makeBuffers(), SAMPLE_RATE)).toBe(-1)
  })

  it("rejects a non-periodic signal", () => {
    // Deterministic pseudo-random noise (LCG): loud enough to clear the RMS
    // floor but with no true period, so clarity falls below the threshold.
    const buf = new Float32Array(FFT_SIZE)
    let seed = 42
    for (let i = 0; i < FFT_SIZE; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      buf[i] = (seed / 0x7fffffff) * 2 - 1
    }
    expect(detectPitch(buf, makeBuffers(), SAMPLE_RATE)).toBe(-1)
  })
})

describe("decimate", () => {
  it("applies an 8-tap boxcar sum every 4th sample", () => {
    const src = new Float32Array(16)
    for (let i = 0; i < 16; i++) src[i] = i + 1
    const dst = new Float32Array(3)
    decimate(src, dst)
    expect(Array.from(dst)).toEqual([36, 68, 100])
  })
})

describe("buildPower", () => {
  it("computes a running sum of squares", () => {
    const buf = new Float32Array([1, 2, 3])
    const power = new Float32Array(4)
    buildPower(buf, 3, power)
    expect(Array.from(power)).toEqual([0, 1, 5, 14])
  })
})

describe("nsdf", () => {
  it("matches a brute-force reference computation", () => {
    const size = 64
    const buf = new Float32Array(size)
    for (let i = 0; i < size; i++) buf[i] = Math.sin(i * 0.3) + 0.5 * Math.sin(i * 0.7 + 1)
    const power = new Float32Array(size + 1)
    buildPower(buf, size, power)

    const lo = 1
    const hi = 20
    const out = new Float32Array(hi - lo + 1)
    nsdf(buf, size, lo, hi, power, out)

    for (let lag = lo; lag <= hi; lag++) {
      const n = size - lag
      let r = 0
      let m = 0
      for (let j = 0; j < n; j++) {
        r += buf[j] * buf[j + lag]
        m += buf[j] * buf[j] + buf[j + lag] * buf[j + lag]
      }
      const expected = m > 0 ? (2 * r) / m : 0
      expect(out[lag - lo]).toBeCloseTo(expected, 4)
    }
  })
})

describe("firstStrongPeak", () => {
  it("returns the first peak within PEAK_RATIO of the tallest, not the tallest itself", () => {
    const out = new Float32Array(30).fill(0.1)
    // A strong-but-not-tallest peak early...
    out[7] = 0.5
    out[8] = 0.95
    out[9] = 0.5
    // ...and the global tallest peak later, which should be ignored because
    // the earlier peak already clears PEAK_RATIO (0.9) of it.
    out[19] = 0.6
    out[20] = 1.0
    out[21] = 0.6

    expect(firstStrongPeak(out, 30)).toBe(8)
  })

  it("returns -1 when nothing is positive", () => {
    const out = new Float32Array(10)
    expect(firstStrongPeak(out, 10)).toBe(-1)
  })
})
