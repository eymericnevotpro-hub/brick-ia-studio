import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface CoachContext {
  displayTotal: number;
  goal: number;
  remaining: number;
  daysLeft: number;
  doneCount: number;
  totalCount: number;
  onPace: boolean;
  modeLabel: string;
}

const fmtEur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

const FOCUS_HINTS: Record<string, string> = {
  hook:
    "Concentre-toi sur 3 idées de hook (accroches de 3 premières secondes) percutantes pour une vidéo IA TikTok/Insta. Donne-les concrètement.",
  script:
    "Concentre-toi sur la trame d'un script de vidéo courte IA : propose un angle précis, le hook, les 2-3 beats, et la phrase de fin.",
  pitch:
    "Concentre-toi sur un pitch de prospection : écris une accroche de DM/mail courte et concrète à envoyer à une marque pour vendre une vidéo de pub IA.",
};

function buildPrompt(ctx: CoachContext, focus?: string): string {
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const focusLine = focus && FOCUS_HINTS[focus] ? `\nDemande spécifique du jour : ${FOCUS_HINTS[focus]}\n` : "";
  return `Tu es le coach quotidien d'un autoentrepreneur français qui veut atteindre 10 000 € par mois grâce à trois sources : sa communauté Skool sur l'IA (abonnement mensuel), des vidéos de pub IA livrées à des marques (80€ courte, 150€ longue), et son contenu TikTok/Instagram.

État du jour (${dateStr}) :
- Revenus du mois : ${fmtEur(ctx.displayTotal)} / ${fmtEur(ctx.goal)} (${Math.round((100 * ctx.displayTotal) / ctx.goal)}%)
- Reste à faire : ${fmtEur(ctx.remaining)} en ${ctx.daysLeft} jour(s)
- Rituels faits aujourd'hui : ${ctx.doneCount}/${ctx.totalCount}
- ${ctx.onPace ? "Il est dans les temps." : "Il est en retard sur l'objectif."}
${focusLine}
Écris-lui UN message court (3-4 phrases max, ton direct et chaleureux, tutoiement) qui :
1. Reconnaît où il en est (sans le flatter inutilement)
2. Donne UN angle d'action concret et précis pour aujourd'hui (idée de vidéo IA, sujet TikTok, hook pour prospecter une marque, post Skool, etc. — sois spécifique, propose un vrai sujet ou une vraie accroche)
3. Termine par une phrase qui pique sa motivation

Pas d'emoji. Pas de blabla générique. Pas de listes. Juste du texte fluide qui donne envie de bouger.`;
}

// Local fallback when no API key is set yet (the user said "j'ajouterai l'API claude").
function fallbackMessage(ctx: CoachContext, focus?: string): string {
  if (focus === "hook") {
    return "Trois hooks à tester aujourd'hui : « J'ai laissé une IA gérer ma journée, voilà ce qui s'est passé », « Personne ne te dit ça sur l'IA en 2026 », « Cette astuce IA m'a fait gagner 3h hier ». Choisis-en un, tourne dans l'heure, ne cherche pas la perfection — la version publiée bat la version parfaite restée dans ton téléphone.";
  }
  if (focus === "script") {
    return "Angle : « 3 outils IA que tout créateur devrait connaître ». Hook : montre le résultat final dès la 1re seconde. Beat 1 : le problème en une phrase. Beat 2 : l'outil en action, écran à l'appui. Beat 3 : le résultat chiffré. Fin : « Lequel tu testes en premier ? ». Tourne-le maintenant, monte ce soir.";
  }
  if (focus === "pitch") {
    return "Pitch à envoyer : « Salut [Marque], je crée des pubs IA qui scrollent moins vite — j'en ai fait une de 15s sur un produit comme le vôtre, je vous l'envoie ? Aucune obligation, juste pour voir si le style colle. » Court, concret, sans pression. Envoie-le à 5 marques avant ce soir, c'est ça qui débloque les 80-150€.";
  }
  const late = !ctx.onPace;
  const base = late
    ? `Tu es à ${fmtEur(ctx.displayTotal)} et il reste ${fmtEur(ctx.remaining)} en ${ctx.daysLeft} jours — du retard, mais rien d'irrattrapable. `
    : `${fmtEur(ctx.displayTotal)} au compteur, tu tiens le rythme. `;
  const ritual =
    ctx.doneCount >= ctx.totalCount
      ? "Tes rituels du jour sont bouclés, capitalise dessus. "
      : `Tu en es à ${ctx.doneCount}/${ctx.totalCount} rituels — enchaîne le suivant avant de souffler. `;
  return (
    base +
    ritual +
    "Aujourd'hui, le levier numéro un : tourne une vidéo courte sur un cas d'usage IA concret (avant 11h, quand ta tête est claire) et envoie 5 messages de prospection dans la foulée. " +
    "Le mois ne se gagne pas en une fois, il se gagne une action à la fois — fais la prochaine."
  );
}

export async function POST(request: NextRequest) {
  let ctx: CoachContext;
  let focus: string | undefined;
  try {
    const body = await request.json();
    ctx = body.context as CoachContext;
    focus = body.focus as string | undefined;
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ text: fallbackMessage(ctx, focus), source: "fallback" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: buildPrompt(ctx, focus) }],
      }),
    });
    if (!res.ok) {
      return Response.json({ text: fallbackMessage(ctx, focus), source: "fallback" });
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text?.trim();
    if (!text) {
      return Response.json({ text: fallbackMessage(ctx, focus), source: "fallback" });
    }
    return Response.json({ text, source: "claude" });
  } catch {
    return Response.json({ text: fallbackMessage(ctx, focus), source: "fallback" });
  }
}
