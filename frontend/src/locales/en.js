export const en = {
  nav: {
    about: "About",
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    contact: "Contact"
  },
  hero: {
    titlePrefix: "Hey, I'm",
    name: "Diego",
    subtitle: "I'm a Acoustic Engineer, Data Scientist and Software Developer"
  },
  about: {
    intro: "Introduction",
    overview: "Overview.",
    text1: "I'm Diego — an Acoustic Engineer who crossed into AI and never looked back. That background is not a detour; it's a competitive edge. I understand signal processing, complex systems, and mathematical modeling at a depth most engineers don't, and I apply all of it to build production-grade ML solutions that actually ship.",
    text2: "I work across the full ML stack: real-time <strong>recommendation engines on GCP</strong> with <strong>NVIDIA Triton Inference Server</strong>, <strong>RAG systems with LangChain</strong>, conversational <strong>AI voice assistants</strong>, and full-stack applications with <strong>FastAPI</strong> and <strong>React</strong>. I don't build demos — I build systems designed to run under real-world pressure and deliver measurable results."
  },
  contact: {
    subtitle: "Get in touch",
    title: "Contact.",
    nameLabel: "Your Name",
    namePlaceholder: "What's your good name?",
    emailLabel: "Your email",
    emailPlaceholder: "What's your email address?",
    msgLabel: "Your Message",
    msgPlaceholder: "What you want to say?",
    btnSend: "Send",
    btnSending: "Sending...",
    alertSuccess: "Thank you. I will get back to you as soon as possible.",
    alertError: "Ahh, something went wrong. Please try again.",
    downloadCv: "Download My Resume",
    downloadCvAria: "Download Diego's resume as PDF"
  },
  projects: {
    subtitle: "My work",
    title: "Projects.",
    text1: "My portfolio is a curated collection of projects at the intersection of <strong>Artificial Intelligence</strong>, <strong>Data Science</strong>, and <strong>Full-Stack Development</strong>. Here, you will see how I translate complex technical challenges into practical, high-impact solutions.",
    text2: "The projects showcase:",
    li1: "<strong>Generative AI & LLMs</strong>: Applications built with cutting-edge tools like <strong>LangChain</strong> to create sophisticated Retrieval-Augmented Generation (RAG) systems and intelligent conversational AI.",
    li2: "<strong>Data Science & Machine Learning</strong>: From predictive models built with <strong>Scikit-learn</strong> and <strong>TensorFlow</strong> to data automation scripts that streamline complex statistical processes in <strong>Python</strong>.",
    li3: "<strong>Business Intelligence & Visualization</strong>: Dynamic dashboards developed in <strong>Power BI</strong> that transform raw data into clear, strategic insights for decision-making.",
    text3: "Each project reflects my commitment to building robust, scalable, and efficient technology that delivers tangible results. Dive in to explore my work."
  },
  projectsData: {
    p1: {
      name: "Talk to the web (Web Scraper)",
      desc: "This project is a web scraper that extracts data from websites and presents it in a structured format. It utilizes web scraping supported with LLM models to gather information efficiently through natural languages queries."
    },
    p2: {
      name: "Rag Assistant",
      desc: "This assistant is designed to support Evergreen farmers in making informed crop production decisions. It delivers precise recommendations generated through a large language model (LLM) that processes integrated data including field production history, weather conditions, soil characteristics, lunar phases, and production parameters."
    },
    p3: {
      name: "Chat-Bot",
      desc: "This project showcases a conversational assistant prototype built with LangchainJS. It is designed to respond to frequently asked questions by leveraging a set of text documents and conversational memory to deliver context-aware answers."
    }
  },
  chat: {
    title: "Virtual Assistant",
    cloud: "Cloud",
    local: "Local CPU",
    placeholder: "Ask me anything...",
    uploading: "Uploading document:",
    errorParse: "Sorry, I couldn't process",
    successParse: "I have successfully read the document",
    successMsg: "What would you like to know about it?",
    fetchError: "Failed to communicate with AI server",
    fallbackError: "Sorry, I am having trouble connecting to my server. Please try again later.",
    welcome: "Hi! I am Diego's AI Assistant. How can I help you today?",
    warming: "warming up..."
  },
  experience: {
    subtitle: "What I have done so far",
    title: "Work Experience.",
    jobs: {
      j1: {
        title: "Data Scientist",
        period: "August 2025 – May 2026",
        p1: "Implemented a real-time hybrid recommendation engine processing user interactions in milliseconds to personalize gaming offers.",
        p2: "Designed a Transformer-based architecture and Two-Tower model to generate latent representations of sequential user behavior.",
        p3: "Deployed high-availability models using NVIDIA Triton Inference Server, achieving efficient memory management and low latency in production.",
        p4: "Integrated Qdrant as vector search engine and orchestrated ML microservices (Stream Processor, API Gateway) on Google Cloud Platform (GCP).",
      },
      j2: {
        title: "AI Engineer / Data Scientist",
        period: "February 2025 – May 2025",
        p1: "Developed and implemented RAG systems using LangChain to improve information extraction and synthesis.",
        p2: "Designed and automated a conversational AI voice assistant integrating Vapi to optimize customer interactions.",
        p3: "Applied Web Scraping techniques for information extraction to feed OpenAI LLM models.",
      },
      j3: {
        title: "New Technologies Analyst",
        period: "August 2023 – July 2024",
        p1: "Created and deployed over 100 dashboards in Power BI, improving data analysis efficiency and table relationships by 30%.",
        p2: "Developed Python applications to automate statistical processes in R, reducing company operational times.",
        p3: "Implemented, developed, and maintained IoT systems to optimize the accuracy of field data collection.",
      },
    },
  },
  education: {
    subtitle: "My academic background",
    title: "Education.",
    inProgress: "In Progress",
    types: {
      degree: "Degree",
      diploma: "Diploma",
      certification: "Certif.",
    },
    items: {
      e1: { degree: "Cloud Architecture – Advanced Innovator Level" },
      e2: { degree: "IBM AI Engineering Professional Certificate" },
      e3: { degree: "Software Development Specialization" },
      e4: { degree: "Machine Learning Basics" },
      e5: { degree: "Data Science and Artificial Intelligence / Data Analyst" },
      e6: { degree: "Data Analyst" },
      e7: { degree: "Diploma in Data Analysis and Machine Learning in Python", institution: "University of Antioquia" },
      e8: { degree: "Sound Engineer", institution: "University of San Buenaventura" },
    },
  },
  skills: {
    subtitle: "My technical toolkit",
    cat: {
      languages: "Programming Languages",
      mlai: "Machine Learning & AI",
      cloud: "Cloud, DevOps & MLOps",
      data: "Data & Databases",
    },
  },
};
