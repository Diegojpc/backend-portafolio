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
- `ChatWidget.jsx`: `BACKEND_URL` ahora sale de `VITE_BACKEND_URL`, o `http://localhost:8000` en `npm run dev`, o Render en producción. (Antes estaba fijo en Render: en local el botón de voz no aparecía porque el `/health` de Render aún no tiene `realtime_voice`.)
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
- Endpoint HTTP `/conversations/{id}/chat` probado de punta a punta (venv limpio, 2026-10-18). Pendiente: deploy a producción.
- **Bug corregido:** `requirements.txt` fijaba `pydantic==2.10.4`, incompatible con `google-genai` (>=2.12.5): la instalación en entorno limpio fallaba (Docker/Render habrían fallado). Ahora `pydantic>=2.12.5,<3`.
- README reescrito (era de TinyLlama/ChromaDB) con instrucciones para bash y fish; nuevo `backend/.env.example`.

## Fase 1 (código escrito): llamada de voz
Flujo: `VoiceCall.jsx` (SpeechRecognition del navegador) → `POST /realtime/voice/turn` → `rag.stream_response(mode="voice")` →
`speech.split_sentences` → `tts_fish.FishTts` (HTTP streaming mp3) → audio en streaming → MediaSource (fallback blob en Safari).
- Backend: `routers/realtime.py`, `services/{speech,tts_fish}.py`, entidad `VoiceTurn` + migración `a1c4e7d90b21`, vars en `config.py`
  (`REALTIME_ENABLED` (default **false**), `FISH_API_KEY`, `FISH_MODEL` (default `s2.1-pro-free`), `FISH_VOICE_ID`, `REALTIME_DAILY_CHARS`=20000,
  `REALTIME_MAX_TURNS`=12, `REALTIME_MAX_INPUT_CHARS`=500, `REALTIME_MAX_TTS_CHARS`=700). `/health` expone `realtime_voice`; el botón de micrófono solo aparece si es true.
- Guardas: slowapi 12/min por IP, tope de turnos por llamada, tope diario global de caracteres TTS (persistido en `voice_turns`), kill switch, la clave de Fish nunca sale del servidor.
- Frontend: `components/call/VoiceCall.jsx` (lazy), botón de micrófono en el header de `ChatWidget.jsx`, claves `call.*` en `locales/{es,en}.js`, esfera reutilizada (`Sphere` ahora exportada).
- **Probado:** script con TTS falso + Gemini real + SQLite temporal: audio en streaming, historial, persistencia, 429 por turnos y por tope diario, 503 si el TTS falla antes del primer byte, 503 deshabilitado, 422 entrada larga, 404.
  Chat y widget cargan en el build sin errores. **No probado:** audio real de Fish, reproducción MediaSource, SpeechRecognition (requiere micrófono y Chrome), latencia por turno, ES/EN en voz.
- **Probado con Fish real** (`s2.1-pro-free`, voz clonada del usuario): mp3 válido (128 kbps, 44.1 kHz mono). Servidor real + curl, 3 turnos ES/EN:
  primer byte de audio **2.1–2.6 s** tras recibir la petición (Gemini primera frase 1.4–2.0 s + Fish 0.6–0.9 s), sin contar el STT del navegador (+~0.5–1 s esperado).
  La síntesis va más rápida que la reproducción: no hay huecos entre frases. Cliente HTTP de Fish compartido (la primera llamada con conexión nueva tardó 2.4 s solo en Fish).
  Idea no aplicada para bajar latencia: cortar la primera frase en la primera coma (~30+ caracteres), a costa de prosodia menos natural.
