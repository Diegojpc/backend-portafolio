import { Tilt } from 'react-tilt';
import { motion } from 'framer-motion';

import { styles } from '../styles';
import { github } from '../assets';
import { SectionWrapper } from '../hoc';
import { getProjects } from "../constants";
import { fadeIn, textVariant } from '../utils/motion';
import { useLanguage } from '../context/LanguageContext';

const ProjectCard = ({ index, name, description, tags, image, source_code_link }) => {
  return (
    <motion.div variants={fadeIn("up", "spring", index * 0.5, 0.75)}>
      <Tilt
        options={{
          max:45,
          scale: 1,
          speed: 450
        }}
        className="bg-gradient-to-t from-transparent via-transparent to-white p-5 rounded-2xl w-full max-w-[360px]"
      >
        <div className='relative w-full h-[230px]'>
          <img
            src={image}
            alt={name}
            className='w-full h-full object-cover rounded-2xl'
          />
          <div className='absolute inset-0 flex justify-end m-3 card_img_hover'>
            <div
              onClick={() => window.open
              (source_code_link, "_blank")}
              className='black-gradient w-10 h-10 rounded-full flex justify-center items-center cursor-pointer'
            >
              <img
                src={github}
                alt="github"
                className='w-1/2 h-1/2 object-contain'
              />
            </div>
          </div>
        </div>

        <div className='mt-5'>
          <h3 className='text-white font-bold text-[24px]'>{name}</h3>
          <p className='mt-2 text-white text-[14px]'>{description}</p>
        </div>

        <div className='mt-4 flex flex-wrap gap-2'>
          {tags.map((tag) => (
            <p key={tag.name} className={`text-[14px] ${tag.color}`}>
              #{tag.name}
            </p>
          ))}

        </div>

      </Tilt>
    </motion.div>
  )
}

const Works = () => {
  const { t } = useLanguage();
  const projects = getProjects(t);
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>{t('projects.subtitle')}</p>
        <h2 className={styles.sectionHeadText}>{t('projects.title')}</h2>
      </motion.div>

      <div className='w-full flex'>
        <motion.div
          variants={fadeIn("", "", 0.1, 1)}
          className='mt-3 text-white text-[17px] max-w-3xl leading-[30px] text-justify'
        >
          <p>
            <span dangerouslySetInnerHTML={{ __html: t('projects.text1') }} />
            <br /><br />
            {t('projects.text2')}
          </p>
          <ul className='list-disc ml-5 mt-2'>
            <li dangerouslySetInnerHTML={{ __html: t('projects.li1') }} />
            <li className="mt-2" dangerouslySetInnerHTML={{ __html: t('projects.li2') }} />
            <li className="mt-2" dangerouslySetInnerHTML={{ __html: t('projects.li3') }} />
          </ul>
          <br />
          <p dangerouslySetInnerHTML={{ __html: t('projects.text3') }} />
        </motion.div>
      </div>

      <div className='mt-20 flex flex-wrap gap-7 justify-center w-full'>
        {projects.map((project, index) => (
          <ProjectCard key={`project-${index}`} index={index} {...project} />
        ))}
      </div>
    </>
  )
}

export default SectionWrapper(Works, "projects")