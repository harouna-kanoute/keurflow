# apps/mobile — KeurFlow Mobile

Non scaffoldé pour l'instant. Le scaffold Expo complet (React Native + Expo + TypeScript, expo-router, EAS config, icônes, splash screen) arrive en **Phase 14** de la feuille de route, une fois le cœur métier (auth, projets, budget, dépenses, RLS) validé côté web.

Fonctions prioritaires prévues pour le mobile (voir prompt produit §42-44) :

- ajouter une dépense
- prendre une photo / photographier une facture
- ajouter un document / commentaire
- mettre à jour une étape
- consulter les notifications

Le mobile consommera les mêmes packages partagés que le web :

- `@keurflow/types`
- `@keurflow/validation`
- `@keurflow/business`
- `@keurflow/config`

Aucun secret ne sera jamais embarqué dans le bundle mobile (voir `SECURITY.md` à la racine) — seules les clés `EXPO_PUBLIC_*` (URL Supabase + clé anon) y figureront.
