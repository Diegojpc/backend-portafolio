# HANDOFF

Estado vivo del proyecto. Actualizar al cerrar cada fase. Última actualización: 2026-10-18.

## Rama y estado de git
- Rama: `feat/aws-backend`. Cambios de la optimización 3D **sin commitear**:
  `frontend/src/App.jsx`, `components/canvas/{Waves,Stars,AudioVisualizer,TechIconCardExperience}.jsx`,
  `frontend/src/hooks/useInView.js` (nuevo), `.claude/` (skill y agente nuevos).
- `CLAUDE.md` está en `.gitignore` (línea 44): no se versiona. Este archivo sí.

## Hecho: optimización de arranque 3D
- `Waves.jsx`: el ruido simplex corre en un vertex shader (GPU) en vez de ~33k llamadas CPU por frame.
  Compilación con `gl.compileAsync`, reveal tras 2 frames, DPR máx 1.5 (1 en móvil) con `PerformanceMonitor`,
  segmentos 128×64 desktop, resize con debounce que solo actualiza un uniform.
- `App.jsx`: secciones de abajo y `StarsCanvas` se montan tras `onReady` de las olas (`requestIdleCallback`).
  Timeout de seguridad del Hero: 3 s → 1.5 s.
- `useInView`: `TechIconCardExperience`, `Stars` y `AudioVisualizer` montan su `<Canvas>` solo cerca del viewport.
- Verificado en build de producción: 1 solo `<canvas>` al cargar, compile async 211 ms, estética igual.
- **NO medido:** baseline vs. después con trace/Lighthouse. No hay cifra de mejora real.
- Pendiente: HDR de `<Environment preset="city">` sigue viniendo de un CDN externo (bajarlo a `public/hdr/`);
  revisar a ojo la densidad 128×64 en móvil y retina.

## Tooling de Claude Code
- Skill `perf-check` (`.claude/skills/perf-check/SKILL.md`): FCP, LCP, TBT, long tasks, nº de canvases.
- Agente `r3f-perf-reviewer` (`.claude/agents/r3f-perf-reviewer.md`): revisor de solo lectura de R3F/WebGL.
- Repo indexado en codebase-memory-mcp: proyecto `mnt-Proyectos-Portafolio-dise-o-web-3d_portafolio`.

## Gaps conocidos (verificados en el código)
- `backend/app/database.py` solo soporta SQLite; `docs/` y `requirements.txt` describen Postgres/RDS.
- `init_db()` hace `create_all` en cada arranque; Alembic no crea tablas en runtime.
- `GET /contact` lista todos los mensajes sin autenticación. `Contact.jsx` envía por EmailJS, no usa `/contact`.
- `ChatWidget.jsx` tiene `BACKEND_URL` hardcodeado (Render).
- `README.md` y `ARCHITECTURE.md` están obsoletos (TinyLlama/ChromaDB/Render/Hostinger).
- `fetch_url` (`services/tools.py`) estaba roto y, activado, sería un SSRF (el servidor pediría URLs elegidas por el
  visitante; en AWS alcanzaría el endpoint de metadata). Quedó **desconectado** de `rag.py`. No reactivar sin allowlist/bloqueo de IPs privadas.
- Privacidad: en la capa gratuita de Gemini, Google puede usar el contenido para mejorar sus productos. Los chats de visitantes
  (y documentos que suban) pasan por ahí; conviene un aviso en el widget.

## Fase 0 (hecha): cerebro compartido
- `app/services/persona.py` (nuevo): `build_system_instruction(mode, context)`, modos chat/voice/video (voz/video: 1–3 frases, sin markdown, disclosure de IA).
- `app/services/rag.py` migrado a `google-genai` (`client.chats.create` + `send_message_stream`). Probado: respuesta con el CV e historial.
- `requirements.txt`: `google-generativeai` → `google-genai>=2.31.0,<3`.
- `config.py`: `extra="ignore"`; el `backend/.env` tenía `VITE_APP_EMAILJS_*` y el backend no arrancaba.
- **Modelo de chat: `gemini-3.8-flash`** (default en `config.py` y `.env` local). Según la página oficial de precios es el
  Flash más reciente con capa gratuita (Gemini 4 Argon es solo de pago; 3.8 Flash pasa a $0.75/$3.75 por 1M tokens hasta el 31-dic-2026
  y se duplica el 1-ene-2027 si se sale del free tier). Probado con la clave actual.
- Modelos Live disponibles con la clave: `gemini-3.8-live`, `gemini-2.5-flash-native-audio-latest`.
- Pendiente de Fase 0: probar el endpoint HTTP `/conversations/{id}/chat` end-to-end y el deploy a producción.

## En curso: avatares de voz y video (plan completo en `~/.claude/plans/quiero-que-hagas-lo-mellow-dahl.md`)
Decisiones del usuario: avatar de video realista premium, voz clonada con **Fish Audio**, presupuesto < $10/mes, chat con el último modelo gratuito de Gemini.
Esas tres cosas no caben juntas (Tavus ~$0.26–0.37/min con planes desde ~$22–59/mes; HeyGen LiveAvatar custom ~$99/mes;
cifras de terceros, verificar). Higgsfield no hace tiempo real: solo sirve para assets (retrato, clips con su voz).
Créditos Higgsfield al 2026-10-18: 419.1 (plan starter).

| Fase | Contenido | Estado |
|---|---|---|
| 0 | HANDOFF, migrar a `google-genai`, extraer `persona.py` | **hecho y probado** localmente (sin commitear) |
| 1 | Llamada de voz con **Fish Audio** (decisión del usuario): STT → chat Gemini 3.8 Flash → TTS Fish con su voz clonada; guardas de costo, `RealtimeSession` | pendiente |
| 1b | (absorbida en 1: la voz clonada es Fish `reference_id`) | — |
| 2a | Retrato y clips pre-renderizados con Higgsfield (pedir aprobación de costo antes de cada generación) | pendiente |
| 2b | Avatar en tiempo real (Tavus/HeyGen LiveAvatar LITE) | **gate:** decidir presupuesto antes de escribir código |

Reglas del plan: disclosure obligatorio de que es un avatar de IA; tope diario, tope por sesión (3 min), rate limit
por IP y Turnstile antes de emitir tokens; kill switch por variable de entorno.

## Fish Audio (voz) — hechos verificados en docs.fish.audio y pendientes
- TTS: `wss://api.fish.audio/v1/tts/live`, header `Authorization: Bearer <key>`, header `model` (`s2.1-pro`, `s2.1-pro-free`, `s2-pro`).
  Mensajes MessagePack `start` → `text`* → `flush`? → `stop`; responde `audio` (bytes) y `finish`. Formatos wav/pcm/mp3/opus. `reference_id` = voz clonada. Idiomas: 83 (ES y EN).
- `s2.1-pro-free`: $0 "bajo fair use", sin límites publicados, sin garantías de latencia. La doc no dice nada sobre uso comercial ni datos.
- **No verificado:** precio de `s2.1-pro` (terceros: ~$15 por 1M bytes UTF-8), límites de concurrencia, requisitos del clon (terceros: 10–30 s de audio), si la clave de API puede restringirse.
- Implicación de diseño: la API key de Fish debe quedarse en el servidor (no hay tokens efímeros documentados), así que el audio del avatar pasa por el backend.
