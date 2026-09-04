# Analyse Fonctionnelle — MadaLogistix (v3)

> **Objectif :** Valider l'architecture fonctionnelle cible du MVP de soutenance.
> **Contexte :** Projet de recherche (M1 MIAGE) — le cœur de la contribution scientifique est l'optimisation logistique (Knapsack, VRP, affectation), pas la richesse fonctionnelle du SaaS.
> **Règle :** Aucune modification de code. Analyse et recommandations uniquement.
> **Validation :** Chaque décision doit être validée par un humain avant d'être appliquée.

---

## SYSTÈME DE VALIDATION

| Statut | Signification |
|--------|---------------|
| `[EN ATTENTE]` | Décision proposée, pas encore validée |
| `[VALIDÉE]` | Décision approuvée par un humain |
| `[REFUSÉE]` | Décision rejetée — retirée du périmètre MVP |
| `[MODIFIÉE]` | Décision acceptée avec des modifications |

---

## 1. ADMIN SaaS

### Décisions Admin SaaS

| # | Décision | Statut | Commentaire |
|---|----------|--------|-------------|
| D-ADM-1 | "Tenants" contient la liste des tenants + annuaire utilisateurs transversal | `[MODIFIÉE]` | Admin SaaS réduit au minimum : lister les tenants, basculer entre eux pour démontrer l'isolation multi-tenant. L'annuaire utilisateurs transversal (CRUD complet) n'est pas nécessaire — la création des comptes se fait via Direction > Équipe |
| D-ADM-2 | "Onboarding tenant" est un onglet dédié au workflow d'activation | `[REFUSÉE]` | Workflow complet (clé d'invitation, checklist d'activation) hors périmètre. Simplifié : l'Admin crée le tenant + le premier compte Direction en une seule action |
| D-ADM-3 | "Paramètres SaaS" est un 3ème onglet séparé | `[REFUSÉE]` | Gestion de plateforme (2FA, facturation SaaS, notifications, localisation) sans valeur pour la démonstration de recherche |

### Squelette validé

```
ADMIN SaaS
└── Tenants
    ├── Liste des tenants (basculer entre eux)
    └── Créer un tenant + 1er compte Direction
```

**1 onglet.**

---

## 2. DIRECTION

### Décisions Direction

| # | Décision | Statut | Commentaire |
|---|----------|--------|-------------|
| D-DIR-1 | Vue d'ensemble reste une interface séparée | `[REFUSÉE]` | Redondante avec Décisions pour la démonstration ; ses KPI (CA, taux livraison, remplissage) n'apportent rien de plus que Performance & Décisions côté recherche |
| D-DIR-2 | CA (page séparée) → section dans Vue d'ensemble | `[REFUSÉE]` | Conséquence de D-DIR-1 : pas de Vue d'ensemble, donc pas de section CA |
| D-DIR-3 | Performance + Décisions → fusion "Performance & Décisions" | `[MODIFIÉE]` | Fusion retenue mais renommée simplement **Décisions** ; la partie "Performance" (donut statuts, délai moyen, incidents) n'a pas de valeur de recherche propre — seul l'historique des exécutions d'algorithmes (VRP, groupage, affectation) est conservé |
| D-DIR-4 | Audit → onglet interne dans "Performance & Décisions" | `[REFUSÉE]` | L'audit (logs, export CSV) est hors périmètre — la traçabilité utile est déjà couverte par l'historique des décisions d'optimisation |
| D-DIR-5 | Équipe reste un onglet séparé | `[VALIDÉE]` | Nécessaire : la Direction doit pouvoir créer les comptes gestionnaire et chauffeur de son tenant |
| D-DIR-6 | "Configuration" est un nouvel onglet (Hubs + Tarification + Catégories) | `[MODIFIÉE]` | Retenu, mais renommé **Paramètres tarifaires** pour le MVP : grilles tarifaires (Must) + seuil de remplissage (Must). Hubs et Catégories produits restent `[EN ATTENTE]` — trous identifiés précédemment, à trancher (cf. section Trous ci-dessous) |

### Squelette validé

```
DIRECTION
├── Équipe
│   ├── Créer un gestionnaire
│   └── Créer un chauffeur
├── Décisions
│   └── Historique des exécutions d'algorithmes (VRP, groupage, affectation)
└── Paramètres tarifaires
    ├── Grilles tarifaires (consulter/modifier)
    ├── Seuil de remplissage minimum
    └── Historique des modifications (Should)
```

