import { useState, useRef, useEffect, useCallback } from 'react';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ENHARMONIC: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

const DEGREE_NAMES = [
  'Root', '\u{266D}2', '2nd', '\u{266D}3', '3rd', '4th',
  '\u{266D}5', '5th', '\u{266D}6', '6th', '\u{266D}7', '7th',
];

// How many cents each scale degree sits above its equal-tempered position in 5-limit JI.
// Ratios: 1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8
// e.g. the major 3rd (5/4) is 386¢, which is 14¢ BELOW the ET major 3rd (400¢) → -13.7
const JI_OFFSETS = [0, 11.7, 3.9, 15.6, -13.7, -2.0, -9.8, 2.0, 13.7, -15.6, 17.6, -11.7];

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;

  let sum = 0;
  for (let i = 0; i < SIZE; i++) sum += buf[i] * buf[i];
  if (sum / SIZE < 0.001) return -1; // raise RMS floor to reject breath/room noise

  const c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  // Skip initial peak, find first valley
  let d = 0;
  while (d < SIZE - 1 && c[d] > c[d + 1]) d++;

  // Search only in the barbershop voice range (65–1050 Hz)
  const minLag = Math.floor(sampleRate / 1050);
  const maxLag = Math.ceil(sampleRate / 65);
  let maxVal = -1, maxPos = -1;
  for (let i = Math.max(d, minLag); i < Math.min(SIZE - 1, maxLag); i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  }

  if (maxPos < 1 || maxVal < c[0] * 0.05) return -1; // raise confidence threshold

  // Parabolic interpolation for sub-sample accuracy
  const T0 = maxPos + (c[maxPos + 1] - c[maxPos - 1]) /
    (2 * (2 * c[maxPos] - c[maxPos - 1] - c[maxPos + 1]));

  return sampleRate / T0;
}

function freqToNote(freq: number): { note: string; octave: number; cents: number } {
  const semitones = 12 * Math.log2(freq / 440);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);
  // A4 = semitone 0 = index 9 = octave 4
  const noteIdx = ((rounded % 12) + 12 + 9) % 12;
  const octave = Math.floor((rounded + 57) / 12);
  return { note: NOTE_NAMES[noteIdx], octave, cents };
}

function getScaleDegree(note: string, key: string): string {
  const keyNorm = ENHARMONIC[key] ?? key;
  const noteNorm = ENHARMONIC[note] ?? note;
  const keyIdx = NOTE_NAMES.indexOf(keyNorm);
  const noteIdx = NOTE_NAMES.indexOf(noteNorm);
  if (keyIdx === -1 || noteIdx === -1) return '';
  return DEGREE_NAMES[(noteIdx - keyIdx + 12) % 12];
}

interface PitchInfo {
  note: string;
  octave: number;
  cents: number;
}

interface Props {
  tagKey: string;
}

export default function Tuner({ tagKey }: Props) {
  const [active, setActive] = useState(false);
  const [pitch, setPitch] = useState<PitchInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<{
    ctx: AudioContext;
    analyser: AnalyserNode;
    stream: MediaStream;
    buffer: Float32Array<ArrayBuffer>;
  } | null>(null);
  const animRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Smoothing: EMA on raw frequency + note-name stability over 2 frames
  const smoothedFreqRef = useRef(0);
  const pendingNoteRef = useRef('');
  const pendingFramesRef = useRef(0);

  function resetSmoothing() {
    smoothedFreqRef.current = 0;
    pendingNoteRef.current = '';
    pendingFramesRef.current = 0;
  }

  const stop = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.stream.getTracks().forEach(t => t.stop());
      audioRef.current.ctx.close();
      audioRef.current = null;
    }
    resetSmoothing();
  }, []);

  useEffect(() => stop, [stop]);

  async function toggle() {
    if (active) {
      stop();
      setActive(false);
      setError(null);
      setPitch(null);
      return;
    }

    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      audioRef.current = { ctx, analyser, stream, buffer };
      setActive(true);

      function tick(timestamp: number) {
        if (timestamp - lastTickRef.current < 80) { // ~12 fps
          animRef.current = requestAnimationFrame(tick);
          return;
        }
        lastTickRef.current = timestamp;

        const audio = audioRef.current;
        if (!audio) return;

        audio.analyser.getFloatTimeDomainData(audio.buffer);
        const freq = autoCorrelate(audio.buffer, audio.ctx.sampleRate);

        if (freq > 0) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          // EMA smoothing: blend 25% new reading into the running average
          smoothedFreqRef.current = smoothedFreqRef.current === 0
            ? freq
            : 0.25 * freq + 0.75 * smoothedFreqRef.current;

          const result = freqToNote(smoothedFreqRef.current);

          // Shift cents relative to the JI target for this scale degree
          const keyNorm = ENHARMONIC[tagKey] ?? tagKey;
          const keyIdx = NOTE_NAMES.indexOf(keyNorm);
          const noteIdx = NOTE_NAMES.indexOf(result.note);
          const degreeIdx = keyIdx >= 0 && noteIdx >= 0 ? (noteIdx - keyIdx + 12) % 12 : -1;
          const jiCents = degreeIdx >= 0
            ? Math.round(result.cents - JI_OFFSETS[degreeIdx])
            : result.cents;

          // Require 2 consecutive frames on the same note before updating name
          if (result.note !== pendingNoteRef.current) {
            pendingNoteRef.current = result.note;
            pendingFramesRef.current = 1;
          } else {
            pendingFramesRef.current++;
          }

          setPitch(prev => ({
            note: pendingFramesRef.current >= 2 ? result.note : (prev?.note ?? result.note),
            octave: pendingFramesRef.current >= 2 ? result.octave : (prev?.octave ?? result.octave),
            cents: jiCents,
          }));
        } else if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            setPitch(null);
            resetSmoothing();
            silenceTimerRef.current = null;
          }, 1500);
        }

        animRef.current = requestAnimationFrame(tick);
      }
      animRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const msg = e instanceof Error && e.name === 'NotAllowedError'
        ? 'Microphone access denied'
        : 'Could not access microphone';
      setError(msg);
    }
  }

  const degree = pitch ? getScaleDegree(pitch.note, tagKey) : null;
  const absC = pitch ? Math.abs(pitch.cents) : 0;
  const centsColor = pitch
    ? (absC <= 10 ? '#4ade80' : absC <= 25 ? '#facc15' : '#f87171')
    : '#888';

  return (
    <div className="tuner">
      {active && (
        <div className="tuner-panel">
          {pitch ? (
            <>
              <div className="tuner-note">
                {pitch.note}<span className="tuner-octave">{pitch.octave}</span>
              </div>
              <div className="tuner-meter">
                <div
                  className="tuner-needle"
                  style={{ left: `${50 + pitch.cents}%`, background: centsColor }}
                />
              </div>
              <div className="tuner-cents" style={{ color: centsColor }}>
                {pitch.cents > 0 ? '+' : ''}{pitch.cents}¢
              </div>
              {degree && tagKey && (
                <div className="tuner-degree">{degree} of {tagKey}</div>
              )}
            </>
          ) : (
            <div className="tuner-listening">listening…</div>
          )}
        </div>
      )}
      {!active && error && (
        <div className="tuner-error-float">{error}</div>
      )}
      <button
        className={`tuner-btn${active ? ' active' : ''}`}
        onClick={toggle}
        aria-label={active ? 'Stop tuner' : 'Start tuner'}
        title={active ? 'Stop tuner' : 'Tune'}
      >
        ♩
      </button>
    </div>
  );
}
