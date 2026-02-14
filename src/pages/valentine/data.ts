// ——————————————————————————————————————————————
//  Types & Data — extracted from Valentine.tsx
// ——————————————————————————————————————————————

export interface QuestionNode {
  id: string;
  context: string;
  question: string;
  optionA: { label: string; next: string; together: boolean };
  optionB: { label: string; next: string; together: boolean };
  position: [number, number, number];
}

export interface EndNode {
  id: string;
  position: [number, number, number];
}

export interface ConnectionData {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  fromId: string;
  toId: string;
}

export interface PresenterLine {
  text: string;
  animation: string;
  duration: number;
  buttonText?: string;
  holdLastFrame?: boolean;
  autoAdvance?: boolean;
}

// ——————————————————————————————————————————————
//  Questions
// ——————————————————————————————————————————————

export const QUESTIONS: Record<string, QuestionNode> = {
  start: {
    id: "start",
    context: "Cierra los ojos. Imagina un camino que se divide en dos...",
    question: "Si pudieras elegir a alguien para recorrer la vida, ¿me elegirías a mí?",
    optionA: { label: "Te elegiría sin pensarlo.", next: "q2a", together: true },
    optionB: { label: "Necesito caminar sola primero.", next: "q2b", together: false },
    position: [0, -3, 0],
  },
  q2a: {
    id: "q2a",
    context: "Los años pasan, las estaciones cambian, pero algunos sentimientos permanecen...",
    question: "¿Te imaginas conmigo cuando tengamos canas y arrugas?",
    optionA: { label: "Envejecer contigo sería mi mayor aventura.", next: "q3a", together: true },
    optionB: { label: "El futuro me da vértigo, no puedo prometer tanto.", next: "q3b", together: false },
    position: [-8, 4, -15],
  },
  q2b: {
    id: "q2b",
    context: "Dicen que el amor verdadero no encadena, sino que libera...",
    question: "¿Crees que podríamos construir algo hermoso juntos?",
    optionA: { label: "Creo que juntos podemos con todo.", next: "q3b", together: true },
    optionB: { label: "Algunos caminos son más bonitos en soledad.", next: "q3c", together: false },
    position: [8, -2, -15],
  },
  q3a: {
    id: "q3a",
    context: "Habrá días de lluvia, de dudas, de silencios incómodos...",
    question: "¿Elegirías crecer conmigo, incluso en los días difíciles?",
    optionA: { label: "Especialmente en esos días, ahí quiero estar.", next: "q4a", together: true },
    optionB: { label: "No quiero ser la razón de tu dolor.", next: "q4b", together: false },
    position: [-14, 8, -30],
  },
  q3b: {
    id: "q3b",
    context: "La vida nos pone frente a decisiones que definen todo...",
    question: "Si tuvieras que apostar por alguien, ¿apostarías por nosotros?",
    optionA: { label: "Apostaría todo por nosotros.", next: "q4a", together: true },
    optionB: { label: "Prefiero no apostar con los sentimientos.", next: "q4b", together: false },
    position: [0, 1, -30],
  },
  q3c: {
    id: "q3c",
    context: "Cada corazón tiene su propio ritmo y su propio tiempo...",
    question: "¿Guardarías un lugar para mí en tu historia?",
    optionA: { label: "Siempre habrá un capítulo con tu nombre.", next: "q4a", together: true },
    optionB: { label: "Mi historia necesita páginas solo mías.", next: "q4b", together: false },
    position: [12, -4, -30],
  },
  q4a: {
    id: "q4a",
    context: "Este es el momento. No hay vuelta atrás...",
    question: "Aquí y ahora, con todo lo que somos... ¿me eliges?",
    optionA: { label: "Te elijo. Hoy, mañana y siempre.", next: "end", together: true },
    optionB: { label: "Te quiero, pero necesito elegirme a mí.", next: "end", together: false },
    position: [-8, 12, -45],
  },
  q4b: {
    id: "q4b",
    context: "A veces las decisiones más difíciles son las más honestas...",
    question: "¿Qué camino llama más fuerte a tu corazón?",
    optionA: { label: "El camino donde estés tú esperándome.", next: "end", together: true },
    optionB: { label: "El camino donde aprenda a ser yo misma.", next: "end", together: false },
    position: [8, -1, -45],
  },
};

export const TIEBREAKER: QuestionNode = {
  id: "tiebreaker",
  context: "El destino nos trajo hasta aquí empatados... El universo pide una última señal.",
  question: "Con total honestidad, ¿qué dice tu corazón en este momento?",
  optionA: { label: "Dice que quiere intentarlo contigo.", next: "end", together: true },
  optionB: { label: "Dice que necesita más tiempo a solas.", next: "end", together: false },
  position: [0, 2, -60],
};

export const ENDINGS: Record<string, EndNode> = {
  end: { id: "end", position: [0, 2, -60] },
};

export const ALL_NODES: Record<string, { id: string; position: [number, number, number] }> = {
  ...Object.fromEntries(Object.values(QUESTIONS).map(q => [q.id, { id: q.id, position: q.position }])),
  ...ENDINGS,
};

export const TOTAL_STEPS = 4;

// ——————————————————————————————————————————————
//  GLB paths & asset constants
// ——————————————————————————————————————————————

