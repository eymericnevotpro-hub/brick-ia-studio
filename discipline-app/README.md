# Discipline — app autonome

Tableau de bord ludique pour autoentrepreneur : roue d'habitudes mensuelle,
objectif de revenus (10 000 € par défaut) et calcul URSSAF / impôt en temps réel.

100 % front-end, sans backend : toutes les données sont stockées dans le
`localStorage` du navigateur. C'est un projet Next.js **indépendant** du studio IA.

## Lancer en local

```bash
cd discipline-app
npm install
npm run dev
```

## Déployer sur un NOUVEAU projet Vercel

Ce dossier est volontairement isolé pour devenir son propre projet Vercel,
sans toucher au studio IA situé à la racine du dépôt.

1. Sur https://vercel.com → **Add New… → Project**, importe ce dépôt GitHub.
2. Dans la config d'import, règle **Root Directory** sur `discipline-app`.
3. Framework = **Next.js** (détecté automatiquement). Laisse les commandes par défaut.
4. **Deploy**. Tu obtiens une URL séparée, indépendante du studio.

Tu peux ensuite y brancher un domaine personnalisé dans
*Project → Settings → Domains*.

## Réglages (icône ⚙️ en haut à droite)

- Objectif mensuel + base (CA brut ou net en poche)
- Prix Skool / membre ($) et coût mensuel du Skool ($)
- Taux de conversion 1 $ → €
- Tarifs vidéos courtes / longues
- Taux URSSAF (micro-BNC) et impôt (versement libératoire) — éditables
- Liste des habitudes (jusqu'à 8)
