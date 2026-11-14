// Shared Web Audio graph for the navbar music player.
//
// createMediaElementSource() may be called only ONCE per <audio> element: a second call throws and the
// element's sound is routed only through the first graph. Every visual that reacts to the music (the
// Contact sphere, the hero waves) must therefore read from the same AnalyserNode, created here once.

const graphs = new WeakMap();

/**
 * Returns { context, analyser } for this element, creating the graph on first use.
 * Returns null if Web Audio is unavailable or wiring fails (visuals then just stay idle).
 */
export const getAudioGraph = (audioElement) => {
  if (!audioElement) return null;
  if (graphs.has(audioElement)) return graphs.get(audioElement);

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    console.warn('[audioGraph] Web Audio API not available; audio-reactive visuals disabled.');
    return null;
  }

  try {
    // Must be set before the element is wired into the graph.
    audioElement.crossOrigin = 'anonymous';
    const context = new Ctx();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    const source = context.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(context.destination);

    // A context created outside a user gesture starts suspended, which would also mute the music
    // (it now plays through the graph). Resume on playback and on the next interaction.
    const resume = () => {
      if (context.state === 'suspended') {
        context.resume()
          .then(() => console.info('[audioGraph] AudioContext resumed.'))
          .catch((err) => console.error('[audioGraph] Could not resume AudioContext:', err));
      }
    };
    audioElement.addEventListener('play', resume);
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('touchstart', resume, { once: true });
    resume();

    const graph = { context, analyser };
    graphs.set(audioElement, graph);
    console.info('[audioGraph] Shared analyser created', { fftSize: analyser.fftSize, sampleRate: context.sampleRate, state: context.state });
    return graph;
  } catch (error) {
    console.error('[audioGraph] Failed to build audio graph:', { error, src: audioElement.currentSrc });
    return null;
  }
};

// Frequency bands in Hz. Bin width = sampleRate / fftSize (≈ 43–47 Hz at fftSize 1024).
const BANDS = { bass: [20, 250], mid: [250, 2000], high: [2000, 8000] };

// Byte frequency data clips at analyser.maxDecibels (-30 dB by default) and bass-heavy music sits there
// permanently, so it shows no beats. Float data is in dB and never clips; map a fixed dB window to 0..1.
// (The analyser's own settings are left untouched: the Contact sphere reads byte data from it.)
const DB_FLOOR = -90;
const DB_CEIL = -15;

