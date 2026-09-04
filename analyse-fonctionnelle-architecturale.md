# Analyse Fonctionnelle et Architecturale — MadaLogistix

> **Objectif :** Valider le squelette fonctionnel cible avant refactorisation.
> **Règle :** Aucune modification de code. Analyse et recommandations uniquement.

---

## 1. ANALYSE DU CODE ACTUEL

### 1.1 Rôles existants

| Clé | Label | Layout |
|-----|-------|--------|
| `admin` | Administrateur | `AdminSaaSLayout` |
| `logistics` | Responsable logistique | `GestionnaireLayout` |
| `client` | Client | `ClientLayout` |
| `driver` | Chauffeur | `ChauffeurLayout` |
| `direction` | Direction | `DirectionLayout` |

### 1.2 Interfaces existantes par rôle

**Admin (3 onglets)**
- Dashboard (statistiques globales plateforme)
- Utilisateurs (annuaire, CRUD)
- Paramètres (société, abonnement, sécurité, alertes)

**Logistics (5 onglets)**
- Dashboard (KPI opérationnels)
- Commandes (liste, filtres, CRUD)
- Flotte (liste véhicules, CRUD, graphique activité)
- Optimisation (simulateur groupage)
- Carte (vue temps réel)

**Client (3 onglets)**
- Nouvelle demande (formulaire expédition)
- Mes commandes (suivi + historique)
- Factures (liste + KPI)

**Driver (3 onglets)**
- Livraisons (liste missions, gestion statuts, confirmation livraison)
- Navigation (placeholder 13 lignes)
- Historique (liste livraisons passées)

**Direction (6 onglets)**
- Vue d'ensemble (CA, taux livraison, remplissage, gains IA, flotte)
- Chiffre d'affaires (CA multi-hubs, factures)
- Performance (donut statuts, temps moyen, incidents)
- Décisions (gains IA, exécutions algorithmes, insights)
- Équipe (membres, recherche, pagination)
- Audit (logs, export CSV)

### 1.3 Fonctionnalités identifiées par onglet

**Admin > Dashboard**
- Visualiser KPI globaux (utilisateurs, activité, santé système)
- Suivre évolution activité hebdomadaire
- Consulter journal système

**Admin > Utilisateurs**
- Lister les comptes
- Rechercher un utilisateur
- Créer un gestionnaire
- Créer un chauffeur
- Modifier un utilisateur
- Désactiver un compte
- Naviguer (pagination)

**Admin > Paramètres**
- Consulter informations société
- Visualiser abonnement et factures
- Configurer langue/fuseau/devise
- Activer/désactiver 2FA
- Configurer notifications
- Réinitialiser mots de passe
- Sauvegarder/annuler

**Logistics > Dashboard**
- Visualiser KPI du jour
- Suivre livraisons hebdomadaires
- Surveiller utilisation flotte
- Consulter commandes récentes

**Logistics > Commandes**
- Lister les commandes
- Filtrer par statut
- Rechercher une commande
- Ajouter une livraison
- Modifier/supprimer une commande
- Visualiser carte livraisons actives
- Consulter journal d'activité

**Logistics > Flotte**
- Lister les véhicules
- Rechercher/Filtrer
- Ajouter un véhicule (modal)
- Suivre activité 24h
- Recevoir recommandation IA
- Exporter CSV

**Logistics > Optimisation**
- Paramétrer simulation (colis, poids, volume, véhicules, distance)
- Lancer calcul optimisation
- Visualiser résultat (taux remplissage, véhicule, coût)
- Recevoir alerte capacité
- Visualiser chargement

**Logistics > Carte**
- Visualiser livraisons en temps réel
- Localiser véhicules/entrepôts/stops
- Naviguer couches (satellite/trafic/terrain)
- Consulter panneau livraisons
- Suivre stats bas (vitesse, actifs, ponctualité)

**Client > Nouvelle demande**
- Remplir formulaire (adresses, description, poids, volume)
- Sélectionner options (assurance, express)
- Visualiser estimation trajet
- Soumettre la demande

**Client > Mes commandes**
- Suivre commandes actives (barre progression)
- Consulter historique
- Visualiser stats personnelles

**Client > Factures**
- Lister factures
- Filtrer par statut
- Télécharger PDF
- Visualiser KPI (total dû, payé, dernière facture)

