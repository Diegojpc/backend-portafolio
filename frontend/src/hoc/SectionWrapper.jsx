// src/hoc/SectionWrapper.jsx
import { motion } from 'framer-motion';
import { styles } from '../styles';
import { staggerContainer } from '../utils/motion';

const SectionWrapper = (Component, idName) => {
    // Añadimos props como parámetro al HOC
    function HOC(props) {
        return (
            <motion.section
                variants={staggerContainer()}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.25 }}
                className={`${styles.padding} max-w-7xl mx-auto relative z-0 w-full`}
            >
                <span className='hash-span' id={idName}>
                    &nbsp;
                </span>

                {/* Pasamos las props al componente */}
                <Component {...props} />
            </motion.section>
        );
    }

    return HOC;
};

export default SectionWrapper;