- Respuestas de voz: el prompt pide ≤35 palabras; salen ~35–45 palabras (12–20 s de audio). El usuario aún debe confirmar a oído que la voz es la suya.
- Bug encontrado y corregido: `gemini-3.8-flash` gasta tokens en "pensar"; con `max_output_tokens=300` quedaban ~8 para la respuesta. En modo voz se usa `thinking_budget=0`.
- **STT con respaldo en servidor (2026-10-18):** `SpeechRecognition` del navegador depende del servicio de voz de Google y falla en Brave (`error: network`) o no existe (Firefox).
  Ahora `VoiceCall` usa el reconocimiento del navegador si funciona y, si falla o no existe, pasa solo a: micrófono + VAD por energía (`components/call/audioCapture.js`, AudioWorklet) → WAV 16 kHz mono →
  `POST /realtime/voice/stt?language=es|en` (`services/stt.py`, Gemini con audio, `thinking_budget=0`) → texto → `/realtime/voice/turn`. El navegador recuerda el cambio en `sessionStorage`.
  Guardas del endpoint: kill switch, 20/min por IP, máx ~1 MB (~30 s) leído en streaming, solo `audio/wav` válido, y se descarta el audio casi silencioso (pico < 500/32768) sin llamar al modelo.
  **Hallazgo:** con silencio o ruido el modelo inventa texto ("¡Tontos!"). El silencio digital se filtra en el servidor; el ruido de fondo lo filtra el VAD del cliente (umbral = 3× el ruido ambiente aprendido, mínimo 400 ms de voz). Ruido blanco constante fuerte aún puede colarse.
  **Probado:** WAV generado con TTS → transcripción exacta (ES) y correcta (EN); 415/422/413/503; en Brave real: error de reconocimiento → cambio automático → micrófono → VAD → STT → turno → audio ("HABLANDO…") sin errores.
  **No probado:** voz humana real por micrófono físico en Brave/Firefox, Safari/iOS (MediaSource, AudioWorklet), latencia total con voz real (esperable: 0.9 s de silencio final + STT ~1 s + turno ~2.3 s).
- **Bug de maquetación corregido:** el panel de llamada (500 px fijos, `overflow-hidden`) dejaba el botón "Iniciar llamada" a 14 px del borde y recortaba "Volver al chat"; con más zoom/fuente o pantallas bajas el botón desaparecía. Ahora los botones están fijos abajo (`shrink-0`), la esfera mide `h-32` y solo el medio hace scroll. Verificado a 1100x520, 375x640 móvil y 834x754.
- **Rediseño del panel de llamada + auditoría (2026-10-18):** el aviso largo ahora es una línea ("Avatar de IA, no es Diego · máx. 3 min. Privacidad") y el texto completo se despliega solo bajo demanda (su propia zona con scroll, botones siempre fijos abajo).
  La esfera crece con el alto disponible y se oculta en móvil horizontal (`h-sm`, el breakpoint propio del proyecto). Encabezado: el interruptor Nube/CPU se oculta bajo 450 px (`xs`) porque sacaba el botón de cerrar del panel a 320 px; iconos con zona táctil de 40 px.
  Tailwind: **las variantes arbitrarias `min-[..]` NO se generan** en este proyecto (el `tailwind.config.js` define `screens` propios con `raw`); usar `xs:`, `h-sm:` o `sm:`.
  Panel: `max-h-[calc(100dvh-7.5rem)]` (en móvil horizontal se salía de la pantalla). Auditoría final: 48 mediciones (8 tamaños × ES/EN × chat/llamada/privacidad) sin problemas altos ni medios.
- **Esfera de agua:** `Sphere` acepta `material="water"` (por defecto `wire`, que sigue usando la sección Contacto): icosfera soldada (normales suaves), `MeshPhysicalMaterial` translúcido (opacity 0.5, doble cara, clearcoat) con entorno procedural `RoomEnvironment` (sin descargar HDR) y ondulación suave en reposo; se deforma con el audio. Fondo transparente como el chat. Se descartó un fondo degradado y la `transmission` (sin nada detrás solo muestra negro).
- **Voz en inglés:** `speech.detect_language` (ES/EN por palabras vacías) decide el idioma de cada frase y se pasa a Fish (`language`); `FISH_VOICE_ID_EN` opcional para una segunda voz clonada hablando inglés (si no está, usa `FISH_VOICE_ID`). El STT ya no fuerza el idioma de la interfaz (solo es una pista: transcribe lo que se habla sin traducir; probado ES↔EN).
  Probado con Fish real: inglés con y sin idioma explícito inteligible (transcrito de vuelta). **Sin evaluar:** el acento de tu voz clonada hablando inglés (hay que oírlo; si suena español, grabar un clon con 10–30 s hablando inglés y poner su id en `FISH_VOICE_ID_EN`).
  Límite: el reconocimiento nativo del navegador (Chrome/Edge) usa el idioma de la interfaz; para hablar inglés con ese camino hay que poner la web en EN. El respaldo del servidor sí detecta el idioma hablado.