**Driver > Livraisons**
- Consulter missions du jour
- Accepter une mission
- Démarrer itinéraire
- Mettre à jour statut (bottom sheet)
- Visualiser résumé tournée
- Accéder détail livraison
- Confirmer livraison (photo + signature)

**Driver > Navigation**
- Afficher carte navigation (placeholder)

**Driver > Historique**
- Consulter livraisons passées

**Direction > Vue d'ensemble**
- Filtrer par période/hub
- Suivre CA hebdomadaire
- Visualiser taux livraison (donut)
- Comparer remplissage vs objectif
- Mesurer gains IA
- Surveiller utilisation flotte

**Direction > CA**
- Comparer revenus par hub
- Consulter factures détaillées
- Filtrer par période

**Direction > Performance**
- Visualiser répartition statuts
- Mesurer temps moyen livraison
- Consulter incidents
- Filtrer par période

**Direction > Décisions**
- Visualiser gains cumulés
- Consulter exécutions algorithmes
- Recevoir recommandations
- Filtrer par période

**Direction > Équipe**
- Lister membres
- Rechercher un membre
- Inviter un utilisateur
- Visualiser résumé équipe
- Vérifier couverture hubs
- Naviguer (pagination)

**Direction > Audit**
- Visualiser volume actions
- Consulter répartition
- Rechercher une action
- Exporter CSV
- Filtrer par période

### 1.4 Doublons et chevauchements identifiés

| Constat | Interfaces concernées | Détail |
|---------|----------------------|--------|
| **Dashboard Admin = Dashboard Direction** | Admin > Dashboard, Direction > Vue d'ensemble | Même structure (KPI + graphiques), mais périmètre différent (plateforme vs agence). Les deux sont justifiés. |
| **Journal système = Audit trail** | Admin > Dashboard (journal), Direction > Audit | Même concept (logs), périmètre différent (global vs agence). Direction > Audit est plus complet. |
| **Commandes Logistics = Mes Commandes Client** | Logistics > Commandes, Client > Mes commandes | Mêmes données, vues différentes. Justifié (ops vs consultation). |
| **Flotte Logistics = Vue d'ensemble Direction (flotte)** | Logistics > Flotte, Direction > Vue d'ensemble | Direction voit des stats agrégées, Logistics voit le détail. Justifié. |
| **Optimisation Logistics = Décisions Direction** | Logistics > Optimisation, Direction > Décisions | Logistics exécute, Direction supervise. Justifié. |
| **Factures Client = CA Direction** | Client > Factures, Direction > CA | Client voit ses factures, Direction voit le CA de l'agence. Justifié. |
| **Équipe Direction = Utilisateurs Admin** | Direction > Équipe, Admin > Utilisateurs | Direction gère son agence, Admin gère la plateforme. Justifié. |
| **Carte Logistics = Navigation Driver** | Logistics > Carte, Driver > Navigation | Même concept, périmètre différent (supervision vs exécution). Navigation est un placeholder. |

### 1.5 Fonctionnalités absentes du code mais nécessaires au cycle métier

| Fonctionnalité | Rôle | Étape du cycle | Statut |
|----------------|------|----------------|--------|
| **Création de compte client** | Client | Inscription | Absent — pas de page d'inscription |
| **Consultation des devis** | Client | Devis | Absent — le formulaire crée une demande mais pas de liste de devis |
| **Validation d'une commande** | Logistics | Commande | Bouton "Ajouter" existe mais pas de workflow de validation |
| **Affectation chauffeur/véhicule** | Logistics | Affectation | Absent — le GroupagePage simule mais n'affecte pas réellement |
| **Planification VRP** | Logistics | Planification | Absent — mentionné dans le schema BDD mais pas dans le frontend |
| **Catégorisation des colis** | Logistics | Catégorisation | Absent — pas de gestion des catégories produits |
| **Confirmation de livraison** | Client | Confirmation | Absent — le Driver confirme mais le Client ne reçoit pas de notif |
| **Gestion des hubs** | Direction | Configuration | Absent — mentionné dans les filtres mais pas de page dédiée |
| **Gestion de la grille tarifaire** | Direction | Tarification | Absent — mentionné dans la DB mais pas dans le frontend |
| **Onboarding d'une agence** | Admin | Tenant | Absent — pas de workflow d'invitation/onboarding |

### 1.6 Fonctionnalités présentes dans le code mais hors périmètre probable

