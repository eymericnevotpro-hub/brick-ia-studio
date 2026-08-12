# Discipline

Tableau de bord ludique pour autoentrepreneur : roue d'habitudes mensuelle,
objectif de revenus (10 000 € par défaut) et calcul URSSAF / impôt en temps réel.

100 % front-end, sans backend : toutes les données sont stockées dans le
`localStorage` du navigateur.

C'est aussi une **PWA** : tu peux l'installer sur l'écran d'accueil de ton
téléphone et recevoir des **rappels sur l'écran verrouillé** à l'heure de chaque
tâche.

## 📱 Installer sur Android (écran d'accueil + rappels)

1. Déploie l'app (voir Vercel ci-dessous) pour avoir une URL en **HTTPS** — les
   notifications et l'installation ne marchent qu'en HTTPS (ou sur `localhost`).
2. Ouvre l'URL dans **Chrome** sur ton téléphone.
3. Une bannière « Installe Discipline » apparaît → **Installer**. (Sinon : menu
   ⋮ → *Ajouter à l'écran d'accueil*.)
4. Ouvre l'app depuis son icône, va sur la carte **« Rappels sur l'écran
   verrouillé »** et active le bouton. Accepte la demande de notifications.
5. Choisis le délai (à l'heure, 5/10/15/30 min avant) et teste avec **« Tester un
   rappel »**.

### Comment marchent les rappels

- Les rappels sont programmés **depuis ton téléphone**, sans serveur.
- Sur les Chrome récents qui gèrent l'API *Notification Triggers*, ils se
  déclenchent **même appli fermée** (la carte affiche « fonctionnent appli
  fermée »).
- Sinon, ils se déclenchent tant que l'appli est installée et a été ouverte
  récemment (garde-la épinglée). La carte t'indique le mode actif.

### Modifier ton emploi du temps

Dans la section **Emploi du temps**, bouton **« Éditer »** : ajoute / supprime
des tâches, change l'heure, l'icône, la durée, les XP, et active ou non le rappel
tâche par tâche. Tout est enregistré localement.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000.

> Pour tester les notifications en local, lance plutôt `npx next dev
> --experimental-https` (les rappels exigent HTTPS ou `localhost`).

Les icônes PWA sont générées par `node scripts/generate-icons.mjs` (déjà
commitées dans `public/`).

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

L'emploi du temps (tâches, heures, rappels) se modifie via le bouton
**« Éditer »** de la section Emploi du temps.

## 🎮 Congères — le jeu de l'onglet « Jeu » (`/game`)

Le jeu de survie que les fausses pubs mobiles promettent sans jamais le livrer,
en vrai et **sans aucune mécanique idle** : rien ne progresse quand tu ne joues
pas, aucun gain hors-ligne, aucun compteur qui monte tout seul.

Vue **isométrique 3D** (le style « diorama » des pubs), tout dessiné au canvas :
zéro image à télécharger, donc ça marche hors-ligne dans la PWA.

**La boucle :**

1. **Jour (55 s)** — tu coupes du bois dans la forêt gelée (la hache frappe
   toute seule quand tu es à portée), tu rebouches les brèches de la palissade
   avec ce bois, tu fais cuire la viande crue sur le feu (elle **brûle** si tu
   traînes) et tu nourris les rescapés qui arrivent au camp : ils paient en
   pièces et certains restent se battre avec toi.
2. **Nuit** — la horde sort de la forêt, tape la palissade et passe par les
   trous. Tu tiens la ligne avec tes gardes, archers et charpentiers. Les
   zombies tués lâchent la viande crue de la journée suivante.
3. **Boutique** (le jour) — hache, raquettes, palissade renforcée, meilleur
   foyer, vigueur, recrues, soins, livraison de bois.

Chaque nuit est plus dure (plus nombreux, plus rapides, brutes à partir de la
nuit 3), et si la nuit s'éternise **la horde s'enrage** et défonce la palissade
— impossible de camper derrière ses murs.

**Contrôles :** glisse n'importe où sur l'écran pour marcher (joystick
flottant), bouton **Esquive** en bas à droite. Au clavier : ZQSD/WASD/flèches +
espace. Les actions sont contextuelles : près d'un arbre tu coupes, près d'un
trou avec du bois tu répares, près du feu tu poses/récupères la viande, près
d'un rescapé affamé tu le nourris.

Le meilleur score (nuit atteinte, zombies tués, pièces) est gardé dans le
`localStorage`, comme le reste de l'app.

Code : `lib/forest-game.ts` (simulation pure, sans DOM),
`lib/forest-render.ts` (rendu isométrique canvas), `lib/forest-audio.ts`
(bruitages WebAudio générés à la volée), `app/game/ForestGame.tsx` (boucle
rAF, joystick, HUD).
