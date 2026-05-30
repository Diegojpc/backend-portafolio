export const es = {
  nav: {
    about: "Sobre Mí",
    experience: "Experiencia",
    education: "Educación",
    projects: "Proyectos",
    contact: "Contacto"
  },
  hero: {
    titlePrefix: "Hola, soy",
    name: "Diego",
    subtitle: "Ingeniero Acústico, Científico de Datos y Desarrollador de Software"
  },
  about: {
    intro: "Introducción",
    overview: "Visión General.",
    text1: "Soy Diego — un Ingeniero Acústico que cruzó al mundo de la IA y nunca volvió la vista atrás. Ese trasfondo no es un desvío; es una ventaja competitiva. Entiendo el procesamiento de señales, los sistemas complejos y el modelado matemático a una profundidad que la mayoría de los ingenieros no tiene, y aplico todo eso para construir soluciones de ML en producción que realmente funcionan.",
    text2: "Trabajo en todo el stack de ML: <strong>motores de recomendación en tiempo real en GCP</strong> con <strong>NVIDIA Triton Inference Server</strong>, <strong>sistemas RAG con LangChain</strong>, <strong>asistentes de voz conversacionales con IA</strong>, y aplicaciones full-stack con <strong>FastAPI</strong> y <strong>React</strong>. No construyo demos — construyo sistemas diseñados para operar bajo presión real y entregar resultados medibles."
  },
  contact: {
    subtitle: "Ponte en contacto",
    title: "Contacto.",
    nameLabel: "Tu Nombre",
    namePlaceholder: "¿Cuál es tu nombre?",
    emailLabel: "Tu Correo",
    emailPlaceholder: "¿A dónde podría responderte?",
    msgLabel: "Tu Mensaje",
    msgPlaceholder: "¿Qué deseas decirme?",
    btnSend: "Enviar",
    btnSending: "Enviando...",
    alertSuccess: "Gracias por escribirme. Me pondré en contacto contigo lo antes posible.",
    alertError: "Ahh, algo salió mal. Inténtalo de nuevo, por favor.",
    downloadCv: "Descargar Mi Hoja de Vida",
    downloadCvAria: "Descargar la hoja de vida de Diego en PDF"
  },
  projects: {
    subtitle: "Mi Trabajo",
    title: "Proyectos.",
    text1: "Mi portafolio es una colección curada de proyectos en la intersección de la <strong>Inteligencia Artificial</strong>, <strong>Ciencia de Datos</strong> y <strong>Desarrollo Full-Stack</strong>. Aquí verás cómo traduzco desafíos técnicos complejos en soluciones prácticas y de alto impacto.",
    text2: "Estos proyectos demuestran:",
    li1: "<strong>IA Generativa y LLMs</strong>: Aplicaciones construidas con herramientas de vanguardia como <strong>LangChain</strong> para crear sofisticados sistemas RAG e Integencia Artificial conversacional.",
    li2: "<strong>Machine Learning y Data Science</strong>: Desde modelos predictivos construidos con <strong>Scikit-learn</strong> y <strong>TensorFlow</strong>, hasta scripts de automatización que optimizan procesos estadísticos complejos en <strong>Python</strong>.",
    li3: "<strong>VIsualización e Inteligencia de Negocios</strong>: Paneles visuales (Dashboards) dinámicos desarrollados en <strong>Power BI</strong> que transforman datos crudos en visiones estratégicas limpias para la toma de decisiones.",
    text3: "Cada proyecto refleja mi compromiso de construir tecnología robusta, escalable y eficiente para generar resultados tangibles. Explora todo mi trabajo a continuación."
  },
  projectsData: {
    p1: {
      name: "Habla con la Web (Scraper)",
      desc: "Este proyecto es un raspador web que extrae datos de sitios y los presenta en formatos estructurados. Utiliza una arquitectura soportada en Modelos LLM para recopilar información eficientemente usando únicamente búsquedas semánticas y lenguaje natural."
    },
    p2: {
      name: "Asistente RAG",
      desc: "Este asistente está diseñado para apoyar a los agricultores de Evergreen para tomar decisiones informadas sobre la producción de cultivos. Ofrece recomendaciones precisas generadas a través de un LLM que procesa la historia de producción del campo, clima, suelo, y fases lunares."
    },
    p3: {
      name: "Chat-Bot Automático",
      desc: "Demostración de un prototipo interactivo puramente elaborado sobre LangchainJS. Diseñado para responder a preguntas frecuentes mediante la inyección vectorial de documentos de texto proporcionando respuestas dotadas de memoria situacional."
    }
  },
  chat: {
    title: "Asistente Virtual",
    cloud: "Nube",
    local: "CPU Local",
    placeholder: "Pregúntame algo...",
    uploading: "Adjuntando documento:",
    errorParse: "Lo lamento, no pude procesar",
    successParse: "He terminado de leer el documento",
    successMsg: "¿Qué deseas saber acerca del mismo?",
    fetchError: "Fallo en la comunicación con el servidor central",
    fallbackError: "Disculpa, estoy experimentando fallos de conexión al cerebro de la IA. Por favor, intenta de nuevo.",
    welcome: "¡Hola! Soy el Asistente Inteligente de Diego. ¿Hay algo en lo que te pueda ayudar?",
    warming: "iniciando servidor..."
  },
  experience: {
    subtitle: "Lo que he hecho hasta ahora",
    title: "Experiencia Laboral.",
    jobs: {
      j1: {
        title: "Científico de Datos",
        period: "Agosto 2025 – Mayo 2026",
        p1: "Implementé un motor de recomendación híbrido en tiempo real capaz de procesar interacciones de usuarios en milisegundos para personalizar ofertas en plataformas de juego.",
        p2: "Diseñé una arquitectura basada en Transformers y un modelo Two-Tower para generar representaciones latentes del comportamiento secuencial del usuario.",
        p3: "Desplegué modelos de alta disponibilidad con NVIDIA Triton Inference Server, logrando gestión eficiente de memoria y baja latencia en producción.",
        p4: "Integré Qdrant como motor de búsqueda vectorial y orquesté microservicios de ML (Stream Processor, API Gateway) en Google Cloud Platform (GCP).",
      },
      j2: {
        title: "Ingeniero en IA / Científico de Datos",
        period: "Febrero 2025 – Mayo 2025",
        p1: "Desarrollé e implementé sistemas RAG con LangChain para mejorar la extracción y síntesis de información.",
        p2: "Diseñé y automaticé un asistente de voz conversacional integrando Vapi para optimizar las interacciones con clientes.",
        p3: "Apliqué técnicas de Web Scraping para extracción de información que alimentó modelos LLM de OpenAI.",
      },
      j3: {
        title: "Analista de Nuevas Tecnologías",
        period: "Agosto 2023 – Julio 2024",
        p1: "Creé y desplegué más de 100 dashboards en Power BI, mejorando la eficiencia del análisis de datos y las relaciones entre tablas en un 30%.",
        p2: "Desarrollé aplicaciones en Python para automatizar procesos estadísticos en R, reduciendo los tiempos operativos de la empresa.",
        p3: "Implementé, desarrollé y mantuve sistemas IoT para optimizar la precisión en la recolección de datos de campo.",
      },
    },
  },
  education: {
    subtitle: "Mi formación académica",
    title: "Educación.",
    inProgress: "En Progreso",
    types: {
      degree: "Título",
      diploma: "Diploma",
      certification: "Certif.",
    },
    items: {
      e1: { degree: "Arquitectura Cloud – Nivel Innovador Avanzado" },
      e2: { degree: "Certificado Profesional en Ingeniería de IA de IBM" },
      e3: { degree: "Especialización en Desarrollo de Software" },
      e4: { degree: "Fundamentos de Machine Learning" },
      e5: { degree: "Ciencia de Datos e Inteligencia Artificial / Analista de Datos" },
      e6: { degree: "Analista de Datos" },
      e7: { degree: "Diplomado en Análisis de Datos y Machine Learning en Python", institution: "Universidad de Antioquia" },
      e8: { degree: "Ingeniero de Sonido", institution: "Universidad de San Buenaventura" },
    },
  },
  skills: {
    subtitle: "Mi caja de herramientas técnica",
    cat: {
      languages: "Lenguajes de Programación",
      mlai: "Machine Learning e IA",
      cloud: "Cloud, DevOps y MLOps",
      data: "Datos y Bases de Datos",
    },
  },
};
