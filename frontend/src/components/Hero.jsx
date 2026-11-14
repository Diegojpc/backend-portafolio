import { styles } from '../styles';
import { useLanguage } from '../context/LanguageContext';
import { OPEN_CHAT_EVENT } from '../utils/events';
import { RESUME } from '../constants';

const FACTS = ['f1', 'f2', 'f3', 'f4'];

const Hero = ({ isLoaded }) => {
  const { t, language } = useLanguage();
  const cv = RESUME[language] ?? RESUME.es;

  const openChat = () => {
    console.info('[Hero] "Talk to my AI" clicked, opening chat widget.');
    window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
  };

  return (
    <section className="relative w-full min-h-screen flex flex-col justify-center pt-32 pb-16 sm:pb-20 px-6 sm:px-16">
      {/* Soft scrim between the WaveCanvas and the copy, so the headline stays readable
          while the waves remain visible around it. z-[5]: above the canvas, below the text. */}
      <div
        aria-hidden="true"
        className="hero-scrim pointer-events-none absolute inset-0 z-[5]"
      />
      {/* z-10: the WaveCanvas is an absolutely positioned later sibling in App.jsx */}
      <div
        className="relative z-10 w-full max-w-[1200px] mx-auto flex flex-col gap-6 sm:gap-7 transition-opacity duration-1000 ease-in-out"
        style={{ opacity: isLoaded ? 1 : 0, pointerEvents: isLoaded ? 'auto' : 'none' }}
      >
        {/* Roles separated by " · ": each one is kept on a single line so narrow screens wrap between roles, not inside one. */}
        <p className="flex items-start gap-2.5 font-mono text-[11px] sm:text-[13px] tracking-[0.04em] text-soft">
          <span className="w-2 h-2 mt-[0.4em] shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span className="flex flex-wrap gap-x-2">
            {t('hero.eyebrow').split(' · ').map((role, i) => (
              <span key={role} className="whitespace-nowrap">
                {i > 0 && <span className="text-dim" aria-hidden="true">·&nbsp;</span>}
                {role}
              </span>
            ))}
          </span>
        </p>

        <h1 className={`${styles.heroHeadText} max-w-[1000px]`}>
          {t('hero.titleA')}
          <br />
          <span className="text-dim">{t('hero.titleB')}</span>{' '}
          <span className="text-accent">{t('hero.titleHighlight')}</span>
          <span className="text-dim">.</span>
        </h1>

        <p className={`${styles.heroSubText} max-w-[560px]`}>{t('hero.subtitle')}</p>

        <div className="flex flex-col xs:flex-row flex-wrap gap-3 mt-2">
          <a
            href="#projects"
            className="h-[52px] inline-flex items-center justify-center gap-2.5 px-6 rounded-full bg-accent text-ink font-semibold text-[15px] hover:brightness-110 transition"
          >
            {t('hero.ctaProjects')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
          <button
            type="button"
            onClick={openChat}
            className="h-[52px] inline-flex items-center justify-center gap-2.5 px-6 rounded-full border border-white/15 text-white font-medium text-[15px] hover:border-accent/60 hover:text-accent transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            {t('hero.ctaAI')}
          </button>
          <a
            href={cv.href}
            download={cv.name}
            target="_blank"
            rel="noopener noreferrer"
            className="h-[52px] inline-flex items-center justify-center gap-2 px-3 text-soft text-[15px] hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M5 20h14" /></svg>
            {t('hero.ctaCv')}
          </a>
        </div>
      </div>

      <dl
        className="relative z-10 w-full max-w-[1200px] mx-auto mt-14 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden transition-opacity duration-1000 delay-300"
        style={{ opacity: isLoaded ? 1 : 0 }}
      >
        {FACTS.map((f) => (
          <div key={f} className="bg-[rgba(11,11,17,0.92)] px-4 sm:px-6 py-4 sm:py-5 flex flex-col-reverse gap-1.5">
            <dt className="text-[12px] sm:text-[13px] leading-snug text-muted">{t(`hero.facts.${f}.label`)}</dt>
            <dd className="font-display text-[20px] sm:text-[28px] font-semibold text-white">{t(`hero.facts.${f}.value`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default Hero;
