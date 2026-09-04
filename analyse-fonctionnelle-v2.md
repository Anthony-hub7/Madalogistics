# Analyse Fonctionnelle — MadaLogistix (v2)

> **Objectif :** Valider l'architecture fonctionnelle cible.
> **Règle :** Aucune modification de code. Analyse et recommandations uniquement.
> **Validation :** Chaque décision doit être validée par un humain avant d'être appliquée.

---

## SYSTÈME DE VALIDATION

Chaque décision est marquée d'un statut :

| Statut | Signification |
|--------|---------------|
| `[EN ATTENTE]` | Décision proposée, pas encore validée |
| `[VALIDÉE]` | Décision approuvée par un humain |
| `[REFUSÉE]` | Décision rejetée — à revoir |
| `[MODIFIÉE]` | Décision acceptée avec des modifications |

**Règle :** Aucune décision marquée `[EN ATTENTE]` ne peut être appliquée au code.

---

## ANALYSE PAR RÔLE

---

## 1. ADMIN SaaS

### Squelette proposé

```
ADMIN SaaS
├── Tenants
└── Onboarding tenant
```

### Vérification

**Tenants** — Le code actuel contient :
- `TenantsAdminPage.jsx` : dashboard statistiques globales (KPI plateforme, graphique activité, santé système, journal système)
- `UtilisateursPage.jsx` : annuaire des comptes, CRUD (créer gestionnaire, créer chauffeur, modifier, désactiver), pagination

**Problème :** `UtilisateursPage` gère les utilisateurs de TOUS les tenants. Ce n'est pas la gestion des tenants eux-mêmes. C'est un annuaire transversal.

**Question :** L'annuaire transversal des utilisateurs appartient-il à "Tenants" ?

**Réponse :** Oui, à condition que "Tenants" soit interprété comme "Gestion de la plateforme" et non comme "Liste des agences". L'admin SaaS gère les tenants ET les utilisateurs de la plateforme. Un onglet "Tenants" peut contenir :
1. Liste des tenants avec KPI
2. Annuaire transversal des utilisateurs
3. Détail d'un tenant (ses utilisateurs, sa config)

C'est cohérent.

**Onboarding tenant** — Absent du code. Fonctionnalité manquante critique.

**Où vont les paramètres SaaS ?**

Le `ParametresPage.jsx` contient :
- Informations société (nom, NIF, adresse) → paramètres de la PLATEFORME
- Abonnement Premium (plan, prix, utilisation) → paramètres de la PLATEFORME
- Factures de la plateforme → paramètres de la PLATEFORME
- Localisation (langue, fuseau, devise) → paramètres de la PLATEFORME
- Sécurité (2FA, logs connexions, reset mots de passe) → paramètres de la PLATEFORME
- Notifications (alertes email/SMS) → paramètres de la PLATEFORME

Tout concerne la plateforme, pas un tenant.

### Décisions Admin SaaS

| # | Décision | Statut | Validé par | Date |
|---|----------|--------|------------|------|
| D-ADM-1 | "Tenants" contient la liste des tenants + annuaire utilisateurs transversal | `[EN ATTENTE]` | — | — |
| D-ADM-2 | "Onboarding tenant" est un onglet dédié au workflow d'activation | `[EN ATTENTE]` | — | — |
| D-ADM-3 | "Paramètres SaaS" est un 3ème onglet séparé (pas dans Tenants, pas dans Onboarding) | `[EN ATTENTE]` | — | — |

**Recommandation :** Ajouter un onglet "Paramètres" dans Admin SaaS. C'est distinct de l'onboarding d'un tenant.

### Verdict Admin SaaS

| Élément | Constat | Recommandation | Statut |
|---------|---------|----------------|--------|
| Tenants (liste + KPI) | Existe (`TenantsAdminPage`) | Garder | `[EN ATTENTE]` |
| Utilisateurs (annuaire transversal) | Existe (`UtilisateursPage`) | Intégrer dans Tenants comme section | `[EN ATTENTE]` |
| Onboarding tenant | Absent | Ajouter | `[EN ATTENTE]` |
| Paramètres SaaS | Existe (`ParametresPage`) | Ajouter comme onglet | `[EN ATTENTE]` |

### Squelette corrigé

```
ADMIN SaaS
├── Tenants
│   ├── Liste des tenants (KPI)
│   └── Annuaire utilisateurs (CRUD)
├── Onboarding tenant
└── Paramètres SaaS
```

**3 onglets.** Pas 2.

---

## 2. DIRECTION

### Squelette proposé

```
DIRECTION
├── Vue d'ensemble
├── Équipe
├── Performance & Décisions
└── Configuration
    ├── Hubs
    └── Paramètres tarifaires
```

### Vérification par fonctionnalité

**Vue d'ensemble** (`VueEnsembleTab.jsx`) contient :
- CA hebdomadaire (AreaChart)
- Taux de livraison (donut 94.8%)
- Remplissage vs objectif (jauge)
- Gains optimisation IA (3.8M Ar, CO2, heures)
- Utilisation flotte (barres progression)

→ **Verdict :** Garder. Interface de pilotage synthétique.

**CA** (`ChiffreAffairesPage.jsx`) :
- Graphique CA multi-hubs
- Tableau factures
- Filtre période

→ **Problème :** Le CA est déjà dans Vue d'ensemble (courbe hebdomadaire). La page CA ajoute le détail par hub et les factures.
→ **Décision :** Le CA peut être une section de Vue d'ensemble. Pas besoin d'onglet séparé. Si le Direction veut voir le détail par hub, il clique sur un bouton "Détail" dans Vue d'ensemble.

