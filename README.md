# Discipline

Tableau de bord ludique pour autoentrepreneur : roue d'habitudes mensuelle,
objectif de revenus (10 000 € par défaut) et calcul URSSAF / impôt en temps réel.

100 % front-end, sans backend : toutes les données sont stockées dans le
`localStorage` du navigateur.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000.

## Déployer sur Vercel

1. Sur https://vercel.com → **Add New… → Project**, importe ce dépôt GitHub.
2. Framework = **Next.js** (détecté automatiquement). Laisse tout par défaut.
3. **Deploy**. Tu obtiens ton URL.

Tu peux ensuite brancher un domaine perso dans *Project → Settings → Domains*.

## Réglages (icône ⚙️ en haut à droite)

- Objectif mensuel + base (CA brut ou net en poche)
- Prix Skool / membre ($) et coût mensuel du Skool ($)
- Taux de conversion 1 $ → €
- Tarifs vidéos courtes / longues
- Taux URSSAF (micro-BNC) et impôt (versement libératoire) — éditables
- Liste des habitudes (jusqu'à 8)
