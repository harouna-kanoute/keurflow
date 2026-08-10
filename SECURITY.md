# Sécurité — KeurFlow

> « Mes données m'appartiennent. Mon code peut être visible, mais mes secrets et mes données privées ne doivent jamais être exposés. »

## Règle finale avant de considérer une fonctionnalité terminée

**Si quelqu'un possède le code source de KeurFlow, peut-il récupérer un secret ou accéder aux données d'un autre utilisateur ?**
Si oui → la fonctionnalité n'est pas terminée.

## Zéro secret dans le code

Interdit en dur dans le code source, quel que soit le langage : mots de passe, API keys, tokens, `SUPABASE_SERVICE_ROLE_KEY`, clés Stripe secrètes, clés IA, credentials SMTP/DB, secrets OAuth, clés de chiffrement.

Toute valeur sensible passe par une variable d'environnement (`.env.local`, jamais committé — voir `.gitignore`) ou un secret manager (Vercel/Supabase/GitHub Actions Secrets en CI/CD).

`NEXT_PUBLIC_*` et `EXPO_PUBLIC_*` sont **publics par construction** : jamais de secret dedans, ils finissent dans le bundle client/mobile.

## Isolation multi-tenant

Un utilisateur ne doit jamais accéder aux données d'une autre organisation ou d'un autre projet, même en devinant un UUID. Appliqué à quatre niveaux indépendants :

1. **RLS Postgres** — `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` sur toute table portant des données privées ; policies basées sur des fonctions `SECURITY DEFINER STABLE` (`is_org_member`, `has_org_role`, `is_project_member`, `has_project_role`) pour éviter la récursion et centraliser la logique.
2. **Storage** — buckets privés uniquement, chemin `{project_id}/...`, policy Storage qui revalide `is_project_member(project_id)`, accès via URL signée courte durée.
3. **API / Edge Functions** — le rôle est toujours relu depuis la session authentifiée côté serveur, jamais depuis une valeur envoyée par le client.
4. **Frontend** — les vérifications de rôle côté client (`packages/business/permissions.ts`) sont un confort d'UI, jamais une frontière de sécurité.

## Zero trust

Toute donnée entrante (body HTTP, query params, headers, valeurs du frontend) est validée avec Zod (`packages/validation`) avant tout traitement. Les montants sont toujours recalculés côté serveur (ex : `quantity × unitPrice` d'une dépense), jamais persistés tels que soumis par le client.

## Tests d'attaque à exécuter avant chaque release (§82, §98)

- Modifier un UUID dans l'URL / le body pour viser un autre projet/organisation
- Appeler l'API directement sans passer par l'UI, avec un rôle insuffisant
- Télécharger un fichier privé sans être membre du projet
- Requête sans authentification / avec session expirée
- Tentative de changer son propre rôle via le client

Résultat attendu dans tous les cas : **DENIED**.

## Si un secret est découvert dans le repo

1. Ne jamais l'afficher ni le recopier.
2. Le révoquer immédiatement côté fournisseur (Supabase / Stripe / OpenAI / SMTP...).
3. Le remplacer par une variable d'environnement.
4. Vérifier l'historique Git — un `git filter-repo` ou équivalent peut être nécessaire ; un simple nouveau commit ne suffit pas à l'effacer de l'historique.
