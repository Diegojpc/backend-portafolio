import { motion } from 'framer-motion';
import { styles } from '../styles';
import { fadeIn, textVariant } from '../utils/motion'
import { SectionWrapper } from '../hoc';
import { useLanguage } from '../context/LanguageContext';

const CHIPS = ['chip1', 'chip2', 'chip3'];

const About = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
      <motion.div variants={textVariant()} className="lg:flex-1">
        <p className={styles.sectionSubText}>{t('about.intro')}</p>
        <h2 className={styles.sectionHeadText}>{t('about.overview')}</h2>
      </motion.div>

      <motion.div
        variants={fadeIn("", "", 0.1, 1)}
        className="lg:flex-1 flex flex-col gap-5 text-[16px] sm:text-[17px] leading-[1.7] text-soft [&_strong]:text-white [&_strong]:font-medium"
      >
        <p dangerouslySetInnerHTML={{ __html: t('about.text1') }} />
        <p dangerouslySetInnerHTML={{ __html: t('about.text2') }} />
        <ul className="flex flex-wrap gap-2 mt-1">
          {CHIPS.map((c) => (
            <li key={c} className="px-3.5 py-2 rounded-full border border-white/10 font-mono text-[12px] text-white">
              {t(`about.${c}`)}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  )
}

export default SectionWrapper(About, "about")
