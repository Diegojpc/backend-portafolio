import { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const songs = [
  "/music/ＣＯＭＭＵＮＩＯＮ [ Synthwave - Chillwave Mix ].mp3",
  "/music/ＡＬＴＥＲＥＤ　ＴＨＯＵＧＨＴＳ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＢＬＯＳＳＯＭ [Chillwave - Synthwave - Retrowave Mix].mp3",
  "/music/ＤＥＰＡＲＴＵＲＥ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＤＥＰＡＲＴＵＲＥ　ＩＩ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＥＤＧＥ　ＯＦ　ＤＵＳＫ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＥＴＨＥＲＥＡＬ[ Synthwave - Chillwave - Retrowave Mix ].mp3",
  "/music/ＧＥＮＥＳＩＳ[ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＧＬＯＷＩＮＧ　ＮＩＧＨＴ [ Synthwave - Retrowave Mix ].mp3",
  "/music/ＨＡＺＹ　ＶＩＳＩＯＮ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＨＥＡＴ[Chillwave - Synthwave - Retrowave Mix].mp3",
  "/music/HOME - Resonance.mp3",
  "/music/ＨＯＲＩＺＯＮ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＩＬＬＵＳＩＯＮＳ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＩＬＬＵＳＩＯＮＳ　ＩＩ [ Chillwave - Synthwave Mix ].mp3",
  "/music/ＩＬＬＵＳＩＯＮＳ　ＩＩＩ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＬＩＭＩＮＡＬ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＬＩＶＥ　ＡＴ　ＳＴＥＬＬＡＲ [ Chillwave - Synthwave - Retrowave ].mp3",
  "/music/ＬＯＮＧ　ＮＩＧＨＴＳ [ Chillwave - Synthwave - Retrowave  Mix ].mp3",
  "/music/ＬＯＮＧ　ＮＩＧＨＴＳ　ＩＩ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＭＥＭＯＲＩＥＳ ＩＩＩ [ Synthwave - Dreamwave - Retrowave Mix ].mp3",
  "/music/ＭＥＭＯＲＩＥＳ ＩＶ [ Synthwave - Dreamwave - Retrowave Mix ].mp3",
  "/music/ＮＩＧＨＴＦＡＬＬ　ＲＩＤＥ [Chillwave - Synthwave - Retrowave Mix].mp3",
  "/music/ＮＩＧＨＴＲＵＮ [ Synthwave - Retrowave - Chillwave Mix ].mp3",
  "/music/ＮＩＧＨＴＲＵＮ ＩＩ [ Synthwave - Retrowave - Chillwave Mix ].mp3",
  "/music/ＮＩＧＨＴＲＵＮ ＩＩＩ [ Synthwave - Retrowave - Chillwave Mix ].mp3",
  "/music/ＯＣＣＵＬＴＡＴＩＯＮ　つヿピ [ Chillwave - Synthwave - Knightwave Mix ].mp3",
  "/music/ＯＦＦ　ＴＨＥ　ＲＯＡＤ [ Chillwave - Synthwave Mix ].mp3",
  "/music/ＰＡＴＩＥＮＣＥ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＰＨＡＳＥ　ＣＨＡＮＧＥ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＰＨＡＳＥ　ＣＨＡＮＧＥ　ＩＩ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＰＬＡＣＥＳ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＫＹＷＡＹ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＫＹＷＡＹ　ＩＩ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＰＡＣＥ　ＴＲＩＰ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＰＡＣＥ　ＴＲＩＰ　ＩＩ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＰＡＣＥ　ＴＲＩＰ　ＩＩＩ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＰＡＣＥ　ＴＲＩＰ　ＩＶ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＰＡＣＥＳＨＩＰ [Chillwave - Synthwave - Retrowave Mix].mp3",
  "/music/ＳＴＡＲＨＯＰＰＥＲ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＴＥＬＬＡＲ　ＧＡＴＥＷＡＹ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＳＵＮＲＩＳＥ [ Synthwave - Chillwave - Retrowave Mix ].mp3",
  "/music/Synthwave⧸Electric Mixtape I ｜ For Study⧸Relax.mp3",
  "/music/ＴＩＭＥＬＥＳＳ [ Chillwave - Synthwave - Retrowave Mix ].mp3",
  "/music/ＴＲＡＮＱＵＩＬＩＴＹ [ Chillwave - Synthwave Mix ].mp3",
  "/music/ＶＩＢＥ [ Synthwave - Chillwave - Retrowave Mix ].mp3",
  "/music/憂鬱 - Sun.mp3"
];
const ROMAN = new Set(['I', 'II', 'III', 'IV', 'V']);

/**
 * Turn a file path like "/music/ＣＯＭＭＵＮＩＯＮ [ Synthwave - Chillwave Mix ].mp3"
 * into { title: "Communion", genre: "Synthwave · Chillwave" }.
 * NFKC folds the full-width letters and ideographic spaces to plain ASCII.
 */
const parseTrack = (src) => {
  const raw = src.split('/').pop().replace(/\.[^/.]+$/, '').normalize('NFKC');
  const bracket = raw.match(/^(.*?)\s*\[(.*)\]\s*$/);
  let title = (bracket ? bracket[1] : raw).replace(/\s+/g, ' ').trim();
  const genre = bracket
    ? bracket[2].replace(/\bMix\b/gi, '').split('-').map((g) => g.trim()).filter(Boolean).join(' · ')
    : 'Synthwave';
  // Title-case only ALL-CAPS Latin titles; keep roman numerals and mixed-case names.
  if (title === title.toUpperCase() && /[A-Z]/.test(title)) {
    title = title
      .split(' ')
      .map((w) => (ROMAN.has(w) || !/^[A-Z]/.test(w) ? w : w[0] + w.slice(1).toLowerCase()))
      .join(' ');
  }
  return { src, title, genre };
};

const tracks = songs.map(parseTrack);

const formatTime = (time) => {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  return h ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/* ── Icons (inline stroke/fill SVG; replaces FontAwesome here) ── */
const PlayIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
);
const PauseIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);
const NextIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5l10 7-10 7zM19 5v14" /></svg>
);
const PrevIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 5L9 12l10 7zM5 5v14" /></svg>
);
const VolumeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

