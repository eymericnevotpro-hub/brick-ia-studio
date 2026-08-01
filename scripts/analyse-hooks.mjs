#!/usr/bin/env node
// Analyse les 3 premières secondes de vidéos virales françaises et compte les
// structures d'accroche qui reviennent.
//
//   node scripts/analyse-hooks.mjs data/hooks.tsv
//
// Entrée  : un fichier TSV ou CSV avec au minimum une colonne `hook`.
//           Colonnes optionnelles : `vues`, `url`, `niche`.
// Sortie  : data/resultats-hooks.json  (les données brutes classées)
//           docs/strategie-contenu/rapport-hooks.md  (le rapport lisible)
//
// Prérequis : ANTHROPIC_API_KEY dans l'environnement, et `npm i @anthropic-ai/sdk`.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const BATCH_SIZE = 25;

/** Les structures d'accroche. Fermé volontairement : c'est ce qui permet de compter. */
const STRUCTURES = {
  promesse_chiffree: "Un bénéfice précis et chiffré (« ce prompt m'a fait gagner 6 h »)",
  resultat_dabord: "Le résultat final est montré ou annoncé avant toute explication",
  contradiction: "Une tension : tu fais X, et c'est précisément pour ça que Y échoue",
  curiosite_retenue: "Une information volontairement retenue (« l'outil que personne n'utilise »)",
  identification: "Le spectateur se reconnaît dans une situation précise",
  comparatif: "Deux ou trois versions opposées du même objet (« X vs Y vs Z »)",
  pattern_revele: "Plusieurs cas qui partagent un point commun caché",
  steal_this: "Une liste donnée gratuitement, à copier (« vole ces 10 accroches »)",
  autorite_volume: "Une autorité posée par un volume de travail (« j'ai analysé 1 000 X »)",
  actualite: "Une nouveauté ou une sortie récente comme accroche",
  storytelling: "Une histoire personnelle, souvent un échec ou un basculement",
  negation_conseil: "Un ordre d'arrêter quelque chose (« arrête de faire X »)",
  question_directe: "Une question posée frontalement au spectateur",
  autre: "Aucune des structures ci-dessus",
};

const LEVIERS = ["curiosite", "gain", "peur_de_rater", "identification", "surprise", "colere"];

const SCHEMA = {
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer", description: "L'index de l'accroche, tel que fourni" },
          structure: { type: "string", enum: Object.keys(STRUCTURES) },
          levier: { type: "string", enum: LEVIERS },
          contient_un_chiffre: { type: "boolean" },
          nb_mots: { type: "integer" },
          commentaire: {
            type: "string",
            description: "Une phrase courte : pourquoi cette accroche fonctionne (ou pas).",
          },
        },
        required: ["index", "structure", "levier", "contient_un_chiffre", "nb_mots", "commentaire"],
        additionalProperties: false,
      },
    },
  },
  required: ["classifications"],
  additionalProperties: false,
};

const SYSTEM = `Tu es analyste de contenu court francophone (TikTok, Reels, Shorts).
On te donne les trois premières secondes de vidéos qui ont dépassé 500 000 vues.
Pour chaque accroche, tu identifies UNE structure dominante et UN levier émotionnel dominant.

Les structures disponibles :
${Object.entries(STRUCTURES).map(([k, v]) => `- ${k} : ${v}`).join("\n")}

Règles :
- Une seule structure par accroche, celle qui porte le plus de poids.
- N'utilise "autre" que si aucune structure ne colle vraiment.
- "contient_un_chiffre" est vrai dès qu'un nombre apparaît, écrit en chiffres ou en lettres.
- "nb_mots" compte les mots de l'accroche telle que fournie.
- Réponds pour TOUTES les accroches du lot, avec l'index exact fourni.`;

// ---------------------------------------------------------------- lecture

/** Découpe une ligne CSV en respectant les guillemets. */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function readRows(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    throw new Error(`${file} : il faut une ligne d'en-tête puis au moins une accroche.`);
  }
  const isTsv = lines[0].includes("\t");
  const split = isTsv ? (l) => l.split("\t") : splitCsvLine;

  const header = split(lines[0]).map((h) => h.trim().toLowerCase());
  const hookCol = header.findIndex((h) => h === "hook" || h === "accroche");
  if (hookCol === -1) {
    throw new Error(`${file} : il manque une colonne "hook" (ou "accroche"). Trouvé : ${header.join(", ")}`);
  }

  return lines.slice(1).map((line, i) => {
    const cells = split(line);
    const get = (name) => {
      const c = header.indexOf(name);
      return c === -1 ? "" : (cells[c] ?? "").trim();
    };
    return {
      index: i,
      hook: (cells[hookCol] ?? "").trim(),
      vues: Number(get("vues").replace(/[^\d]/g, "")) || null,
      url: get("url"),
      niche: get("niche"),
    };
  }).filter((r) => r.hook.length > 0);
}

// ---------------------------------------------------------------- analyse