export const TURRET_GLB = "/glb/lol/turrets_(48).glb";
export const TURRET_RED_GLB = "/glb/lol/turrets_(12)red.glb";
export const TURRET_BLUE_GLB = "/glb/lol/turrets_(11)blue.glb";
export const SCUTTLE_CRAB_PURPLE_GLB = "/glb/lol/scuttle_crab_(6).glb";
export const SCUTTLE_CRAB_GREEN_GLB = "/glb/lol/scuttle_crab.glb";
export const NEXUS_GLB = "/glb/lol/poro.glb";
export const LOOT_GOBLIN_GLB = "/glb/lol/nexusblitz_lootgoblin_(9).glb";
export const PRESENTER_GLB = "/glb/presentador/custom_tftcafecutiesmaid_(nan).glb";

export const PENTAKILL_KARTHUS = "/glb/lol/pentakill/pentakill_karthus.glb";
export const PENTAKILL_MORDEKAISER = "/glb/lol/pentakill/pentakill_mordekaiser.glb";
export const PENTAKILL_OLAF = "/glb/lol/pentakill/pentakill_olaf.glb";
export const PENTAKILL_SONA = "/glb/lol/pentakill/pentakill_sona.glb";
export const PENTAKILL_YORICK = "/glb/lol/pentakill/pentakill_yorick.glb";
export const COVEN_NAMI = "/glb/lol/pentakill/coven_nami.glb";
export const CONCERT_STAGE_GLB = "/glb/stage/Concert Stage 2.glb";
export const DRUM_SET_GLB = "/glb/band/Drum Set.glb";
export const GUITAR_AMP_GLB = "/glb/band/Guitar Amp.glb";
export const SPOT_LIGHT_GLB = "/glb/light/Spot Light.glb";
export const CONCERT_MUSIC_SRC = "/audio/valentin/Feliz Valentín 2.mp3";

export const BARON_GLB = "/glb/lol/extras/baron.glb";
export const DRAGON_ELDER_GLB = "/glb/lol/extras/dragon_(elder).glb";

export const CRAB_MINIMAP_IMAGES: Record<string, string> = {
  purple: "/images/lol/Scuttle-crub-purple.png",
  green: "/images/lol/Scuttle-crub-green.png",
};

// ——————————————————————————————————————————————
//  Presenter script
// ——————————————————————————————————————————————

export const PRESENTER_SCRIPT: PresenterLine[] = [
  { text: "Regálame una noche, una noche regaaaaaaalaaaameeeeeee 🎶", animation: "sweep", duration: 5000, autoAdvance: true },
  { text: "¡Hey!", animation: "jumping", duration: 3000, buttonText: "!" },
  { text: "No le digas a nadie de esa canción...", animation: "turn_idle", duration: 3000, buttonText: "¿Qué canción?" },
  { text: "¡Correcto!", animation: "jumping", duration: 1000, autoAdvance: true },
  { text: "Mil disculpas, señorita T_T", animation: "intro_bow_02", duration: 3500, buttonText: "Hehe", holdLastFrame: true },
  { text: "Permíteme presentarme...", animation: "jumping", duration: 3500, autoAdvance: true },
  { text: "Mi nombre es 🐰 Le Bunny Bonbon y soy maid café presenter.", animation: "idle2", duration: 3500, buttonText: "¡Qué linda!" },
  { text: "Gracias, tú también eres muy linda.", animation: "celebrate", duration: 3500, buttonText: "Aww" },
  { text: "Bueno, bueno… vengo a contarte que tu enamorado te preparó algunas preguntas para este día tan especial.", animation: "trafficcontrol", duration: 3500, buttonText: "Ahh, ¿sí?" },
  { text: "¡Claro! Ahora elige tu personaje favorito y vamos allá.", animation: "click", duration: 3500, buttonText: "¡Vamos!" },
];

// ——————————————————————————————————————————————
//  Node color helpers
// ——————————————————————————————————————————————

function buildNodeColorMap(): Record<string, "red" | "blue" | "neutral"> {
  const map: Record<string, "red" | "blue" | "neutral"> = { start: "neutral", end: "neutral" };
  for (const q of Object.values(QUESTIONS)) {
    if (!map[q.optionA.next]) map[q.optionA.next] = "red";
    if (!map[q.optionB.next]) map[q.optionB.next] = "blue";
  }
  return map;
}
export const NODE_COLOR_MAP = buildNodeColorMap();

export function getNodeGlb(nodeId: string): string | null {
  if (nodeId === "start") return null;
  if (nodeId === "end") return null;
  const color = NODE_COLOR_MAP[nodeId];
  if (color === "red") return TURRET_RED_GLB;
  if (color === "blue") return TURRET_BLUE_GLB;
  return TURRET_GLB;
}

export function getConnections(): ConnectionData[] {
  const conns: ConnectionData[] = [];
  const seen = new Set<string>();
  for (const q of Object.values(QUESTIONS)) {
    const addConn = (next: string, color: string) => {
      const n = ALL_NODES[next];
      if (!n) return;
      const key = `${q.id}->${next}`;
      if (seen.has(key)) return;
      seen.add(key);
      conns.push({ from: q.position, to: n.position, color, fromId: q.id, toId: next });
    };
    addConn(q.optionA.next, "#ff6b9d");
    addConn(q.optionB.next, "#4a6fa5");
  }
  return conns;
}
