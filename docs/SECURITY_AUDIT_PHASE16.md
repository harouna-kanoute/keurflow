# Audit de sécurité — Phase 16

Date : 2026-08-11. Périmètre : `supabase/migrations/`, `apps/web`, `apps/mobile`, `packages/*`, historique git complet. Méthode : lecture systématique + tests d'intrusion en direct contre le projet Supabase réel (voir `SECURITY.md` pour le référentiel appliqué).

## Résumé

Un problème **critique** a été trouvé et corrigé : une faille d'isolation multi-tenant dans `create_project()` permettait à n'importe quel utilisateur authentifié de créer un chantier dans l'organisation de n'importe qui d'autre, en appelant l'API Supabase directement (hors UI) avec l'`id` de l'organisation ciblée. Confirmée en exploitant réellement la faille en conditions live, puis corrigée et re-testée : l'attaque échoue désormais avec `Insufficient organization role`.

Deux régressions fonctionnelles introduites par la Phase 15 ont aussi été trouvées et corrigées au passage (ensemencement des étapes par défaut perdu ; abonnement jamais créé pour les comptes issus de l'inscription directe — celle-ci corrigée avant la Phase 16, voir commit `fix(db,web): trial/paywall gating and signup bootstrap never actually fired`).

## 1. Faille critique — contournement d'autorisation par NULL (corrigé)

**Fonction concernée** : `public.create_project()` (SECURITY DEFINER), présente depuis `20260811170000_project_members.sql` et redéclarée à quatre reprises (Phase 9, Phase 15 ×2).

**Cause** : la garde d'autorisation était écrite

```sql
if public.get_organization_role(p_organization_id) not in ('owner', 'admin', 'manager') then
  raise exception 'Insufficient organization role';
end if;
```

`get_organization_role()` retourne `NULL` quand l'appelant n'a **aucune** ligne d'appartenance dans l'organisation ciblée. En SQL, `NULL not in (...)` s'évalue à `NULL`, et PL/pgSQL traite un `IF NULL` comme faux — la garde ne se déclenche donc jamais pour un utilisateur totalement étranger à l'organisation, alors qu'elle fonctionne correctement pour un utilisateur ayant un rôle insuffisant (ex. `'member' not in (...)` = `true`, bloque bien). Autrement dit : la vérification bloquait les mauvais rôles mais laissait passer l'absence totale de rôle.

**Exploitation confirmée en direct** (session authentifiée réelle, organisation A, ciblant l'organisation B à laquelle l'utilisateur n'appartient pas) :

- Lecture de l'organisation B, de son abonnement, tentative d'auto-élévation de rôle, auto-insertion comme membre → tous refusés (RLS classique, fail-closed, aucun souci).
- Appel direct de `rpc/create_project` avec `p_organization_id` = organisation B → **succès (200)**, un chantier a été inséré dans l'organisation B avec le compte de l'organisation A comme propriétaire.

**Correctif** (`20260811340000_project_limits_milestones_fix.sql`) :

```sql
if coalesce(public.get_organization_role(p_organization_id), '') not in ('owner', 'admin', 'manager') then
```

`coalesce(..., '')` transforme le `NULL` en chaîne vide, qui échoue bien la condition `not in (...)`. Re-testé en direct après application : `400 Insufficient organization role`.

**Portée de la recherche** : grep de tout le pattern `role not in (` et `role != / <>` sur l'ensemble des migrations — un seul site vulnérable trouvé (celui-ci). Le code applicatif TypeScript (`apps/web`) utilise systématiquement le pattern inverse et sûr (`!!membership && hasOrgRoleAtLeast(...)`), qui échoue fermé par construction sur `undefined`. Les policies RLS elles-mêmes utilisant `in (...)` (jamais `not in`) sont sûres par nature : `NULL in (...)` = `NULL`, traité comme refus par Postgres RLS.

**Donnée de test nettoyée** : le chantier injecté pendant le test (`SECURITY-TEST-ignore-me`) a été supprimé par l'utilisateur avant l'application du correctif.

## 2. Régression — ensemencement des étapes par défaut perdu (corrigé)

`20260811310000` et `20260811330000` (Phase 15) ont chacune redéclaré `create_project()` en repartant de la version de `20260811170000`, effaçant silencieusement la boucle d'ensemencement des 10 étapes par défaut ajoutée en Phase 9 (`20260811240000_milestones.sql`). Tout chantier créé entre le déploiement de la Phase 15 et ce correctif n'a reçu aucune étape. Corrigé dans la même migration que le point 1 (les deux logiques sont maintenant réunies dans une seule fonction). Revérifié en direct : un nouveau chantier créé après le correctif a bien ses 10 étapes.

## 3. Durcissement — `FORCE ROW LEVEL SECURITY` (corrigé, préventif)

Les 18 tables avaient `ENABLE ROW LEVEL SECURITY` mais aucune n'avait `FORCE ROW LEVEL SECURITY`, contrairement à `SECURITY.md`. Sans `FORCE`, le *propriétaire* de la table contourne RLS. L'application n'interroge jamais la base en tant que propriétaire (toujours via `anon`/`authenticated` par PostgREST), donc ceci ne change aucun comportement actuel — c'est une fermeture de trou par anticipation (migration future exécutée avec un rôle privilégié, intégration DB directe future, etc.). Appliqué à toutes les tables (`20260811350000_security_audit_hardening.sql`).

## 4. PII exposée — `profiles.phone` (corrigé)

`phone` était une vraie colonne sur `profiles`, jamais lue ni écrite nulle part dans `apps/web` ou `apps/mobile` (confirmé par recherche exhaustive). La policy `profiles_select_shared_context` (Phase 12) donne accès à la ligne complète à quiconque partage une organisation ou un projet — RLS protège la ligne, pas la colonne. N'importe quel appel REST direct (hors UI) pouvait donc lire le téléphone d'un collègue de chantier, même si rien dans l'interface ne l'affichait. Colonne supprimée : totalement inutilisée, donc plus simple et plus honnête que de la déplacer dans une table séparée pour un champ qui n'existe pas encore fonctionnellement. À réintroduire dans une table dédiée, visible seulement par son propriétaire, si la collecte du téléphone devient une vraie fonctionnalité.

## 5. Autres points vérifiés, aucun problème trouvé

- **Secrets** : aucun `.env*` réel n'a jamais été suivi par git (historique complet vérifié) ; aucune clé Stripe/JWT en dur trouvée nulle part dans le code actuel ou l'historique.
- **Storage** : les 3 buckets sont privés, chemins scoppés par `{project_id}/...` ou `{user_id}/...`, policies qui revalident l'appartenance — conforme à `SECURITY.md`.
- **Messages d'erreur** : tous les Server Actions loguent le détail Supabase côté serveur (`console.error`) et ne renvoient au client que des messages génériques ou des cas explicitement mappés (ex. `over_email_send_rate_limit`) — aucune fuite de `error.message`/`error.code` brut trouvée.
- **Validation / recalcul serveur** : chaque Server Action valide son entrée avec Zod avant traitement ; le montant d'une dépense avec items est toujours recalculé côté serveur (`calculateExpenseTotal`), jamais celui envoyé par le client — renforcé par un trigger DB (`recompute_expense_item_total` + `sync_expense_amount_from_items`) qui tient bon même face à une écriture API directe.
- **Dépendances** : `npm audit` sur `apps/web` (la surface de production réelle) → 0 vulnérabilité. Les 21 alertes du monorepo global viennent exclusivement de l'outillage de build Expo/React Native (bundler Metro, plugin xcode) — jamais exécuté côté utilisateur final, jamais exposé en production. `npm audit fix --force` imposerait une régression majeure d'Expo (SDK 57 → 53, cassante) pour un risque de build-time non exploitable à distance ; non appliqué. À revisiter lors d'une future mise à jour naturelle d'Expo.

## Tests d'intrusion exécutés (checklist `SECURITY.md`)

| Test | Résultat |
|---|---|
| Lecture de toutes les tables sensibles sans authentification | Vide (`200 []`) sur les 10 tables testées |
| Appel RPC `create_organization` sans authentification | `400 Authentication required` |
| Lecture d'objet Storage privé sans authentification | `404` |
| Lecture d'une autre organisation (UUID substitué) | Vide |
| Lecture de l'abonnement d'une autre organisation | Vide |
| Auto-élévation de rôle vers une autre organisation | Aucune ligne affectée |
| Auto-insertion comme membre d'une autre organisation | `403`, violation RLS explicite |
| Appel RPC `create_project` ciblant une autre organisation | **Vulnérable → corrigé → re-testé refusé** |

Résultat final : **DENIED** dans tous les cas, conforme au standard attendu par `SECURITY.md`.