const EQ_HEIGHTS = [6, 12, 9, 14, 5];
const EqBars = ({ playing, className = '' }) => (
  <span aria-hidden="true" className={`flex items-end gap-[2px] h-[14px] ${playing ? 'eq-playing' : ''} ${className}`}>
    {EQ_HEIGHTS.map((h, i) => (
      <span
        key={i}
        className="eq-bar w-[2px] rounded-[1px] bg-accent"
        style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }}
      />
    ))}
  </span>
);

/**
 * Ambient music player.
 *
 * Contract kept from the previous version (do not break it): a single <audio> element,
 * handed to the parent through setAudioElement on 'loadeddata'. Contact passes that same
 * element to AudioVisualizer, which wires createMediaElementSource on it (once) to make the
 * 3D sphere react to the music. The EQ bars here are CSS only on purpose, so this component
 * never touches the Web Audio graph.
 */
const LocalAudioPlayer = ({ setAudioElement }) => {
  const { t } = useLanguage();
  const audioRef = useRef(null);
  const panelRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [hasUserInteraction, setHasUserInteraction] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const track = tracks[currentSongIndex];

  // Hand the element to the parent (→ Contact → AudioVisualizer) once it has data.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoaded = () => {
      console.info('[LocalAudioPlayer] Audio data loaded, sharing element with visualizer.');
      setAudioElement(audio);
    };
    audio.addEventListener('loadeddata', handleLoaded);
    return () => audio.removeEventListener('loadeddata', handleLoaded);
  }, [setAudioElement]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    console.debug('[LocalAudioPlayer] Track changed', { index: currentSongIndex, title: tracks[currentSongIndex].title });
  }, [currentSongIndex]);

  const handleNext = useCallback(() => {
    setCurrentSongIndex((prev) => (prev + 1) % tracks.length);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentSongIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, []);

  // Keep playing across track changes once the visitor has started playback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying || !hasUserInteraction) return;
    audio.play().catch((error) => {
      console.error('[LocalAudioPlayer] Error auto-playing next song:', { error, track: tracks[currentSongIndex].src });
      setIsPlaying(false);
    });
  }, [currentSongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleSongEnd = () => handleNext();
    const handleLoad = () => setDuration(audio.duration);
    const handleError = () => {
      console.error('[LocalAudioPlayer] Audio failed to load', { src: audio.currentSrc, code: audio.error?.code });
      setIsPlaying(false);
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('loadedmetadata', handleLoad);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('loadedmetadata', handleLoad);
      audio.removeEventListener('error', handleError);
    };
  }, [currentSongIndex, handleNext]);

  // Close the panel on Escape or on a click outside it.
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setPanelOpen(false); };
    const onPointer = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('[data-player-toggle]')) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [panelOpen]);

  const handlePlay = () => {
    setHasUserInteraction(true);
    console.info('[LocalAudioPlayer] Play requested', { title: track.title });
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        setCurrentTime(audioRef.current.currentTime);
      })
      .catch((error) => {
        console.error('[LocalAudioPlayer] Error playing audio:', { error, track: track.src });
        setIsPlaying(false);
      });
  };

  const handlePause = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    console.info('[LocalAudioPlayer] Paused', { at: audioRef.current.currentTime });
  };

  const togglePlay = () => (isPlaying ? handlePause() : handlePlay());

  const pickTrack = (index) => {
    setHasUserInteraction(true);
    setIsPlaying(true);
    setCurrentSongIndex(index);
  };

  const handleVolumeChange = (event) => {
    const newVolume = Number(event.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume / 100;
  };

  const handleProgressChange = (event) => {
    const newTime = Number(event.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const playLabel = isPlaying ? t('player.pause') : t('player.play');
  const upNext = [1, 2, 3].map((k) => (currentSongIndex + k) % tracks.length);

  const panel = panelOpen && (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('player.openPanel')}
      className="fixed left-3 right-3 bottom-[96px] md:absolute md:left-auto md:right-0 md:bottom-auto md:top-full md:mt-3 md:w-[360px] z-30 rounded-3xl border border-white/10 bg-[#0E0E15] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      <div className="px-5 pt-5 pb-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-1">
            <span className="font-mono text-[11px] text-dim">
              {String(currentSongIndex + 1).padStart(2, '0')} / {tracks.length}
            </span>
            <span className="font-display text-[22px] font-semibold tracking-[-0.02em] text-white truncate">{track.title}</span>
            <span className="font-mono text-[12px] text-muted truncate">{track.genre}</span>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label={t('player.closePanel')}
            className="shrink-0 w-11 h-11 -mr-2 -mt-1 rounded-full flex items-center justify-center text-soft hover:text-white hover:bg-white/5 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="1"
            value={currentTime}
            onChange={handleProgressChange}
            aria-label={t('player.seek')}
            className="range-accent w-full"
            style={{ '--pct': `${pct}%` }}
          />
          <div className="flex justify-between font-mono text-[11px] text-muted tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={handlePrev} aria-label={t('player.prev')} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:border-accent/60 transition-colors">
            <PrevIcon size={16} />
          </button>
          <button type="button" onClick={togglePlay} aria-label={playLabel} className="w-16 h-16 rounded-full bg-accent text-ink flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </button>
          <button type="button" onClick={handleNext} aria-label={t('player.next')} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:border-accent/60 transition-colors">
            <NextIcon size={16} />
          </button>
        </div>

        <label className="flex items-center gap-3 text-dim">
          <VolumeIcon />
          <span className="sr-only">{t('player.volume')}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="range-accent flex-1"
            style={{ '--pct': `${volume}%` }}
          />
        </label>

        <div className="border-t border-white/10 pt-3 flex flex-col">
          <span className="font-mono text-[11px] text-dim uppercase tracking-[0.08em] pb-1">{t('player.upNext')}</span>
          {upNext.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickTrack(i)}
              className="h-11 flex items-center gap-3 px-2 -mx-2 rounded-xl text-left hover:bg-white/5 transition-colors"
            >
              <span className="w-6 font-mono text-[11px] text-dim">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1 min-w-0 truncate text-[14px] text-white">{tracks[i].title}</span>
            </button>
          ))}
        </div>

        <p className="text-[12px] leading-[1.5] text-dim">{t('player.visualizerHint')}</p>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <audio ref={audioRef} src={track.src} preload="none" />

      {/* ── Desktop / tablet: pill in the navbar ── */}
      <div className={`hidden md:flex h-11 items-center gap-2 pl-1.5 pr-1.5 rounded-full border bg-[#0E0E15] transition-colors ${hasUserInteraction ? 'border-accent/40' : 'border-white/10'}`}>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playLabel}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${hasUserInteraction ? 'bg-accent text-ink' : 'bg-surface-3 text-white hover:bg-white/15'}`}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        {hasUserInteraction ? (
          <>
            <EqBars playing={isPlaying} />
            <button
              type="button"
              data-player-toggle
              onClick={() => setPanelOpen((o) => !o)}
              aria-label={t('player.openPanel')}
              aria-expanded={panelOpen}
              className="w-[150px] lg:w-[180px] h-8 text-left truncate text-[13px] font-medium text-white hover:text-accent transition-colors"
            >
              {track.title}
            </button>
            <button type="button" onClick={handleNext} aria-label={t('player.next')} className="w-8 h-8 rounded-full flex items-center justify-center text-soft hover:text-white transition-colors">
              <NextIcon />
            </button>
          </>
        ) : (
          <button
            type="button"
            data-player-toggle
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            className="pr-3 h-8 font-mono text-[12px] text-soft hover:text-white transition-colors"
          >
            {t('player.idle')}
          </button>
        )}
      </div>

      {/* ── Mobile: single play button in the navbar ── */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playLabel}
        className={`md:hidden w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${hasUserInteraction ? 'border-accent/50 text-accent' : 'border-white/10 text-white'}`}
      >
        {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
      </button>

      {/* ── Mobile: docked mini-player, left of the chat launcher ── */}
      {hasUserInteraction && (
        <div className="md:hidden fixed left-3 right-[84px] bottom-4 z-30 rounded-2xl border border-white/10 bg-[#0E0E15] overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]">
          <div className="h-[2px] bg-[#22222E]">
            <div className="h-[2px] bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
            <EqBars playing={isPlaying} />
            <button
              type="button"
              data-player-toggle
              onClick={() => setPanelOpen((o) => !o)}
              aria-label={t('player.openPanel')}
              aria-expanded={panelOpen}
              className="flex-1 min-w-0 h-11 flex flex-col justify-center text-left"
            >
              <span className="text-[13px] font-semibold text-white truncate">{track.title}</span>
              <span className="font-mono text-[10px] text-muted tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </button>
            <button type="button" onClick={togglePlay} aria-label={playLabel} className="shrink-0 w-11 h-11 rounded-full bg-accent text-ink flex items-center justify-center">
              {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </button>
            <button type="button" onClick={handleNext} aria-label={t('player.next')} className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white">
              <NextIcon />
            </button>
          </div>
        </div>
      )}

      {panel}
    </div>
  );
};

export default LocalAudioPlayer;