/** Maps a dB value to 0..1 inside the fixed [DB_FLOOR, DB_CEIL] window (silence / -Infinity → 0). */
export const normDb = (db) => {
  const v = (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR);
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/**
 * Average energy (0..1) of the bass / mid / high bands from an already-filled float (dB) buffer.
 */
export const bandsFromFloat = (buffer, hzPerBin, out) => {
  for (const key in BANDS) {
    const [lo, hi] = BANDS[key];
    const from = Math.max(1, Math.floor(lo / hzPerBin));
    const to = Math.min(buffer.length - 1, Math.ceil(hi / hzPerBin));
    let sum = 0;
    for (let i = from; i <= to; i++) sum += normDb(buffer[i]);
    out[key] = sum / (to - from + 1);
  }
  return out;
};

/**
 * Average energy (0..1) of the bass / mid / high bands, written into `out`.
 * `buffer` must be a Float32Array of analyser.frequencyBinCount (reused across frames, no allocations).
 */
export const readBands = (analyser, buffer, sampleRate, out) => {
  analyser.getFloatFrequencyData(buffer);
  return bandsFromFloat(buffer, sampleRate / analyser.fftSize, out);
};

/**
 * Log-spaced frequency columns (as the ear hears pitch): for each of `columns` returns the [from, to]
 * FFT bin range it covers, from fMin (column 0) to fMax (last column). Low columns that would fall
 * inside a single bin reuse it, so no column is empty.
 */
export const buildLogColumns = (columns, fftSize, sampleRate, fMin = 35, fMax = 16000) => {
  const hzPerBin = sampleRate / fftSize;
  const maxBin = fftSize / 2 - 1;
  const ranges = new Int16Array(columns * 2);
  for (let c = 0; c < columns; c++) {
    const f0 = fMin * Math.pow(fMax / fMin, c / columns);
    const f1 = fMin * Math.pow(fMax / fMin, (c + 1) / columns);
    const from = Math.min(maxBin, Math.max(1, Math.floor(f0 / hzPerBin)));
    const to = Math.min(maxBin, Math.max(from, Math.floor(f1 / hzPerBin)));
    ranges[c * 2] = from;
    ranges[c * 2 + 1] = to;
  }
  return ranges;
};

const smoothstep = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Turns the analyser into `columns` log-spaced, musically useful values (0..1), shared by every
 * audio-reactive visual so they all read the music the same way:
 *  - float dB data (never clips, unlike byte data on bass-heavy mixes),
 *  - a mild high-frequency tilt (music falls ~3 dB/octave, highs would otherwise never show),
 *  - automatic gain, two-level: global (follows the loudest recent column) blended with a per-column
 *    window (each band's own min/max over the last ~2 s). Without the per-column part the loudest band
 *    (bass) sits pinned at 1.0 and never visibly moves,
 *  - gentle contrast, spatial blur between neighbouring frequencies,
 *  - optional temporal smoothing (fast rise, slower fall).
 * Default top frequency is 12.5 kHz: the site's mp3 mixes carry almost nothing above ~12 kHz (lossy
 * encoding low-passes it), so higher columns would sit flat.
 * Also exposes `bands` (bass / mid / high, 0..1) computed from the same frame.
 */
export class SpectrumFollower {
  constructor(analyser, sampleRate, columns, options = {}) {
    const { fMin = 35, fMax = 12500, blurPasses = 2, smooth = true, attack = 18, release = 7, contrastLow = 0.18, localWeight = 0.65 } = options;
    this.localWeight = localWeight;
    this.analyser = analyser;
    this.columns = columns;
    this.blurPasses = blurPasses;
    this.smooth = smooth;
    this.attack = attack;
    this.release = release;
    this.contrastLow = contrastLow;
    this.hzPerBin = sampleRate / analyser.fftSize;
    this.ranges = buildLogColumns(columns, analyser.fftSize, sampleRate, fMin, fMax);
    this.floatBuf = new Float32Array(analyser.frequencyBinCount);
    this.frame = new Float32Array(columns);   // this frame, after gain / contrast / blur
    this.values = new Float32Array(columns);  // temporally smoothed (equals `frame` when smooth = false)
    this.peak = 0.5;
    this.lo = new Float32Array(columns);      // per-column dynamic window
    this.hi = new Float32Array(columns).fill(0.5);
    this.bands = { bass: 0, mid: 0, high: 0 };
  }

  /** Reads the analyser and updates `frame`, `values` and `bands`. */
  update(dt) {
    const { columns, frame, ranges, floatBuf } = this;
    this.analyser.getFloatFrequencyData(floatBuf);

    let frameMax = 0;
    for (let c = 0; c < columns; c++) {
      let m = 0;
      for (let i = ranges[c * 2]; i <= ranges[c * 2 + 1]; i++) {
        const v = normDb(floatBuf[i]);
        if (v > m) m = v;
      }
      m *= 0.8 + 0.35 * (c / columns);
      frame[c] = m;
      if (m > frameMax) frameMax = m;
    }
    this.peak = Math.max(this.peak * Math.exp(-0.25 * dt), frameMax, 0.25);
    const relax = 1 - Math.exp(-0.5 * dt);   // ~2 s window
    const { lo, hi, localWeight } = this;
    for (let c = 0; c < columns; c++) {
      const m = frame[c];
      // Window edges jump to new extremes and relax back toward the signal.
      hi[c] = m > hi[c] ? m : hi[c] + (m - hi[c]) * relax;
      lo[c] = m < lo[c] ? m : lo[c] + (m - lo[c]) * relax;
      const local = Math.min(1, Math.max(0, (m - lo[c]) / Math.max(hi[c] - lo[c], 0.04)));
      const global = smoothstep(m / this.peak, this.contrastLow, 1.0);
      // Local dynamics carry the motion; the global level keeps strong bands taller than weak ones.
      frame[c] = global * ((1 - localWeight) + localWeight * local);
    }

    for (let pass = 0; pass < this.blurPasses; pass++) {
      let prev = frame[0];
      for (let c = 0; c < columns; c++) {
        const cur = frame[c];
        const next = c < columns - 1 ? frame[c + 1] : cur;
        frame[c] = (prev + 2 * cur + next) * 0.25;
        prev = cur;
      }
    }

    this._smoothToward(frame, dt);
    bandsFromFloat(floatBuf, this.hzPerBin, this.bands);
    return this.values;
  }

  /** Nothing playing: let every column fall back to rest. */
  decay(dt) {
    this.frame.fill(0);
    this._smoothToward(this.frame, dt);
    this.bands.bass = this.bands.mid = this.bands.high = 0;
    return this.values;
  }

  _smoothToward(target, dt) {
    const { values } = this;
    if (!this.smooth) {
      values.set(target);
      return;
    }
    for (let c = 0; c < this.columns; c++) {
      const k = target[c] > values[c] ? this.attack : this.release;
      values[c] += (target[c] - values[c]) * (1 - Math.exp(-k * dt));
    }
  }
}
