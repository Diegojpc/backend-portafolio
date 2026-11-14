import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { styles } from '../styles';
import { SectionWrapper } from '../hoc';
import { getProjects } from '../constants';
import { fadeIn, textVariant } from '../utils/motion';
import { useLanguage } from '../context/LanguageContext';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
);

const ChevronIcon = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

// Card width: one and a bit on phones (the peek of the next card says "swipe"), two on tablets, three on desktop.
// gap-5 = 20px, hence the calc() offsets.
const CARD_WIDTH = 'w-[86%] sm:w-[70%] md:w-[calc((100%_-_20px)/2)] lg:w-[calc((100%_-_40px)/3)]';

const ProjectCard = ({ index, name, description, tags, image, codeUrl, liveUrl, t }) => (
  <motion.li
    variants={fadeIn('up', 'spring', Math.min(index, 3) * 0.15, 0.75)}
    className={`${CARD_WIDTH} shrink-0 snap-start list-none`}
  >
    <article className="group h-full flex flex-col rounded-[22px] border border-white/10 bg-surface hover:border-accent/40 transition-colors overflow-hidden">
      <div className="aspect-[16/10] overflow-hidden bg-surface-2">
        <img
          src={image}
          alt=""
          loading="lazy"
          width="800"
          height="500"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex-1 flex flex-col gap-3.5 p-5 sm:p-6">
        <h3 className="font-display text-[22px] font-semibold text-white">{name}</h3>
        <p className="flex-1 text-[14px] leading-[1.65] text-muted">{description}</p>
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag} className="px-2 py-1 rounded-md bg-surface-2 font-mono text-[11px] text-soft">
              #{tag}
            </li>
          ))}
        </ul>
        <div className="mt-1 flex flex-wrap gap-x-5">
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 inline-flex items-center gap-2 text-[14px] font-medium text-accent hover:gap-3 transition-all"
            >
              {t('projects.viewSite')}
              <ExternalIcon />
            </a>
          )}
          {codeUrl && (
            <a
              href={codeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`h-11 inline-flex items-center gap-2 text-[14px] font-medium hover:gap-3 transition-all ${liveUrl ? 'text-soft hover:text-white' : 'text-accent'}`}
            >
              {t('projects.viewCode')}
              <ArrowIcon />
            </a>
          )}
        </div>
      </div>
    </article>
  </motion.li>
);

const NavButton = ({ dir, disabled, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="w-11 h-11 rounded-full border border-white/15 text-white flex items-center justify-center transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-30 disabled:pointer-events-none"
  >
    <ChevronIcon dir={dir} />
  </button>
);

const Works = () => {
  const { t } = useLanguage();
  const projects = getProjects(t);
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false, progress: 0, overflow: false });

  // Reads the scroll position into state: drives the arrows' disabled state, the edge fades and the progress bar.
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const overflow = max > 8;
    const next = {
      overflow,
      start: el.scrollLeft <= 8,
      end: el.scrollLeft >= max - 8,
      progress: overflow ? el.scrollLeft / max : 1,
    };
    setEdges((prev) => (prev.start === next.start && prev.end === next.end && prev.overflow === next.overflow && Math.abs(prev.progress - next.progress) < 0.01 ? prev : next));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    console.info('[Works] Carousel mounted', { projects: projects.length });
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure, projects.length]);

  const scrollByPage = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    // One "page" = the visible width minus a card's peek, so the next card lands flush left (snap does the rest).
    const delta = el.clientWidth * 0.9 * direction;
    console.debug('[Works] Carousel nav', { direction, from: Math.round(el.scrollLeft), delta: Math.round(delta) });
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Fades only on the sides that still have cards, so the edge itself tells the visitor there is more.
  const fade = edges.overflow
    ? `linear-gradient(to right, ${edges.start ? '#000' : 'transparent'} 0, #000 ${edges.start ? '0' : '48px'}, #000 calc(100% - ${edges.end ? '0px' : '48px'}), ${edges.end ? '#000' : 'transparent'} 100%)`
    : 'none';

  return (
    <>
      <div className="flex flex-wrap justify-between items-end gap-5">
        <motion.div variants={textVariant()}>
          <p className={styles.sectionSubText}>{t('projects.subtitle')}</p>
          <h2 className={styles.sectionHeadText}>{t('projects.title')}</h2>
          <p className="mt-4 max-w-[560px] text-[16px] leading-[1.6] text-muted">{t('projects.intro')}</p>
        </motion.div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Diegojpc"
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 inline-flex items-center gap-2 px-5 rounded-full border border-white/15 text-[14px] text-white hover:border-accent/60 hover:text-accent transition-colors"
          >
            {t('projects.allGithub')}
            <ExternalIcon />
          </a>
          {edges.overflow && (
            <>
              <NavButton dir="prev" disabled={edges.start} onClick={() => scrollByPage(-1)} label={t('projects.prev')} />
              <NavButton dir="next" disabled={edges.end} onClick={() => scrollByPage(1)} label={t('projects.next')} />
            </>
          )}
        </div>
      </div>

      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={t('projects.carousel')}
        className="no-scrollbar mt-10 sm:mt-12 -mx-1 px-1 py-1 flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent/60 rounded-[24px]"
        style={{ WebkitMaskImage: fade, maskImage: fade }}
      >
        {projects.map((project, index) => (
          <ProjectCard key={project.id} index={index} t={t} {...project} />
        ))}
      </ul>

      {edges.overflow && (
        <div className="mt-6 h-[2px] rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-200"
            style={{ width: `${Math.max(12, edges.progress * 100)}%` }}
          />
        </div>
      )}
    </>
  );
};

export default SectionWrapper(Works, 'projects');
