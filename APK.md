# Générer l'APK Android

Ton app est déjà une PWA installable (manifest + service worker). Pour avoir un
vrai **fichier .apk** à sideloader sur ton téléphone ou publier sur le
Play Store, le chemin le plus rapide est **PWABuilder**.

Les données restent dans le `localStorage` de l'app — tes objectifs, ta
cagnotte, tes rituels, tes records de planche, ton historique de mouvements
restent là, sans backend.

---

## Option 1 — PWABuilder (recommandé, 10 min)

### Prérequis
- L'app doit être déployée en **HTTPS** (Vercel ✓).
- Ton URL de prod, par exemple `https://discipline-xxxx.vercel.app`.

### Étapes

1. **Va sur https://www.pwabuilder.com**
2. Colle ton URL Vercel dans le champ et clique **Start**.
3. PWABuilder analyse ton manifest + service worker. Tu dois voir un score
   ≥ 30/30 sur Manifest et Service Worker. (Si pas le cas, dis-moi
   l'erreur, on corrige.)
4. Clique l'onglet **Package For Stores** → **Android**.
5. Choisis le format :
   - **Test APK** si tu veux juste sideloader sur ton téléphone (le plus
     simple, signé avec une clé de test).
   - **Google Play** si tu veux publier officiellement. PWABuilder génère
     un .aab signé prêt à uploader.
6. Renseigne les infos :
   - **Package ID** : `com.brickia.discipline` (ou ce que tu veux).
   - **App name** : Discipline.
   - **Version** : 1.0.0.
   - **Display mode** : Standalone.
   - **Status bar color** : `#FF6A1A`.
   - **Background color** : `#FFF4E8`.
7. Clique **Download Package**. Tu reçois un .zip qui contient l'APK + les
   instructions de signature.

### Installer l'APK sur ton téléphone Android

1. Active **Sources inconnues** dans les paramètres de sécurité.
2. Transfère le .apk sur le téléphone (USB, Drive, e-mail à toi-même).
3. Ouvre le fichier dans le gestionnaire de fichiers → **Installer**.

L'icône Discipline apparaît, tu ouvres l'app, **tes données sont
exactement celles que tu as déjà saisies sur la version web** (même origine
HTTPS = même localStorage).

---

## Option 2 — Bubblewrap CLI (pour CI / automatisation)

L'outil officiel Google pour wrapper une PWA en Android Trusted Web
Activity. Plus technique mais scriptable.

```bash
# 1) Installer Java JDK 17+ et Android SDK
# 2) Installer Bubblewrap
npm i -g @bubblewrap/cli

# 3) Initialiser depuis le manifest
bubblewrap init --manifest https://TON-URL.vercel.app/manifest.webmanifest

# 4) Builder
bubblewrap build
```

Tu obtiens `app-release-signed.apk` à la racine.

À utiliser si tu veux automatiser le build dans une GitHub Action plutôt
que de cliquer dans PWABuilder à chaque release.

---

## Limites à connaître

- L'app dans l'APK est essentiellement un navigateur Chrome embarqué (TWA).
  Si Chrome n'est pas à jour, certaines API peuvent flancher.
- Les **rappels écran verrouillé** (Notification Triggers) marchent mais
  dépendent du Chrome installé sur le téléphone, pas de l'APK lui-même.
- Le **coach caméra planche** (MediaPipe Pose) marche dans le TWA, mais
  demande l'autorisation caméra à la première activation.
- Les **données restent locales** dans le `localStorage` de l'app. Si tu
  désinstalles l'APK, les données partent avec. Pour synchroniser entre
  plusieurs appareils, il faudrait une vraie BDD (Supabase / Firebase),
  pas indispensable pour un usage solo.
