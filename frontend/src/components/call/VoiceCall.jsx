import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Canvas } from "@react-three/fiber";
import { Sphere } from "../canvas/AudioVisualizer";
import { useLanguage } from "../../context/LanguageContext";
import { createVadRecorder } from "./audioCapture";

const SpeechRecognitionImpl =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const CAN_CAPTURE =
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== "undefined";

// Brave exposes webkitSpeechRecognition but blocks Google's speech service. On Android it often fails
// silently (the session ends at once with no error), which used to leave the call stuck on "listening".
// Go straight to server transcription there.
const IS_BRAVE = typeof navigator !== "undefined" && !!navigator.brave;
// A recognition session that ends this fast without hearing speech is treated as a broken service.
const QUICK_END_MS = 2000;
const QUICK_ENDS_BEFORE_FALLBACK = 2;

// Speech lives in ~80 Hz–8 kHz: map only that to the sphere so every belt moves with the voice.
const VOICE_FREQ_RANGE = [80, 8000];

const MAX_CALL_MS = 3 * 60 * 1000;
const MIME = "audio/mpeg";
const STT_FLAG = "voicecall_stt_server";

const readServerFlag = () => {
  try { return sessionStorage.getItem(STT_FLAG) === "1"; } catch { return false; }
};

const errorKeyFor = (detail) => {
  switch (detail) {
    case "call_limit_reached": return "call.errCallLimit";
    case "daily_limit_reached": return "call.errDailyLimit";
    case "voice_disabled": return "call.errDisabled";
    default: return "call.errGeneric";
  }
};

/**
 * Voice call with Diego's AI avatar.
 *   speech -> text:  browser SpeechRecognition when it works, otherwise mic + VAD -> WAV -> POST /realtime/voice/stt
 *   text -> avatar:  POST /realtime/voice/turn -> streamed mp3 (cloned voice) -> speaker
 * The mic is paused while the avatar thinks/speaks, which avoids echo.
 */
const VoiceCall = ({ backendUrl, conversationId, onConversationId, onTurn, onClose }) => {
  const { t, language } = useLanguage();
  // idle | listening | thinking | speaking | error
  const [status, setStatus] = useState("idle");
  const [heard, setHeard] = useState("");
  const [errorKey, setErrorKey] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [level, setLevel] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);
  const convIdRef = useRef(conversationId);
  const activeRef = useRef(false); // true between "start" and "hang up"
  const callTimerRef = useRef(null);
  const modeRef = useRef(SpeechRecognitionImpl && !IS_BRAVE && !readServerFlag() ? "browser" : "server");
  const quickEndsRef = useRef(0);
  const vadRef = useRef(null);
  // Long-lived callbacks (recognition/VAD events) call through here so they always see the latest render.
  const act = useRef({});

  if (!audioRef.current && typeof Audio !== "undefined") audioRef.current = new Audio();

  const fail = (key, detail) => {
    console.error(`[VoiceCall] ${key}`, detail ?? "");
    activeRef.current = false;
    vadRef.current?.setPaused(true);
    setErrorKey(key);
    setStatus("error");
  };

  const ensureConversation = async () => {
    if (convIdRef.current) return convIdRef.current;
    const res = await fetch(`${backendUrl}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Voice Call" }),
    });
    if (!res.ok) throw new Error(`create conversation HTTP ${res.status}`);
    const data = await res.json();
    convIdRef.current = data.id;
    onConversationId?.(data.id);
    return data.id;
  };

  // Plays a streamed mp3 response. Uses MediaSource when available (starts speaking on the first chunk),
  // otherwise buffers the whole reply (Safari/iOS).
  const playResponse = async (resp, signal) => {
    const audio = audioRef.current;
    const ended = new Promise((resolve) => {
      const done = () => { audio.removeEventListener("ended", done); audio.removeEventListener("error", done); resolve(); };
      audio.addEventListener("ended", done);
      audio.addEventListener("error", done);
    });

    if (window.MediaSource && MediaSource.isTypeSupported(MIME)) {
      const ms = new MediaSource();
      audio.src = URL.createObjectURL(ms);
      await new Promise((r) => ms.addEventListener("sourceopen", r, { once: true }));
      const sb = ms.addSourceBuffer(MIME);
      const queue = [];
      let finished = false;
      const pump = () => {
        if (sb.updating || ms.readyState !== "open") return;
        if (queue.length) sb.appendBuffer(queue.shift());
        else if (finished) { try { ms.endOfStream(); } catch { /* already closed */ } }
      };
      sb.addEventListener("updateend", pump);

      const reader = resp.body.getReader();
      let started = false;
      for (;;) {
        if (signal.aborted) return;
        const { value, done } = await reader.read();
        if (done) { finished = true; pump(); break; }
        queue.push(value);
        pump();
        if (!started) {
          started = true;
          setStatus("speaking");
          audio.play().catch((e) => console.warn("[VoiceCall] play() blocked:", e));
        }
      }
    } else {
      const blob = await resp.blob();
      audio.src = URL.createObjectURL(blob);
      setStatus("speaking");
      await audio.play();
    }
    await ended;
  };

  const sendTurn = async (text) => {
    if (!activeRef.current) return;
    vadRef.current?.setPaused(true);
    setStatus("thinking");
    const controller = new AbortController();
    abortRef.current = controller;
    const t0 = performance.now();
    try {
      const convId = await ensureConversation();
      const resp = await fetch(`${backendUrl}/realtime/voice/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId, text }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const detail = (await resp.json().catch(() => ({}))).detail;
        return fail(errorKeyFor(detail), `HTTP ${resp.status} ${detail ?? ""}`);
      }
      console.info(`[VoiceCall] response headers after ${(performance.now() - t0).toFixed(0)}ms`);
      await playResponse(resp, controller.signal);
      if (controller.signal.aborted || !activeRef.current) return;

      // Captions: the backend persists the turn once the stream ends; read it back.
      try {
        const msgs = await (await fetch(`${backendUrl}/conversations/${convId}/messages`)).json();
        const last = msgs[msgs.length - 1];
        if (last) onTurn?.(last.prompt_content, last.response_content);
      } catch (e) {
        console.warn("[VoiceCall] could not load captions:", e);
        onTurn?.(text, "");
      }
      act.current.startListening();
    } catch (e) {
      if (e.name === "AbortError") return;
      fail("call.errGeneric", e);
    }
  };

  // Browser recognition is unusable here: remember it for this tab and continue with path B.
  const switchToServer = (reason) => {
    console.info(`[VoiceCall] Browser speech recognition unavailable (${reason}); switching to server transcription.`);
    modeRef.current = "server";
    try { sessionStorage.setItem(STT_FLAG, "1"); } catch { /* storage unavailable */ }
    act.current.startListening();
  };

  // ---- speech -> text, path A: the browser's own recognition ----
  const startBrowserListening = () => {
    const rec = new SpeechRecognitionImpl();
    const startedAt = performance.now();
    let gotSpeech = false;
    rec.lang = language === "en" ? "en-US" : "es-CO";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    recognitionRef.current = rec;

    rec.onresult = (event) => {
      gotSpeech = true;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setHeard((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      console.warn(`[VoiceCall] recognition error: ${e.error} ${e.message ?? ""}`);
      if (e.error === "no-speech" || e.error === "aborted") return; // onend decides whether to restart
      recognitionRef.current = null;
      rec.abort();
      if (e.error === "not-allowed") return fail("call.errMic", e.error);
      if (e.error === "audio-capture") return fail("call.errMicCapture", e.error);
      // "network" / "service-not-allowed": no speech service here (Brave, Chromium without Google keys).
      if (!CAN_CAPTURE) return fail("call.errSpeechService", e.error);
      switchToServer(e.error);
    };
    rec.onstart = () => console.info("[VoiceCall] recognition started");
    rec.onspeechstart = () => {
      gotSpeech = true;
      console.info("[VoiceCall] speech detected");
    };
    rec.onend = () => {
      const lasted = performance.now() - startedAt;
      console.info(`[VoiceCall] recognition ended after ${lasted.toFixed(0)}ms (final text: ${finalText.trim() ? "yes" : "none"})`);
      if (!activeRef.current || recognitionRef.current !== rec) return;
      const text = finalText.trim();
      if (text) {
        quickEndsRef.current = 0;
        return act.current.sendTurn(text);
      }
      // A real "no speech" timeout takes several seconds; ending instantly, again and again, means the
      // speech service is silently broken (Brave, some WebViews): fall back instead of looping forever.
      quickEndsRef.current = !gotSpeech && lasted < QUICK_END_MS ? quickEndsRef.current + 1 : 0;
      if (quickEndsRef.current >= QUICK_ENDS_BEFORE_FALLBACK && CAN_CAPTURE) {
        recognitionRef.current = null;
        return switchToServer(`${quickEndsRef.current} empty sessions under ${QUICK_END_MS}ms`);
      }
      act.current.startListening(); // silence: keep listening
    };
    setHeard("");
    setStatus("listening");
    try { rec.start(); } catch (e) { console.warn("[VoiceCall] recognition.start failed:", e); }
  };

  // ---- speech -> text, path B: mic + VAD, transcribed by the backend ----
  const handleUtterance = async (wav) => {
    if (!activeRef.current) return;
    vadRef.current?.setPaused(true);
    setStatus("thinking");
    const controller = new AbortController();
    abortRef.current = controller;
    const t0 = performance.now();
    try {
      const resp = await fetch(`${backendUrl}/realtime/voice/stt?language=${language === "en" ? "en" : "es"}`, {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
        signal: controller.signal,
      });
      if (!resp.ok) {
        const detail = (await resp.json().catch(() => ({}))).detail;
        return fail(errorKeyFor(detail), `STT HTTP ${resp.status} ${detail ?? ""}`);
      }
      const { text } = await resp.json();
      console.info(`[VoiceCall] transcribed in ${(performance.now() - t0).toFixed(0)}ms (${(text || "").length} chars)`);
      if (!activeRef.current) return;
      const clean = (text || "").trim();
      if (!clean) return act.current.startListening(); // nothing intelligible: keep listening
      setHeard(clean);
      act.current.sendTurn(clean);
    } catch (e) {
      if (e.name === "AbortError") return;
      fail("call.errGeneric", e);
    }
  };

  const startServerListening = async () => {
    setHeard("");
    setStatus("listening");
    if (!vadRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (!activeRef.current) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        vadRef.current = await createVadRecorder({
          ctx: audioCtxRef.current,
          stream,
          onUtterance: (wav) => act.current.handleUtterance(wav),
          onLevel: setLevel,
        });
        console.info("[VoiceCall] Server transcription: microphone ready.");
      } catch (e) {
        if (e.name === "NotAllowedError") return fail("call.errMic", e);
        if (e.name === "NotFoundError") return fail("call.errMicCapture", e);
        return fail("call.errGeneric", e);
      }
    }
    if (activeRef.current) vadRef.current.setPaused(false);
  };

  const startListening = () => {
    if (!activeRef.current) return;
    if (modeRef.current === "browser") startBrowserListening();
    else startServerListening();
  };

  act.current = { startListening, sendTurn, handleUtterance };

  const hangUp = () => {
    activeRef.current = false;
    clearTimeout(callTimerRef.current);
    abortRef.current?.abort();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    vadRef.current?.stop();
    vadRef.current = null;
    audioRef.current?.pause();
    setStatus("idle");
    setHeard("");
    setLevel(0);
  };

  const interrupt = () => {
    abortRef.current?.abort();
    audioRef.current?.pause();
    startListening();
  };

  const start = async () => {
    setErrorKey(null);
    activeRef.current = true;
    // Created inside the click handler so the browser allows audio playback.
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaElementSource(audioRef.current).connect(an);
      an.connect(ctx.destination);
      audioCtxRef.current = ctx;
      setAnalyser(an);
    }
    audioCtxRef.current.resume?.();
    callTimerRef.current = setTimeout(() => {
      console.info("[VoiceCall] Max call duration reached.");
      hangUp();
    }, MAX_CALL_MS);
    console.info(`[VoiceCall] Call started (speech-to-text: ${modeRef.current}).`);
    startListening();
  };

  useEffect(() => () => {
    activeRef.current = false;
    clearTimeout(callTimerRef.current);
    abortRef.current?.abort();
    recognitionRef.current?.abort();
    vadRef.current?.stop();
    audioRef.current?.pause();
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  const inCall = status !== "idle" && status !== "error";
  const label = status === "listening" ? t("call.listening")
    : status === "thinking" ? t("call.thinking")
    : status === "speaking" ? t("call.speaking")
    : "";

  if (!SpeechRecognitionImpl && !CAN_CAPTURE) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-soft text-[14px] gap-4">
        <p>{t("call.unsupported")}</p>
        <button type="button" onClick={onClose} className="min-h-[44px] px-5 rounded-full bg-accent text-ink font-semibold">{t("call.backToChat")}</button>
      </div>
    );
  }

  // Status pill colour follows the call phase.
  const pillDot = status === "listening" ? "bg-accent animate-pulse"
    : status === "thinking" ? "bg-yellow-400 animate-pulse"
    : status === "speaking" ? "bg-[#FF2975]"
    : status === "error" ? "bg-red-500"
    : "bg-white/40";

  return (
    // Fixed-height panel: the sphere takes whatever height is left, the actions stay pinned at the bottom
    // (shrink-0) and nothing the visitor needs to read or press can be pushed out of view.
    <div data-testid="call-panel" className="flex-1 min-h-0 flex flex-col gap-3 px-4 pt-3 pb-4 text-center">
      {/* Sphere (3D, reacts to the avatar's voice): grows on tall panels, hidden on very short screens */}
      <div className="relative flex-1 min-h-[88px] w-full rounded-2xl overflow-hidden bg-ink border border-white/[0.06] h-sm:hidden">
        <Canvas camera={{ position: [0, 0, 58], fov: 80 }} dpr={[1, 1.5]}>
          <Sphere analyser={analyser} fit freqRange={VOICE_FREQ_RANGE} />
        </Canvas>
      </div>

      <div data-testid="call-middle" className="shrink-0 flex flex-col items-center gap-2 w-full h-sm:flex-1 h-sm:justify-center">
        <span
          className={`inline-flex items-center gap-2 min-h-[28px] px-3 rounded-full border font-mono text-[11px] uppercase tracking-[0.08em] ${label ? "border-white/10 text-white" : "border-transparent text-dim"}`}
          aria-live="polite"
        >
          <span className={`w-2 h-2 rounded-full ${pillDot}`} aria-hidden="true" />
          {label || t("call.open")}
        </span>
        {status === "listening" && modeRef.current === "server" && (
          // Mic level: lets the visitor see the microphone is picking them up.
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0" aria-hidden="true">
            <div className="h-full bg-accent transition-[width] duration-75" style={{ width: `${Math.min(100, level * 800)}%` }} />
          </div>
        )}
        {heard && <p className="text-[14px] text-white/85 line-clamp-2">&ldquo;{heard}&rdquo;</p>}
        {errorKey && <p className="text-[13px] text-red-400 leading-snug">{t(errorKey)}</p>}
      </div>

      <div className="min-h-0 shrink overflow-y-auto flex flex-col items-center gap-1 w-full">
        {/* One short line always; the full privacy text only on demand, so it never pushes the layout around. */}
        <p className="text-[11px] text-muted leading-snug">
          {t("call.noticeShort")}{" "}
          <button
            type="button"
            data-testid="call-privacy-toggle"
            onClick={() => setShowPrivacy((v) => !v)}
            aria-expanded={showPrivacy}
            className="py-2.5 underline underline-offset-2 hover:text-white"
          >
            {t("call.privacy")}
          </button>
        </p>
        {showPrivacy && (
          <p data-testid="call-privacy-detail" className="text-[11px] text-soft leading-snug max-h-20 overflow-y-auto rounded-xl bg-white/5 p-2.5 text-left">
            {t("call.notice")}
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-center gap-1 w-full">
        <div className="flex items-center justify-center gap-3">
          {!inCall ? (
            <button
              type="button"
              data-testid="call-start"
              onClick={start}
              className="min-h-[48px] inline-flex items-center gap-2 px-6 rounded-full bg-accent hover:brightness-110 text-ink font-semibold transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 19v3" /></svg>
              {status === "error" ? t("call.retry") : t("call.start")}
            </button>
          ) : (
            <>
              {status === "speaking" && (
                <button
                  type="button"
                  data-testid="call-interrupt"
                  onClick={interrupt}
                  className="min-h-[48px] px-5 rounded-full border border-white/15 text-white hover:bg-white/5 transition-colors"
                >
                  {t("call.interrupt")}
                </button>
              )}
              <button
                type="button"
                data-testid="call-hangup"
                onClick={hangUp}
                className="min-h-[48px] inline-flex items-center gap-2 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c4.5-4 11.5-4 16 0l-2 3-3-1v-3c-2-.6-4-.6-6 0v3l-3 1z" /></svg>
                {t("call.hangUp")}
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          data-testid="call-back"
          onClick={() => { hangUp(); onClose?.(); }}
          className="min-h-[44px] px-4 text-[13px] text-soft hover:text-white transition-colors"
        >
          {t("call.backToChat")}
        </button>
      </div>
    </div>
  );
};

VoiceCall.propTypes = {
  backendUrl: PropTypes.string.isRequired,
  conversationId: PropTypes.number,
  onConversationId: PropTypes.func,
  onTurn: PropTypes.func,
  onClose: PropTypes.func,
};

export default VoiceCall;
