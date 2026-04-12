import { useRef, useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStop, faForward, faBackward, faVolumeUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';

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

const LocalAudioPlayer = ({ setAudioElement }) => {
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [hasUserInteraction, setHasUserInteraction] = useState(false);

  const getSongTitle = (songPath) => {
    const fileName = songPath.split('/').pop();
    return fileName.replace(/\.[^/.]+$/, "");
  };

  const currentSongTitle = getSongTitle(songs[currentSongIndex]);

  // FIX: Named function reference so cleanup actually works
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => setAudioElement(audio);
    audio.addEventListener('loadeddata', handleLoaded);
    
    // Attempt autoplay immediately
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.warn("[LocalAudioPlayer] Autoplay blocked by browser. User interaction required.", err);
    });

    return () => audio.removeEventListener('loadeddata', handleLoaded);
  }, [setAudioElement]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [currentSongIndex]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Stable reference for handleNext to avoid stale closures in event listeners
  const handleNext = useCallback(() => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % songs.length);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentSongIndex((prevIndex) => (prevIndex - 1 + songs.length) % songs.length);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleSongEnd = () => handleNext();
    const handleLoad = () => setDuration(audio.duration);
    const handleCanPlay = () => {
      if (isPlaying && hasUserInteraction) {
        audio.play().catch((error) => {
          console.error("[LocalAudioPlayer] Error playing after load:", error);
          setIsPlaying(false);
        });
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('loadedmetadata', handleLoad);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('loadedmetadata', handleLoad);
    };
  }, [currentSongIndex, isPlaying, hasUserInteraction, handleNext]);

  const handlePlay = () => {
    setHasUserInteraction(true);
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        setCurrentTime(audioRef.current.currentTime);
      })
      .catch((error) => {
        console.error("[LocalAudioPlayer] Error playing audio:", error);
        setIsPlaying(false);
      });
  };

  const handlePause = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleVolumeChange = (event) => {
    const newVolume = event.target.value;
    setVolume(newVolume);
    audioRef.current.volume = newVolume / 100;
  };

  const handleProgressChange = (event) => {
    const newTime = event.target.value;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 1000);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleVolumeClick = (event) => {
    event.stopPropagation();
    setShowVolumeControl(!showVolumeControl);
    setShowProgress(false);
  };

  const handleProgressClick = (event) => {
    event.stopPropagation();
    setShowProgress(!showProgress);
    setShowVolumeControl(false);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto relative">
      <audio ref={audioRef} src={songs[currentSongIndex]} autoPlay />
      <div className="flex items-center space-x-4 mx-auto">
        <button onClick={handlePrev} className="text-white hover:text-gray-400">
          <FontAwesomeIcon icon={faBackward} />
        </button>
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="text-white hover:text-gray-400"
        >
          <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
        </button>
        <button onClick={handleStop} className="text-white hover:text-gray-400">
          <FontAwesomeIcon icon={faStop} />
        </button>
        <button onClick={handleNext} className="text-white hover:text-gray-400">
          <FontAwesomeIcon icon={faForward} />
        </button>

        {!isSmallScreen && (
          <div className="flex-grow">
            <input
              type="range"
              min="0"
              max={duration || 1}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-2 bg-gray-200 accent-white rounded-lg focus:outline-none"
            />
          </div>
        )}

        <span className="text-white font-bold text-sm w-12 text-center tabular-nums shrink-0">{formatTime(currentTime)}</span>

        <div className="relative">
          <FontAwesomeIcon
            icon={faVolumeUp}
            onClick={handleVolumeClick}
            className="text-white hover:text-gray-400 cursor-pointer"
          />
          {showVolumeControl && (
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className={`absolute w-24 bottom-[5px] left-[30px] bg-gray-200 accent-white rounded-lg focus:outline-none ${isSmallScreen ? '-rotate-90 translate-y-[65px] translate-x-[-70px]' : 'none'}`}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {isSmallScreen && (
          <FontAwesomeIcon
            icon={faChevronDown}
            onClick={handleProgressClick}
            className="text-white hover:text-gray-400 cursor-pointer"
          />
        )}
      </div>

      {isSmallScreen && showProgress && (
        <div className="absolute top-12 left-0 w-full bg-transparent p-5 progress-container">
          <input
            type="range"
            min="0"
            max={duration || 1}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-2 bg-gray-200 accent-white rounded-lg focus:outline-none"
          />
        </div>
      )}

      {/* Replaced deprecated <marquee> with CSS animation */}
      <div className="text-white text-center mt-1 overflow-hidden">
        <div className={`mx-auto absolute ${isSmallScreen ? 'w-40' : ''}`}>
          <div className="animate-marquee whitespace-nowrap">
            {currentSongTitle}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalAudioPlayer;