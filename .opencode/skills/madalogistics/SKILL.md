---
name: madalogistics
description: "Contexte complet du projet MadaLogistix — SaaS multi-tenant de gestion logistique et de flotte pour les PME malgaches (projet de recherche M1 MIAGE). Utiliser quand on travaille sur ce dépôt : objectifs, modules, acteurs, algorithmes d'optimisation, architecture, stack, besoins fonctionnels/non fonctionnels et périmètre. Se déclenche à l'évocation de MadaLogistix, MadaLogi, cahier des charges, SaaS logistique, groupage, multi-tenant, hub, tournée, flotte, ou de toute tâche sur ce projet."
---

# MadaLogistix — Contexte projet (cahier des charges)

Référence : `Cahier_des_charges_SaaS_Logistique_Madagascar__réviser_ (1).pdf` (projet de recherche M1 MIAGE — NIE SE20230012, ANDRIANANTENAINA Joris Anthony, encadrant Dr Fano, année 2026–2027).

## 1. Problématique et hypothèse

- **Problématique** : comment concevoir et développer un SaaS permettant une gestion automatisée et optimisée des flux logistiques et de flotte pour les PME à Madagascar ?
- **Hypothèse** : un SaaS mutualisé multi-tenant démocratise l'accès aux outils d'optimisation logistique avancés (groupage, flotte, facturation) pour des PME qui gèrent aujourd'hui leurs flux de façon artisanale.
- Projet de **recherche appliquée générique**, non lié à une entreprise existante. Les données de marché (RN7, grilles tarifaires usuelles) ne servent que de cas d'usage de référence.

## 2. Objectifs

**Objectif général** : concevoir et développer une plateforme SaaS multi-tenant de gestion logistique et de flotte permettant à plusieurs PME malgaches de digitaliser et optimiser, chacune indépendamment et avec isolation des données, tout le processus de groupage de fret : de la demande de transport à la livraison et la facturation.

**Objectifs spécifiques** :
- Architecture multi-tenant avec isolation stricte des données par PME cliente.
- Configuration par tenant : hubs, véhicules, chauffeurs, grilles tarifaires.
- Optimisation automatique du remplissage des véhicules (Knapsack, Bin Packing).
- Suivi temps réel des expéditions et véhicules (statuts, ETA).
- Facturation et documents de transport automatisés, conformes par tenant.
- Évaluer (volet recherche) la pertinence/performance des algorithmes sur des scénarios représentatifs du contexte malgache.

## 3. Parties prenantes / rôles applicatifs

