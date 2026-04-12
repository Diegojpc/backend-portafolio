import { motion } from 'framer-motion';
import { styles } from '../styles';
import { fadeIn, textVariant } from '../utils/motion'
import { SectionWrapper } from '../hoc';
import { useLanguage } from '../context/LanguageContext';

const About = () => {
  const { t } = useLanguage();
  return (
    <>
      <motion.div
      variants={textVariant()}>
        <p className={styles.sectionSubText}>{t('about.intro')}</p>
        <h2 className={styles.sectionHeadText}>{t('about.overview')}</h2>
      </motion.div>

      <motion.div 
        variants={fadeIn("", "", 0.1, 1)}
        className='mt-4 text-white text-justify text-[17px] max-w-3xl leading-[30px] flex flex-col gap-6'
      >
        <p dangerouslySetInnerHTML={{ __html: t('about.text1') }} />
        <p dangerouslySetInnerHTML={{ __html: t('about.text2') }} />
      </motion.div>
    </>
  )
}

export default SectionWrapper(About, "about")