import { Tilt } from 'react-tilt';
import { motion } from 'framer-motion';
import { styles } from '../styles';
import { fadeIn, textVariant } from '../utils/motion';
import { SectionWrapper } from '../hoc';
import { getExperiences } from '../constants';
import { useLanguage } from '../context/LanguageContext';

const CardBody = ({ experience }) => (
  <>
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 mb-5">
      <div>
        <h3 className="text-white font-bold text-[21px]">{experience.company}</h3>
        <p className="text-[#915EFF] text-[15px] font-medium mt-0.5">{experience.title}</p>
      </div>
      <p className="text-secondary text-[13px] font-medium whitespace-nowrap sm:text-right pt-1">
        {experience.period}
      </p>
    </div>
    <ul className="space-y-3">
      {experience.points.map((point, i) => (
        <li key={i} className="text-white-100 text-[14px] leading-[22px] flex gap-3">
          <span className="mt-[9px] shrink-0 w-1.5 h-1.5 rounded-full bg-[#915EFF]" />
          {point}
        </li>
      ))}
    </ul>
  </>
);

const ExperienceItem = ({ experience, index }) => {
  const isLeft = index % 2 === 0;

  const baseCard =
    'relative bg-tertiary rounded-2xl p-6 border border-[#915EFF]/25 hover:border-[#915EFF]/55 shadow-card transition-colors duration-300 overflow-hidden h-full';

  /* Subtle purple shimmer line at top of card */
  const shimmer = (
    <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#915EFF]/60 to-transparent" />
  );

  /* Mobile card — slides up */
  const mobileCard = (
    <motion.div
      variants={fadeIn('up', 'spring', index * 0.3, 0.75)}
      className={baseCard}
    >
      {shimmer}
      <CardBody experience={experience} />
    </motion.div>
  );

  /* Desktop card — converges toward the center line */
  const desktopCard = (
    <Tilt options={{ max: 10, scale: 1.02, speed: 400, glare: false }}>
      <motion.div
        variants={fadeIn(isLeft ? 'left' : 'right', 'spring', index * 0.3, 0.75)}
        className={baseCard}
      >
        {shimmer}
        <CardBody experience={experience} />
      </motion.div>
    </Tilt>
  );

  const dot = (
    <div className="w-[15px] h-[15px] rounded-full bg-[#915EFF] ring-4 ring-[#915EFF]/20 shadow-[0_0_16px_6px_rgba(145,94,255,0.45)] shrink-0" />
  );

  return (
    <div className="relative mb-10 last:mb-0">
      {/* ── Mobile layout ── */}
      <div className="md:hidden relative pl-10">
        {/* left vertical line segment */}
        <div className="absolute left-[6px] top-0 bottom-0 w-px bg-gradient-to-b from-[#915EFF] via-[#915EFF]/30 to-transparent" />
        {/* dot positioned on line */}
        <div className="absolute -left-[1px] top-[22px]">{dot}</div>
        {mobileCard}
      </div>

      {/* ── Desktop layout: 3-column grid ── */}
      <div className="hidden md:grid md:grid-cols-[1fr_56px_1fr] md:items-start">
        {/* Left card */}
        <div className="pr-6 flex justify-end">
          {isLeft && <div className="w-full max-w-[500px]">{desktopCard}</div>}
        </div>

        {/* Center dot, z-10 so it sits above the absolute line */}
        <div className="flex justify-center pt-[24px] relative z-10">
          {dot}
        </div>

        {/* Right card */}
        <div className="pl-6">
          {!isLeft && <div className="w-full max-w-[500px]">{desktopCard}</div>}
        </div>
      </div>
    </div>
  );
};

const Experience = () => {
  const { t } = useLanguage();
  const experiences = getExperiences(t);

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>{t('experience.subtitle')}</p>
        <h2 className={styles.sectionHeadText}>{t('experience.title')}</h2>
      </motion.div>

      <div className="mt-14 relative">
        {/* Desktop: continuous center line */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-[#915EFF] via-[#915EFF]/20 to-transparent pointer-events-none" />

        {experiences.map((exp, index) => (
          <ExperienceItem key={exp.company} experience={exp} index={index} />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Experience, 'experience');
