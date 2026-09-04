---
name: madalogistics-db
description: "Documentation détaillée de la base de données PostgreSQL de MadaLogistix (SaaS logistique multi-tenant). Utiliser quand on travaille sur le schéma, les tables, les entités JPA, les relations/FK, le modèle de données (tenant, hub, demande, colis, sac, tournée, optimisation, facture), les migrations Flyway, l'extension pgvector ou la compréhension du modèle relationnel. Se déclenche à l'évocation de : base de données, BDD, schema, schéma SQL, table, tables, entité, entity, modèle de données, model de données, foreign key, FK, relation, PostgreSQL, pgvector, Flyway, migration, V1__init_schema."
---

# MadaLogistix — Base de données PostgreSQL (guide détaillé)

SGBD : **PostgreSQL 16** (image `pgvector/pgvector:pg16` en Docker).
Migration gérée par **Flyway** (`src/main/resources/db/migration/V1__init_schema.sql`), `ddl-auto: none` en JPA.
Extensions : `uuid-ossp` (UUID), `vector` (pgvector, embeddings).

## 1. Principe fondamental : multi-tenant à discriminant tenant_id

Modèle **« shared database / shared schema »** : toutes les PME clientes partagent la même base et le même schéma, mais chaque ligne des tables métier porte un `tenant_id` référençant `pme_cliente.tenant_id`.