| Rôle | Code rôle (backend) | Rôle métier |
|---|---|---|
| Administrateur plateforme SaaS | `ADMIN_SAAS` | Onboarding des tenants, supervision technique, indicateurs transverses |
| Responsable logistique / gestionnaire de hub | `GESTIONNAIRE` | Planifie tournées, enregistre colis, valide les groupages (utilisateur principal) |
| Chauffeur | `CHAUFFEUR` | Feuille de route, mise à jour des statuts de livraison, signale incidents |
| Client final (d'une PME cliente) | `CLIENT` | Dépose les demandes de transport, suit ses expéditions, reçoit factures et preuves |
| Direction de la PME cliente | `DIRECTION` | Pilotage global via le tableau de bord |

Attention : le rôle existant `logistics` dans `Frontend/src/app/routes.jsx` correspond au gestionnaire ; `driver`, `client`, `direction`, `admin` sont déjà mappés côté frontend.

## 4. Modules fonctionnels

1. **Administration SaaS / Tenants** — création/config d'un espace PME (hubs, véhicules, chauffeurs, grille tarifaire, utilisateurs/rôles), isolation des données, dashboard super-admin.
2. **Gestion des demandes de transport** — création par le client (expéditeur, destinataire, poids, volume, nature, délai), tarif indicatif automatique selon la grille du tenant, historique.
3. **Groupage & optimisation** — demandes en attente par hub ; Knapsack (1 véhicule, 2 contraintes poids+volume) ; Bin Packing FFD/BFD (plusieurs véhicules, minimiser le nombre / maximiser le remplissage) ; ajustement manuel du gestionnaire avant validation ; alerte si seuil de remplissage minimal non atteint ; **justification explicative automatique** de chaque proposition.
4. **Gestion de flotte** — fiche véhicule (immatriculation, capacité, statut), fiche chauffeur, planification des tournées, affectation automatique chauffeur ↔ véhicule ↔ tournée (algorithme hongrois), VRP en évolution (hors V1).
5. **Suivi des expéditions** — statuts (collecte, en transit, livré, incident), notification du client final, **mode hors ligne PWA pour le chauffeur** (cache local + resync automatique).
6. **Facturation** — génération automatique à la livraison, historique par client + export, formules d'abonnement de la PME à ses clients (paramétrable, hors abonnement SaaS lui-même).
7. **Tableau de bord** — KPIs par tenant (tonnage, taux de remplissage, CA, clients actifs), KPIs avancés (coût/km, km à vide, livraison dans les délais, rentabilité par hub, CO2 estimé), **simulation stratégique** (« que se passe-t-il si j'ajoute un camion de 10 t sur la RN7 ? », rejoue les algorithmes sans impacter les données réelles), filtres période/hub/type de tarif.

## 5. Algorithmes d'optimisation (cœur du volet recherche, OR-Tools)

- **Knapsack 2 contraintes** (poids + volume) : max Σ wᵢxᵢ s.t. Σ wᵢxᵢ ≤ W, Σ vᵢxᵢ ≤ V, xᵢ ∈ {0,1} — résolution exacte par programmation dynamique (volumes modestes).
- **Bin Packing** : Σⱼ xᵢⱼ = 1 (un colis = un véhicule), capacités par véhicule, min Σ yⱼ — heuristiques FFD/BFD.
- **Affectation (algorithme hongrois)** : min Σᵢⱼ cᵢⱼxᵢⱼ avec Σⱼ xᵢⱼ = 1 et Σᵢ xᵢⱼ = 1 — minimise km à vide, contraintes de disponibilité xᵢⱼ ≤ dᵢ et de compatibilité xᵢⱼ ≤ aᵢⱼ.
- **Taux de remplissage** : T = min(Σwᵢxᵢ/W, Σvᵢxᵢ/V), contrainte T ≥ T_min (paramétrable par tenant, ex. 80 %).
- **VRP** : évolution non prioritaire (hors V1).
- **Multi-tenant** : ∀ donnée d, d.tenant_id = tenant de l'utilisateur authentifié.

## 6. Modèle de données (diagramme de classes)

Entité pivot `PMECliente` (tenant) → hubs, véhicules, chauffeurs, clients finaux. `DemandeTransport` (la commande) ≠ `Colis` (unité physique). Un colis groupé est rattaché à un **Sac** (chargement d'un véhicule), affecté à un chauffeur. Chaque Sac garde un double lien vers `OptimisationRun` (groupage + affectation) qui stocke la **justification en texte libre + son embedding vectoriel** (recherche sémantique, sans LLM — la justification est rédigée par le gestionnaire lors de l'ajout d'une catégorie, la recherche sémantique est destinée au client). Un Sac peut être séquencé en `Tournee` (optionnelle V1, `run_vrp_id` à null) organisant des `EtapeLivraison` (ordre, prévu/réel). Cycle de vie : Créée → groupée en Sac → séquencée en Tournee → étapes réalisées → Livrée.

## 7. Architecture & stack

- **Frontend** : React (SPA) — Vite, Tailwind, Recharts, oxlint. 4 niveaux : pages/vues par rôle, composants réutilisables, gestion d'état (Context API — AuthContext/AppStateContext), services API (apiClient → `/api`). **PWA + offline pour chauffeur** (serviceWorker, offlineStorage, syncQueue).
- **Backend** : Spring Boot (actuellement **Maven**, `pom.xml`, Spring Boot 4.1.0, Java 17) — architecture en couches : Contrôleur → DTO/Mapper → Service → Repository (JPA) → Entité. Module Optimisation isolé (GroupageOptimizerService, OR-Tools). Sécurité Spring Security + JWT (token embarque tenant_id), rôles : CLIENT, GESTIONNAIRE, CHAUFFEUR, DIRECTION, ADMIN_SAAS.
- **Multi-tenant** : base partagée, schéma partagé, discriminant `tenant_id` (`@Where`/filtre Hibernate), résolution du tenant en amont des contrôleurs.
- **BDD** : PostgreSQL (config dockerisée : service `db` + volume, healthcheck `pg_isready`).
- **Docker** : `docker-compose.yml` racine (db + backend + web/nginx), Dockerfile backend multi-stage (Maven), nginx proxy `/api/` → backend. Ports : front 8080, backend 8081, DB 5432.
- **API type** : `POST /api/demandes`, GroupageController, FlotteController, FactureController, TenantController.

## 8. Besoins fonctionnels clés (BF) et non fonctionnels (BNF)

BF-01 tenant self-service ; BF-02 demande de transport ; BF-03 tarif indicatif ; BF-04 groupage auto (seuil paramétrable) ; BF-05 affectation auto ; BF-06 statuts par le chauffeur ; BF-07 suivi client final ; BF-08 facture auto à la livraison ; BF-09 dashboard tenant ; BF-10 dashboard super-admin ; BF-11 incidents.

BNF-01 isolation stricte multi-tenant ; BNF-02 ergonomie simple ; BNF-03 dispo 6h–20h ; BNF-04 sécurité par rôle+tenant ; BNF-05 < 2 s temps de réponse ; BNF-06 mobile + tolérance réseau instable ; BNF-07 évolutivité (ajout de tenants sans refonte) ; BNF-08 traçabilité/audit par tenant.

## 9. Périmètre

**Hors périmètre** : intégration GPS matériel, comptabilité générale/paie, paiement en ligne + facturation de l'abonnement SaaS, marque blanche par tenant.

## 10. Planning et livrables

18 semaines, 9 phases (socle technique → demandes → groupage → flotte → suivi/facturation → tableau de bord → tests → finalisation). Livrables : cahier des charges + dossier de conception, code versionné (Git), plateforme déployable avec ≥ 2 tenants de démonstration couvrant a minima Demandes, Groupage/Optimisation et Flotte, documentation, jeux de tests (groupage + isolation), mémoire, soutenance.
