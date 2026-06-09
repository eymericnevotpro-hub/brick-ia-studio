// Planche training program — phase-based progression. Data is in French to
// match the rest of the dashboard. Volumes/sets are typical recommendations
// from established calisthenics progressions, not a personalized coaching plan.

export interface Exercise {
  name: string;
  detail: string;
  sets: string;
  rest?: string;
  note?: string;
}

export interface Block {
  title: string;
  kind: "warmup" | "skill" | "strength" | "gym" | "antagonist" | "mobility";
  exercises: Exercise[];
}

export interface Phase {
  id: string;
  number: number;
  name: string;
  goal: string;
  duration: string;
  description: string;
  prereqs: string[];
  testOut: string;
  blocks: Block[];
}

export const WEEKLY_SCHEDULE: { day: string; focus: string; bullets: string[] }[] = [
  {
    day: "Lundi",
    focus: "Skill planche (long) + accessoires légers",
    bullets: [
      "Échauffement complet poignets + épaules (8-10 min)",
      "Travail de la position planche (bloc skill complet)",
      "Pompes pseudo-planche : 4 séries",
      "Salle légère : élévations latérales, oiseau, gainage 20 min",
    ],
  },
  {
    day: "Mardi",
    focus: "Repos actif",
    bullets: [
      "Mobilité épaules + poignets (15 min)",
      "Cardio léger optionnel (vélo, marche rapide)",
      "Étirements pectoraux et grands dorsaux",
    ],
  },
  {
    day: "Mercredi",
    focus: "Force pure (push + scapulaire)",
    bullets: [
      "Échauffement",
      "Développé militaire ou dips lestés : 4×6-8",
      "Élévations latérales lourdes : 4×8-10",
      "Travail scapulaire : protraction/dépression bandes",
      "Curls eccentric biceps (tendons) 3×8",
    ],
  },
  {
    day: "Jeudi",
    focus: "Repos complet",
    bullets: ["Récupération", "Sommeil 8h", "Pas d'entraînement"],
  },
  {
    day: "Vendredi",
    focus: "Skill planche (court) + antagonistes",
    bullets: [
      "Échauffement",
      "Travail planche : holds courts, qualité avant quantité",
      "Antagonistes : back lever progressions, tractions, rowing",
      "Conditionnement poignets 5 min",
    ],
  },
  {
    day: "Samedi",
    focus: "Salle complète (option)",
    bullets: [
      "Jambes : squats, fentes, mollets",
      "Tirage horizontal et vertical",
      "Travail core lourd : ab-wheel, hanging leg raises",
      "Pas de planche aujourd'hui",
    ],
  },
  {
    day: "Dimanche",
    focus: "Repos complet + mobilité",
    bullets: ["Mobilité douce", "Préparation mentale semaine suivante"],
  },
];

