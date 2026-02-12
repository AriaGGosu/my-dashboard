# Overview – audio y sync con animaciones

Los audios se generaron en [TTS OpenAI](https://ttsopenai.com/). Cada clip se reproduce en secuencia y el bloque de texto correspondiente aparece **cuando empieza** ese clip, así el ritmo de la voz y el de la animación coinciden.

## Qué metadata necesitamos para que el texto y el audio vayan a la vez

Para el match actual (un bloque de texto por clip) **no hace falta metadata extra**:

1. **Orden de los clips**  
   El orden en `OVERVIEW_AUDIO_CLIPS` en `KPRLanding.tsx` (o en `overview-meta.json`) define la secuencia: clip 1 → texto 1, clip 2 → texto 2, etc.

2. **Duración**  
   No hace falta indicarla. El reproductor usa la duración real del MP3: cuando un clip termina (`ended`), se reproduce el siguiente y se muestra el siguiente bloque. Los **credits** (202, etc.) y la **velocidad** (0.8x) de TTS OpenAI no se usan para calcular tiempo; lo que cuenta es la duración del archivo.

Si en el futuro quieres **animación por palabra o por carácter** (que cada palabra aparezca cuando se dice), haría falta:

- **Timestamps por palabra**: inicio y fin de cada palabra en segundos (por ejemplo exportando desde [Whisper](https://github.com/openai/whisper) con timestamps, o usando herramientas de forced alignment). Esa metadata se usaría para disparar la animación de cada palabra en su momento.

Para solo “un bloque por clip”, con el orden correcto y los MP3 en `public/audio/overview/` es suficiente.

## Estructura de `overview-meta.json` (opcional)

- `clips`: array de objetos.
- Cada clip: `id`, `src`, `textRef`, y opcionalmente `durationSeconds` si quieres fijar la duración a mano en lugar de leerla del MP3.

## Archivos en esta carpeta

- `overview.txt`: texto de cada audio (1–6).
- MP3: nombres libres; en código se referencian por la ruta (ej. `/audio/overview/Overview.mp3`).