async function classifyBatch(client, batch) {
  const listing = batch.map((r) => `[${r.index}] ${r.hook}`).join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCHEMA },
    },
    messages: [{ role: "user", content: `Classe ces ${batch.length} accroches :\n\n${listing}` }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Le modèle a refusé de traiter ce lot. Vérifie le contenu des accroches.");
  }
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text).classifications;
}

// ---------------------------------------------------------------- rapport

function buildReport(rows, byIndex) {
  const total = rows.length;
  const counts = new Map();
  const leviers = new Map();
  let avecChiffre = 0;
  let totalMots = 0;

  for (const row of rows) {
    const c = byIndex.get(row.index);
    if (!c) continue;
    if (!counts.has(c.structure)) counts.set(c.structure, []);
    counts.get(c.structure).push({ ...row, ...c });
    leviers.set(c.levier, (leviers.get(c.levier) ?? 0) + 1);
    if (c.contient_un_chiffre) avecChiffre++;
    totalMots += c.nb_mots;
  }

  const classees = [...counts.values()].reduce((n, l) => n + l.length, 0);
  const ranked = [...counts.entries()].sort((a, b) => b[1].length - a[1].length);
  const pct = (n) => ((100 * n) / (classees || 1)).toFixed(1);

  const lines = [];
  lines.push("# Ce qui revient dans les accroches virales françaises");
  lines.push("");
  lines.push(`**${total} vidéos à plus de 500 000 vues, analysées par une IA.**`);
  lines.push("");
  lines.push("## En une ligne");
  lines.push("");
  if (ranked.length) {
    const [top, list] = ranked[0];
    lines.push(`La structure la plus fréquente est **${top}** — ${pct(list.length)} % des vidéos analysées.`);
  }
  lines.push(`**${pct(avecChiffre)} %** des accroches contiennent un chiffre.`);
  lines.push(`Longueur moyenne : **${(totalMots / (classees || 1)).toFixed(1)} mots**.`);
  lines.push("");
  lines.push("## Le classement");
  lines.push("");
  lines.push("| # | Structure | Vidéos | Part | Ce que c'est |");
  lines.push("|---|---|---:|---:|---|");
  ranked.forEach(([name, list], i) => {
    lines.push(`| ${i + 1} | \`${name}\` | ${list.length} | ${pct(list.length)} % | ${STRUCTURES[name] ?? ""} |`);
  });
  lines.push("");
  lines.push("## Le levier émotionnel");
  lines.push("");
  lines.push("| Levier | Vidéos | Part |");
  lines.push("|---|---:|---:|");
  [...leviers.entries()].sort((a, b) => b[1] - a[1]).forEach(([name, n]) => {
    lines.push(`| ${name} | ${n} | ${pct(n)} % |`);
  });
  lines.push("");
  lines.push("## Les exemples, structure par structure");
  ranked.forEach(([name, list]) => {
    lines.push("");
    lines.push(`### \`${name}\` — ${list.length} vidéos`);
    lines.push("");
    list
      .sort((a, b) => (b.vues ?? 0) - (a.vues ?? 0))
      .slice(0, 5)
      .forEach((r) => {
        const vues = r.vues ? ` *(${r.vues.toLocaleString("fr-FR")} vues)*` : "";
        lines.push(`- « ${r.hook} »${vues}`);
      });
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`Analyse générée avec ${MODEL} sur ${total} accroches. Méthode : transcription des 3 premières secondes, classification en ${Object.keys(STRUCTURES).length} structures, comptage.`);
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------- main

async function main() {
  const input = process.argv[2] ?? "data/hooks.tsv";
  if (!fs.existsSync(input)) {
    console.error(`Fichier introuvable : ${input}`);
    console.error("");
    console.error("Crée un TSV avec cet en-tête (une ligne par vidéo) :");
    console.error("hook\tvues\turl\tniche");
    process.exit(1);
  }

  const rows = readRows(input);
  console.log(`${rows.length} accroches lues depuis ${input}.`);

  const client = new Anthropic();
  const byIndex = new Map();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const n = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    process.stdout.write(`Lot ${n}/${totalBatches} (${batch.length} accroches)… `);
    try {
      for (const c of await classifyBatch(client, batch)) byIndex.set(c.index, c);
      console.log("ok");
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        console.log("limite atteinte, pause de 30 s puis reprise");
        await new Promise((r) => setTimeout(r, 30_000));
        i -= BATCH_SIZE;
        continue;
      }
      if (err instanceof Anthropic.APIError) {
        console.log(`erreur API ${err.status} — lot ignoré : ${err.message}`);
        continue;
      }
      throw err;
    }
  }

  const merged = rows.map((r) => ({ ...r, ...(byIndex.get(r.index) ?? {}) }));

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/resultats-hooks.json", JSON.stringify(merged, null, 2));

  const out = path.join("docs", "strategie-contenu", "rapport-hooks.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buildReport(rows, byIndex));

  console.log("");
  console.log(`${byIndex.size}/${rows.length} accroches classées.`);
  console.log("→ data/resultats-hooks.json");
  console.log(`→ ${out}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