export const PHASES: Phase[] = [
  {
    id: "lean",
    number: 1,
    name: "Planche Lean",
    goal: "Tenir 30s en planche lean propre (épaules bien devant les poignets, bras verrouillés)",
    duration: "4 à 8 semaines",
    description:
      "Phase fondatrice. On gagne la conditionnement des poignets, le verrouillage bras tendu et la base de force scapulaire. Sans cette base, les phases suivantes sont une recette à blessures (épaules, biceps, poignets).",
    prereqs: [
      "Pompes strictes au sol : 15 d'affilée",
      "Dips strictes : 8 d'affilée",
      "Capacité à tenir 30s en planche sur les avant-bras (gainage classique)",
    ],
    testOut: "30 secondes nettes en planche lean, bras complètement verrouillés, sans tremblement majeur.",
    blocks: [
      {
        title: "Échauffement poignets & épaules",
        kind: "warmup",
        exercises: [
          { name: "Rotations poignets", detail: "Cercles lents, paumes ouvertes puis fermées", sets: "2 × 20s chaque sens" },
          { name: "Pompes sur poignets", detail: "Mains sur le dessus, pression progressive", sets: "3 × 10", note: "À ne pas zapper — clé pour éviter la tendinite" },
          { name: "Étirements paumes / avant-bras", detail: "Paume vers le haut puis vers le bas", sets: "2 × 30s chaque" },
          { name: "Rotations épaules avec bâton", detail: "Bras tendus, fais passer le bâton derrière la tête", sets: "2 × 10" },
        ],
      },
      {
        title: "Skill planche",
        kind: "skill",
        exercises: [
          { name: "Planche lean (sol ou parallettes)", detail: "Épaules bien devant les poignets, corps gainé, bras verrouillés", sets: "5 × 20-30s", rest: "90s" },
          { name: "Pompes pseudo-planche (PPPU)", detail: "Mains aux hanches, coudes pointés vers les pieds, descente lente", sets: "4 × 6-10", rest: "90s" },
          { name: "Hollow body hold", detail: "Bas du dos plaqué au sol, jambes + épaules levées", sets: "4 × 30s", rest: "60s" },
        ],
      },
      {
        title: "Force scapulaire (bras tendus)",
        kind: "strength",
        exercises: [
          { name: "Scapular push-ups", detail: "Position planche, bras tendus, fais juste descendre/monter les omoplates", sets: "3 × 10", rest: "60s" },
          { name: "Support RTO ou sur parallettes", detail: "Suspension bras tendus, épaules baissées, mains tournées vers l'extérieur", sets: "4 × 30s", rest: "90s" },
        ],
      },
      {
        title: "Accessoires en salle (poids / machines)",
        kind: "gym",
        exercises: [
          { name: "Élévations latérales haltères", detail: "Tempo lent (2s montée, 2s descente)", sets: "4 × 12", rest: "60s", note: "Léger, on construit la base deltoïde" },
          { name: "Élévations frontales haltères", detail: "Bras tendus, légère flexion coude", sets: "3 × 12", rest: "60s" },
          { name: "Face pulls poulie haute", detail: "Coudes hauts, tirer vers le visage", sets: "3 × 15", rest: "60s", note: "Santé des épaules — obligatoire" },
          { name: "Wrist curls (poignets)", detail: "Avant-bras posé sur banc, haltère ou barre légère", sets: "3 × 15 (paume haut + paume bas)", rest: "60s" },
        ],
      },
    ],
  },
  {
    id: "tuck",
    number: 2,
    name: "Tuck Planche",
    goal: "Tenir 20s en tuck planche (genoux contre la poitrine, dos rond, bras tendus, hanches au niveau des épaules)",
    duration: "6 à 12 semaines",
    description:
      "Premier vrai mouvement planche. La position groupée réduit le levier — c'est ici qu'on apprend à pousser les épaules vers l'avant et à supporter son poids sur des bras tendus. Les biceps commencent à vraiment souffrir : on protège avec du travail eccentric.",
    prereqs: [
      "30s de planche lean propres validés",
      "Aucune douleur poignet/coude depuis 2 semaines",
      "Pseudo planche push-ups : 8 strictes",
    ],
    testOut: "20 secondes de tuck planche, hanches au niveau des épaules, bras complètement tendus.",
    blocks: [
      {
        title: "Échauffement (rappel)",
        kind: "warmup",
        exercises: [
          { name: "Conditionnement poignets complet", detail: "Toute la routine de la phase 1", sets: "5-7 min" },
          { name: "Activation deltoïdes + bandes", detail: "Élévations latérales bandes 2×20, rotations externes 2×15", sets: "2 séries" },
        ],
      },
      {
        title: "Skill planche",
        kind: "skill",
        exercises: [
          { name: "Tuck planche holds", detail: "Sur parallettes ou poings. Cherche la qualité, pas la durée", sets: "5 × 5-10s, monter à 15s", rest: "2 min" },
          { name: "Négatifs depuis frog stand", detail: "Frog stand → descente contrôlée vers tuck planche", sets: "4 × 3", rest: "90s" },
          { name: "Planche lean maintenance", detail: "Pour ne pas perdre la base", sets: "3 × 30s", rest: "60s" },
        ],
      },
      {
        title: "Force droit-bras",
        kind: "strength",
        exercises: [
          { name: "PPPU déclinés (pieds surélevés)", detail: "Pousse l'angle pour mimer la planche", sets: "4 × 8", rest: "90s" },
          { name: "Scapular pulls suspendus", detail: "Barre fixe, omoplates qui se rétractent et descendent", sets: "3 × 8", rest: "60s" },
          { name: "Hollow rocks", detail: "Berce-toi en gardant la forme hollow", sets: "3 × 20", rest: "45s" },
        ],
      },
      {
        title: "Accessoires en salle",
        kind: "gym",
        exercises: [
          { name: "Élévations latérales haltères", detail: "Plus lourd que phase 1, tempo contrôlé", sets: "4 × 10-12", rest: "75s" },
          { name: "Développé militaire haltères assis", detail: "Trajectoire stricte, descente sous le menton", sets: "3 × 8-10", rest: "90s" },
          { name: "Reverse fly (oiseau) haltères", detail: "Buste penché, bras semi-tendus", sets: "3 × 15", rest: "60s" },
          { name: "Curls eccentric haltères", detail: "Monte avec les 2 bras, descends 4s avec 1 seul. Protège tes tendons biceps", sets: "3 × 6 (par bras)", rest: "90s", note: "Critique pour éviter la tendinite distale du biceps" },
          { name: "Wrist roller", detail: "Tige + corde + poids, enrouler et dérouler", sets: "3 × 2 allers-retours", rest: "60s" },
        ],
      },
    ],
  },
  {
    id: "adv-tuck",
    number: 3,
    name: "Advanced Tuck Planche",
    goal: "Tenir 15-20s en advanced tuck planche (dos plat à l'horizontale, genoux pliés mais cuisses tirées vers la poitrine)",
    duration: "8 à 12 semaines",
    description:
      "On allonge progressivement le levier. Le dos doit être plat, c'est cette planéité qui distingue le tuck du adv tuck. La force progresse lentement : patience, qualité, et beaucoup de holds courts plutôt que peu de longs.",
    prereqs: [
      "Tuck planche 20s validée",
      "Pas de douleur tendineuse persistante",
      "Capacité à faire 3 pompes tuck planche sur parallettes",
    ],
    testOut: "15 secondes nettes en advanced tuck planche, dos à plat à l'horizontale.",
    blocks: [
      {
        title: "Échauffement",
        kind: "warmup",
        exercises: [
          { name: "Routine poignets / épaules complète", detail: "Plus de volume — tu es lourd sur les articulations maintenant", sets: "8-10 min" },
        ],
      },
      {
        title: "Skill planche",
        kind: "skill",
        exercises: [
          { name: "Adv tuck planche holds", detail: "Maximum 10s par série, viser la qualité parfaite", sets: "5 × 5-10s", rest: "2 min" },
          { name: "Adv tuck planche push-ups", detail: "Pompes en restant en position adv tuck", sets: "3 × 3-5", rest: "2 min" },
          { name: "Tuck planche push-ups (maintien)", detail: "Plus accessible, garde le mouvement bien rodé", sets: "3 × 5", rest: "90s" },
          { name: "Leg lifts depuis tuck planche", detail: "En tuck planche, tends une jambe à la fois", sets: "3 × 6 (alterné)", rest: "90s" },
        ],
      },
      {
        title: "Force complémentaire",
        kind: "strength",
        exercises: [
          { name: "Planche lean lourd (max)", detail: "Tu peux ajouter 2-5 kg sur le bas du dos pour surcharger", sets: "3 × 20s", rest: "2 min" },
          { name: "Pseudo planche push-ups lestées", detail: "Gilet 5-10 kg", sets: "3 × 6", rest: "2 min" },
        ],
      },
      {
        title: "Accessoires en salle",
        kind: "gym",
        exercises: [
          { name: "Élévations latérales lourdes", detail: "Travail strict, charge progressive", sets: "4 × 10", rest: "90s" },
          { name: "Y-raises poulie ou haltères", detail: "Bras en Y, monte au-dessus de la tête", sets: "3 × 12", rest: "60s" },
          { name: "Dips lestés", detail: "Gilet ou ceinture", sets: "3 × 6-8", rest: "2 min" },
          { name: "Curls eccentric haltères", detail: "Continue, c'est la vie de tes biceps", sets: "3 × 8 (descente 5s)", rest: "90s" },
          { name: "Travail poignets — wrist roller + pompes poignets", detail: "Combine les deux", sets: "3 séries de chaque", rest: "60s" },
        ],
      },
    ],
  },
  {
    id: "straddle",
    number: 4,
    name: "Straddle Planche",
    goal: "Tenir 5-10s en straddle planche (jambes écartées tendues, corps horizontal)",
    duration: "3 à 6 mois",
    description:
      "Le grand saut. Les jambes s'écartent et se tendent, ce qui multiplie le bras de levier. Beaucoup s'arrêtent ici car la progression devient lente. Continue, utilise des holds partiels (une jambe tendue) pour habituer ton corps.",
    prereqs: [
      "Advanced tuck planche 15s validée",
      "Mobilité hanche correcte pour écarter les jambes (sinon : travail mobilité dédié)",
      "Pas de douleur épaules ou biceps",
    ],
    testOut: "5 secondes de straddle planche complète, hanches au niveau des épaules, jambes tendues écartées.",
    blocks: [
      {
        title: "Échauffement long",
        kind: "warmup",
        exercises: [
          { name: "Routine complète (10 min)", detail: "Plus tu progresses, plus l'échauffement compte", sets: "10 min" },
          { name: "Mobilité hanches", detail: "Ouverture papillon, pancake stretches", sets: "5 min" },
        ],
      },
      {
        title: "Skill planche",
        kind: "skill",
        exercises: [
          { name: "Straddle partial holds (1 jambe tendue)", detail: "Pars en adv tuck, tends une jambe sur le côté", sets: "5 × 5s par jambe", rest: "2 min" },
          { name: "Straddle planche holds complets", detail: "Démarre depuis position groupée, ouvre les jambes", sets: "5 × 3-5s", rest: "2 min" },
          { name: "Straddle leg lifts (assistées)", detail: "Sur parallettes, monte les jambes droites écartées", sets: "3 × 5", rest: "90s" },
          { name: "Adv tuck → straddle transitions", detail: "Passe lentement de l'un à l'autre", sets: "4 × 3", rest: "2 min" },
        ],
      },
      {
        title: "Force planche maintenance",
        kind: "strength",
        exercises: [
          { name: "Adv tuck planche holds", detail: "Maintenir 15-20s par série pour ne pas régresser", sets: "3 × 15s", rest: "2 min" },
          { name: "Pompes en adv tuck planche", detail: "Continue à entretenir le pattern", sets: "3 × 3", rest: "2 min" },
        ],
      },
      {
        title: "Accessoires en salle",
        kind: "gym",
        exercises: [
          { name: "Élévations latérales lourdes (charge maximale stricte)", detail: "C'est ton vrai assistant", sets: "4 × 8-10", rest: "90s" },
          { name: "Développé militaire barre", detail: "Force globale épaules", sets: "4 × 6-8", rest: "2 min" },
          { name: "Dips lestés", detail: "Charge progressive", sets: "3 × 6-8", rest: "2 min" },
          { name: "Tractions lestées", detail: "Antagoniste, équilibre dos/épaules", sets: "3 × 6-8", rest: "2 min" },
          { name: "Curls eccentric + isométriques", detail: "Le coude doit rester en bonne santé", sets: "4 × 6", rest: "90s" },
        ],
      },
      {
        title: "Antagonistes",
        kind: "antagonist",
        exercises: [
          { name: "Back lever progressions (tuck ou adv tuck)", detail: "Équilibre push/pull en bras tendus", sets: "3 × 10-15s", rest: "2 min" },
          { name: "Rowing horizontal", detail: "Anneaux ou barre", sets: "3 × 8-10", rest: "90s" },
        ],
      },
    ],
  },
  {
    id: "full",
    number: 5,
    name: "Full Planche",
    goal: "Tenir 3-5s puis viser 10s en full planche (corps tendu parfaitement à l'horizontale, jambes serrées)",
    duration: "6 à 18 mois",
    description:
      "Le boss. La différence avec le straddle est énorme — un nouveau levier complet. À ce stade, la progression dépend autant du système nerveux que des muscles. Réduis légèrement le volume mais augmente la qualité. Tu peux ajouter quelques eccentric depuis straddle assist pour habituer.",
    prereqs: [
      "Straddle planche 5s validée",
      "Aucune blessure active",
      "Routine d'échauffement parfaitement maîtrisée",
    ],
    testOut: "3 secondes propres en full planche, ensuite vise progressivement 5s puis 10s.",
    blocks: [
      {
        title: "Échauffement très complet",
        kind: "warmup",
        exercises: [
          { name: "Routine totale 12-15 min", detail: "Poignets, épaules, scapulaires, hollow, mobilité hanches", sets: "12-15 min" },
        ],
      },
      {
        title: "Skill planche",
        kind: "skill",
        exercises: [
          { name: "Full planche assistées (sangles ou élastique)", detail: "Sangles autour du bassin reliées à barre haute, ou bande sous les hanches", sets: "5 × 3-5s", rest: "3 min" },
          { name: "Full planche partial holds", detail: "Sans assistance, vise 1-3s par série, qualité absolue", sets: "5 × max 3s", rest: "3 min" },
          { name: "Eccentric depuis straddle vers full", detail: "Tiens straddle, écarte progressivement les jambes pour les serrer", sets: "3 × 3", rest: "3 min" },
          { name: "Straddle planche push-ups", detail: "Maintien du pattern", sets: "3 × 3", rest: "2 min" },
          { name: "Press to handstand depuis straddle planche", detail: "Renforce la transition", sets: "3 × 3", rest: "2 min" },
        ],
      },
      {
        title: "Force planche maintenance",
        kind: "strength",
        exercises: [
          { name: "Straddle planche holds", detail: "10s par série", sets: "3 × 10s", rest: "3 min" },
          { name: "Adv tuck planche push-ups", detail: "Entretien", sets: "3 × 5", rest: "2 min" },
        ],
      },
      {
        title: "Accessoires en salle",
        kind: "gym",
        exercises: [
          { name: "Élévations latérales lourdes", detail: "Toujours, à vie", sets: "4 × 8", rest: "90s" },
          { name: "Développé militaire barre lourd", detail: "Pyramidal 5-3-1", sets: "4 séries", rest: "2-3 min" },
          { name: "Dips lestés lourds", detail: "Charge progressive", sets: "4 × 5-8", rest: "2 min" },
          { name: "Curls + travail tendons", detail: "Toujours indispensable", sets: "4 × 6", rest: "90s" },
        ],
      },
      {
        title: "Mobilité / récupération (chaque jour)",
        kind: "mobility",
        exercises: [
          { name: "Étirements pectoraux", detail: "À l'angle d'une porte", sets: "2 × 45s" },
          { name: "Ouverture épaules sur le sol", detail: "Bras tendus en T, déposer", sets: "2 × 60s" },
          { name: "Massage avant-bras", detail: "Rouleau, balle, ou main", sets: "5 min" },
        ],
      },
    ],
  },
];

export const SAFETY_NOTES: string[] = [
  "Échauffement non négociable : 8-12 min minimum, poignets en premier.",
  "Bras toujours verrouillés en planche. Coude plié = risque biceps majeur.",
  "Si tendinite naissante (poignet, coude, épaule) : recule d'une phase 1-2 semaines, augmente le travail eccentric.",
  "Volume hebdo : 3 sessions planche maximum. La récup, c'est là que la force se construit.",
  "Tu peux faire la salle (jambes, dos, abs) à côté sans souci, ça n'empiète pas sur la planche.",
  "Patience : la full planche prend 2-4 ans en moyenne. Personne ne saute des étapes sans payer en blessures.",
];

export function getPhase(id: string): Phase | undefined {
  return PHASES.find((p) => p.id === id);
}
