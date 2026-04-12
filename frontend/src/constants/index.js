import {
    rag_system,
    chatbot,
    webscraper,
    github,
    linkedin,
  } from "../assets";
  
  export const getNavLinks = (t) => [
    {
      id: "about",
      title: t("nav.about"),
    },
    {
      id: "projects",
      title: t("nav.projects"),
    },
    {
      id: "contact",
      title: t("nav.contact"),
    },
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
  
  export { socialLinks, techStackIcons };