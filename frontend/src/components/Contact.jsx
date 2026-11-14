// src/components/Contact.jsx
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import emailjs from '@emailjs/browser';
import { AudioVisualizer } from './canvas';
import { SectionWrapper } from '../hoc';
import { useLanguage } from '../context/LanguageContext';

import { styles } from '../styles';
import { slideIn } from '../utils/motion';
import { RESUME } from '../constants';

const Contact = ({ audioElement }) => {
    const formRef = useRef();
    const [form, setForm] = useState({
        name: '',
        email: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);
    const { t, language } = useLanguage();

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

    const cv = RESUME[language] ?? RESUME.es;
    const inputClass = 'h-12 px-4 rounded-xl border border-white/10 bg-ink text-white text-[15px] placeholder:text-dim outline-none focus:border-accent/70 transition-colors';

    return (
        <div className="flex xl:flex-row flex-col-reverse gap-10 xl:gap-12 overflow-hidden">
            <motion.div
                variants={slideIn('left', 'tween', 0.2, 1)}
                className="xl:flex-[0.9] flex flex-col gap-8 p-6 sm:p-9 rounded-3xl border border-white/10 bg-[rgba(11,11,17,0.85)]"
            >
                <div>
                    <p className={styles.sectionSubText}>{t('contact.subtitle')}</p>
                    <h3 className={styles.sectionHeadText}>{t('contact.title')}</h3>
                    <p className="mt-3 text-[15px] text-muted">{t('contact.lead')}</p>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <label className="flex flex-col gap-2 text-[13px] text-soft">
                            {t('contact.nameLabel')}
                            <input
                                type="text"
                                name="name"
                                required
                                value={form.name}
                                onChange={handleChange}
                                placeholder={t('contact.namePlaceholder')}
                                className={inputClass}
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-[13px] text-soft">
                            {t('contact.emailLabel')}
                            <input
                                type="email"
                                name="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder={t('contact.emailPlaceholder')}
                                className={inputClass}
                            />
                        </label>
                    </div>
                    <label className="flex flex-col gap-2 text-[13px] text-soft">
                        {t('contact.msgLabel')}
                        <textarea
                            rows={6}
                            name="message"
                            required
                            value={form.message}
                            onChange={handleChange}
                            placeholder={t('contact.msgPlaceholder')}
                            className={`${inputClass} h-auto py-3.5 resize-y`}
                        />
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-[50px] px-7 rounded-full bg-accent text-ink font-semibold text-[15px] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-wait"
                        >
                            {loading ? t('contact.btnSending') : t('contact.btnSend')}
                        </button>

                        <a
                            href={cv.href}
                            download={cv.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t('contact.downloadCvAria')}
                            className="cv-download-btn group h-[50px] inline-flex items-center gap-2 px-6 rounded-full text-white text-[15px] transition-all duration-300"
                        >
                            <svg
                                className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-[2px]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                            </svg>
                            {t('contact.downloadCv')}
                        </a>
                    </div>
                </form>
            </motion.div>

            {/* 3D sphere: reacts to the navbar player through the shared <audio> element */}
            <motion.div
                variants={slideIn('right', 'tween', 0.2, 1)}
                className="xl:flex-1 xl:h-auto md:h-[550px] h-[350px]"
            >
                <AudioVisualizer audioElement={audioElement} />
            </motion.div>
        </div>
    );
};

export default SectionWrapper(Contact, "contact");