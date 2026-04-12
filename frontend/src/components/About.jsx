import { motion } from 'framer-motion';
import { styles } from '../styles';
import { fadeIn, textVariant } from '../utils/motion'
import { SectionWrapper } from '../hoc';

const About = () => {
  return (
    <>
      <motion.div
      variants={textVariant()}>
        <p className={styles.sectionSubText}>Introduction</p>
        <h2 className={styles.sectionHeadText}>Overview.</h2>
      </motion.div>

      <motion.p 
        variants={fadeIn("", "", 0.1, 1)}
        className='mt-4 text-white text-justify text-[17px] max-w-3xl leading-[30px]'
      >
        Hello! I'm Diego, an AI Engineer and Data Scientist driven by a passion for technology and optimization. With a foundation in Acoustic Engineering, I bridge the gap between complex domains and practical, high-impact AI solutions.

        I specialize in the end-to-end development of AI systems—from crafting predictive models with <strong>Scikit-learn</strong> and <strong>TensorFlow</strong> to building robust APIs with <strong>FastAPI</strong>. My recent work has focused on the frontier of generative AI, where I've implemented <strong>RAG systems with LangChain</strong> and designed conversational voice assistants to enhance user interaction. I am dedicated to using data not just for analysis, but to build intelligent tools that perform.
      </motion.p>
    </>
  )
}

export default SectionWrapper(About, "about")