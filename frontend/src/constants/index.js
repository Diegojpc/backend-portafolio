import {
  github,
  linkedin,
  projectImages,
} from "../assets";
import { CLAUDE_CODE_PATH, MCP_PATH } from "../components/canvas/logoPaths";

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

// The 3D cards of the Stack section. `modelPath` = a GLB in public/models; `svgPath` = a logo outline extruded
// in real time (components/canvas/ExtrudedLogo.jsx). Claude and MCP lead: they are how the code gets written now.
const techStackIcons = [
  {
    name: "Claude Code",
    labelKey: "skills.icons.claude",
    svgPath: CLAUDE_CODE_PATH,
    color: "#D97757",
    scale: 0.18,
    depth: 4,
    // Pixel art: square edges, so only a hairline bevel.
    bevel: 0.08,
    rotation: [0, 0, 0],
    // Three agents (site palette) orbiting the model.
    orbiters: ["#2DE2E6", "#9700CC", "#F6019D"],
    orbitRadius: 15.5,
  },
  {
    name: "MCP",
    labelKey: "skills.icons.mcp",
    svgPath: MCP_PATH,
    color: "#E8E8F0",
    scale: 0.19,
    rotation: [0, 0, 0],
  },
  {
    name: "Python",
    labelKey: "skills.icons.python",
    modelPath: "models/python-transformed.glb",
    scale: 0.8,
    rotation: [0, 0, 0],
  },
  {
    name: "React",
    labelKey: "skills.icons.react",
    modelPath: "models/react_logo-transformed.glb",
    scale: 1,
    rotation: [0, 0, 0],
  },
];

// Order = what a visitor sees first in the carousel. codeUrl / liveUrl may be null (private repo, no live site).
export const getProjects = (t) => [
  {
    id: 'sentmine',
    name: t('projectsData.sentmine.name'),
    description: t('projectsData.sentmine.desc'),
    tags: ['TypeScript', 'Chrome Extension', 'LLM', 'Anki'],
    image: projectImages.sentmine,
    codeUrl: null,
    liveUrl: 'https://www.sentmine.com',
  },
  {
    id: 'portfolio',
    name: t('projectsData.portfolio.name'),
    description: t('projectsData.portfolio.desc'),
    tags: ['React', 'Three.js', 'FastAPI', 'Gemini', 'Agents'],
    image: projectImages.portfolio,
    codeUrl: 'https://github.com/Diegojpc/backend-portafolio',
    liveUrl: 'https://diegojpc.com',
  },
  {
    id: 'cineai',
    name: t('projectsData.cineai.name'),
    description: t('projectsData.cineai.desc'),
    tags: ['Docker', 'FastAPI', 'React', 'PostgreSQL', 'Gemini'],
    image: projectImages.cineai,
    codeUrl: 'https://github.com/Diegojpc/CineAI',
    liveUrl: null,
  },
  {
    id: 'astralmesh',
    name: t('projectsData.astralmesh.name'),
    description: t('projectsData.astralmesh.desc'),
    tags: ['Unity', 'C#', 'AR Foundation', 'Audio DSP'],
    image: projectImages.astralmesh,
    codeUrl: 'https://github.com/Diegojpc/AstralMesh',
    liveUrl: null,
  },
  {
    id: 'blackjack',
    name: t('projectsData.blackjack.name'),
    description: t('projectsData.blackjack.desc'),
    tags: ['Python', 'Gymnasium', 'DQN', 'PPO'],
    image: projectImages.blackjack,
    codeUrl: 'https://github.com/Diegojpc/BlackJack-AI',
    liveUrl: null,
  },
  {
    id: 'docsrag',
    name: t('projectsData.docsrag.name'),
    description: t('projectsData.docsrag.desc'),
    tags: ['LangChain', 'Qdrant', 'FastAPI', 'Streamlit'],
    image: projectImages.docsrag,
    codeUrl: 'https://github.com/Diegojpc/Talk-to-Documents-RAG-',
    liveUrl: null,
  },
  {
    id: 'evergreen',
    name: t('projectsData.evergreen.name'),
    description: t('projectsData.evergreen.desc'),
    tags: ['FastAPI', 'LangChain', 'Python'],
    image: projectImages.evergreen,
    codeUrl: 'https://github.com/Diegojpc/evergreen_rag_assistant',
    liveUrl: null,
  },
  {
    id: 'trading',
    name: t('projectsData.trading.name'),
    description: t('projectsData.trading.desc'),
    tags: ['Python', 'HMM', 'FastAPI', 'CCXT'],
    image: projectImages.trading,
    codeUrl: 'https://github.com/Diegojpc/trading-bot-mvp',
    liveUrl: null,
  },
  {
    id: 'webscraper',
    name: t('projectsData.webscraper.name'),
    description: t('projectsData.webscraper.desc'),
    tags: ['FastAPI', 'Streamlit', 'LLM', 'Python'],
    image: projectImages.webscraper,
    codeUrl: 'https://github.com/Diegojpc/Talk-to-the-web-web-scraper-',
    liveUrl: null,
  },
  {
    id: 'cpocket',
    name: t('projectsData.cpocket.name'),
    description: t('projectsData.cpocket.desc'),
    tags: ['LangChain.js', 'Node.js', 'React'],
    image: projectImages.cpocket,
    codeUrl: 'https://github.com/Diegojpc/PruebaChatbot-Cpocket',
    liveUrl: null,
  },
];

export const RESUME = {
  es: { href: encodeURI('/resume/CV ES - 2026.pdf'), name: 'Diego_Pena_CV_ES.pdf' },
  en: { href: encodeURI('/resume/CV EN - 2026.pdf'), name: 'Diego_Pena_CV_EN.pdf' },
};

export const getExperiences = (t) => [
  {
    company: 'Dyaboo',
    title: t('experience.jobs.j0.title'),
    period: t('experience.jobs.j0.period'),
    points: [
      t('experience.jobs.j0.p1'),
      t('experience.jobs.j0.p2'),
      t('experience.jobs.j0.p3'),
      t('experience.jobs.j0.p4'),
    ],
  },
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
    institution: 'Talento Tech (MinTIC) · IU Training',
    period: 'Jul 2026',
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
    type: 'postgrad',
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