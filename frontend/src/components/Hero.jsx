import { styles } from '../styles'
import { useLanguage } from '../context/LanguageContext'

const Hero = () => {
  const { t } = useLanguage();
  return (
    <section className="relative w-full h-screen mx-auto flex justify-center items-center">
      <div className={`absolute inset-0 top-[120px]  max-w-7xl mx-auto ${styles.paddingX} flex flex-row items-start gap-5`}>
        <div className={`${styles.paddingX} max-w-7xl mx-auto flex flex-col items-center justify-center h-screen`} style={{ marginTop: '-120px' }}>
          <h1 className={`${styles.heroHeadText} text-center`}>
            {t('hero.titlePrefix')} <span className="text-[#915EFF]">{t('hero.name')}</span>
          </h1>
          <p className={`${styles.heroSubText} mt-2 text-secondary text-center`}>
            {t('hero.subtitle')}
          </p>
        </div>
      </div>
    </section>
    
  )
}

export default Hero