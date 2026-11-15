import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import TechIconCardExperience from "../components/canvas/TechIconCardExperience";
import { techStackIcons, skillCategories } from "../constants";
import { useLanguage } from "../context/LanguageContext";
import { styles } from "../styles";

gsap.registerPlugin(ScrollTrigger);

const TechStack = () => {
  const { t } = useLanguage();

  useGSAP(() => {
    gsap.fromTo(
      ".tech-card",
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.inOut",
        stagger: 0.2,
        scrollTrigger: { trigger: "#skills", start: "top center" },
      }
    );

    // Subtitle animates first, then categories stagger in behind it
    gsap.fromTo(
      ".skills-subtitle",
      { y: 18, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: "#skills", start: "top center" },
      }
    );

    gsap.fromTo(
      ".skill-category",
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.15,
        delay: 0.15,
        scrollTrigger: { trigger: "#skills", start: "center center" },
      }
    );
  });

  return (
    <section id="skills" className="sm:px-16 px-6 pb-16 sm:pb-24">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <p className={styles.sectionSubText}>{t('skills.label')}</p>
            <h2 className={styles.sectionHeadText}>{t('skills.title')}</h2>
          </div>
          <p className="skills-subtitle max-w-[360px] text-[15px] leading-[1.6] text-muted">{t('skills.hint')}</p>
        </div>

        {/* 3D cards: GLB models, or logo outlines extruded in real time (Claude, MCP) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {techStackIcons.map((techStackIcon, i) => (
            <div
              key={techStackIcon.name}
              className="tech-card relative h-[260px] rounded-[20px] border border-white/10 bg-surface hover:border-accent/40 transition-colors flex flex-col justify-between p-5 overflow-hidden"
            >
              <div className="flex-1 -mx-5 flex items-center justify-center">
                <TechIconCardExperience model={techStackIcon} />
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="font-display text-[17px] font-semibold text-white">{t(techStackIcon.labelKey)}</span>
                <span className="font-mono text-[11px] text-dim">{String(i + 1).padStart(2, '0')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {skillCategories.map((cat) => (
            <div
              key={cat.categoryKey}
              className="skill-category rounded-[20px] border border-white/10 p-5 flex flex-col gap-4"
            >
              <h3 className="font-mono font-medium text-[12px] uppercase tracking-[0.08em] text-soft">
                {t(cat.categoryKey)}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {cat.skills.map((skill) => (
                  <li
                    key={skill}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-2 text-[13px] text-white border border-transparent hover:border-accent/40 transition-colors cursor-default"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStack;