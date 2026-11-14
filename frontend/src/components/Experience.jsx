import { motion } from 'framer-motion';
import { styles } from '../styles';
import { fadeIn, textVariant } from '../utils/motion';
import { SectionWrapper } from '../hoc';
import { getExperiences } from '../constants';
import { useLanguage } from '../context/LanguageContext';

const ExperienceRow = ({ experience, index }) => (
  <motion.article
    variants={fadeIn('up', 'spring', index * 0.25, 0.75)}
    className="group flex flex-col md:flex-row gap-4 md:gap-8 py-8 sm:py-9 border-t border-white/10"
  >
    <div className="md:basis-1/3 flex flex-col gap-1.5">
      <h3 className="font-display text-[24px] sm:text-[26px] font-semibold text-white group-hover:text-accent transition-colors">
        {experience.company}
      </h3>
      <p className="font-mono text-[12px] uppercase tracking-[0.04em] text-muted">{experience.period}</p>
    </div>
    <div className="md:basis-2/3 flex flex-col gap-3.5">
      <p className="text-[17px] sm:text-[18px] font-semibold text-accent">{experience.title}</p>
      <ul className="flex flex-col gap-2.5">
        {experience.points.map((point, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-[1.65] text-soft">
            <span className="mt-[11px] shrink-0 w-1 h-1 rounded-full bg-white/40" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  </motion.article>
);

const Experience = () => {
  const { t } = useLanguage();
  const experiences = getExperiences(t);

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>{t('experience.subtitle')}</p>
        <h2 className={styles.sectionHeadText}>{t('experience.title')}</h2>
      </motion.div>

      <div className="mt-10 sm:mt-12 border-b border-white/10">
        {experiences.map((exp, index) => (
          <ExperienceRow key={exp.company} experience={exp} index={index} />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Experience, 'experience');
