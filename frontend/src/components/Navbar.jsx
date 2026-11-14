import { useState, memo } from 'react';
import { Link } from 'react-router-dom';

import { getNavLinks } from '../constants';
import { LocalAudioPlayer } from './canvas';
import { useLanguage } from '../context/LanguageContext';

// No backdrop-filter on the bar: it would become the containing block for the
// player's position:fixed mini-player and panel on mobile.
const Navbar = memo(({ setAudioElement }) => {
  const [active, setActive] = useState('');
  const [toggle, setToggle] = useState(false);
  const { t, language, toggleLanguage } = useLanguage();
  const navLinks = getNavLinks(t);
  const nextLangLabel = language === 'en' ? 'Cambiar a español' : 'Switch to English';

  return (
    <header className="fixed top-0 inset-x-0 z-20 px-3 sm:px-6 pt-3 sm:pt-5">
      <nav
        aria-label="Main"
        className="max-w-[1200px] mx-auto flex items-center justify-between gap-3 pl-3 sm:pl-4 pr-1.5 py-1.5 rounded-full border border-white/10 bg-[rgba(14,14,21,0.85)]"
      >
        <Link
          to="/"
          aria-label="Diego J. Peña C."
          className="flex items-center gap-2.5 shrink-0 min-h-[44px] min-w-[44px]"
          onClick={() => {
            setActive('');
            window.scrollTo(0, 0);
          }}
        >
          <img src="/favicon.svg" alt="" width="32" height="32" className="w-8 h-8 rounded-[9px]" />
          <span className="hidden sm:block font-display font-semibold text-[16px] tracking-[-0.01em] text-white">Diego J. Peña C.</span>
        </Link>

        <ul className="hidden xl:flex min-w-0 list-none items-center gap-0.5 text-[14px]">
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={() => setActive(link.title)}
                className={`block whitespace-nowrap px-3 py-2.5 rounded-full transition-colors ${active === link.title ? 'text-white bg-white/5' : 'text-soft hover:text-white'}`}
              >
                {link.title}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LocalAudioPlayer setAudioElement={setAudioElement} />

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={nextLangLabel}
            className="hidden xl:flex shrink-0 whitespace-nowrap h-11 min-w-[44px] px-3 items-center justify-center rounded-full border border-white/10 font-mono text-[12px] text-white hover:bg-white/5 transition-colors"
          >
            {language.toUpperCase()} <span className="text-dim">&nbsp;/ {language === 'en' ? 'ES' : 'EN'}</span>
          </button>

          <div className="xl:hidden relative">
            <button
              type="button"
              onClick={() => setToggle(!toggle)}
              aria-label={toggle ? 'Close menu' : 'Open menu'}
              aria-expanded={toggle}
              className="w-11 h-11 rounded-full bg-white text-ink flex items-center justify-center"
            >
              {toggle ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 8h16M4 16h16" /></svg>
              )}
            </button>

            {toggle && (
              <div className="absolute top-full right-0 mt-3 min-w-[220px] p-2 rounded-2xl border border-white/10 bg-[#0E0E15] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] z-10">
                <ul className="list-none flex flex-col">
                  {navLinks.map((link) => (
                    <li key={link.id}>
                      <a
                        href={`#${link.id}`}
                        onClick={() => {
                          setToggle(false);
                          setActive(link.title);
                        }}
                        className={`block px-4 py-3 rounded-xl text-[15px] transition-colors ${active === link.title ? 'text-white bg-white/5' : 'text-soft hover:text-white hover:bg-white/5'}`}
                      >
                        {link.title}
                      </a>
                    </li>
                  ))}
                  <li className="mt-1 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        toggleLanguage();
                        setToggle(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl font-mono text-[13px] text-white hover:bg-white/5 transition-colors"
                    >
                      {language === 'en' ? 'ESPAÑOL' : 'ENGLISH'}
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
