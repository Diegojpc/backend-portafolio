import { Tilt } from 'react-tilt';
import { motion } from 'framer-motion';
import { styles } from '../styles';
import { textVariant, zoomIn } from '../utils/motion';
import { SectionWrapper } from '../hoc';
import { getEducation } from '../constants';
import { useLanguage } from '../context/LanguageContext';

const typeStyles = {
  degree: {
    border: 'border-yellow-500/35',
    badge: 'bg-yellow-500/15 text-yellow-400',
    shimmer: 'from-transparent via-yellow-500/40 to-transparent',
  },
  diploma: {
    border: 'border-blue-500/35',
    badge: 'bg-blue-500/15 text-blue-400',
    shimmer: 'from-transparent via-blue-500/40 to-transparent',
  },
  certification: {
    border: 'border-[#915EFF]/35',
    badge: 'bg-[#915EFF]/15 text-[#915EFF]',
    shimmer: 'from-transparent via-[#915EFF]/55 to-transparent',
  },
};

const EducationCard = ({ item, index, t }) => {
  const style = typeStyles[item.type] ?? typeStyles.certification;
  const inProgress = item.period.includes('Present') || item.period.includes('Presente');

  return (
    <motion.div variants={zoomIn(index * 0.07, 0.5)}>
      <Tilt options={{ max: 15, scale: 1.03, speed: 350, glare: false }}>
        <div
          className={`relative bg-tertiary rounded-2xl p-5 border ${style.border} flex flex-col gap-3 shadow-card h-full overflow-hidden hover:${style.border.replace('/35', '/60')} transition-colors duration-300`}
        >
          {/* Top shimmer line matching card type color */}
          <span className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${style.shimmer}`} />

          <div className="flex justify-between items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest ${style.badge}`}>
              {t(`education.types.${item.type}`)}
            </span>
            {inProgress && (
              <span className="flex items-center gap-1.5 text-green-400 text-[10px] font-semibold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {t('education.inProgress')}
              </span>
            )}
          </div>

          <h3 className="text-white font-semibold text-[14px] leading-[21px] flex-1">
            {item.degree}
          </h3>

          <div className="mt-auto pt-3 border-t border-white/5">
            <p className="text-secondary text-[13px]">{item.institution}</p>
            <p className="text-secondary/60 text-[12px] mt-1">{item.period}</p>
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

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {education.map((item, index) => (
          <EducationCard key={item.degree} item={item} index={index} t={t} />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Education, 'education');
