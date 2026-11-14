import { Tilt } from 'react-tilt';
import { motion } from 'framer-motion';
import { styles } from '../styles';
import { textVariant, zoomIn } from '../utils/motion';
import { SectionWrapper } from '../hoc';
import { getEducation } from '../constants';
import { useLanguage } from '../context/LanguageContext';

// Degree stands out with the accent; the rest share a neutral badge.
const badgeStyle = {
  degree: 'border-accent/50 text-accent',
  diploma: 'border-white/25 text-white',
  certification: 'border-white/15 text-soft',
};

const EducationCard = ({ item, index, t }) => {
  const inProgress = item.period.includes('Present') || item.period.includes('Presente');

  return (
    <motion.div variants={zoomIn(index * 0.07, 0.5)} className="h-full">
      <Tilt options={{ max: 8, scale: 1.02, speed: 350, glare: false }} className="h-full">
        <div className="h-full flex gap-4 items-start p-5 rounded-2xl bg-surface border border-white/[0.06] hover:border-white/15 transition-colors">
          <span className={`shrink-0 w-[76px] py-1 text-center rounded-md border font-mono text-[11px] ${badgeStyle[item.type] ?? badgeStyle.certification}`}>
            {t(`education.types.${item.type}`)}
          </span>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h3 className="text-[15px] font-semibold leading-[1.4] text-white">{item.degree}</h3>
            <p className="text-[13px] text-muted">{item.institution}</p>
            <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-dim">
              {item.period}
              {inProgress && (
                <span className="inline-flex items-center gap-1.5 text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                  {t('education.inProgress')}
                </span>
              )}
            </p>
          </div>
        </div>
      </Tilt>
    </motion.div>
  );
};

const Education = () => {
  const { t } = useLanguage();
  const education = getEducation(t);

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>{t('education.subtitle')}</p>
        <h2 className={styles.sectionHeadText}>{t('education.title')}</h2>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
        {education.map((item, index) => (
          <EducationCard key={item.degree} item={item} index={index} t={t} />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Education, 'education');
