// src/components/Contact.jsx
import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import emailjs from '@emailjs/browser';
import { AudioVisualizer } from './canvas';
import { SectionWrapper } from '../hoc';
import { useLanguage } from '../context/LanguageContext';

import { styles } from '../styles';
import { slideIn } from '../utils/motion';

const Contact = ({ audioElement }) => {
    const formRef = useRef();
    const [form, setForm] = useState({
        name: '',
        email: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        if (!audioElement) return;

        const handleLoaded = () => {
            console.info('[Contact] Audio element loaded.');
        };
        const handleError = (error) => {
            console.error('[Contact] Audio error:', error);
        };

        audioElement.addEventListener('loadeddata', handleLoaded);
        audioElement.addEventListener('error', handleError);

        return () => {
            audioElement.removeEventListener('loadeddata', handleLoaded);
            audioElement.removeEventListener('error', handleError);
        };
    }, [audioElement]);

    const handleChange = (e) => {
        const { target } = e;
        const { name, value } = target;

        setForm({
            ...form,
            [name]: value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        emailjs
            .send(
                import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
                {
                    from_name: form.name,
                    to_name: 'Diego Peña',
                    from_email: form.email,
                    to_email: 'diegojosepc3@hotmail.com',
                    message: form.message,
                },
                import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY
            )
            .then(
                () => {
                    setLoading(false);
                    alert(t('contact.alertSuccess'));

                    setForm({
                        name: '',
                        email: '',
                        message: '',
                    });
                },
                (error) => {
                    setLoading(false);
                    console.error(error);

                    alert(t('contact.alertError'));
                }
            );
    };

    return (
        <div className={`xl:mt-12 flex xl:flex-row flex-col-reverse gap-10 overflow-hidden`}>
            <motion.div
                variants={slideIn('left', 'tween', 0.2, 1)}
                className='flex-[0.75] bg-[transparent] p-8 rounded-2xl'
            >
                <p className={styles.sectionSubText}>{t('contact.subtitle')}</p>
                <h3 className={styles.sectionHeadText}>{t('contact.title')}</h3>

                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className='mt-12 flex flex-col gap-8'
                >
                    <label className='flex flex-col'>
                        <span className='text-white font-medium mb-4'>{t('contact.nameLabel')}</span>
                        <input
                            type='text'
                            name='name'
                            value={form.name}
                            onChange={handleChange}
                            placeholder={t('contact.namePlaceholder')}
                            className='bg-grey py-4 px-6 placeholder:text-secondary text-white rounded-lg outline-none border-none font-medium'
                        />
                    </label>
                    <label className='flex flex-col'>
                        <span className='text-white font-medium mb-4'>{t('contact.emailLabel')}</span>
                        <input
                            type='email'
                            name='email'
                            value={form.email}
                            onChange={handleChange}
                            placeholder={t('contact.emailPlaceholder')}
                            className='bg-grey py-4 px-6 placeholder:text-secondary text-white rounded-lg outline-none border-none font-medium'
                        />
                    </label>
                    <label className='flex flex-col'>
                        <span className='text-white font-medium mb-4'>{t('contact.msgLabel')}</span>
                        <textarea
                            rows={7}
                            name='message'
                            value={form.message}
                            onChange={handleChange}
                            placeholder={t('contact.msgPlaceholder')}
                            className='bg-grey py-4 px-6 placeholder:text-secondary text-white rounded-lg outline-none border-none font-medium'
                        />
                    </label>

                    <button
                        type="submit"
                        className="relative flex items-center justify-center cursor-pointer py-3 px-8 rounded-xl font-bold text-white bg-neutral-900 transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-md shadow-primary outline-none w-fit hover:animate-wave"
                    >
                        {loading ? t('contact.btnSending') : t('contact.btnSend')}
                        <span className="absolute inset-0 border border-primary rounded-xl opacity-0 transition-opacity duration-300 hover:opacity-100"></span>
                    </button>
                </form>
            </motion.div>

            <motion.div
                variants={slideIn('right', 'tween', 0.2, 1)}
                className='xl:flex-1 xl:h-auto md:h-[550px] h-[350px]'
            >
                <AudioVisualizer audioElement={audioElement} />
            </motion.div>
        </div>
    );
};

export default SectionWrapper(Contact, "contact");