| Fonctionnalité | Onglet | Constat |
|----------------|--------|---------|
| **Paramètres Admin (société, abonnement, 2FA, alertes)** | Admin > Paramètres | Paramètres de la plateforme SaaS, pas d'une agence. Cohérent pour un Admin SaaS. |
| **MadaAI Optimizer** | Logistics > Flotte | Recommandation IA hardcodée. Intéressant mais pas branché. |
| **Insights Décisions** | Direction > Décisions | Cards d'insights hardcodées. Utile mais pas interactif. |

---

## 2. ANALYSE DU SQUELETTE CIBLE

### 2.1 Authentification

**Fonctionnalités existantes rattachables :**
- Login (email + mot de passe + sélection rôle) — `LoginPage.jsx`

**Fonctionnalités manquantes :**
- Inscription client
- Mot de passe oublié
- Session / JWT (auth actuellement simulée)

**Fonctionnalités à supprimer :**
- Sélection de rôle dans le login (à remplacer par l'auth réelle)

---

### 2.2 ADMIN SaaS > Tenants

**Fonctionnalités existantes rattachables :**
- Dashboard Admin (KPI plateforme, journal système) — `TenantsAdminPage.jsx`
- Gestion utilisateurs (annuaire, CRUD) — `UtilisateursPage.jsx`

**Fonctionnalités à fusionner :**
- Dashboard + Utilisateurs peuvent coexister comme deux sections d'une même interface "Tenants"
- OU rester séparés si le volume le justifie

**Fonctionnalités manquantes :**
- Liste des tenants (agences) avec statut
- Détail d'un tenant (utilisateurs, config, stats)
- Activation/désactivation d'un tenant

**Fonctionnalités à supprimer :**
- Paramètres Admin (société, abonnement, 2FA) → à déplacer dans Onboarding tenant ou à supprimer si c'est les paramètres de la plateforme elle-même

---

### 2.3 ADMIN SaaS > Onboarding tenant

**Fonctionnalités existantes :**
- Aucune

**Fonctionnalités manquantes (nécessaires) :**
- Générer une clé d'invitation
- Envoyer l'invitation (email)
- Suivre l'état des invitations (en attente / acceptée / expirée)
- Workflow d'inscription d'un nouveau tenant (hub, tarification, équipe, flotte)

**Justification :** Étape critique du cycle — sans onboarding, pas de nouveau tenant.

---

### 2.4 DIRECTION > Équipe

**Fonctionnalités existantes rattachables :**
- Direction > Équipe (liste membres, recherche, invitation, couverture hubs) — `EquipeTab.jsx`
- Admin > Utilisateurs (peut être redondant si Direction gère ses propres membres)

**Fonctionnalités à fusionner :**
- Aucune fusion nécessaire — l'onglet Équipe est autonome

**Fonctionnalités manquantes :**
- Détail d'un membre (profil, historique)
- Modification d'un membre
- Désactivation d'un membre

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.5 DIRECTION > Décisions

**Fonctionnalités existantes rattachables :**
- Direction > Décisions (gains IA, exécutions algorithmes, insights) — `DecisionsTab.jsx`
- Direction > Performance (donut statuts, temps moyen, incidents) — `PerformanceTab.jsx`

**Fonctionnalités à fusionner :**
- **Décisions + Performance** peuvent logiquement appartenir au même flux "Pilotage & Optimisation"
- La Performance montre les résultats, les Décisions montrent les actions IA qui y ont contribué

**Fonctionnalités manquantes :**
- Aucune critique

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.6 DIRECTION > Paramètres tarifaires

**Fonctionnalités existantes :**
- Aucune dédiée

**Fonctionnalités manquantes (nécessaires) :**
- Grille tarifaire (créer/ modifier / supprimer des tarifs)
- Catégories de produits (fragile, standard, robuste, etc.)
- Règles de tarification (par poids, par volume, par distance)

**Justification :** Le schéma BDD contient `grille_tarifaire` et `categorie_produit`. Ces données conditionnent le devis client.

---

### 2.7 RESPONSABLE LOGISTIQUE > Dashboard

**Fonctionnalités existantes rattachables :**
- Logistics > Dashboard (KPI, graphiques, commandes récentes) — `DashboardGestionnairePage.jsx`

**Fonctionnalités à fusionner :**
- Aucune — le dashboard est une vue synthétique

**Fonctionnalités manquantes :**
- Aucune critique

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.8 RESPONSABLE LOGISTIQUE > Commandes

**Fonctionnalités existantes rattachables :**
- Logistics > Commandes (liste, filtres, CRUD, carte, journal) — `DemandesListPage.jsx`

**Fonctionnalités à fusionner :**
- Aucune — l'onglet est déjà complet

**Fonctionnalités manquantes :**
- Détail d'une commande (colis, affectation, historique)
- Validation / rejet d'une commande
- Passage de statut (en attente → validée → en cours → livrée)

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.9 RESPONSABLE LOGISTIQUE > Catégorisation

**Fonctionnalités existantes :**
- Aucune dédiée

**Fonctionnalités manquantes (nécessaires) :**
- Liste des catégories de produits
- Créer / modifier une catégorie
- Associer une catégorie à un colis
- Règles par catégorie (fragile = manipulation spéciale, etc.)

**Justification :** Le schéma BDD contient `categorie_produit`. La catégorisation conditionne le groupage et l'affectation.

---

### 2.10 RESPONSABLE LOGISTIQUE > Groupage

**Fonctionnalités existantes rattachables :**
- Logistics > Optimisation (simulateur groupage) — `GroupagePage.jsx`

**Fonctionnalités à fusionner :**
- L'onglet "Optimisation" actuel = Groupage. Renommer.

**Fonctionnalités manquantes :**
- Historique des simulations
- Application du résultat (créer des sacs réels)
- Visualisation des sacs créés

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.11 RESPONSABLE LOGISTIQUE > Planification VRP

**Fonctionnalités existantes :**
- Aucune dédiée

**Fonctionnalités manquantes (nécessaires) :**
- Lancer la planification VRP (Vehicle Routing Problem)
- Visualiser les tournées résultantes
- Modifier / valider une tournée
- Consulter l'historique des planifications

**Justification :** Le schéma BDD contient `tournee` et `etape_livraison`. La VRP est l'étape clé entre l'affectation et les missions chauffeur.

---

### 2.12 RESPONSABLE LOGISTIQUE > Affectation

**Fonctionnalités existantes :**
- Partiellement dans GroupagePage (simulation) et FlottePage (assignation chauffeur/véhicule)

**Fonctionnalités manquantes (nécessaires) :**
- Visualiser les paires chauffeur/véhicule compatibles
- Affecter un chauffeur + véhicule à un sac
- Valider les affectations
- Consulter l'historique des affectations

**Justification :** Le schéma BDD contient `compatibilite_chauffeur_vehicule` et `sac`. L'affectation est une étape distincte du groupage.

---

### 2.13 RESPONSABLE LOGISTIQUE > Flotte

**Fonctionnalités existantes rattachables :**
- Logistics > Flotte (liste véhicules, CRUD, activité 24h, recommandation IA) — `FlottePage.jsx`

**Fonctionnalités à fusionner :**
- Aucune — l'onglet est autonome

**Fonctionnalités manquantes :**
- Détail d'un véhicule (historique, maintenance)
- Gestion de la maintenance

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.14 CHAUFFEUR > Mes missions

**Fonctionnalités existantes rattachables :**
- Driver > Livraisons (liste missions, acceptation, démarrage, statuts, résumé tournée) — `MesLivraisonsPage.jsx`
- Composant ConfirmationLivraison (photo, signature, commentaires)

**Fonctionnalités à fusionner :**
- Mes missions + le workflow de confirmation (photo/signature) forment un flux complet

**Fonctionnalités manquantes :**
- Aucune critique

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.15 CHAUFFEUR > Ma tournée

**Fonctionnalités existantes :**
- Partiellement dans MesLivraisonsPage (résumé tournée, distance)
- NavigationPage (placeholder)

**Fonctionnalités manquantes (nécessaires) :**
- Visualiser l'itinéraire optimisé (liste des étapes dans l'ordre)
- Voir la carte de la tournée avec les stops
- Estimations temps par étape
- Temps restant total