- Règle d'or (cf. cahier des charges) : `∀ donnée d, d.tenant_id = tenant_id de l'utilisateur authentifié`.
- Toutes les tables métier ont `tenant_id UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE`.
- **Exceptions** :
  - `utilisateur.tenant_id` est **NULLable** (les `ADMIN_SAAS` de la plateforme sont transverses).
  - Les tables `flyway_schema_history` (Flyway) et les extensions n'ont pas de tenant.
- Un index `idx_<table>_tenant ON <table>(tenant_id)` est créé sur chaque table scoped tenant.

## 2. Cycle de vie métier (pour situer les tables)

```
DemandeTransport (commande client)
   └── Colis (unité physique, 1..n par demande)
        └── Sac (groupage : chargement d'un véhicule)      ← résultat Knapsack/Bin Packing
             ├── affecté à un Vehicule + un Chauffeur      ← résultat algorithme hongrois
             └── Tournee (séquencement VRP, optionnel V1)
                  └── EtapeLivraison (COLLECTE/LIVRAISON par colis)
Livraison effectuée → Facture générée (1 facture par demande)
Incident déclaré sur un Colis
Toute action tracée dans AuditLog (BNF-08)
Chaque groupage/affectation expliqué dans OptimisationRun (justification + embedding)
```

Cycle d'un statut demande : `CREEE → EN_ATTENTE_GROUPAGE → GROUPEE → EN_TRANSIT → LIVREE / INCIDENT`.

## 3. Les 18 tables en détail

### 3.1 `pme_cliente` — la PME cliente (tenant)
| Colonne | Type | Contraintes |
|---|---|---|
| `tenant_id` | UUID | PK, défaut `uuid_generate_v4()` |
| `nom_entreprise` | VARCHAR(255) | NOT NULL |
| `seuil_remplissage_min` | NUMERIC(5,2) | NOT NULL, défaut 80.00, CHECK 0–100 |
| `created_at` | TIMESTAMP | NOT NULL, défaut now() |
| `updated_at` | TIMESTAMP | NOT NULL, défaut now() |

### 3.2 `hub` — point de regroupement du tenant
`hub_id` PK ; FK : `tenant_id → pme_cliente`. Colonnes : `nom` NOT NULL, `zone_securisee_dispo BOOLEAN` défaut false, `created_at`. Index : tenant.

### 3.3 `client_final` — client demandeur du tenant
`client_final_id` PK ; FK `tenant_id`. Colonnes : `nom` NOT NULL, `created_at`.

### 3.4 `categorie_produit` — catégorie avec classe de valeur
`categorie_id` PK ; FK `tenant_id`. Colonnes : `libelle` NOT NULL, `classe_valeur CHAR(1)` NOT NULL CHECK (`A`/`B`/`C`).

### 3.5 `utilisateur` — comptes (tous rôles)
`utilisateur_id` PK ; FK `tenant_id` **NULLable** (ADMIN_SAAS transverse). Colonnes : `nom` NOT NULL, `email` NOT NULL **UNIQUE**, `mot_de_passe_hash` NOT NULL, `role VARCHAR(30)` CHECK (`GESTIONNAIRE`/`CHAUFFEUR`/`DIRECTION`/`ADMIN_SAAS`/`CLIENT_FINAL`), `habilite_valeur BOOLEAN` (pertinent si CHAUFFEUR), `created_at`. Index : tenant + role.

### 3.6 `vehicule` — véhicule du tenant rattaché à un hub
`vehicule_id` PK ; FK : `tenant_id`, `hub_id → hub` (ON DELETE CASCADE). Colonnes : `immatriculation` NOT NULL, `capacite_poids_kg NUMERIC(10,2)` NOT NULL, `capacite_volume_m3 NUMERIC(10,2)` NOT NULL, `statut` défaut `DISPONIBLE`, `created_at`. Index : tenant + hub.

### 3.7 `chauffeur` — détail métier lié à un Utilisateur
`chauffeur_id` PK ; FK : `tenant_id`, `utilisateur_id` NOT NULL **UNIQUE** → `utilisateur` (CASCADE), `vehicule_id → vehicule` (**SET NULL**, véhicule habituel). Colonnes : `telephone`, `disponible BOOLEAN` défaut true, `created_at`. Index : tenant.

### 3.8 `compatibilite_chauffeur_vehicule` — matrice a_ij
**PK composite (chauffeur_id, vehicule_id)** ; FK : `tenant_id`, `chauffeur_id → chauffeur`, `vehicule_id → vehicule` (CASCADE). Colonne : `compatible BOOLEAN` défaut true. C'est la matrice de compatibilité du modèle mathématique (contrainte `x_ij ≤ a_ij`).

### 3.9 `grille_tarifaire` — grille de prix du tenant
`grille_id` PK ; FK `tenant_id`. Colonnes : `libelle` NOT NULL, `prix_par_kg`, `prix_par_m3`, `prix_minimum` (NUMERIC(10,2) nullables), `actif` défaut true, `created_at`.

### 3.10 `demande_transport` — la commande du client final
`demande_id` PK ; FK : `tenant_id`, `client_final_id → client_final`, `hub_id → hub` (CASCADE). Colonnes : `adresse_collecte`, `adresse_livraison` (VARCHAR(500)), `tarif NUMERIC(10,2)`, `statut` défaut `CREEE` CHECK (6 valeurs), `created_at`. Index : tenant + hub + statut.

### 3.11 `optimisation_run` — run algorithmique (Knapsack/Bin Packing/Affectation/VRP)
`run_id` PK ; FK : `tenant_id`, `hub_id → hub`. Colonnes :
- `type_algorithme` CHECK (`KNAPSACK`/`BIN_PACKING`/`AFFECTATION`/`VRP`)
- `parametres JSONB`, `resultat JSONB` (entrées/sorties de l'algo)
- `justification_document TEXT` (raisonnement en langage clair)
- `justification_embedding VECTOR(1536)` (**pgvector**, recherche sémantique sans LLM)
- `duree_calcul_ms INTEGER`, `created_at`
Index : tenant + hub + type.

### 3.12 `sac` — unité opérationnelle du groupage (le cœur du modèle)
`sac_id` PK ; FK : `tenant_id`, `hub_id → hub`, `vehicule_id → vehicule` (**SET NULL** tant que non affecté), `chauffeur_id → chauffeur` (**SET NULL**), `run_groupage_id → optimisation_run` (SET NULL), `run_affectation_id → optimisation_run` (SET NULL). Colonnes : `categorie_dominante CHAR(1)` CHECK (A/B/C, dérivée du contenu), `taux_remplissage NUMERIC(5,2)`, `statut` défaut `CONSTITUE` CHECK (`CONSTITUE`/`AFFECTE`/`EN_TRANSIT`/`LIVRE`), `created_at`. Index : tenant, hub, vehicule, chauffeur.

### 3.13 `colis` — unité physique de marchandise
`colis_id` PK ; FK : `tenant_id`, `demande_id → demande_transport` (CASCADE), `categorie_id → categorie_produit` (**SET NULL**), `sac_id → sac` (**SET NULL** tant que non groupé). Colonnes : `poids_kg NUMERIC(10,2)` NOT NULL, `volume_m3 NUMERIC(10,2)` NOT NULL, `etat` défaut `EN_ATTENTE`, `created_at`. Index : tenant + demande + sac.

### 3.14 `incident` — casse/retard/perte sur un colis
`incident_id` PK ; FK : `tenant_id`, `colis_id → colis` (CASCADE). Colonnes : `type_incident VARCHAR(50)` NOT NULL (ex. CASSE/RETARD/PERTE), `description TEXT`, `statut` défaut `DECLARE` CHECK (`DECLARE`/`EN_COURS`/`RESOLU`), `created_at`.

### 3.15 `facture` — facturation à la livraison
`facture_id` PK ; FK : `tenant_id`, `demande_id` NOT NULL **UNIQUE** → `demande_transport` (une facture = une demande). Colonnes : `montant_total NUMERIC(12,2)` NOT NULL, `statut` défaut `EMISE` CHECK (`EMISE`/`PAYEE`/`ANNULEE`), `date_emission` défaut now().

### 3.16 `tournee` — séquencement VRP d'un Sac (optionnel en V1)
`tournee_id` PK ; FK : `tenant_id`, `sac_id → sac` (CASCADE), `run_vrp_id → optimisation_run` (**SET NULL**, null tant que VRP inactif). Colonnes : `distance_totale_km NUMERIC(10,2)`, `statut` défaut `PLANIFIEE` CHECK (`PLANIFIEE`/`EN_COURS`/`TERMINEE`), `created_at`.

### 3.17 `etape_livraison` — ligne de livraison d'une tournée
`etape_id` PK ; FK : `tenant_id`, `tournee_id → tournee` (CASCADE), `colis_id → colis` (CASCADE). Colonnes : `ordre INTEGER` NOT NULL, `type_etape` CHECK (`COLLECTE`/`LIVRAISON`), `date_heure_prevue`, `date_heure_reelle`.

### 3.18 `audit_log` — traçabilité (BNF-08)
`audit_id` PK ; FK : `tenant_id`, `utilisateur_id → utilisateur` (**SET NULL**). Colonnes : `entite VARCHAR(100)` NOT NULL (ex. DemandeTransport, Sac, Facture), `entite_id UUID` NOT NULL, `action` CHECK (`CREATION`/`MODIFICATION`/`VALIDATION`/`SUPPRESSION`), `details JSONB`, `created_at`. Index : tenant + (entite, entite_id).

## 4. Récapitulatif des clés étrangères

| Table | FK → Table | Comportement DELETE |
|---|---|---|
| hub, client_final, categorie_produit, vehicule, chauffeur, grille_tarifaire, demande_transport, optimisation_run, sac, colis, incident, facture, tournee, etape_livraison, audit_log, compatibilite | **pme_cliente** (tenant_id) | CASCADE |
| vehicule, demande_transport, optimisation_run, sac | **hub** (hub_id) | CASCADE |
| demande_transport | **client_final** | CASCADE |
| demande_transport | hub | CASCADE |
| chauffeur | **utilisateur** (utilisateur_id, UNIQUE) | CASCADE |
| vehicule (chauffeur.vehicule_id), sac.vehicule_id | **vehicule** | SET NULL |
| chauffeur (sac.chauffeur_id) | **chauffeur** | SET NULL |
| compatibilite_chauffeur_vehicule | **chauffeur**, **vehicule** | CASCADE |
| colis | **demande_transport** | CASCADE |
| colis | **categorie_produit** | SET NULL |
| colis | **sac** | SET NULL |
| incident | **colis** | CASCADE |
| facture | **demande_transport** (UNIQUE) | CASCADE |
| sac | **optimisation_run** (run_groupage_id, run_affectation_id) | SET NULL |
| tournee | **sac**, **optimisation_run** (run_vrp_id) | CASCADE / SET NULL |
| etape_livraison | **tournee**, **colis** | CASCADE |
| audit_log | **utilisateur** | SET NULL |

## 5. Conventions

- **Nommage** : tables en snake_case (`pme_cliente`, `demande_transport`), PK `<entité>_id`, FK `<entité>_id`, colonnes snake_case, index `idx_<table>_<colonne>`.
- **UUID** générés en base (`uuid_generate_v4()`), PK de toutes les tables. JPA utilise `GenerationType.UUID` (les UUID sont générés côté app).
- **Timestamps** : `TIMESTAMP`, `created_at` défaut `now()` ; `updated_at` présent seulement sur `pme_cliente`.
- **Enums en base** : stockés en `VARCHAR` via CHECK (rôles, statuts, types).
- **JSONB** : `parametres`/`resultat` (optimisation_run), `details` (audit_log) — mappés en `String` dans les entités JPA.
- **pgvector** : `justification_embedding VECTOR(1536)` — nécessite l'image `pgvector/pgvector:pg16`.

## 6. Correspondance entités JPA ↔ tables

`Backend/src/main/java/com/example/Bakend/entity/` : chaque entité `@Entity` = une table, chaque champ FK = `@ManyToOne`/`@OneToOne` avec `@JoinColumn(name=...)` identique au SQL. La PK composite de `compatibilite_chauffeur_vehicule` est gérée par `@IdClass(CompatibiliteId.class)`. Les enums (`Role`, `DemandeStatut`, `SacStatut`, `TypeAlgorithme`, …) vivent dans `entity/enums/`. Les timestamps sont remplis par `@PrePersist`.

## 7. Migrations Flyway

- Schéma **versionné** dans `src/main/resources/db/migration/` (`V1__init_schema.sql`).
- Appliquées automatiquement au démarrage ; ne **jamais** modifier une migration déjà appliquée → créer `V2__….sql`.
- `application.yml` : `spring.jpa.hibernate.ddl-auto: none` (Hibernate ne gère plus le schéma) + `spring.flyway.baseline-on-migrate: true`.
- Pour repartir propre : `docker-compose down -v` (détruit le volume `postgres_data`).

## 8. Détails techniques

### 8.1 Pourquoi ces types de données
- **UUID en PK** (via `uuid_generate_v4()`, extension `uuid-ossp`) : identifiant aléatoire non prédictible, sûr multi-instance, pas d'exposition de compteur. JPA les génère côté application avec `GenerationType.UUID`. Alternative native PG13+ : `gen_random_uuid()` (n'importe plus uuid-ossp).
- **NUMERIC(p,s) partout pour les montants/capacités** : arithmétique décimale exacte. Jamais de `DOUBLE PRECISION` pour un prix (erreurs d'arrondi flottant). `NUMERIC(10,2)` = 10 chiffres max dont 2 décimales ; `NUMERIC(12,2)` réservé aux montants de facture.
- **TIMESTAMP (sans timezone)** : le schéma stocke l'heure « locale » telle quelle ; acceptable car l'app est mono-fuseau (Madagascar UTC+3). Pour une multi-fuseau on choisirait `TIMESTAMPTZ`.
- **CHAR(1) pour `classe_valeur`** : valeur unique A/B/C ; `VARCHAR` aurait aussi convenu, le CHECK garantit le domaine.
- **JSONB (et non `json`)** : stockage binaire efficace, pas de doublons de clés, requêtable via opérateurs JSONB et indexable GIN. Utilisé pour des structures flexibles (paramètres/résultat d'algo, détails d'audit) sans schéma relationnel figé.
- **VECTOR(1536)** : type fourni par **pgvector** ; tableau de 1536 nombres à virgule flottante (dimension classique des embeddings de texte). Coût ~6 Ko par ligne (1536 × 4 octets).

### 8.2 Index et requêtes types
Chaque index correspond à une requête métier prévisible :
- `idx_*_tenant` : **toutes** les requêtes de l'app filtrent par `tenant_id` (isolation obligatoire) → index systématique sur la colonne tenant de chaque table scoped.
- `idx_demande_statut` : « demandes en attente d'un hub » → `WHERE tenant_id = ? AND hub_id = ? AND statut = 'EN_ATTENTE_GROUPAGE'` (GroupageController).
- `idx_demande_hub` : agrégation des demandes par hub.
- `idx_colis_demande` / `idx_colis_sac` : jointures Colis↔Demande et Colis↔Sac pendant le groupage.
- `idx_optim_run_type` : historique par type d'algorithme (KNAPSACK/BIN_PACKING/…).
- `idx_audit_entite (entite, entite_id)` : retrouver l'historique d'une entité précise (litiges, facturation).
- `idx_sac_vehicule` / `idx_sac_chauffeur` : planification (sacs affectés à un véhicule/chauffeur).
- **pgvector (non créé en V1, à prévoir)** : si le volume d'`optimisation_run` grandit, ajouter un index **HNSW** pour la recherche ANN : `CREATE INDEX ON optimisation_run USING hnsw (justification_embedding vector_l2_ops);` — sans lui, la recherche sémantique est un scan séquentiel.

### 8.3 Isolation multi-tenant : comment c'est garanti
- Modèle retenu : **shared database / shared schema** (1 base, 1 schéma, mêmes tables pour tous les tenants) avec **discriminant `tenant_id`**. Alternative plus coûteuse : schema-per-tenant ou database-per-tenant (analyse des compromis coût/isolation/complexité à justifier dans le mémoire).
- Le tenant de la requête est résolu **en amont des contrôleurs** (filtre/intercepteur lisant le JWT, qui embarque `tenant_id`), puis injecté dans chaque accès données.
- Côté JPA : mécanisme de filtre Hibernate (type `@Filter`/`@Where` ou repository avec clause tenant automatique) pour que **toute** requête soit bornée au tenant courant, sans avoir à l'écrire à la main dans chaque repository.
- Conséquence de sécurité : un utilisateur ne peut jamais lire/écrire la donnée d'un autre tenant (le backend ajoute toujours `tenant_id = ?`).
- Cas particulier : `utilisateur.email` est **UNIQUE global** (pas par tenant) — un compte admin SaaS transverse partage le schéma utilisateur.

### 8.4 Intégrité référentielle et comportement de suppression
- **ON DELETE CASCADE** sur `tenant_id` : supprimer une `pme_cliente` supprime tout son espace (hubs, véhicules, demandes, sacs, factures, …). Nettoie proprement un tenant en fin de vie.
- **ON DELETE SET NULL** sur les références optionnelles (`vehicule`, `chauffeur`, `categorie`, `sac`, `run_groupage/affectation/vrp`) : on **préserve l'historique** des colis/sacs/tournées même si l'objet référencé disparaît (ex. un véhicule retiré de la flotte garde ses sacs passés avec `vehicule_id = NULL`).
- **CASCADE sur les enfants directs** (chauffeur→utilisateur, colis→demande, etape→tournee/colis, incident→colis) : cohérence du cycle de vie (une demande supprimée emporte ses colis et incidents).

### 8.5 pgvector et la recherche sémantique
- `optimisation_run.justification_embedding` stocke le vecteur de `justification_document` pour permettre une **recherche sémantique** de décisions passées par similarité vectorielle, **sans appel à un LLM à l'exécution** (la justification est rédigée par le gestionnaire à la création d'une catégorie ; la recherche sémantique est destinée au client).
- Distances prises en charge : L2 (`vector_l2_ops`), cosinus (`vector_cosine_ops`), produit scalaire. La distance cosinus est adaptée à des vecteurs d'embeddings.
- Exemple de requête : `SELECT run_id, justification_document, 1 - (justification_embedding <=> $1) AS similarite FROM optimisation_run WHERE tenant_id = $2 ORDER BY justification_embedding <=> $1 LIMIT 10;`
- **Prérequis d'infra** : l'image Docker `pgvector/pgvector:pg16` (l'extension `vector` n'existe pas dans `postgres:16` standard). D'où le changement de l'image DB dans `docker-compose.yml`.

### 8.6 Transactions et concurrence
- Niveau d'isolation par défaut PostgreSQL : **READ COMMITTED**. Les scénarios multi-étapes (créer demande → calculer tarif → persister ; constituer un sac → l'affecter) doivent être enveloppés dans une transaction (`@Transactional` en Spring) pour garantir l'atomicité.
- Modèle **shared-schema** : les tenants travaillent sur des lignes distinctes → **verrouillage au niveau ligne**, aucune contention d'écriture entre tenants ; c'est l'un des avantages opérationnels du choix retenu.
- Le pool de connexions **HikariCP** (géré par Spring Boot, 10 connexions par défaut) alimente le backend ; la BDD est joignable sur le réseau Docker `madalogistics-net` via le hostname `db` (port interne 5432).

### 8.7 Flyway : fonctionnement interne
- Table d'état `flyway_schema_history` : `installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `installed_on`, `execution_time`, `success`. Toute migration réussie y est enregistrée (`success = true`).
- **Checksum** : Flyway hash le contenu de chaque script. Modifier une migration déjà appliquée → `Validate failed` au prochain démarrage (protection d'intégrité). Règle : on ne corrige jamais `V1`, on ajoute `V2__….sql`.
- **Ordre** : scripts `V<n>__<desc>.sql` exécutés une seule fois, dans l'ordre croissant de version, avant le démarrage du serveur web.
- **baseline-on-migrate** : si une base **non vide** (sans historique Flyway) existe déjà, Flyway l'« baselines » à la version 1 et laisse les tables en place ; si la base est **vide**, il applique normalement toutes les migrations. Pour un état propre, préférer `docker-compose down -v`.

### 8.8 Mapping JPA/Hibernate
- `spring.jpa.hibernate.ddl-auto: none` : Hibernate ne crée/modifie **plus** le schéma, il fait confiance à Flyway.
- **Enums** : `@Enumerated(EnumType.STRING)` → stockées en `VARCHAR` (défendable face aux changements d'ordre ; à l'opposé de `ORDINAL` qui casse à la moindre réorganisation).
- **`LocalDateTime` ↔ `TIMESTAMP`** (sans tz), cohérent avec le schéma.
- **JSONB / VECTOR** : champs mappés en `String` avec `@Column(columnDefinition = "jsonb")` / `"VECTOR(1536)"`. Hibernate délègue le type DDL au moteur ; le driver PostgreSQL renvoie le texte JSON / la représentation du vecteur en chaîne — pas de dépendance supplémentaire (ni hibernate-types ni hibernates-pgvector). Limite : pas d'accès structurel JSON en JPQL natif (utiliser des requêtes SQL natives si besoin).
- Les relations sont **lazy** (`FetchType.LAZY`) : éviter les accès hors transaction (risque de `LazyInitializationException`), penser aux DTO pour exposer les données au frontend.
