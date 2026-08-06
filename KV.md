# Synchro cloud (Vercel KV)

Les données de l'app sont partagées entre tous les appareils via **Vercel KV**
(Redis). Aucun compte, aucun code, aucun SQL — c'est automatique une fois le
stockage branché.

## Brancher le KV (une seule fois, ~2 min)

1. Va sur **vercel.com** → ton projet **Bproductive**.
2. Onglet **Storage** → **Create Database** → choisis **KV** (Redis / Upstash).
3. Donne un nom, région Europe, plan **Free**, **Create**.
4. Sur l'écran suivant, **Connect Project** → sélectionne ton projet Bproductive
   pour les environnements Production (et Preview/Development si tu veux).
   Vercel ajoute automatiquement les variables `KV_REST_API_URL` et
   `KV_REST_API_TOKEN`.
5. **Redeploy** : Vercel → Deployments → `...` sur le dernier déploiement →
   **Redeploy**.

## Vérifier

Ouvre l'app → pied de page **Revenus** → lien **« Sync & backup »**.
La carte **« Synchro automatique »** doit afficher **Actif** avec un statut
« à jour ». Si elle affiche « La base cloud n'est pas encore branchée »,
c'est que le KV n'est pas connecté ou que le redeploy n'a pas encore eu lieu.

## Faire converger tes données existantes

1. Sur l'appareil qui a les **bonnes données**, ouvre l'app →
   **Sync & backup** → **« Pousser maintenant »**.
2. Sur l'autre appareil, ouvre l'app (ou **« Tirer du cloud »**) → il récupère
   les mêmes données.

## Comment ça marche (technique)

- Une route serveur `app/api/sync/route.ts` lit/écrit un unique blob JSON dans
  le KV (clé `bproductive:shared:v1`) via l'API REST Upstash.
- Le hook `lib/kv-sync.ts` tire au chargement + toutes les 8 s + au retour sur
  l'app, et pousse (debounce 1,5 s) à chaque modification locale. Il ne pousse
  jamais avant d'avoir tiré (anti-écrasement).
- Quotas gratuits Upstash/Vercel KV : largement suffisants pour un usage perso
  (le blob fait quelques Ko, quelques requêtes par minute).

## Sécurité

Le blob est unique et partagé pour cette app (usage privé couple). N'importe
qui connaissant l'URL de l'API pourrait lire/écrire — acceptable pour une app
perso, mais ne publie pas l'URL. Pour verrouiller, on pourrait ajouter un
secret partagé plus tard.