**Performance** (`PerformanceTab.jsx`) contient :
- Donut statuts livraisons (75% livrées, 15% en cours, 7% retard, 3% incidents)
- Délai moyen livraison (4.2h, -12% MoM)
- Tableau incidents

**Décisions** (`DecisionsTab.jsx`) contient :
- Gains cumulés IA (3.8M Ar, km évités, CO2)
- Tableau exécutions algorithmes (VRP, Bin Packing, Knapsack)
- Insights (recommandations)

→ **Fusion logique ?** OUI. Performance = "comment se porte mon activité". Décisions = "qu'est-ce que l'IA a fait pour l'améliorer". Même question de pilotage. Le Direction veut d'abord voir les résultats (performance), puis comprendre les actions (décisions IA). Une seule interface avec deux sections est naturel.

**Audit** (`AuditTab.jsx`) contient :
- Compteur total actions (12 450)
- Répartition par type (BarChart)
- Tableau logs d'audit (date, utilisateur, rôle, action, hub, statut)
- Recherche + export CSV

→ **Question :** L'audit est-il suffisamment différent de Performance & Décisions ?

**Analyse :**
- Performance = métriques opérationnelles (livraisons, délais, incidents)
- Décisions = actions IA (optimisations, gains)
- Audit = traçabilité des actions humaines (qui a fait quoi, quand)

L'audit n'est PAS une métrique de performance. C'est un journal de conformité. Un responsable qualité ou un auditeur l'utilise, pas le même public que Performance.

**Cependant :** L'audit est une fonctionnalité "avancée" que peu d'utilisateurs consultent quotidiennement. Dans l'interface actuelle, c'est un onglet séparé que le Direction visite rarement.

**Décision :** L'audit peut être :
- Soit une section dans "Performance & Décisions" (onglet interne "Audit")
- Soit accessible depuis un menu "Outils avancés"
- Soit un onglet séparé si le volume le justifie

**Recommandation :** Intégrer l'audit comme section dans "Performance & Décisions" avec un onglet interne.

**Configuration (Hubs + Tarification)** — Absente du code. Fonctionnalités manquantes :
- Hubs : liste, création, modification
- Grille tarifaire : création, modification des tarifs
- Catégories de produits : création, règles

→ **Verdict :** Nécessaire. Le schéma BDD contient `hub`, `grille_tarifaire`, `categorie_produit`. Ces données sont utilisées par le Client (devis) et le Logistics (groupage). La Direction doit pouvoir les configurer.

### Décisions Direction

| # | Décision | Statut | Validé par | Date |
|---|----------|--------|------------|------|
| D-DIR-1 | Vue d'ensemble reste une interface séparée (pilotage synthétique) | `[EN ATTENTE]` | — | — |
| D-DIR-2 | CA (page séparée) → section dans Vue d'ensemble | `[EN ATTENTE]` | — | — |
| D-DIR-3 | Performance + Décisions → fusion "Performance & Décisions" | `[EN ATTENTE]` | — | — |
| D-DIR-4 | Audit → onglet interne dans "Performance & Décisions" (pas supprimé) | `[EN ATTENTE]` | — | — |
| D-DIR-5 | Équipe reste un onglet séparé | `[EN ATTENTE]` | — | — |
| D-DIR-6 | "Configuration" est un nouvel onglet (Hubs + Tarification + Catégories) | `[EN ATTENTE]` | — | — |

### Verdict Direction

| Élément | Constat | Recommandation | Statut |
|---------|---------|----------------|--------|
| Vue d'ensemble | Existe | Garder | `[EN ATTENTE]` |
| CA (page séparée) | Existe | **Déplacer** dans Vue d'ensemble comme section | `[EN ATTENTE]` |
| Performance | Existe | Fusionner avec Décisions | `[EN ATTENTE]` |
| Décisions | Existe | Fusionner avec Performance | `[EN ATTENTE]` |
| Audit | Existe | Intégrer dans Performance & Décisions comme onglet interne | `[EN ATTENTE]` |
| Équipe | Existe | Garder | `[EN ATTENTE]` |
| Hubs | Absent | Ajouter dans Configuration | `[EN ATTENTE]` |
| Tarification | Absent | Ajouter dans Configuration | `[EN ATTENTE]` |

### Squelette corrigé

```
DIRECTION
├── Vue d'ensemble
│   ├── CA hebdomadaire
│   ├── Taux livraison
│   ├── Remplissage
│   ├── Gains IA
│   ├── Utilisation flotte
│   └── Détail CA par hub (section)
├── Équipe
├── Performance & Décisions
│   ├── Onglet : Performance (donut, délais, incidents)
│   ├── Onglet : Décisions IA (gains, exécutions, insights)
│   └── Onglet : Audit (logs, export)
└── Configuration
    ├── Hubs
    └── Paramètres tarifaires
```

**4 onglets sidebar.** L'audit n'est pas supprimé, il est intégré.

---

## 3. RESPONSABLE LOGISTIQUE

### Squelette proposé

```
RESPONSABLE LOGISTIQUE
├── Dashboard
├── Commandes
├── Optimisation
│   ├── Catégorisation
│   ├── Groupage
│   ├── Affectation
│   └── Planification VRP
└── Flotte
```

### Vérification du flux métier

```
Commandes (réception)
↓
Catégorisation (identifier le type de colis)
↓
Groupage (regrouper les colis en sacs)
↓
Affectation (assigner chauffeur + véhicule à chaque sac)
↓
Planification VRP (créer les tournées)
↓
Mission chauffeur
```

