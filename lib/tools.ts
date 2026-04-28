export type ToolCategory = "video" | "image";
export type ModelType = "open-source" | "proprietary" | "redirect";

export interface StyleOption {
  id: string;
  label: string;
  emoji: string;
}

export interface Tool {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ToolCategory;
  emoji: string;
  color: string;
  accentColor: string;
  isNew?: boolean;
  isPro?: boolean;
  styles: StyleOption[];
  promptPlaceholder: string;
  examplePrompts: string[];
  apiUrl?: string;
  // Generation
  falModelId?: string;
  falCredits?: number;
  falAspectRatio?: string;
  // Transparency
  modelLabel: string;       // Nom réel affiché ex: "HunyuanVideo"
  modelBy: string;          // Qui a créé le modèle ex: "Tencent"
  modelType: ModelType;     // "open-source" | "proprietary" | "redirect"
}

export const TOOLS: Tool[] = [
  // ─── VIDEO ───────────────────────────────────────────────────────
  {
    id: "seedance",
    name: "HunyuanVideo",
    tagline: "Influenceurs & personnages IA",
    description: "Génère des vidéos avec personnages IA réalistes, poses naturelles et mouvements fluides",
    category: "video",
    emoji: "🎬",
    color: "#FF6B00",
    accentColor: "#FF9A3C",
    isNew: true,
    falModelId: "fal-ai/hunyuan-video",
    falCredits: 10,
    falAspectRatio: "16:9",
    modelLabel: "HunyuanVideo",
    modelBy: "Tencent",
    modelType: "open-source",
    styles: [
      { id: "influencer", label: "Influenceur IA", emoji: "🧑‍💻" },
      { id: "cinematic", label: "Cinématique", emoji: "🎥" },
      { id: "lifestyle", label: "Lifestyle", emoji: "☀️" },
      { id: "viral", label: "Viral TikTok", emoji: "🔥" },
    ],
    promptPlaceholder: "Ex: Une influenceuse IA aux cheveux dorés qui présente un produit dans un appartement luxueux à Paris...",
    examplePrompts: [
      "Un influenceur IA stylé qui danse dans une rue néon de Tokyo la nuit",
      "Une femme IA qui parle face caméra dans un studio minimaliste moderne",
      "Un personnage IA qui présente un téléphone dans un décor futuriste",
    ],
  },
  {
    id: "kling",
    name: "CogVideoX 5B",
    tagline: "Vidéos cinématographiques",
    description: "Génère des vidéos style cinéma avec mouvements de caméra pro et éclairages dramatiques",
    category: "video",
    emoji: "🎞️",
    color: "#7B2FFF",
    accentColor: "#A855F7",
    isPro: true,
    falModelId: "fal-ai/cogvideox-5b",
    falCredits: 10,
    falAspectRatio: "16:9",
    modelLabel: "CogVideoX-5B",
    modelBy: "Zhipu AI",
    modelType: "open-source",
    styles: [
      { id: "epic", label: "Épique", emoji: "⚡" },
      { id: "drama", label: "Dramatique", emoji: "🌩️" },
      { id: "action", label: "Action", emoji: "💥" },
      { id: "fantasy", label: "Fantaisie", emoji: "✨" },
    ],
    promptPlaceholder: "Ex: Un héros marchant vers le soleil couchant, caméra en contre-plongée, cinématique...",
    examplePrompts: [
      "Dragon survolant une ville futuriste sous la pluie, cinématique 8K",
      "Chevalier en armure dorée courant au ralenti dans une forêt enchantée",
      "Cascadeur sautant d'un building, vue aérienne, lever de soleil",
    ],
  },
  {
    id: "veo3",
    name: "Veo 3",
    tagline: "Vidéos réalistes Google IA",
    description: "API en liste d'attente — génère un prompt optimisé pour coller dans Veo 3",
    category: "video",
    emoji: "🌐",
    color: "#00A3FF",
    accentColor: "#34C3FF",
    isNew: true,
    modelLabel: "Veo 3",
    modelBy: "Google DeepMind",
    modelType: "redirect",
    styles: [
      { id: "photorealistic", label: "Photo-réaliste", emoji: "📸" },
      { id: "nature", label: "Nature", emoji: "🌿" },
      { id: "urban", label: "Urbain", emoji: "🏙️" },
      { id: "abstract", label: "Abstrait", emoji: "🌀" },
    ],
    promptPlaceholder: "Ex: Une forêt tropicale au lever du soleil, brume matinale, gouttes de rosée...",
    examplePrompts: [
      "Océan au coucher du soleil, vagues qui s'écrasent sur les rochers",
      "Rue animée de New York sous la pluie, reflets dans les flaques",
      "Lava coulant dans l'océan, fumée et vapeur, vue rapprochée",
    ],
    apiUrl: "https://labs.google/fx/tools/video-fx",
  },
  {
    id: "grok",
    name: "Wan Video",
    tagline: "Vidéos créatives & surréalistes",
    description: "Génère des vidéos créatives et artistiques avec des compositions visuelles uniques",
    category: "video",
    emoji: "⚡",
    color: "#FF2D78",
    accentColor: "#FF6AA7",
    falModelId: "fal-ai/wan/v2.1/t2v-13b",
    falCredits: 10,
    falAspectRatio: "16:9",
    modelLabel: "Wan 2.1 (13B)",
    modelBy: "Alibaba",
    modelType: "open-source",
    styles: [
      { id: "surreal", label: "Surréaliste", emoji: "🌈" },
      { id: "artistic", label: "Artistique", emoji: "🎨" },
      { id: "futuristic", label: "Futuriste", emoji: "🤖" },
      { id: "weird", label: "WTF Viral", emoji: "🤪" },
    ],
    promptPlaceholder: "Ex: Un astronaute qui fait du skateboard sur un anneau de Saturne, style cartoon néon...",
    examplePrompts: [
      "Chat géant marchant dans une ville en sucre coloré, surréaliste",
      "Robot dansant le flamenco dans un désert au coucher du soleil",
      "Poisson volant dans des nuages de bonbons, couleurs vives",
    ],
  },

  // ─── IMAGE ───────────────────────────────────────────────────────
  {
    id: "nanobanana",
    name: "Nano Banana 2",
    tagline: "Images IA ultra-précises",
    description: "Génère des images photoréalistes et créatives avec le modèle Google Gemini Flash Image",
    category: "image",
    emoji: "🍌",
    color: "#FFD700",
    accentColor: "#FFE566",
    isNew: true,
    falModelId: "fal-ai/nano-banana-2",
    falCredits: 2,
    falAspectRatio: "1:1",
    modelLabel: "Nano Banana 2",
    modelBy: "Google",
    modelType: "proprietary",
    styles: [
      { id: "3d-cgi", label: "3D CGI", emoji: "💎" },
      { id: "icon", label: "Icône jeu", emoji: "🎮" },
      { id: "character", label: "Personnage", emoji: "🧑" },
      { id: "product", label: "Produit", emoji: "📦" },
    ],
    promptPlaceholder: "Ex: Icône 3D d'une épée légendaire flottante, éclairage dramatique, fond sombre...",
    examplePrompts: [
      "Couronne royale en or 3D flottante, diamants brillants, fond noir",
      "Personnage guerrier 3D CGI, armure de cristal, pose épique",
      "Bouteille de potion magique 3D, liquide lumineux vert, fond sombre",
    ],
  },
  {
    id: "seedream",
    name: "FLUX Schnell",
    tagline: "Images créatives ultra-rapides",
    description: "Génère des images créatives en quelques secondes — posts, thumbnails, concepts",
    category: "image",
    emoji: "🌸",
    color: "#FF6B9D",
    accentColor: "#FF99BB",
    falModelId: "fal-ai/flux/schnell",
    falCredits: 2,
    falAspectRatio: "16:9",
    modelLabel: "FLUX Schnell",
    modelBy: "Black Forest Labs",
    modelType: "open-source",
    styles: [
      { id: "anime", label: "Anime", emoji: "🎌" },
      { id: "realistic", label: "Réaliste", emoji: "📷" },
      { id: "illustration", label: "Illustration", emoji: "🖌️" },
      { id: "thumbnail", label: "Thumbnail", emoji: "🖼️" },
    ],
    promptPlaceholder: "Ex: Anime girl dans un café japonais, fenêtre avec vue sur la pluie, ambiance douce...",
    examplePrompts: [
      "Fille anime aux yeux violets dans une forêt en fleurs de cerisier",
      "Portrait réaliste d'un influenceur stylé en veste en cuir, fond urbain",
      "Thumbnail YouTube avec texte impact et fond explosif coloré",
    ],
  },
  {
    id: "gptimage",
    name: "Recraft V3",
    tagline: "Images photoréalistes premium",
    description: "Rendus photoréalistes haute qualité avec rendu des textures et détails fins",
    category: "image",
    emoji: "🤖",
    color: "#10B981",
    accentColor: "#34D399",
    isPro: true,
    falModelId: "fal-ai/recraft-v3",
    falCredits: 2,
    falAspectRatio: "1:1",
    modelLabel: "Recraft V3",
    modelBy: "Recraft",
    modelType: "proprietary",
    styles: [
      { id: "photo", label: "Photo", emoji: "📸" },
      { id: "logo", label: "Logo & Texte", emoji: "✍️" },
      { id: "social", label: "Social Media", emoji: "📱" },
      { id: "mockup", label: "Mockup", emoji: "💻" },
    ],
    promptPlaceholder: "Ex: Photo d'un créateur de contenu dans un home studio avec écrans et lumières LED...",
    examplePrompts: [
      "Créateur de contenu filmant avec un ring light dans un bureau moderne",
      "Logo minimaliste pour une marque lifestyle avec texte élégant",
      "Mockup iPhone avec app ouverte sur un bureau en bois élégant",
    ],
  },
];

export const VIDEO_TOOLS = TOOLS.filter(t => t.category === "video");
export const IMAGE_TOOLS = TOOLS.filter(t => t.category === "image");

export function getTool(id: string): Tool | undefined {
  return TOOLS.find(t => t.id === id);
}
