// src/App.jsx

import { BrowserRouter } from "react-router-dom";
import { useState, Suspense, lazy } from 'react';
import { About, Contact, Footer, Hero, Navbar, Tech, Works } from './components';

const WaveCanvas = lazy(() => import("./components/canvas/Waves"));
const StarsCanvas = lazy(() => import("./components/canvas/Stars"));

const App = () => {
  const [audioElement, setAudioElement] = useState(null);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="relative z-0 bg-primary">
        <div className="bg-primary bg-cover bg-no-repeat bg-center relative">
          <Navbar setAudioElement={setAudioElement} />
          <Hero />
          <div className="absolute inset-0 flex flex-col justify-between">
            <Suspense fallback={<div>Loading WaveCanvas...</div>}>
              <WaveCanvas />
            </Suspense>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-black pointer-events-none">
            </div>
          </div>
        </div>
        <About />
        <Tech />
        <Works />
        <div className="relative z-0">
          <Contact audioElement={audioElement} />
          <Footer />
          <Suspense fallback={<div>Loading StarsCanvas...</div>}>
            <StarsCanvas />
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App;