**Ces étapes sont-elles réellement dépendantes ?**

OUI. Chaque étape produit une donnée que l'étape suivante consomme :

| Étape | Produit | Consommé par |
|-------|---------|--------------|
| Commande | Colis à traiter | Catégorisation |
| Catégorisation | Colis catégorisés | Groupage |
| Groupage | Sacs (colis regroupés) | Affectation |
| Affectation | Sacs assignés (chauffeur + véhicule) | VRP |
| VRP | Tournées avec étapes | Chauffeur |

C'est un pipeline. Les séparer en pages distinctes force l'utilisateur à naviguer entre 4 endroits pour exécuter un seul processus.

**Fusion dans "Optimisation" est logique.**

### Mais comment organiser "Optimisation" ?

**Option A : Wizard séquentiel**
L'utilisateur avance étape par étape. Chaque étape valide l'étape précédente avant de passer à la suivante.

**Option B : Onglets internes**
L'utilisateur voit 4 onglets (Catégorisation, Groupage, Affectation, VRP) et peut naviguer librement.

**Option C : Tableau de bord avec pipeline**
L'utilisateur voit un tableau de bord synthétique de l'état du pipeline. Chaque étape est un bloc cliquable.

**Analyse :**
- Un wizard séquentiel est trop rigide. Parfois le gestionnaire veut modifier l'affectation sans re-catégoriser.
- Des onglets internes sont flexibles mais ne montrent pas l'avancement du pipeline.
- Un tableau de bord avec pipeline est visuel et informatif.

**Recommandation :** Interface "Optimisation" avec :
1. En haut : barre de pipeline montrant l'avancement (catégorisés → groupés → affectés → planifiés)
2. En dessous : contenu de l'étape sélectionnée (onglet interne ou section)
3. Chaque étape peut être exécutée indépendamment si les données existent

### Catégorisation : clarification

**A. Gestion des catégories (configuration)**
- Créer une catégorie (fragile, standard, robuste, liquide)
- Définir ses caractéristiques (manipulation spéciale, température, etc.)
- Modifier / supprimer

→ **Qui ?** Direction (c'est de la configuration d'agence)
→ **Où ?** Direction > Configuration > Catégories de produits

**B. Catégorisation opérationnelle des colis**
- Attribuer une catégorie à un colis spécifique
- Catégorisation automatique (basée sur des règles)
- Clustering ML (analyse sémantique de la description)
- Enrichissement des données (poids, volume, fragilité)

