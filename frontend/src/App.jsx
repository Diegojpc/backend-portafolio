// src/App.jsx

import { BrowserRouter } from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from 'react';
import { Hero, Navbar } from './components';

import ChatWidget from './components/chat/ChatWidget';

const About   = lazy(() => import("./components/About"));
const Tech    = lazy(() => import("./components/Tech"));
const Works   = lazy(() => import("./components/Works"));
const Contact = lazy(() => import("./components/Contact"));
const Footer  = lazy(() => import("./components/Footer"));

const WaveCanvas  = lazy(() => import("./components/canvas/Waves"));
const StarsCanvas = lazy(() => import("./components/canvas/Stars"));

/**
 * Dismiss the pure-HTML splash screen injected in index.html.
 * Waits one animation frame so the browser has painted at least
 * the Hero + Navbar before the overlay fades out.
 */
const dismissSplash = () => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    splash.style.opacity = '0';
    splash.style.visibility = 'hidden';
    // Remove from DOM after the CSS transition completes
    setTimeout(() => splash.remove(), 600);
    console.info('[App] Splash screen dismissed.');
  });
};

const App = () => {
  const [audioElement, setAudioElement] = useState(null);
  const [wavesLoaded, setWavesLoaded] = useState(false);

  useEffect(() => {
    dismissSplash();

    // 3-second safety fail-safe timeout
    const fallbackTimeout = setTimeout(() => {
      setWavesLoaded((loaded) => {
        if (!loaded) {
          console.warn('[App] WebGL wave loading timed out. Forcing Hero fade-in.');
          return true;
        }
        return loaded;
      });
    }, 3000);

    return () => clearTimeout(fallbackTimeout);
  }, []);

  const handleWavesReady = () => {
    setWavesLoaded(true);
    console.info('[App] Waves loaded callback received.');
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="relative z-0 bg-primary">
        <div className="bg-primary bg-cover bg-no-repeat bg-center relative">
          <Navbar setAudioElement={setAudioElement} />
          <Hero isLoaded={wavesLoaded} />
          <div className="absolute inset-0 flex flex-col justify-between">
            <Suspense fallback={null}>
              <WaveCanvas onReady={handleWavesReady} />
            </Suspense>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-black pointer-events-none">
            </div>
          </div>
        </div>
        <Suspense fallback={null}>
          <About />
          <Tech />
          <Works />
          <div className="relative z-0">
            <Contact audioElement={audioElement} />
            <Footer />
            <StarsCanvas />
          </div>
        </Suspense>
      </div>
      <ChatWidget />
    </BrowserRouter>
  )
}

export default App;