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

  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);
  const convIdRef = useRef(conversationId);
  const activeRef = useRef(false); // true between "start" and "hang up"
  const callTimerRef = useRef(null);
  const modeRef = useRef(SpeechRecognitionImpl && !readServerFlag() ? "browser" : "server");
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

  // ---- speech -> text, path A: the browser's own recognition ----
  const startBrowserListening = () => {
    const rec = new SpeechRecognitionImpl();
    rec.lang = language === "en" ? "en-US" : "es-CO";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    recognitionRef.current = rec;

    rec.onresult = (event) => {
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
      console.info("[VoiceCall] Browser speech recognition unavailable; switching to server transcription.");
      modeRef.current = "server";
      try { sessionStorage.setItem(STT_FLAG, "1"); } catch { /* storage unavailable */ }
      act.current.startListening();
    };
    rec.onstart = () => console.info("[VoiceCall] recognition started");
    rec.onspeechstart = () => console.info("[VoiceCall] speech detected");
    rec.onend = () => {
      console.info(`[VoiceCall] recognition ended (final text: ${finalText.trim() ? "yes" : "none"})`);
      if (!activeRef.current || recognitionRef.current !== rec) return;
      const text = finalText.trim();
      if (text) act.current.sendTurn(text);
      else act.current.startListening(); // silence: keep listening
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#aaa6c3] text-[14px] gap-4">
        <p>{t("call.unsupported")}</p>
        <button onClick={onClose} className="px-4 py-2 rounded-full bg-[#915EFF] text-white">{t("call.backToChat")}</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 text-center">
      <div className="w-full h-44 rounded-xl overflow-hidden bg-black/40">
        <Canvas camera={{ position: [0, 0, 100], fov: 80 }} dpr={[1, 1.5]}>
          <Sphere analyser={analyser} />
        </Canvas>
      </div>

      <div className="flex flex-col items-center gap-2 min-h-[88px] w-full">
        <span className="text-[12px] text-[#915EFF] font-bold uppercase tracking-wider">{label}</span>
        {status === "listening" && modeRef.current === "server" && (
          // Mic level: lets the visitor see the microphone is picking them up.
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-[#915EFF] transition-[width] duration-75" style={{ width: `${Math.min(100, level * 800)}%` }} />
          </div>
        )}
        {heard && <p className="text-[14px] text-white/80 line-clamp-3">&ldquo;{heard}&rdquo;</p>}
        {errorKey && <p className="text-[13px] text-red-400">{t(errorKey)}</p>}
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <p className="text-[11px] text-[#aaa6c3]/70 leading-snug">{t("call.notice")}</p>
        <div className="flex gap-3">
          {!inCall ? (
            <button onClick={start} className="px-6 py-3 rounded-full bg-[#915EFF] hover:bg-[#804dee] text-white font-semibold transition-colors">
              {status === "error" ? t("call.retry") : t("call.start")}
            </button>
          ) : (
            <>
              {status === "speaking" && (
                <button onClick={interrupt} className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  {t("call.interrupt")}
                </button>
              )}
              <button onClick={hangUp} className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">
                {t("call.hangUp")}
              </button>
            </>
          )}
        </div>
        <button onClick={() => { hangUp(); onClose?.(); }} className="text-[12px] text-[#aaa6c3] underline">
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
