import { useState, useRef, useEffect } from 'react';

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 261.63,
  'C#': 277.18, 'Db': 277.18,
  'D': 293.66,
  'D#': 311.13, 'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99, 'Gb': 369.99,
  'G': 392.00,
  'G#': 415.30, 'Ab': 415.30,
  'A': 440.00,
  'A#': 466.16, 'Bb': 466.16,
  'B': 493.88,
};

const ENHARMONIC: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

interface Props {
  defaultNote: string;
}

export default function PitchPipe({ defaultNote }: Props) {
  const [selectedNote, setSelectedNote] = useState(() => ENHARMONIC[defaultNote] ?? defaultNote);
  const [pickerOpen, setPickerOpen] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.osc.stop();
        audio.ctx.close();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [pickerOpen]);

  function startTone() {
    if (audioRef.current) return;
    const freq = NOTE_FREQUENCIES[selectedNote];
    if (!freq) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    audioRef.current = { ctx, osc, gain };
  }

  function stopTone() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.osc.stop();
    audio.ctx.close();
    audioRef.current = null;
  }

  return (
    <div className="pitch-pipe" ref={containerRef}>
      {pickerOpen && (
        <div className="pitch-picker">
          {CHROMATIC_NOTES.map(note => (
            <button
              key={note}
              className={`pitch-note${note === selectedNote ? ' selected' : ''}`}
              onClick={() => { setSelectedNote(note); setPickerOpen(false); }}
            >
              {note}
            </button>
          ))}
        </div>
      )}
      <div className="pitch-pipe-controls">
        <button
          className="tone-btn"
          onMouseDown={startTone}
          onMouseUp={stopTone}
          onMouseLeave={stopTone}
          onTouchStart={startTone}
          onTouchEnd={stopTone}
          onTouchCancel={stopTone}
        >
          {selectedNote}
        </button>
        <button
          className="pitch-picker-btn"
          onClick={() => setPickerOpen(o => !o)}
          aria-label="Change pitch"
        >
          ▾
        </button>
      </div>
    </div>
  );
}