- **Esfera que se salía del marco (corregido):** la fórmula original de deformación no tiene tope (con voz normal los vértices llegaban a radio 50–150; en el panel caben ~33). Ahora, solo en `material="water"`: `sphereMath.js` (`maxSphereRadius` según cámara/FOV/aspecto real del canvas + `softClampRadius` con tanh, la esfera en reposo no cambia), bandas acotadas a su rango (`clamp`), amplitud de olas `WATER_AMP=0.3` (a 1.0 se arrugaba como plástico) y escalado si el canvas es extremadamente estrecho.
  Verificado por captura con un analizador forzado a 255 en todos los bins (peor caso) a escritorio y a 320x568, y con un espectro realista de voz. La esfera de alambre (Contacto) no se tocó.
- **Ritmo/energía de la voz sin regenerar el clon:** `FISH_SPEED` (default **1.15**; Fish `prosody.speed`, 0.5–2.0), `FISH_SPEED_EN` (opcional) y `FISH_TEMPERATURE` (0–1, default 0.7). Medido con la voz actual: la misma frase dura 11.8 s a 1.0, 9.8 s a 1.15 y 8.8 s a 1.3. Muestras A/B en el scratchpad (`pace_*.mp3`).
  Límite: la velocidad arregla "lenta", no "aburrida"; la entonación/energía la define sobre todo la grabación de referencia (comportamiento habitual de los clones, no verificado en la doc de Fish). Si tras ajustar el ritmo sigue plana, regrabar con 10–30 s hablando animado (el rango de duración es de fuentes de terceros).
- **Voz en inglés propia:** crear el clon en fish.audio y poner su id en `FISH_VOICE_ID_EN`; las frases detectadas como inglés usan esa voz (y `FISH_SPEED_EN` si está). Enrutamiento verificado con Fish simulado (4 casos). Para cambiar la voz en español basta con cambiar `FISH_VOICE_ID`; no hace falta tocar código.
- **Voz en inglés propia configurada (2026-10-18):** `FISH_VOICE_ID_EN` puesta en `backend/.env` (id distinto al de español). Probado con Fish real: la frase en inglés sale inteligible (transcrita de vuelta), primer byte ~0.9 s en la primera llamada y ~0.5 s después; español sin cambios. `FISH_SPEED`/`FISH_SPEED_EN` sin definir: se usa 1.15 para ambos. **Pendiente: que el usuario oiga `my_english_voice.mp3` y confirme que el acento le gusta; ajustar `FISH_SPEED_EN` si el ritmo no le convence.**
- **Tooling:** skill `ui-audit` (+ `measure.js`, atributos `data-testid` estables) y agente `ui-responsive-auditor` (solo lectura, navegador real, matriz de viewports). El agente se registra al iniciar el siguiente turno/sesión; esta vez ejecuté la skill a mano con iframes.
- Pendiente de la fase: Turnstile (necesita claves de Cloudflare), probar con clave Fish y `reference_id` reales, aviso de privacidad también en el modo chat, desplegar con las migraciones.
- Para activar en local: `backend/.env` con `REALTIME_ENABLED=true`, `FISH_API_KEY=...`, `FISH_VOICE_ID=...`, y apuntar `BACKEND_URL` de `ChatWidget.jsx` al backend local.

## En curso: avatares de voz y video (plan completo en `~/.claude/plans/quiero-que-hagas-lo-mellow-dahl.md`)
Decisiones del usuario: avatar de video realista premium, voz clonada con **Fish Audio**, presupuesto < $10/mes, chat con el último modelo gratuito de Gemini.
Esas tres cosas no caben juntas (Tavus ~$0.26–0.37/min con planes desde ~$22–59/mes; HeyGen LiveAvatar custom ~$99/mes;
cifras de terceros, verificar). Higgsfield no hace tiempo real: solo sirve para assets (retrato, clips con su voz).
Créditos Higgsfield al 2026-10-18: 419.1 (plan starter).

| Fase | Contenido | Estado |
|---|---|---|
| 0 | HANDOFF, migrar a `google-genai`, extraer `persona.py` | **hecho y probado** localmente (sin commitear) |
| 1 | Llamada de voz con **Fish Audio**: STT del navegador → Gemini 3.8 Flash → TTS Fish con su voz clonada | **backend probado con Fish y Gemini reales (2026-10-18); falta probar en navegador (micrófono, MediaSource)** (sin commitear) |
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
