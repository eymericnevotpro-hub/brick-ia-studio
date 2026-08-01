# L'étude : analyser 200 accroches virales françaises

Ton acte de fondation. Une soirée de travail qui te donne ton autorité, ton produit gratuit,
et 5 vidéos de contenu.

> **Pourquoi je ne l'ai pas lancée pour toi :** TikTok et Instagram sont derrière un mur de
> connexion et n'exposent pas d'API accessible depuis ici — je ne peux ni aspirer les vidéos
> ni lire leurs transcriptions. La collecte doit venir de ton compte. Le reste, en revanche,
> est automatisé : le script `scripts/analyse-hooks.mjs` fait la classification et écrit le
> rapport.

---

## Ce que ça produit

- **Une phrase d'autorité** que personne ne peut dire en France : *« j'ai fait analyser 200
  vidéos virales françaises par une IA »*
- **Un rapport en Markdown** prêt à mettre en Notion → ton lead magnet
- **Un JSON** avec chaque accroche classée → ta matière première pour les vidéos suivantes
- **5 vidéos** de la semaine 2 (le classement, le hook n°1, le making-of, les patterns…)

---

## Étape 1 — Collecter (0 minute « en plus »)

Pendant la semaine 1, **au fil de ton scroll normal**, enregistre dans une collection TikTok
dédiée toute vidéo francophone qui dépasse ~500 000 vues. Fais pareil sur Instagram avec un
dossier de sauvegardes.

Objectif : **200 vidéos**. À raison de 30 par jour pendant que tu scrolles, c'est fait en une
semaine sans y consacrer une minute dédiée.

**Ne te limite pas à ta niche.** Les structures d'accroche traversent les sujets — c'est
justement ce que l'étude démontre, et c'est ce qui la rend intéressante.

---

## Étape 2 — Saisir (60 à 75 minutes)

Crée `data/hooks.tsv` (séparé par des tabulations — c'est plus sûr que les virgules avec du
texte français) :

```
hook	vues	url	niche
Un hook à 100 vues vs 100 000 vues	1200000	https://…	marketing
Arrête de payer 20 € par mois pour ça	840000	https://…	ia
J'ai perdu 12 000 € en faisant cette erreur	2300000	https://…	business
```

Seule la colonne `hook` est obligatoire — mais remplis `vues` si tu peux, ça permet de
classer les exemples par performance dans le rapport.

**Pour chaque vidéo, tu ne notes que les 3 premières secondes** : ce qui est dit, ou ce qui
est écrit à l'écran si c'est plus fort. ~15 secondes par vidéo, soit un peu plus d'une heure
pour 200. Mets un podcast, c'est mécanique.

> Si tu veux aller plus vite : dicte les accroches dans une note vocale en faisant défiler ta
> collection, puis fais transcrire et mettre en tableau par une IA. Tu passes de 75 à 30 min.

---

## Étape 3 — Lancer (5 minutes)

```bash
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY=sk-ant-…
node scripts/analyse-hooks.mjs data/hooks.tsv
```

Le script classe les accroches par lots de 25 et écrit :

- `data/resultats-hooks.json` — chaque accroche avec sa structure, son levier, un commentaire
- `docs/strategie-contenu/rapport-hooks.md` — le rapport lisible

Sur 200 accroches, compte 2 à 3 minutes et environ 1 à 2 € d'API.

### Ce qu'il mesure

| Sortie | Détail |
|---|---|
| **Structure dominante** | 14 catégories fermées (promesse chiffrée, contradiction, comparatif, pattern révélé, steal this, autorité par le volume, storytelling…) |
| **Levier émotionnel** | curiosité · gain · peur de rater · identification · surprise · colère |
| **Présence d'un chiffre** | Le pourcentage d'accroches virales qui contiennent un nombre |
| **Longueur moyenne** | En mots — c'est un des chiffres les plus parlants du rapport |
| **Exemples classés** | Les 5 meilleures accroches de chaque structure, triées par vues |

La liste des structures est **volontairement fermée** : c'est ce qui permet de compter. Si tu
veux en ajouter une, édite l'objet `STRUCTURES` en haut du script — le schéma et le prompt
se mettent à jour tout seuls.

---

## Étape 4 — Mettre en forme (90 minutes)

Reprends le rapport Markdown dans un Notion propre, à ta DA (orange sur noir) :

1. **La phrase d'ouverture** : ce que tu as fait, en une ligne, avec le chiffre.
2. **Le top 5 des structures**, avec 3 exemples réels chacune.
3. **Les 3 chiffres marquants** (le % avec un nombre, la longueur moyenne, la structure n°1).
4. **50 accroches à copier-coller**, réécrites pour être réutilisables — c'est la partie que
   les gens gardent.
5. **Une page « comment je l'ai fait »** avec le prompt. Donner la méthode ne te dessert pas :
   c'est ce qui rend l'étude crédible, et personne ne va la refaire.

---

## La règle de l'honnêteté

**Ne gonfle jamais le chiffre.** Si tu as analysé 200 vidéos, tu dis 200.

Ta référence dit « j'ai étudié 50 000 hooks ». Le jour où quelqu'un demande la méthodo — et
sur un compte de conseils réseaux, quelqu'un demande toujours — un chiffre invérifiable te
coûte plus cher que ce qu'il t'a rapporté. 200 vidéos françaises analysées par IA, avec le
script public, c'est vérifiable et c'est déjà unique sur le marché francophone.

---

## Après

L'étude n'est pas un one-shot, c'est un actif que tu rafraîchis :

- **Tous les 3 mois** : refais tourner le script sur 200 nouvelles vidéos → « ce qui a changé
  dans les accroches françaises depuis janvier ». Une vidéo, un post LinkedIn, une newsletter.
- **Par niche** : refais-le sur 100 vidéos d'un secteur précis (fitness, immo, restauration)
  → un rapport vendable ou un argument de prestation.
- **Sur ton propre compte** : passe tes 50 dernières vidéos dans le même script → c'est le
  **Prompt-Miroir**, et c'est une vidéo à lui tout seul.
