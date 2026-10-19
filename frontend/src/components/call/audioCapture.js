// audioCapture.js — mic capture with a simple energy-based voice activity detector (VAD).
// Used when the browser's SpeechRecognition is unavailable or blocked: each utterance is cut
// by the VAD, encoded as 16 kHz mono WAV and sent to the backend for transcription.

const WORKLET_CODE = `
class CapProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.parts = []; this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      this.parts.push(new Float32Array(ch));
      this.n += ch.length;
      if (this.n >= 2048) {
        const out = new Float32Array(this.n);
        let o = 0;
        for (const p of this.parts) { out.set(p, o); o += p.length; }
        this.port.postMessage(out, [out.buffer]);
        this.parts = []; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("cap-processor", CapProcessor);
`;

const TARGET_RATE = 16000;
const MIN_THRESHOLD = 0.02;     // absolute floor for "this is speech" (RMS, 0..1)
const NOISE_FACTOR = 3;         // speech must be this many times louder than the noise floor
const START_CHUNKS = 2;         // consecutive loud chunks to start an utterance
const PREROLL_CHUNKS = 8;       // audio kept from before speech was detected (~0.35 s)
const END_SILENCE_MS = 900;
const MIN_VOICED_MS = 400;      // shorter than this is a click/cough, not an utterance
const MAX_UTTERANCE_MS = 15000;

const concat = (chunks) => {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
};

/** Linear-interpolation resample to 16 kHz. Good enough for speech recognition. */
const resample = (input, fromRate) => {
  if (fromRate === TARGET_RATE) return input;
  const ratio = fromRate / TARGET_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    out[i] = input[i0] + (input[i1] - input[i0]) * (pos - i0);
  }
  return out;
};

export const encodeWav = (samples, sampleRate) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
};

/**
 * @param {{ctx: AudioContext, stream: MediaStream, onUtterance: (wav: Blob) => void, onLevel?: (rms: number) => void}} opts
 * @returns {Promise<{setPaused: (p: boolean) => void, stop: () => void}>}
 */
export const createVadRecorder = async ({ ctx, stream, onUtterance, onLevel }) => {
  const url = URL.createObjectURL(new Blob([WORKLET_CODE], { type: "application/javascript" }));
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "cap-processor");
  const mute = ctx.createGain();
  mute.gain.value = 0; // keep the graph pulled without playing the mic back
  source.connect(node);
  node.connect(mute);
  mute.connect(ctx.destination);

  let paused = true;
  let noiseFloor = 0.01;
  let state = "idle"; // idle | speaking
  let voicedCount = 0;
  let preroll = [];
  let chunks = [];
  let silenceMs = 0;
  let voicedMs = 0;
  let totalMs = 0;
  let lastLevelAt = 0;

  const reset = () => { state = "idle"; voicedCount = 0; preroll = []; chunks = []; silenceMs = 0; voicedMs = 0; totalMs = 0; };

  node.port.onmessage = (e) => {
    const chunk = e.data;
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
    const rms = Math.sqrt(sum / chunk.length);
    const chunkMs = (chunk.length / ctx.sampleRate) * 1000;

    const now = performance.now();
    if (onLevel && now - lastLevelAt > 80) { lastLevelAt = now; onLevel(rms); }
    if (paused) { if (state !== "idle") reset(); return; }

    const threshold = Math.max(MIN_THRESHOLD, noiseFloor * NOISE_FACTOR);
    const loud = rms > threshold;

    if (state === "idle") {
      noiseFloor = noiseFloor * 0.95 + rms * 0.05; // learn the room's background level
      preroll.push(chunk);
      if (preroll.length > PREROLL_CHUNKS) preroll.shift();
      voicedCount = loud ? voicedCount + 1 : 0;
      if (voicedCount >= START_CHUNKS) {
        state = "speaking";
        chunks = [...preroll];
        preroll = [];
        silenceMs = 0;
        voicedMs = chunkMs * voicedCount;
        totalMs = chunks.length * chunkMs;
        console.info("[VAD] speech started");
      }
      return;
    }

    chunks.push(chunk);
    totalMs += chunkMs;
    if (rms > threshold * 0.6) { silenceMs = 0; if (loud) voicedMs += chunkMs; } else silenceMs += chunkMs;
    if (silenceMs >= END_SILENCE_MS || totalMs >= MAX_UTTERANCE_MS) {
      const keep = voicedMs >= MIN_VOICED_MS;
      console.info(`[VAD] speech ended (${Math.round(totalMs)}ms total, ${Math.round(voicedMs)}ms voiced) ${keep ? "-> sending" : "-> discarded"}`);
      const samples = concat(chunks);
      reset();
      if (keep) onUtterance(encodeWav(resample(samples, ctx.sampleRate), TARGET_RATE));
    }
  };

  return {
    setPaused: (p) => { paused = p; if (p) reset(); },
    stop: () => {
      paused = true;
      node.port.onmessage = null;
      try { source.disconnect(); node.disconnect(); mute.disconnect(); } catch { /* already disconnected */ }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
};
