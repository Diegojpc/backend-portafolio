import { Tilt } from 'react-tilt';
import { motion } from 'framer-motion';

import { styles } from '../styles';
import { SectionWrapper } from '../hoc';
import { getProjects } from "../constants";
import { fadeIn, textVariant } from '../utils/motion';
import { useLanguage } from '../context/LanguageContext';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const ProjectCard = ({ index, name, description, tags, image, source_code_link, viewCode }) => (
  <motion.div variants={fadeIn("up", "spring", index * 0.3, 0.75)} className="h-full">
    <Tilt
      options={{ max: 10, scale: 1.02, speed: 450 }}
      className="group h-full flex flex-col rounded-[22px] border border-white/10 bg-surface hover:border-accent/40 transition-colors overflow-hidden"
    >
      <div className="aspect-[16/10] overflow-hidden bg-surface-2">
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex-1 flex flex-col gap-3.5 p-5 sm:p-6">
        <h3 className="font-display text-[22px] font-semibold text-white">{name}</h3>
        <p className="flex-1 text-[14px] leading-[1.65] text-muted">{description}</p>
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag.name} className="px-2 py-1 rounded-md bg-surface-2 font-mono text-[11px] text-soft">
              #{tag.name}
            </li>
          ))}
        </ul>
        <a
          href={source_code_link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 h-11 inline-flex items-center gap-2 text-[14px] font-medium text-accent hover:gap-3 transition-all"
        >
          {viewCode}
          <ArrowIcon />
        </a>
      </div>
    </Tilt>
  </motion.div>
);

const Works = () => {
  const { t } = useLanguage();
  const projects = getProjects(t);
  return (
    <>
      <div className="flex flex-wrap justify-between items-end gap-5">
        <motion.div variants={textVariant()}>
          <p className={styles.sectionSubText}>{t('projects.subtitle')}</p>
          <h2 className={styles.sectionHeadText}>{t('projects.title')}</h2>
          <p className="mt-4 max-w-[560px] text-[16px] leading-[1.6] text-muted">{t('projects.intro')}</p>
        </motion.div>
        <a
          href="https://github.com/Diegojpc"
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 inline-flex items-center gap-2 px-5 rounded-full border border-white/15 text-[14px] text-white hover:border-accent/60 hover:text-accent transition-colors"
        >
          {t('projects.allGithub')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
        </a>
      </div>

      <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project, index) => (
          <ProjectCard key={`project-${index}`} index={index} viewCode={t('projects.viewCode')} {...project} />
        ))}
      </div>
    </>
  )
}

export default SectionWrapper(Works, "projects")
