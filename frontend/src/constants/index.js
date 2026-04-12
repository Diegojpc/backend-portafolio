import {
    rag_system,
    chatbot,
    webscraper,
    github,
    linkedin,
  } from "../assets";
  
  export const navLinks = [
    {
      id: "about",
      title: "About",
    },
    {
      id: "projects",
      title: "Projects",
    },
    {
      id: "contact",
      title: "Contact",
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

  const projects = [
    {
      name: "Talk to the web (web Scraper)",
      description:
        "This project is a web scraper that extracts data from websites and presents it in a structured format. It utilizes web scraping supported with LLM models to gather information efficiently through natural languages queries.",
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
      name: "Rag Assistant",
      description:
        "This assistant is designed to support Evergreen farmers in making informed crop production decisions. It delivers precise recommendations generated through a large language model (LLM) that processes integrated data including field production history, weather conditions, soil characteristics, lunar phases, and production parameters.",
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
      name: "Chat-Bot",
      description:
        "This project showcases a conversational assistant prototype built with LangchainJS. It is designed to respond to frequently asked questions by leveraging a set of text documents and conversational memory to deliver context-aware answers.",
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
  
  export { socialLinks, projects, techStackIcons };