**Justification :** Le chauffeur a besoin de voir sa tournée complète, pas juste les missions individuellement.

---

### 2.16 CHAUFFEUR > Livraisons

**Fonctionnalités existantes rattachables :**
- Driver > Historique (liste livraisons passées) — `HistoriquePage.jsx`
- DetailLivraisonPage (détail d'une livraison)

**Fonctionnalités à fusionner :**
- **Livraisons + Historique** peuvent être un seul onglet avec deux sections (en cours / passées)

**Fonctionnalités manquantes :**
- Filtres (par date, par statut)

**Fonctionnalités à supprimer :**
- NavigationPage (placeholder inutile — à intégrer dans Ma tournée)

---

### 2.17 CLIENT > Mes commandes

**Fonctionnalités existantes rattachables :**
- Client > Mes commandes (suivi actif + historique) — `MesCommandesPage.jsx`

**Fonctionnalités à fusionner :**
- Aucune — l'onglet est complet

**Fonctionnalités manquantes :**
- Détail d'une commande (colis, suivi en temps réel)

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.18 CLIENT > Nouvelle demande

**Fonctionnalités existantes rattachables :**
- Client > Nouvelle demande (formulaire) — `NouvelleDemandePage.jsx`

**Fonctionnalités à fusionner :**
- Aucune — le formulaire est autonome

**Fonctionnalités manquantes :**
- Sélection du hub de départ
- Sélection de la catégorie de produit

**Fonctionnalités à supprimer :**
- Aucune

---

### 2.19 CLIENT > Devis

**Fonctionnalités existantes :**
- Partiellement dans NouvelleDemandePage (estimation trajet dans la sidebar)

**Fonctionnalités manquantes (nécessaires) :**
- Liste des devis (en attente / acceptés / refusés / expirés)
- Détail d'un devis (tarification détaillée)
- Accepter / refuser un devis
- Transformer un devis en commande

**Justification :** Le devis est l'étape entre la demande et la commande. Sans liste de devis, le client ne peut pas suivre ses demandes de tarification.

---

### 2.20 CLIENT > Suivi

**Fonctionnalités existantes :**
- Partiellement dans MesCommandesPage (barre de progression)

**Fonctionnalités manquantes (nécessaires) :**
- Suivi en temps réel d'une commande sur carte
- Notifications de statut (email / SMS)
- Détail du colis en cours de transport

**Justification :** Le suivi est la fonctionnalité la plus attendue par un client après la commande.

---

## 3. VÉRIFICATION DU FLUX MÉTIER

| # | Étape | Interface cible | Rôle | Existe dans le code | Absente du code |
|---|-------|----------------|------|--------------------|--------------------|
| 1 | Inscription client | Authentification | Client | Non | **Oui** |
| 2 | Demande de transport | Client > Nouvelle demande | Client | Oui | Non |
| 3 | Devis | Client > Devis | Client | Partiel (estimation) | **Liste + validation** |
| 4 | Commande | Client > Mes commandes | Client | Oui (suivi) | **Création depuis devis** |
| 5 | Validation commande | Responsable > Commandes | Logistics | Partiel (CRUD) | **Workflow de validation** |
| 6 | Catégorisation | Responsable > Catégorisation | Logistics | Non | **Oui** |
| 7 | Groupage | Responsable > Groupage | Logistics | Oui (simulation) | **Application réelle** |
| 8 | Affectation | Responsable > Affectation | Logistics | Non | **Oui** |
| 9 | Planification VRP | Responsable > Planification VRP | Logistics | Non | **Oui** |
| 10 | Mission chauffeur | Chauffeur > Mes missions | Driver | Oui | Non |
| 11 | Tournée | Chauffeur > Ma tournée | Driver | Partiel (placeholder) | **Carte + itinéraire** |
| 12 | Livraison | Chauffeur > Livraisons | Driver | Oui | Non |
| 13 | Confirmation | Chauffeur > Mes missions | Driver | Oui (composant) | Non |
| 14 | Suivi client | Client > Suivi | Client | Partiel (progression) | **Temps réel + notifs** |
| 15 | Facturation | Client > Mes commandes | Client | Partiel (dans historique) | **Page dédiée ou intégrée** |

**Trous critiques :**
1. Pas d'inscription client
2. Pas de workflow devis complet
3. Pas de catégorisation
4. Pas d'affectation réelle
5. Pas de planification VRP
6. Pas de suivi temps réel pour le client

---

## 4. VÉRIFICATION DES RESPONSABILITÉS DES RÔLES

| Rôle | Responsabilité attendue | Constat | Problème ? |
|------|------------------------|---------|------------|
| Admin SaaS | Gérer les tenants, onboarding | Gère aussi les utilisateurs de la plateforme + paramètres de la plateforme | OK |
| Direction | Gérer son agence, son équipe, sa config | Gère 6 onglets (CA, performance, décisions, équipe, audit, vue d'ensemble) | **Surcharge** — trop d'onglets |
| Logistics | Opérations et optimisation | 5 onglets (dashboard, commandes, flotte, optimisation, carte) | OK |
| Chauffeur | Exécution des missions | 3 onglets (livraisons, navigation placeholder, historique) | OK |
| Client | Demandes, commandes, suivi | 3 onglets (nouvelle demande, mes commandes, factures) | **Manque devis + suivi** |

**Incohérences détectées :**
- Direction a 6 onglets → surcharge cognitive. La fusion Décisions + Performance est recommandée.
- Client n'a pas de page Devis → trou dans le cycle.
- Client n'a pas de suivi temps réel → trou dans le cycle.

---

## 5. PROPOSÉ DE FUSIONS

### Fusion 1 : Direction > Décisions + Performance

**AVANT :**
- Décisions & Optimisation (gains IA, exécutions algorithmes, insights)
- Performance (donut statuts, temps moyen, incidents)

**APRÈS :**
- **Performance & Décisions** — une seule interface avec deux sections :
  1. Tableau de bord performance (donut, temps moyen, incidents)
  2. Historique des décisions IA (gains, exécutions, recommandations)

**RAISON :** Ces deux onglets répondent à la même question : "Comment se porte mon activité et qu'est-ce que l'IA a fait pour l'améliorer ?" Les séparer force le Direction à naviguer entre deux endroits pour construire sa vision.

---

### Fusion 2 : Chauffeur > Livraisons + Historique

**AVANT :**
- Livraisons (missions en cours)
- Historique (livraisons passées)

**APRÈS :**
- **Mes livraisons** — une seule interface avec deux onglets internes :
  1. En cours (missions actives)
  2. Terminées (historique)

**RAISON :** Même données, même contexte (le chauffeur veut voir ses missions). La séparation en deux onglets de navigation ajoute un clic inutile. Un toggle interne suffit.

---

### Fusion 3 : Client > Nouvelle demande + Devis

**AVANT :**
- Nouvelle demande (formulaire de demande)
- Devis (liste des devis)

**APRÈS :**
- **Mes expéditions** — une seule interface :
  1. Nouvelle demande (formulaire)
  2. Liste des devis (demandes en attente de réponse)
  3. Historique des demandes

**RAISON :** La demande et le sont le même flux. Le client remplit un formulaire → reçoit un devis → accepte → ça devient une commande. Séparer "Nouvelle demande" et "Devis" casse le flux.

---

## 6. ÉLÉMENTS À SUPPRIMER

| Élément | Onglet | Raison |
|---------|--------|--------|
| **Navigation (placeholder)** | Chauffeur > Navigation | 13 lignes, aucune fonctionnalité. L'itinéraire doit être dans "Ma tournée". |
| **Sélection de rôle dans le login** | Authentification | Remplacée par l'auth réelle (JWT). Le rôle vient du token. |
| **Paramètres Admin (société, abonnement, 2FA, alertes)** | Admin > Paramètres | Paramètres de la plateforme SaaS → à déplacer dans Onboarding tenant ou dans un super-admin dédié. |
| **Onglet Audit** | Direction > Audit | Peut être une section dans "Performance & Décisions" ou dans un menu avancé. 6 onglets = trop pour Direction. |
| **Onglet CA** | Direction > CA | Le CA peut être une section dans "Vue d'ensemble" ou dans "Performance & Décisions". |

---

## 7. ÉLÉMENTS À AJOUTER

| Fonctionnalité | Rôle | Interface proposée | Raison | Source |
|----------------|------|--------------------|--------|--------|
| **Inscription client** | Client | Authentification | Cycle incomplet sans inscription | Nécessité du flux |
| **Liste des devis** | Client | Mes expéditions (fusion) | Le devis est une étape clé du cycle | Nécessité du flux |
| **Accepter/refuser un devis** | Client | Mes expéditions (fusion) | Le client doit pouvoir décider | Nécessité du flux |
| **Transformer devis en commande** | Client + Logistics | Mes expéditions + Commandes | Pont entre devis et commande | Nécessité du flux |
| **Suivi temps réel sur carte** | Client | Suivi (nouvel onglet) | Le client veut voir son colis en mouvement | Nécessité du flux |
| **Notifications de statut** | Client | Transversal (email/SMS) | Le client doit être notifié des changements | Nécessité du flux |
| **Catégorisation des colis** | Logistics | Catégorisation (nouvel onglet) | Conditionne le groupage et l'affectation | Schéma BDD + flux |
| **Affectation chauffeur/véhicule** | Logistics | Affectation (nouvel onglet) | Étape entre groupage et VRP | Schéma BDD + flux |
| **Planification VRP** | Logistics | Planification VRP (nouvel onglet) | Étape entre affectation et missions | Schéma BDD + flux |
| **Liste des hubs** | Direction | Paramètres tarifaires | Configuration de l'agence | Schéma BDD |
| **Grille tarifaire** | Direction | Paramètres tarifaires | Conditionne les devis | Schéma BDD |
| **Workflow d'onboarding tenant** | Admin | Onboarding tenant (nouvel onglet) | Activer de nouveaux clients SaaS | Nécessité du flux |
| **Détail d'un membre** | Direction | Équipe | Voir le profil complet | Logique métier |
| **Détail d'un véhicule** | Logistics | Flotte | Historique, maintenance | Logique métier |

---

## 8. SQUELETTE FINAL RECOMMANDÉ

```
MadaLogistix
│
├── Authentification
│
├── ADMIN SaaS
│   ├── Tenants
│   └── Onboarding tenant
│
├── DIRECTION
│   ├── Vue d'ensemble
│   ├── Équipe
│   ├── Performance & Décisions
│   └── Paramètres tarifaires
│
├── RESPONSABLE LOGISTIQUE
│   ├── Dashboard
│   ├── Commandes
│   ├── Catégorisation
│   ├── Groupage
│   ├── Affectation
│   ├── Planification VRP
│   └── Flotte
│
├── CHAUFFEUR
│   ├── Mes missions
│   ├── Ma tournée
│   └── Mes livraisons
│
└── CLIENT
    ├── Mes expéditions
    ├── Mes commandes
    └── Suivi
```

---

## 9. TABLEAU DE SYNTHÈSE

| Interface | Rôle | Fonctionnalités principales | Action |
|-----------|------|-----------------------------|--------|
| **Authentification** | Tous | Login, inscription client, mot de passe oublié | Adapter |
| **Tenants** | Admin SaaS | Liste tenants, KPI plateforme, gestion utilisateurs | Fusionner Dashboard + Utilisateurs |
| **Onboarding tenant** | Admin SaaS | Invitation, workflow configuration agence | Ajouter |
| **Vue d'ensemble** | Direction | CA, taux livraison, remplissage, gains IA, flotte | Garder |
| **Équipe** | Direction | Membres, recherche, invitation, couverture hubs | Garder |
| **Performance & Décisions** | Direction | Donut statuts, temps moyen, incidents, exécutions IA, gains | Fusionner |
| **Paramètres tarifaires** | Direction | Grille tarifaire, catégories produits, hubs | Ajouter |
| **Dashboard** | Logistics | KPI du jour, livraisons, utilisation flotte | Garder |
| **Commandes** | Logistics | Liste, filtres, CRUD, validation, détail | Garder |
| **Catégorisation** | Logistics | Catégories produits, règles par catégorie | Ajouter |
| **Groupage** | Logistics | Simulateur, application, historique, sacs | Renommer + enrichir |
| **Affectation** | Logistics | Paires compatibles, affectation chauffeur/véhicule | Ajouter |
| **Planification VRP** | Logistics | Lancement, visualisation tournées, validation | Ajouter |
| **Flotte** | Logistics | Liste véhicules, CRUD, maintenance, activité | Garder |
| **Mes missions** | Chauffeur | Liste missions, acceptation, statuts, confirmation | Garder |
| **Ma tournée** | Chauffeur | Itinéraire optimisé, carte, stops, temps | Ajouter |
| **Mes livraisons** | Chauffeur | En cours + historique (toggle interne) | Fusionner |
| **Mes expéditions** | Client | Nouvelle demande, liste devis, historique demandes | Fusionner |
| **Mes commandes** | Client | Suivi actif, historique, détail commande | Garder |
| **Suivi** | Client | Carte temps réel, notifications, détail colis | Ajouter |
