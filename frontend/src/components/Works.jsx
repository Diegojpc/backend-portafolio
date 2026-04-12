import { Tilt } from 'react-tilt';
import { motion } from 'framer-motion';

import { styles } from '../styles';
import { github } from '../assets';
import { SectionWrapper } from '../hoc';
import { projects } from "../constants";
import { fadeIn, textVariant } from '../utils/motion';

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
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>My work</p>
        <h2 className={styles.sectionHeadText}>Projects.</h2>
      </motion.div>

      <div className='w-full flex'>
        <motion.div
          variants={fadeIn("", "", 0.1, 1)}
          className='mt-3 text-white text-[17px] max-w-3xl leading-[30px] text-justify'
        >
          <p>
          My portfolio is a curated collection of projects at the intersection of <strong>Artificial Intelligence</strong>, <strong>Data Science</strong>, and <strong>Full-Stack Development</strong>. Here, you will see how I translate complex technical challenges into practical, high-impact solutions.
          <br /><br />
          The projects showcase:
          </p>
          <ul className='list-disc ml-5 mt-2'>
            <li>
              <strong>Generative AI & LLMs</strong>: Applications built with cutting-edge tools like <strong>LangChain</strong> to create sophisticated Retrieval-Augmented Generation (RAG) systems and intelligent conversational AI.
            </li>
            <li>
              <strong>Data Science & Machine Learning</strong>: From predictive models built with <strong>Scikit-learn</strong> and <strong>TensorFlow</strong> to data automation scripts that streamline complex statistical processes in <strong>Python</strong>.
            </li>
            <li>
              <strong>Business Intelligence & Visualization</strong>: Dynamic dashboards developed in <strong>Power BI</strong> that transform raw data into clear, strategic insights for decision-making.
            </li>
          </ul>
          <br />
          Each project reflects my commitment to building robust, scalable, and efficient technology that delivers tangible results. Dive in to explore my work.
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