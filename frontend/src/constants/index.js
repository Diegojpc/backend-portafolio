import {
  rag_system,
  chatbot,
  webscraper,
  github,
  linkedin,
} from "../assets";

export const getNavLinks = (t) => [
  { id: "about", title: t("nav.about") },
  { id: "experience", title: t("nav.experience") },
  { id: "education", title: t("nav.education") },
  { id: "projects", title: t("nav.projects") },
  { id: "contact", title: t("nav.contact") },
];

const socialLinks = [
  {
    name: "GitHub",
    icon: github,
    url: 'https://github.com/Diegojpc',
  },
  {
    name: "LinkedIn",
    icon: linkedin,
    url: 'https://www.linkedin.com/in/diego-jose-pe%C3%B1a-casadiegos-700598241/'
  },
];

const techStackIcons = [
  {
    name: "React Developer",
    modelPath: "models/react_logo-transformed.glb",
    scale: 1,
    rotation: [0, 0, 0],
  },
  {
    name: "Python Developer",
    modelPath: "models/python-transformed.glb",
    scale: 0.8,
    rotation: [0, 0, 0],
  },
  {
    name: "Interactive Developer",
    modelPath: "models/three.js-transformed.glb",
    scale: 0.05,
    rotation: [0, 0, 0],
  },
  {
    name: "Knowledge in Git",
    modelPath: "models/git-svg-transformed.glb",
    scale: 0.05,
    rotation: [0, -Math.PI / 4, 0],
  },
];

export const getProjects = (t) => [
  {
    name: t('projectsData.p1.name'),
    description: t('projectsData.p1.desc'),
    tags: [
      {
        name: "FastAPI",
        color: "yellow-text-gradient",
      },
      {
        name: "Streamlit",
        color: "green-text-gradient",
      },
      {
        name: "LLM models (Gen AI)",
        color: "pink-text-gradient",
      },
      {
        name: "python",
        color: "blue-text-gradient",
      },
    ],
    image: webscraper,
    source_code_link: "https://github.com/Diegojpc/Talk-to-the-web-web-scraper-",
  },
  {
    name: t('projectsData.p2.name'),
    description: t('projectsData.p2.desc'),
    tags: [
      {
        name: "FastAPI",
        color: "yellow-text-gradient",
      },
      {
        name: "LangChain",
        color: "green-text-gradient",
      },
      {
        name: "Python",
        color: "blue-text-gradient",
      },
    ],
    image: rag_system,
    source_code_link: "https://github.com/Diegojpc/evergreen_rag_assistant",
  },
  {
    name: t('projectsData.p3.name'),
    description: t('projectsData.p3.desc'),
    tags: [
      {
        name: "langchainjs",
        color: "blue-text-gradient",
      },
      {
        name: "nodejs",
        color: "green-text-gradient",
      },
      {
        name: "reactjs",
        color: "pink-text-gradient",
      },
    ],
    image: chatbot,
    source_code_link: "https://github.com/Diegojpc/PruebaChatbot-Cpocket",
  },
];

export const getExperiences = (t) => [
  {
    company: 'Virtualsoft',
    title: t('experience.jobs.j1.title'),
    period: t('experience.jobs.j1.period'),
    points: [
      t('experience.jobs.j1.p1'),
      t('experience.jobs.j1.p2'),
      t('experience.jobs.j1.p3'),
      t('experience.jobs.j1.p4'),
    ],
  },
  {
    company: 'Brain AIX',
    title: t('experience.jobs.j2.title'),
    period: t('experience.jobs.j2.period'),
    points: [
      t('experience.jobs.j2.p1'),
      t('experience.jobs.j2.p2'),
      t('experience.jobs.j2.p3'),
    ],
  },
  {
    company: 'CONHINTEC',
    title: t('experience.jobs.j3.title'),
    period: t('experience.jobs.j3.period'),
    points: [
      t('experience.jobs.j3.p1'),
      t('experience.jobs.j3.p2'),
      t('experience.jobs.j3.p3'),
    ],
  },
];

export const getEducation = (t) => [
  {
    degree: t('education.items.e1.degree'),
    institution: 'Talento Tech (MinTIC)',
    period: 'Apr 2026 – Present',
    type: 'certification',
  },
  {
    degree: t('education.items.e2.degree'),
    institution: 'Coursera',
    period: 'Mar 2026 – Present',
    type: 'certification',
  },
  {
    degree: t('education.items.e3.degree'),
    institution: 'EAFIT University',
    period: 'Jun 2025',
    type: 'certification',
  },
  {
    degree: t('education.items.e4.degree'),
    institution: 'AWS Training and Certification',
    period: 'Apr 2025',
    type: 'certification',
  },
  {
    degree: t('education.items.e5.degree'),
    institution: 'Platzi',
    period: 'Jun 2024',
    type: 'certification',
  },
  {
    degree: t('education.items.e6.degree'),
    institution: 'Platzi',
    period: 'Jul 2023',
    type: 'certification',
  },
  {
    degree: t('education.items.e7.degree'),
    institution: t('education.items.e7.institution'),
    period: 'Oct 2022',
    type: 'diploma',
  },
  {
    degree: t('education.items.e8.degree'),
    institution: t('education.items.e8.institution'),
    period: 'Jun 2022',
    type: 'degree',
  },
];

export const skillCategories = [
  {
    categoryKey: 'skills.cat.languages',
    skills: ['Python', 'JavaScript', 'React', 'R', 'SQL', 'MATLAB', 'C++'],
  },
  {
    categoryKey: 'skills.cat.mlai',
    skills: ['Scikit-learn', 'TensorFlow', 'PyTorch', 'Keras', 'LangChain', 'RAG Systems', 'NLP'],
  },
  {
    categoryKey: 'skills.cat.cloud',
    skills: ['AWS', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Azure DevOps', 'Serverless'],
  },
  {
    categoryKey: 'skills.cat.data',
    skills: ['Qdrant', 'PostgreSQL', 'MySQL', 'Pandas', 'NumPy', 'Power BI', 'SQLite'],
  },
];

export { socialLinks, techStackIcons };