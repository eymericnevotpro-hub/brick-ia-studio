# Activer le sync cloud (Supabase)

5 minutes, gratuit, te permet de retrouver toutes tes données entre ton PC,
ton téléphone et n'importe quel autre appareil connecté avec le même e-mail.

## 1. Créer le projet Supabase

1. Va sur https://supabase.com → **Sign in** → **New project**.
2. Donne un nom (`discipline`), un mot de passe BDD (n'importe lequel), région
   Europe (Frankfurt).
3. Attends ~1 minute que le projet soit prêt.

## 2. Créer la table + RLS

Dans Supabase → **SQL Editor** → **New query** → colle et exécute :

```sql
create table public.cloud_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.cloud_data enable row level security;

create policy "self read" on public.cloud_data
  for select using (auth.uid() = user_id);

create policy "self insert" on public.cloud_data
  for insert with check (auth.uid() = user_id);

create policy "self update" on public.cloud_data
  for update using (auth.uid() = user_id);

create policy "self delete" on public.cloud_data
  for delete using (auth.uid() = user_id);
```

Cette table contient tes données et personne ne peut lire / écrire la ligne
d'un autre utilisateur, c'est verrouillé par Row Level Security.

## 3. Configurer la redirection magic-link

Dans Supabase → **Authentication → URL Configuration** :
- **Site URL** : ton URL Vercel (par ex. `https://discipline-xxxx.vercel.app`)
- **Redirect URLs** (ajoute ces 2 lignes) :
  - `https://discipline-xxxx.vercel.app/install`
  - `http://localhost:3000/install` (pour le dev en local)

Sinon le lien magique te renverra sur la page par défaut.

## 4. Récupérer les clés

Supabase → **Project Settings → API** :
- Copie **Project URL** (ressemble à `https://abcdef.supabase.co`)
- Copie la **anon public** key (jeton très long)

## 5. Coller les clés sur Vercel

Sur Vercel → ton projet → **Settings → Environment Variables**, ajoute :

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | l'URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé anon |

Coche les 3 environnements (Production, Preview, Development), **Save**.

## 6. Redéployer

Vercel → **Deployments** → onglet `...` à droite du dernier deploy → **Redeploy**.

## 7. Tester

Ouvre ton site, va sur l'onglet **📱 Installer**. Tu dois voir la carte
**« Sync cloud »** dépliée avec un champ e-mail. Connecte-toi avec ton e-mail
sur ton PC, attends quelques secondes (statut "à jour"), puis fais la même
chose sur ton téléphone — tes données apparaîtront automatiquement.

## Conseils

- **Conflits** : c'est du *last-write-wins*. Si tu modifies en même temps sur 2
  appareils déconnectés du net, le dernier push gagne. Pour du solo, c'est rarement
  un souci.
- **Sécurité** : ta `anon key` est publique (préfixée `NEXT_PUBLIC_`), c'est
  normal. La RLS empêche n'importe qui de lire ta ligne — il faut être loggué
  avec ton e-mail.
- **Données stockées** : tout ce qui commence par `disc.` dans le localStorage
  (objectifs, cagnotte, rituels, records planche, paramètres miniature, etc.).
- **Supprimer ton compte** : Supabase → **Authentication → Users** → supprime ta
  ligne. La table `cloud_data` se nettoie automatiquement (`on delete cascade`).
- **Quota gratuit Supabase** : 500 Mo BDD, 50 000 utilisateurs actifs / mois.
  Largement suffisant pour ton usage perso, voire pour partager avec quelques
  proches.
