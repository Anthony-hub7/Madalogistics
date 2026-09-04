# Extraction Fonctionnelle - MadaLogistix

> Liste des fonctionnalités par rôle et par onglet, du point de vue métier uniquement.

---

## Role : Administrateur SaaS

### Onglet : Statistiques
- Visualiser les KPI globaux de la plateforme (utilisateurs, activite, sante du systeme)
- Suivre l'evolution de l'activite sur les 7 derniers jours
- Consulter les indicateurs de performance organisationnelle (flotte, entrepot, latence)
- Consulter le journal des evenements du systeme

### Onglet : Utilisateurs
- Lister tous les comptes utilises de la plateforme
- Rechercher un utilisateur par nom ou role
- Creer un compte gestionnaire ou chauffeur
- Modifier les informations d'un utilisateur
- Desactiver un compte utilisateur
- Naviguer dans la liste des utilisateurs

### Onglet : Parametres
- Consulter les informations de la plateforme
- Visualiser le plan d'abonnement et son utilisation
- Consulter l'historique des factures de la plateforme
- Configurer la langue, le fuseau horaire et la devise
- Activer ou desactiver l'authentification a deux facteurs
- Parametrer les preferences de notification
- Reinitialiser un mot de passe
- Sauvegarder ou annuler les modifications

---

## Role : Responsable logistique

### Onglet : Dashboard
- Visualiser les KPI du jour (livraisons, vehicules disponibles, commandes en attente, taux de remplissage, cout journalier)
- Suivre le volume des livraisons sur la semaine
- Surveiller l'occupation de la flotte
- Consulter les dernieres commandes avec leur statut

### Onglet : Commandes
- Lister toutes les commandes
- Filtrer les commandes par statut (en attente, en cours, livree)
- Rechercher une commande
- Modifier les informations d'une commande
- Supprimer ou annuler une commande
- Visualiser les livraisons actives sur une carte
- Consulter l'historique des actions sur les commandes

### Onglet : Flotte
- Lister tous les vehicules et leur etat
- Visualiser les KPI de la flotte (total, disponible, en mission, maintenance)
- Rechercher ou filtrer les vehicules
- Ajouter un nouveau vehicule avec ses caracteristiques
- Suivre l'utilisation des vehicules sur les dernieres 24h
- Recevoir des recommandations d'optimisation

### Onglet : Optimisation
- Definir les parametres de groupage (nombre de colis, poids, volume, vehicules disponibles, distance)
- Lancer un calcul d'optimisation du chargement
- Visualiser le resultat : taux de remplissage, vehicule assigne, cout
- Recevoir une alerte si depassement de capacite
- Visualiser le flux de chargement en temps reel

### Onglet : Carte
- Visualiser sur une carte les livraisons en cours en temps reel
- Localiser les vehicules, entrepots et points de depot
- Naviguer avec不同的couches (satellite, trafic, terrain)
- Consulter la liste des livraisons avec leur progression
- Suivre les statistiques en bas de carte (vitesse, vehicules actifs, ponctualite)

---

## Role : Client

### Onglet : Nouvelle demande
- Remplir une demande d'expedition (adresses, description, poids, volume)
- Ajouter des options (assurance premium, livraison express)
- Visualiser l'estimation du trajet et du tarif
- Soumettre la demande de transport

### Onglet : Mes commandes
- Suivre l'avancement de chaque commande en cours
- Consulter les commandes passees
- Visualiser les statistiques d'expedition du mois

### Onglet : Factures
- Lister toutes ses factures
- Filtrer les factures par statut (payee, en attente, annulee)
- Telecharger le PDF d'une facture
- Visualiser les montants dus, payes et la derniere facture

---

## Role : Chauffeur

### Onglet : Mes livraisons
- Consulter la liste des missions du jour
- Accepter une mission de livraison
- Demarrer l'itineraire
- Mettre a jour le statut de la tournée (a venir, acceptee, en cours, en route, arrivee, livree)
- Visualiser le recapitulatif de la tournée (distance totale)
- Acceder au detail d'une livraison

### Onglet : Detail livraison
- Consulter les informations du destinataire
- Suivre la progression en 4 etapes (preparation, en route, arrive, livre)
- Identifier les colis fragiles ou prioritaires
- Visualiser la position GPS sur une carte
- Lancer la navigation GPS
- Confirmer la livraison avec photo et signature

### Onglet : Historique
- Consulter la liste des livraisons effectuees

---

## Role : Direction

### Onglet : Vue d'ensemble
- Filtrer les donnees par periode et par hub
- Suivre le chiffre d'affaires hebdomadaire
- Visualiser le taux de livraison
- Comparer le taux de remplissage a l'objectif
- Mesurer les gains de l'optimisation IA (economies, CO2, temps)
- Surveiller l'utilisation de la flotte par vehicule

### Onglet : Chiffre d'affaires
- Comparer les revenus par hub sur une periode
- Consulter la facturation detaillee
- Filtrer par periode

### Onglet : Performance
- Visualiser la repartition des statuts de livraison
- Mesurer le temps moyen de livraison
- Consulter la liste des incidents
- Filtrer par periode

### Onglet : Decisions
- Visualiser les gains cumules de l'optimisation IA
- Consulter l'historique des executions d'algorithmes (VRP, groupage, affectation)
- Recevoir des recommandations d'optimisation
- Filtrer par periode

### Onglet : Equipe
- Lister les membres de l'equipe
- Rechercher un membre par nom ou role
- Inviter un nouvel utilisateur
- Visualiser la repartition de l'equipe (managers, chauffeurs, admins)
- Verifier la couverture des hubs
- Naviguer dans la liste

### Onglet : Audit
- Visualiser le volume total des actions enregistrees
- Consulter la repartition des actions (modifications, creations, suppressions, exports)
- Rechercher une action dans le journal
- Exporter les logs en CSV
- Filtrer par periode