**3 onglets.**

---

## 3. RESPONSABLE LOGISTIQUE

### Décisions Logistics

| # | Décision | Statut | Commentaire |
|---|----------|--------|-------------|
| D-LOG-1 | Dashboard reste un onglet séparé | `[VALIDÉE]` | KPI du jour utile pour situer rapidement l'activité en démo |
| D-LOG-2 | Commandes reste un onglet séparé | `[VALIDÉE]` | Avec l'ajout Must déjà acté : sélection multiple des commandes en attente |
| D-LOG-3 | Carte → vue alternative dans Commandes (pas d'onglet sidebar) | `[REFUSÉE]` | La carte elle-même reste hors périmètre (coûteuse à faire fonctionner pour zéro valeur de recherche) — ni onglet séparé, ni vue alternative |
| D-LOG-4 | Catégorisation + Groupage + Affectation + VRP → un seul onglet "Optimisation" | `[VALIDÉE]` | C'est la réponse aux trous identifiés (affectation et VRP absents du MVP initial) — cœur de la démonstration scientifique |
| D-LOG-5 | Organisation d'Optimisation : pipeline visuel + étapes internes | `[VALIDÉE]` | Pertinent pour rendre lisible le pipeline Knapsack → Affectation → VRP pendant la soutenance |
| D-LOG-6 | Catégorisation = 2 aspects : config (Direction) + opération (Logistics) | `[MODIFIÉE]` | La catégorisation opérationnelle (attribuer une catégorie à un colis) reste dans Optimisation ; la configuration des catégories (côté Direction) reste `[EN ATTENTE]` — lié au même trou que Hubs |
| D-LOG-7 | Flotte reste un onglet séparé | `[VALIDÉE]` | Nécessaire : lister/ajouter un véhicule alimente directement l'algorithme d'affectation |

### Squelette validé

```
RESPONSABLE LOGISTIQUE
├── Dashboard (KPI du jour)
├── Commandes
│   ├── Liste + filtres par statut
│   └── Sélection multiple → envoi vers Optimisation
├── Optimisation
│   ├── Pipeline (barre d'avancement)
│   ├── Catégorisation (colis)
│   ├── Groupage (Knapsack/Bin Packing sur la sélection)
│   ├── Affectation (chauffeur + véhicule, Should)
│   └── Planification VRP (tournées, Should/Could selon complexité retenue)
└── Flotte
    ├── Lister les véhicules
    └── Ajouter un véhicule
```

**3 onglets.**

---

## 4. CHAUFFEUR

### Décisions Chauffeur

| # | Décision | Statut | Commentaire |
|---|----------|--------|-------------|
| D-CHF-1 | "Mes missions" est le seul onglet sidebar | `[VALIDÉE]` | Simplification bienvenue, aucune perte fonctionnelle |
| D-CHF-2 | Missions + Livraisons → fusion (même concept) | `[VALIDÉE]` | Évite un doublon inutile |
| D-CHF-3 | Ma tournée → section dans Missions (pas d'onglet séparé) | `[VALIDÉE]` | Cohérent, léger |
| D-CHF-4 | Historique → onglet/filtre interne dans Missions | `[VALIDÉE]` | Remplace l'onglet Historique qu'on avait mis en Won't — ici c'est gratuit puisque fusionné, donc acceptable |
| D-CHF-5 | Navigation (placeholder) → supprimé | `[VALIDÉE]` | Placeholder vide, aucune perte |

### Squelette validé

```
CHAUFFEUR
└── Mes missions
    ├── Liste des missions (en cours, avec actions)
    ├── Ma tournée (résumé, sans carte GPS réelle)
    ├── Confirmation livraison (photo + signature)
    └── Historique (filtre interne)
```

**1 onglet.**

---

## 5. CLIENT

### Décisions Client

| # | Décision | Statut | Commentaire |
|---|----------|--------|-------------|
| D-CLI-1 | "Nouvelle expédition" reste un onglet séparé | `[VALIDÉE]` | — |
| D-CLI-2 | "Mes expéditions" regroupe Demandes, Devis, Commandes, Suivi, Factures | `[MODIFIÉE]` | Retenu pour Commandes + Suivi (Must) ; Devis comme étape distincte (accepter/refuser) et Suivi temps réel sur carte restent `[EN ATTENTE]` — à trancher, alourdissent le cycle client |
| D-CLI-3 | Factures → section dans Mes expéditions (pas d'onglet sidebar) | `[MODIFIÉE]` | Réduit à un simple statut "facture générée" affiché sur la commande (Should) — pas de vraie section Factures avec téléchargement PDF |
| D-CLI-4 | Détail commande → page accessible depuis la liste | `[VALIDÉE]` | Utile et peu coûteux |
| D-CLI-5 | Notifications → backend transversal (pas de page dédiée) | `[REFUSÉE]` | Notifications automatiques hors périmètre MVP (Won't) |

### Squelette validé

```
CLIENT
├── Nouvelle expédition (formulaire + devis + soumission)
└── Mes expéditions
    ├── Suivi de l'avancement des commandes
    ├── Détail d'une commande
    └── Statut "facture générée" (Should)
```

**2 onglets.**

---

## 6. CATÉGORISATION — statut

| Aspect | Qui | Où | Statut |
|--------|-----|-----|--------|
| A. Configuration des catégories | Direction | Paramètres tarifaires (à étendre) ou nouvel onglet | `[EN ATTENTE]` — trou non tranché |
| B. Catégorisation opérationnelle | Logistics | Optimisation > Catégorisation | `[VALIDÉE]` |

---

## SQUELETTE FINAL VALIDÉ

```
MadaLogistix
│
├── Authentification (par rôle, sans dropdown de sélection — le rôle vient du compte)
│
├── ADMIN SaaS
│   └── Tenants (liste + bascule + création tenant/1er compte Direction)
│
├── DIRECTION
│   ├── Équipe
│   ├── Décisions (historique algorithmes)
│   └── Paramètres tarifaires
│
├── RESPONSABLE LOGISTIQUE
│   ├── Dashboard
│   ├── Commandes
│   ├── Optimisation (pipeline complet)
│   └── Flotte
│
├── CHAUFFEUR
│   └── Mes missions
│
└── CLIENT
    ├── Nouvelle expédition
    └── Mes expéditions
```

**10 onglets sidebar au total** (hors Authentification).

---

## TROUS — ARBITRAGE FINAL

Tous les trous ont été tranchés : aucun n'ajoute d'écran ou de développement significatif — 3 sont câblés en dur/seedés en base, 2 sont abandonnés.

| # | Sujet | Statut | Arbitrage retenu |
|---|-------|--------|-------------------|
| 1 | Gestion des Hubs | `[COMBLÉ — simplifié]` | Pas d'écran de gestion. Un hub unique par défaut est créé automatiquement à la création du tenant (Admin SaaS), sans formulaire ni configuration manuelle |
| 2 | Configuration des catégories de produits | `[COMBLÉ — simplifié, reste Must]` | La catégorisation **opérationnelle** (Logistics > Optimisation, attribuer une catégorie à un colis) reste Must et validée. Côté configuration : 3 catégories fixes (Standard / Express / Fragile-Valeur) sont seedées directement en base — pas d'écran CRUD pour les créer/modifier |
| 3 | Compatibilité chauffeur × véhicule | `[COMBLÉ — simplifié]` | Pas de matrice à cocher manuellement. Règle câblée dans l'algorithme d'affectation : un chauffeur est compatible avec un véhicule s'il est rattaché au même hub, et `habilite_valeur=true` est requis pour les sacs classe A |
| 4 | Devis comme étape distincte (accepter/refuser) | `[RETIRÉ]` | Le devis reste affiché en temps réel dans le formulaire de demande (Client > Nouvelle expédition) ; soumettre la demande vaut acceptation implicite. Pas d'étape séparée |
| 5 | Suivi temps réel sur carte (côté client) | `[RETIRÉ]` | La barre de progression par étapes (déjà Must dans Mes expéditions) suffit. Pas de carte côté client, cohérent avec le retrait de la carte côté Logistics |

**Conséquence sur le squelette :** aucun onglet supplémentaire n'est ajouté. Le squelette à 10 onglets (section précédente) reste final et fermé.

---

## PROCHAINE ÉTAPE

Le squelette fonctionnel est désormais figé, sans trou restant. Passer au prompt d'épuration du code (frontend) cohérent avec cette version finale.