→ **Qui ?** Responsable logistique (c'est une opération)
→ **Où ?** Responsable logistique > Optimisation > Catégorisation

**Ne pas mélanger A et B.** La configuration est faite une fois. L'opération est faite sur chaque commande.

### Affectation : vérification

L'affectation n'existe pas dans le code actuel. Le `GroupagePage.jsx` simule un résultat aléatoire. Le `FlottePage.jsx` montre les véhicules et leur disponibilité mais ne fait pas de lien chauffeur/véhicule/colis.

**Fonctionnalités manquantes :**
- Matrice de compatibilité chauffeur/véhicule (schéma : `compatibilite_chauffeur_vehicule`)
- Interface pour cocher les paires compatibles
- Algorithme d'affectation (schéma : `optimisation_run` avec type `AFFECTATION`)
- Résultat : chaque sac reçoit un chauffeur + véhicule

**Verdict :** Nécessaire. Sans affectation, le pipeline s'arrête après le groupage.

### Planification VRP : vérification

Le schéma BDD contient `tournee` et `etape_livraison`. Le `tourneesService.js` définit `getAll()` et `optimize(data)` mais rien n'est appelé.

**Fonctionnalités manquantes :**
- Lancement de l'algorithme VRP
- Visualisation des tournées résultantes (liste des étapes par tournée)
- Validation / modification d'une tournée
- Résultat : chaque tournée a des étapes avec ordre, horaires estimés

**Verdict :** Nécessaire. C'est le pont entre l'affectation et les missions chauffeur.

### Carte : où va-t-elle ?

`CartePage.jsx` est une page plein écran avec :
- Carte SVG animée (véhicules, entrepôts, stops)
- Panneau latéral livraisons (liste avec progression)
- Barre stats bas (vitesse, véhicules actifs, ponctualité)

**Question :** La carte est-elle une fonctionnalité à part ou une vue de Commandes ?

**Analyse :** La carte montre les livraisons EN COURS. C'est une vue de suivi opérationnel. Elle pourrait être :
- Une section dans Commandes (onglet "Carte")
- Un bouton "Voir sur carte" dans le Dashboard
- Une interface séparée

**Décision :** La carte peut être une section dans Commandes ou un bouton d'accès rapide depuis le Dashboard. Elle n'a pas besoin d'être un onglet sidebar séparé.

### Décisions Logistics

| # | Décision | Statut | Validé par | Date |
|---|----------|--------|------------|------|
| D-LOG-1 | Dashboard reste un onglet séparé | `[EN ATTENTE]` | — | — |
| D-LOG-2 | Commandes reste un onglet séparé | `[EN ATTENTE]` | — | — |
| D-LOG-3 | Carte → vue alternative dans Commandes (pas d'onglet sidebar) | `[EN ATTENTE]` | — | — |
| D-LOG-4 | Catégorisation + Groupage + Affectation + VRP → un seul onglet "Optimisation" | `[EN ATTENTE]` | — | — |
| D-LOG-5 | Organisation d'Optimisation : pipeline visuel + étapes internes | `[EN ATTENTE]` | — | — |
| D-LOG-6 | Catégorisation = 2 aspects : config (Direction) + opération (Logistics) | `[EN ATTENTE]` | — | — |
| D-LOG-7 | Flotte reste un onglet séparé | `[EN ATTENTE]` | — | — |

### Verdict Logistics

| Élément | Constat | Recommandation | Statut |
|---------|---------|----------------|--------|
| Dashboard | Existe | Garder | `[EN ATTENTE]` |
| Commandes | Existe | Garder + intégrer la carte | `[EN ATTENTE]` |
| Carte (onglet séparé) | Existe | **Déplacer** dans Commandes comme vue alternative | `[EN ATTENTE]` |
| Groupage (simulation) | Existe | Intégrer dans Optimisation | `[EN ATTENTE]` |
| Flotte | Existe | Garder | `[EN ATTENTE]` |
| Catégorisation | Absent | Ajouter dans Optimisation | `[EN ATTENTE]` |
| Affectation | Absent | Ajouter dans Optimisation | `[EN ATTENTE]` |
| Planification VRP | Absent | Ajouter dans Optimisation | `[EN ATTENTE]` |

### Squelette corrigé

```
RESPONSABLE LOGISTIQUE
├── Dashboard
├── Commandes
│   ├── Liste des commandes
│   ├── Vue carte (alternative)
│   └── Détail d'une commande
├── Optimisation
│   ├── Pipeline (barre d'avancement)
│   ├── Catégorisation (colis)
│   ├── Groupage (sacs)
│   ├── Affectation (chauffeur + véhicule)
│   └── Planification VRP (tournées)
└── Flotte
```

**4 onglets sidebar.** La carte n'est plus un onglet séparé.

---

## 4. CHAUFFEUR

### Squelette proposé

```
CHAUFFEUR
└── Mes missions
    ├── Missions
    ├── Ma tournée
    ├── Livraisons
    └── Historique
```

### Vérification

**Missions** (`MesLivraisonsPage.jsx`) :
- Liste des missions du jour (3 livraisons hardcodées)
- Accepter une mission
- Démarrer l'itinéraire
- Mettre à jour le statut (bottom sheet)
- Résumé tournée (distance totale)
- Accéder au détail (navigation vers `DetailLivraisonPage`)
- Confirmation livraison (photo + signature via `ConfirmationLivraison`)

**Ma tournée** — Partiellement dans `MesLivraisonsPage` (résumé distance) et `NavigationPage` (placeholder 13 lignes).

**Livraisons** — C'est le même que "Missions". Les livraisons sont les missions. Séparer "Missions" et "Livraisons" n'a pas de sens.

**Historique** (`HistoriquePage.jsx`) :
- Liste des livraisons passées (3 items hardcodés)
- Très simple (ID, client, date, statut)

### Problème : "Livraisons" est un doublon de "Missions"

Dans le code actuel :
- `MesLivraisonsPage` = liste des missions EN COURS (avec actions)
- `DetailLivraisonPage` = détail d'une livraison spécifique
- `HistoriquePage` = liste des livraisons TERMINÉES

"Missions" et "Livraisons" sont le même concept. La distinction est "en cours" vs "terminé".

### Fusion logique

**OUI.** "Mes missions" peut contenir :
- Liste des missions en cours (avec actions : accepter, démarrer, mettre à jour, confirmer)
- Historique (onglet interne ou filtre)

**Ma tournée** doit rester séparée ?

**Analyse :** La tournée est la vue globale du chauffeur : tous les stops dans l'ordre, avec les temps estimés. Les missions sont les actions individuelles. La tournée est "je dois aller ici, puis ici, puis ici". Les missions sont "je charge ce colis, je livre celui-là".

**Décision :** La tournée peut être une section dans "Mes missions" (en haut de la liste, un résumé de la tournée avec carte). Pas besoin d'onglet séparé.

### Décisions Chauffeur

| # | Décision | Statut | Validé par | Date |
|---|----------|--------|------------|------|
| D-CHF-1 | "Mes missions" est le seul onglet sidebar | `[EN ATTENTE]` | — | — |
| D-CHF-2 | Missions + Livraisons → fusion (même concept) | `[EN ATTENTE]` | — | — |
| D-CHF-3 | Ma tournée → section dans Missions (pas d'onglet séparé) | `[EN ATTENTE]` | — | — |
| D-CHF-4 | Historique → onglet/filtre interne dans Missions | `[EN ATTENTE]` | — | — |
| D-CHF-5 | Navigation (placeholder) → supprimé (intégré dans Ma tournée) | `[EN ATTENTE]` | — | — |

### Verdict Chauffeur

| Élément | Constat | Recommandation | Statut |
|---------|---------|----------------|--------|
| Missions (en cours) | Existe | Garder comme base | `[EN ATTENTE]` |
| Livraisons (= missions) | Doublon | **Fusionner** avec Missions | `[EN ATTENTE]` |
| Ma tournée | Partiel (placeholder) | Intégrer dans Missions comme section | `[EN ATTENTE]` |
| Historique | Existe | Intégrer dans Missions comme onglet/filtre | `[EN ATTENTE]` |
| Navigation (placeholder) | Inutile | **Supprimer** (intégrer dans Ma tournée) | `[EN ATTENTE]` |

### Squelette corrigé

```
CHAUFFEUR
└── Mes missions
    ├── Liste des missions (en cours, avec actions)
    ├── Ma tournée (résumé + carte + stops)
    └── Historique (onglet interne)
```

**1 onglet sidebar.** Le chauffeur n'a besoin que d'un seul accès.

---

## 5. CLIENT

### Squelette proposé

```
CLIENT
├── Nouvelle expédition
└── Mes expéditions
    ├── Demandes
    ├── Devis
    ├── Commandes
    └── Suivi
```

### Vérification du cycle

```
Nouvelle expédition (formulaire)
↓
Demande créée
↓
Devis généré par le système
↓
Le client accepte le devis
↓
Commande créée
↓
Transport en cours
↓
Suivi en temps réel
↓
Livraison effectuée
↓
Facture générée
```

**Le cycle est-il complet dans le squelette ?**

- Nouvelle expédition → OK
- Demandes → OK (section dans Mes expéditions)
- Devis → OK (section dans Mes expéditions)
- Commandes → OK (section dans Mes expéditions)
- Suivi → OK (section dans Mes expéditions)
- Facturation → **MANQUANT**

**Où vont les factures ?**

Le `FacturesPage.jsx` contient :
- Liste des factures (référence, date, montant, statut, échéance)
- KPI (total dû, payé ce mois, dernière facture)
- Téléchargement PDF

Les factures sont liées aux commandes. Chaque commande livrée génère une facture. Le client veut voir ses factures dans le contexte de ses expéditions.

**Décision :** Les factures peuvent être :
- Une section dans "Mes expéditions" (onglet interne "Factures")
- Un lien dans le détail d'une commande livrée

**Recommandation :** Intégrer les factures comme section dans "Mes expéditions". Pas besoin d'onglet sidebar séparé.

### Détail d'une commande

Le client veut voir le détail d'une commande spécifique : colis, statut, historique, facture. C'est une page de détail, pas un onglet sidebar.

**Décision :** Le détail d'une commande est accessible depuis la liste des commandes (clic sur une ligne). Pas d'onglet séparé.

### Notifications

Le client veut être notifié des changements de statut (email, SMS). C'est une fonctionnalité transversale, pas une page.

**Décision :** Les notifications sont gérées par le backend (email/SMS) et affichées dans l'interface (badge, toast). Pas de page dédiée.

### Décisions Client

| # | Décision | Statut | Validé par | Date |
|---|----------|--------|------------|------|
| D-CLI-1 | "Nouvelle expédition" reste un onglet séparé (formulaire de création) | `[EN ATTENTE]` | — | — |
| D-CLI-2 | "Mes expéditions" regroupe Demandes, Devis, Commandes, Suivi, Factures | `[EN ATTENTE]` | — | — |
| D-CLI-3 | Factures → section dans Mes expéditions (pas d'onglet sidebar) | `[EN ATTENTE]` | — | — |
| D-CLI-4 | Détail commande → page accessible depuis la liste (pas d'onglet sidebar) | `[EN ATTENTE]` | — | — |
| D-CLI-5 | Notifications → backend transversal (pas de page dédiée) | `[EN ATTENTE]` | — | — |

### Verdict Client

| Élément | Constat | Recommandation | Statut |
|---------|---------|----------------|--------|
| Nouvelle demande | Existe | Renommer "Nouvelle expédition" | `[EN ATTENTE]` |
| Mes commandes (suivi + historique) | Existe | Intégrer dans Mes expéditions | `[EN ATTENTE]` |
| Factures | Existe | Intégrer dans Mes expéditions comme section | `[EN ATTENTE]` |
| Devis | Partiel (estimation dans formulaire) | Ajouter dans Mes expéditions | `[EN ATTENTE]` |
| Suivi temps réel | Partiel (barre progression) | Ajouter dans Mes expéditions | `[EN ATTENTE]` |
| Détail commande | Absent | Ajouter (accessible depuis la liste) | `[EN ATTENTE]` |

### Squelette corrigé

```
CLIENT
├── Nouvelle expédition
└── Mes expéditions
    ├── Demandes (en attente de devis)
    ├── Devis (en attente d'acceptation)
    ├── Commandes (en cours + historique)
    ├── Suivi (carte temps réel)
    └── Factures
```

**2 onglets sidebar.** Le client a un flux simple : créer → suivre.

---

## 6. CATÉGORISATION — CLARIFICATION FINALE

| Aspect | Qui | Où | Quand | Statut |
|--------|-----|-----|-------|--------|
| **A. Configuration des catégories** | Direction | Direction > Configuration > Catégories | Une fois (setup initial) | `[EN ATTENTE]` |
| **B. Catégorisation opérationnelle** | Logistics | Logistics > Optimisation > Catégorisation | Sur chaque commande | `[EN ATTENTE]` |

**A. Configuration (Direction)**
- Créer/ modifier/ supprimer une catégorie
- Définir : nom, description, manipulabilité, température, fragilité, classe (A/B/C)
- Règles automatiques (si poids > X → catégorie Y)

**B. Opération (Logistics)**
- Attribuer une catégorie à chaque colis d'une commande
- Règles automatiques (basées sur la configuration de A)
- Catégorisation ML (clustering sémantique de la description)
- Validation manuelle si incertitude

**Ces deux aspects doivent être séparés.** La configuration est faite rarement. L'opération est faite sur chaque commande.

---

## LIVRABLE FINAL

---

### A. Fonctionnalités à conserver

| # | Fonctionnalité | Interface actuelle | Constat | Statut |
|---|----------------|--------------------|---------|--------|
| 1 | Dashboard KPI plateforme | TenantsAdminPage | Garder dans Admin > Tenants | `[EN ATTENTE]` |
| 2 | Annuaire utilisateurs | UtilisateursPage | Garder dans Admin > Tenants | `[EN ATTENTE]` |
| 3 | Vue d'ensemble | VueEnsembleTab | Garder dans Direction | `[EN ATTENTE]` |
| 4 | Équipe | EquipeTab | Garder dans Direction | `[EN ATTENTE]` |
| 5 | Performance (donut, délais, incidents) | PerformanceTab | Garder dans Direction > Perf & Décisions | `[EN ATTENTE]` |
| 6 | Décisions IA (gains, exécutions) | DecisionsTab | Garder dans Direction > Perf & Décisions | `[EN ATTENTE]` |
| 7 | Audit (logs, export) | AuditTab | Garder dans Direction > Perf & Décisions | `[EN ATTENTE]` |
| 8 | Dashboard opérationnel | DashboardGestionnairePage | Garder dans Logistics | `[EN ATTENTE]` |
| 9 | Liste commandes | DemandesListPage | Garder dans Logistics | `[EN ATTENTE]` |
| 10 | Liste véhicules | FlottePage | Garder dans Logistics | `[EN ATTENTE]` |
| 11 | Simulateur groupage | GroupagePage | Garder dans Logistics > Optimisation | `[EN ATTENTE]` |
| 12 | Missions chauffeur | MesLivraisonsPage | Garder dans Chauffeur | `[EN ATTENTE]` |
| 13 | Détail livraison | DetailLivraisonPage | Garder (accessible depuis Missions) | `[EN ATTENTE]` |
| 14 | Confirmation livraison | ConfirmationLivraison | Garder (composant) | `[EN ATTENTE]` |
| 15 | Nouvelle demande | NouvelleDemandePage | Garder dans Client | `[EN ATTENTE]` |
| 16 | Suivi commandes | MesCommandesPage | Garder dans Client > Mes expéditions | `[EN ATTENTE]` |
| 17 | Factures | FacturesPage | Garder dans Client > Mes expéditions | `[EN ATTENTE]` |

---

### B. Fonctionnalités à fusionner

**Fusion 1 : Direction > Performance + Décisions + Audit**

AVANT :
- Performance (donut, délais, incidents)
- Décisions IA (gains, exécutions, insights)
- Audit (logs, export)

APRÈS : **Direction > Performance & Décisions**

Organisation interne :
- Onglet Performance : donut statuts, délai moyen, incidents
- Onglet Décisions : gains IA, exécutions algorithmes, insights
- Onglet Audit : logs, répartition, export CSV

RAISON : Même contexte de pilotage. Le Direction veut d'abord les résultats (performance), puis les actions (décisions IA), puis la traçabilité (audit).

**Statut :** `[EN ATTENTE]`

---

**Fusion 2 : Direction > CA + Vue d'ensemble**

AVANT :
- Vue d'ensemble (CA, taux, remplissage, gains, flotte)
- Chiffre d'affaires (CA multi-hubs, factures détaillées)

APRÈS : **Direction > Vue d'ensemble**

Organisation interne :
- Section CA hebdomadaire (courbe existante)
- Section Détail CA par hub (bouton "Voir détail" → affiche le tableau CA multi-hubs)
- Section Taux de livraison
- Section Remplissage
- Section Gains IA
- Section Utilisation flotte

RAISON : Le CA est déjà dans Vue d'ensemble. La page CA séparée ajoute du détail mais pas de valeur suffisante pour un onglet sidebar.

**Statut :** `[EN ATTENTE]`

---

**Fusion 3 : Logistics > Commandes + Carte**

AVANT :
- Commandes (liste, filtres, CRUD)
- Carte (vue temps réel)

APRÈS : **Logistics > Commandes**

Organisation interne :
- Vue liste (par défaut)
- Vue carte (bouton toggle ou bouton "Voir sur carte")
- Détail d'une commande (accessible depuis la liste)

RAISON : La carte est une vue des mêmes données (livraisons en cours). Elle n'a pas besoin d'être un onglet séparé.

**Statut :** `[EN ATTENTE]`

---

**Fusion 4 : Logistics > Optimisation (Catégorisation + Groupage + Affectation + VRP)**

AVANT :
- Catégorisation (nouveau)
- Groupage (existante)
- Affectation (nouveau)
- Planification VRP (nouveau)

APRÈS : **Logistics > Optimisation**

Organisation interne :
- Barre de pipeline (avancement : catégorisés → groupés → affectés → planifiés)
- Section Catégorisation (liste colis + attribution catégorie)
- Section Groupage (paramètres + calcul + résultats sacs)
- Section Affectation (matrice compatibilité + calcul + résultats)
- Section VRP (lancement + visualisation tournées)

RAISON : Pipeline séquentiel. Chaque étape produit une donnée pour la suivante. Les séparer force 4 navigations pour 1 processus.

**Statut :** `[EN ATTENTE]`

---

**Fusion 5 : Chauffeur > Missions + Historique + Ma tournée**

AVANT :
- Missions (en cours)
- Ma tournée (placeholder)
- Historique (passées)

APRÈS : **Chauffeur > Mes missions**

Organisation interne :
- En haut : résumé tournée (distance, nombre de stops, temps estimé)
- Liste des missions en cours (avec actions)
- Onglet/filtre Historique (terminées)

RAISON : Même contexte opérationnel. Le chauffeur veut une seule page avec tout ce qu'il doit faire aujourd'hui + ce qu'il a déjà fait.

**Statut :** `[EN ATTENTE]`

---

### C. Fonctionnalités à déplacer

| Ancienne interface | Nouvelle interface | Justification | Statut |
|--------------------|--------------------|---------------|--------|
| Direction > CA (page séparée) | Direction > Vue d'ensemble (section) | Le CA est déjà dans Vue d'ensemble | `[EN ATTENTE]` |
| Direction > Audit (onglet sidebar) | Direction > Performance & Décisions (onglet interne) | Audit = sous-fonction de pilotage | `[EN ATTENTE]` |
| Logistics > Carte (onglet sidebar) | Logistics > Commandes (vue alternative) | Même données, vue différente | `[EN ATTENTE]` |
| Admin > Paramètres SaaS | Admin SaaS > Paramètres (nouvel onglet) | Paramètres de la plateforme | `[EN ATTENTE]` |
| Client > Factures (onglet sidebar) | Client > Mes expéditions (section) | Factures liées aux commandes | `[EN ATTENTE]` |

---

### D. Fonctionnalités à supprimer

| Fonctionnalité | Onglet | Raison | Statut |
|----------------|--------|--------|--------|
| **Navigation (placeholder)** | Chauffeur | 13 lignes, aucune fonctionnalité. L'itinéraire doit être dans "Ma tournée" intégrée à "Mes missions". | `[EN ATTENTE]` |
| **Sélection de rôle dans le login** | Authentification | Le rôle vient de l'authentification (JWT), pas d'un dropdown. | `[EN ATTENTE]` |
| **Page "Livraisons" séparée** | Chauffeur | Doublon de "Missions". Les livraisons EN COURS = les missions. | `[EN ATTENTE]` |

---

### E. Fonctionnalités manquantes

| # | Fonctionnalité | Rôle | Interface cible | Raison | Source | Statut |
|---|----------------|------|-----------------|--------|--------|--------|
| 1 | Inscription client | Client | Authentification | Pas de page d'inscription | Nécessité workflow | `[EN ATTENTE]` |
| 2 | Liste des devis | Client | Mes expéditions | Le devis est une étape clé | Nécessité workflow | `[EN ATTENTE]` |
| 3 | Accepter/refuser un devis | Client | Mes expéditions | Le client doit décider | Nécessité workflow | `[EN ATTENTE]` |
| 4 | Transformer devis en commande | Client + Logistics | Mes expéditions + Commandes | Pont devis→commande | Nécessité workflow | `[EN ATTENTE]` |
| 5 | Suivi temps réel sur carte | Client | Mes expéditions > Suivi | Le client veut voir son colis | Nécessité workflow | `[EN ATTENTE]` |
| 6 | Détail d'une commande | Client | Mes expéditions | Voir les colis, statut, facture | Logique métier | `[EN ATTENTE]` |
| 7 | Catégorisation opérationnelle | Logistics | Optimisation > Catégorisation | Attribuer catégorie aux colis | Schéma BDD + workflow | `[EN ATTENTE]` |
| 8 | Affectation chauffeur/véhicule | Logistics | Optimisation > Affectation | Assigner aux sacs | Schéma BDD + workflow | `[EN ATTENTE]` |
| 9 | Planification VRP | Logistics | Optimisation > VRP | Créer les tournées | Schéma BDD + workflow | `[EN ATTENTE]` |
| 10 | Gestion des hubs | Direction | Configuration | Configurer les points de présence | Schéma BDD | `[EN ATTENTE]` |
| 11 | Grille tarifaire | Direction | Configuration | Définir les tarifs | Schéma BDD | `[EN ATTENTE]` |
| 12 | Catégories de produits (config) | Direction | Configuration | Définir les types de colis | Schéma BDD | `[EN ATTENTE]` |
| 13 | Workflow onboarding tenant | Admin SaaS | Onboarding tenant | Activer un nouveau client SaaS | Nécessité workflow | `[EN ATTENTE]` |
| 14 | Détail d'un membre | Direction | Équipe | Profil complet | Logique métier | `[EN ATTENTE]` |
| 15 | Détail d'un véhicule | Logistics | Flotte | Historique, maintenance | Logique métier | `[EN ATTENTE]` |

---

### F. Squelette final recommandé

```
MadaLogistix
│
├── Authentification
│
├── ADMIN SaaS
│   ├── Tenants
│   ├── Onboarding tenant
│   └── Paramètres SaaS
│
├── DIRECTION
│   ├── Vue d'ensemble
│   ├── Équipe
│   ├── Performance & Décisions
│   └── Configuration
│
├── RESPONSABLE LOGISTIQUE
│   ├── Dashboard
│   ├── Commandes
│   ├── Optimisation
│   └── Flotte
│
├── CHAUFFEUR
│   └── Mes missions
│
└── CLIENT
    ├── Nouvelle expédition
    └── Mes expéditions
```

**Statut du squelette :** `[EN ATTENTE DE VALIDATION]`

---

### G. Matrice finale

| Fonctionnalité | Rôle | Interface cible | Section interne | Action | Statut |
|----------------|------|-----------------|-----------------|--------|--------|
| KPI plateforme | Admin | Tenants | Dashboard | Garder | `[EN ATTENTE]` |
| Annuaire utilisateurs | Admin | Tenants | Utilisateurs | Garder | `[EN ATTENTE]` |
| Invitation tenant | Admin | Onboarding tenant | — | Ajouter | `[EN ATTENTE]` |
| Workflow configuration | Admin | Onboarding tenant | Étapes | Ajouter | `[EN ATTENTE]` |
| Paramètres plateforme | Admin | Paramètres SaaS | — | Déplacer | `[EN ATTENTE]` |
| CA hebdomadaire | Direction | Vue d'ensemble | CA | Garder | `[EN ATTENTE]` |
| Taux livraison | Direction | Vue d'ensemble | Performance | Garder | `[EN ATTENTE]` |
| Remplissage | Direction | Vue d'ensemble | Remplissage | Garder | `[EN ATTENTE]` |
| Gains IA | Direction | Vue d'ensemble | Gains | Garder | `[EN ATTENTE]` |
| Utilisation flotte | Direction | Vue d'ensemble | Flotte | Garder | `[EN ATTENTE]` |
| Détail CA par hub | Direction | Vue d'ensemble | CA (détail) | Déplacer depuis page CA | `[EN ATTENTE]` |
| Membres équipe | Direction | Équipe | Liste | Garder | `[EN ATTENTE]` |
| Invitation membre | Direction | Équipe | Actions | Garder | `[EN ATTENTE]` |
| Couverture hubs | Direction | Équipe | Stats | Garder | `[EN ATTENTE]` |
| Performance livraisons | Direction | Performance & Décisions | Onglet Performance | Garder | `[EN ATTENTE]` |
| Décisions IA | Direction | Performance & Décisions | Onglet Décisions | Garder | `[EN ATTENTE]` |
| Audit trail | Direction | Performance & Décisions | Onglet Audit | Déplacer | `[EN ATTENTE]` |
| Hubs (config) | Direction | Configuration | Hubs | Ajouter | `[EN ATTENTE]` |
| Grille tarifaire | Direction | Configuration | Tarification | Ajouter | `[EN ATTENTE]` |
| Catégories produits (config) | Direction | Configuration | Catégories | Ajouter | `[EN ATTENTE]` |
| Dashboard opérationnel | Logistics | Dashboard | — | Garder | `[EN ATTENTE]` |
| Liste commandes | Logistics | Commandes | Vue liste | Garder | `[EN ATTENTE]` |
| Vue carte | Logistics | Commandes | Vue carte | Déplacer | `[EN ATTENTE]` |
| Détail commande | Logistics | Commandes | Détail | Ajouter | `[EN ATTENTE]` |
| Validation commande | Logistics | Commandes | Actions | Ajouter | `[EN ATTENTE]` |
| Catégorisation colis | Logistics | Optimisation | Étape 1 | Ajouter | `[EN ATTENTE]` |
| Groupage | Logistics | Optimisation | Étape 2 | Garder | `[EN ATTENTE]` |
| Affectation | Logistics | Optimisation | Étape 3 | Ajouter | `[EN ATTENTE]` |
| Planification VRP | Logistics | Optimisation | Étape 4 | Ajouter | `[EN ATTENTE]` |
| Liste véhicules | Logistics | Flotte | Liste | Garder | `[EN ATTENTE]` |
| Ajouter véhicule | Logistics | Flotte | Modal | Garder | `[EN ATTENTE]` |
| Activité flotte | Logistics | Flotte | Graphique | Garder | `[EN ATTENTE]` |
| Missions chauffeur | Chauffeur | Mes missions | Liste | Garder | `[EN ATTENTE]` |
| Ma tournée | Chauffeur | Mes missions | Résumé | Intégrer | `[EN ATTENTE]` |
| Confirmation livraison | Chauffeur | Mes missions | Composant | Garder | `[EN ATTENTE]` |
| Historique | Chauffeur | Mes missions | Onglet/filtre | Déplacer | `[EN ATTENTE]` |
| Nouvelle expédition | Client | Nouvelle expédition | Formulaire | Garder | `[EN ATTENTE]` |
| Demandes | Client | Mes expéditions | Onglet | Garder | `[EN ATTENTE]` |
| Devis | Client | Mes expéditions | Onglet | Ajouter | `[EN ATTENTE]` |
| Commandes | Client | Mes expéditions | Onglet | Garder | `[EN ATTENTE]` |
| Suivi temps réel | Client | Mes expéditions | Onglet | Ajouter | `[EN ATTENTE]` |
| Factures | Client | Mes expéditions | Section | Déplacer | `[EN ATTENTE]` |
| Détail commande | Client | Mes expéditions | Page détail | Ajouter | `[EN ATTENTE]` |

---

### Bilan quantitatif

| Métrique | Avant | Après | Variation |
|----------|-------|-------|-----------|
| Onglets sidebar (total) | 20 | 14 | -6 |
| Admin SaaS | 3 | 3 | 0 |
| Direction | 6 | 4 | -2 |
| Logistics | 5 | 4 | -1 |
| Chauffeur | 3 | 1 | -2 |
| Client | 3 | 2 | -1 |
| Fonctionnalités métier | ~69 | ~67 | -2 (supprimées : placeholder, doublon) |

---

## PROCHAINE ÉTAPE

Pour valider cette analyse, il faut :

1. **Relire chaque décision** marquée `[EN ATTENTE]`
2. **Valider ou refuser** chaque décision individuellement
3. **Modifier** si nécessaire (marquer `[MODIFIÉE]` avec la correction)
4. **Une fois toutes les décisions validées**, passer à la refactorisation du code

**Formulaire de validation :**

```
Décision : D-XXX-X
Description : ...
Statut : [VALIDÉE] / [REFUSÉE] / [MODIFIÉE]
Validé par : ...
Date : ...
Commentaire : ...
```
