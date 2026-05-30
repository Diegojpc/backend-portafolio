import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import TechIconCardExperience from "../components/canvas/TechIconCardExperience";
import { techStackIcons, skillCategories } from "../constants";
import { useLanguage } from "../context/LanguageContext";

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

    gsap.fromTo(
      ".skill-category",
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.15,
        scrollTrigger: { trigger: "#skills", start: "center center" },
      }
    );
  });

  return (
    <div id="skills" className="flex-center section-padding">
      <div className="w-full h-full md:px-10 px-5">
        <div className="tech-grid flex flex-row flex-wrap justify-center gap-5">
          {techStackIcons.map((techStackIcon) => (
            <div
              key={techStackIcon.name}
              className="card-border tech-card overflow-hidden group xl:rounded-full rounded-lg"
            >
              <div className="tech-card-animated-bg" />
              <div className="tech-card-content">
                <div className="tech-icon-wrapper">
                  <TechIconCardExperience model={techStackIcon} />
                </div>
                <div className="padding-x text-center w-full">
                  <p>{techStackIcon.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-secondary text-[13px] uppercase tracking-widest mt-16 mb-6">
          {t('skills.subtitle')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {skillCategories.map((cat) => (
            <div
              key={cat.categoryKey}
              className="skill-category bg-tertiary rounded-2xl p-5 border border-[#915EFF]/20"
            >
              <h4 className="text-white font-semibold text-[13px] uppercase tracking-wider mb-4">
                {t(cat.categoryKey)}
              </h4>
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-[11px] text-white-100 bg-black-100 rounded-full border border-white/10 hover:border-[#915EFF]/50 transition-colors cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechStack;